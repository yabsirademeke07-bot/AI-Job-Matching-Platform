const axios = require('axios');
const crypto = require('node:crypto');
const db = require('../config/db');

const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';
const REAL_WEBSITE_URL = process.env.APP_URL || 'http://localhost:5173';
const MAX_MESSAGE_LENGTH = 4000;
const RETRY_DELAYS_MS = [2000, 5000];
let telegramWebhookConfigured = false;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizeAppOrigin(configuredUrl, variableName) {
  const normalizedUrl = String(configuredUrl || '').trim();
  if (!normalizedUrl) {
    throw new Error(`${variableName} must be configured with the public application origin.`);
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)
      || parsedUrl.username
      || parsedUrl.password
      || parsedUrl.pathname !== '/'
      || parsedUrl.search
      || parsedUrl.hash
      || (process.env.NODE_ENV === 'production'
        && ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(parsedUrl.hostname))) {
      throw new Error();
    }
    return parsedUrl.toString().replace(/\/+$/, '');
  } catch {
    throw new Error(`${variableName} must be a valid public HTTP or HTTPS origin.`);
  }
}

function getBaseUrl() {
  return normalizeAppOrigin(REAL_WEBSITE_URL, 'APP_URL');
}

function getPublicAppBaseUrl() {
  return getBaseUrl();
}

function buildAppUrl(parameters = {}) {
  const url = new URL(getBaseUrl());
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function buildPublicAppUrl(parameters = {}) {
  const url = new URL(getPublicAppBaseUrl());
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted]')
    .replace(/\b\d{8,}\b/g, '[redacted]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[redacted]')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeTelegramHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseSkills(value) {
  const normalizeSkill = (skill) => {
    if (typeof skill === 'string' || typeof skill === 'number') return String(skill).trim();
    if (!skill || typeof skill !== 'object') return '';
    return String(skill.name || skill.skill || skill.skill_name || '').trim();
  };
  if (Array.isArray(value)) return value.map(normalizeSkill).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value.trim());
      if (Array.isArray(parsed)) return parseSkills(parsed);
    } catch {
      return value.split(/[,;|]/).map((skill) => skill.trim()).filter(Boolean);
    }
    return value.split(/[,;|]/).map((skill) => skill.trim()).filter(Boolean);
  }
  return [];
}

function formatPublicJobSalary(job) {
  const salary = String(job.salary ?? '').trim();
  if (salary) return salary;
  const currency = String(job.currency || '').trim();
  const minimum = job.salary_min ?? job.salaryMin;
  const maximum = job.salary_max ?? job.salaryMax;
  if (minimum !== null && minimum !== undefined && minimum !== '') {
    const range = maximum !== null && maximum !== undefined && maximum !== ''
      ? `${minimum} - ${maximum}`
      : String(minimum);
    const period = job.salary_type || job.salary_period || job.salaryType;
    return `${currency ? `${currency} ` : ''}${range}${period ? ` / ${period}` : ''}`.trim();
  }
  return 'በስምምነት (Negotiable)';
}

function formatAfriworkJobMessage(job = {}) {
  const skills = [job.required_skills, job.requiredSkills, job.skills]
    .map(parseSkills)
    .find((parsedSkills) => parsedSkills.length > 0) || [];
  const safeText = (value, maxLength = 300) => {
    const escaped = escapeHtml(String(value ?? '').trim());
    if (escaped.length <= maxLength) return escaped;
    const truncated = escaped.slice(0, maxLength);
    const lastAmpersand = truncated.lastIndexOf('&');
    return lastAmpersand > truncated.lastIndexOf(';')
      ? truncated.slice(0, lastAmpersand)
      : truncated;
  };
  const category = String(job.category || 'Jobs')
    .replace(/[^A-Za-z0-9_]/g, '')
    .slice(0, 50) || 'Jobs';
  const detailsUrl = buildAppUrl({ view: 'miniapp', jobId: job.id });
  const websiteUrl = new URL('/explore-jobs', `${getBaseUrl()}/`);
  websiteUrl.searchParams.set('jobId', String(job.id));
  const location = String(job.location || job.city || '').trim().slice(0, 120);
  const workplaceType = String(job.workplaceType || job.work_mode || job.workMode || job.job_type || '').trim().slice(0, 80);
  const experienceLevel = String(job.experienceLevel || job.experience_level || '').trim().slice(0, 80);
  const minYearsExperience = job.minYearsExperience ?? job.min_experience ?? job.minExperience;
  const hasMinYearsExperience = minYearsExperience !== null
    && minYearsExperience !== undefined
    && String(minYearsExperience).trim() !== '';
  const experienceText = experienceLevel || hasMinYearsExperience
    ? `${experienceLevel}${experienceLevel && hasMinYearsExperience ? ' ' : ''}${hasMinYearsExperience ? `(${minYearsExperience}+ ዓመት ልምድ)` : ''}`
    : 'በስምምነት / ጀማሪም ማመልከት ይችላል';
  const deadline = safeText(job.deadline || job.application_deadline || 'ክፍት እስከሚሆን', 80);
  const description = safeText(job.description || job.full_description || job.shortDescription || 'Not specified', 350);
  const skillsText = skills.length
    ? skills.slice(0, 8).map((skill) => `• ${safeText(skill, 70)}`).join('\n')
    : '• አጠቃላይ የስራ ልምድ እና ክህሎት';
  const text = [
    '🌟 <b>አዲስ ክፍት የሥራ ቦታ! (Job Announcement)</b>',
    '',
    `💼 <b>የሥራ መደብ:</b> ${safeText(job.title || 'Not specified', 160)}`,
    `🏢 <b>ድርጅት:</b> ${safeText(job.company || job.company_name || 'Not specified', 160)}`,
    `📍 <b>ቦታ:</b> ${safeText([location, workplaceType].filter(Boolean).join(' · ') || 'Not specified', 180)}`,
    `💰 <b>ደመወዝ:</b> ${safeText(formatPublicJobSalary(job), 100)}`,
    `⏱ <b>ልምድ:</b> ${safeText(experienceText, 120)}`,
    `⏳ <b>የማመልከቻ ማብቂያ:</b> ${deadline}`,
    '',
    `<b>Description:</b> ${description}`,
    '',
    '🛠 <b>ተፈላጊ ሙያዎች:</b>',
    skillsText,
    '',
    `#${category} #EthiopiaJobs`,
    '🤖 <i>MatchWise AI Job Platform</i>',
  ].join('\n');
  return {
    text,
    botApplyUrl: websiteUrl.toString(),
    miniAppUrl: detailsUrl,
    webAppUrl: detailsUrl,
    websiteUrl: websiteUrl.toString(),
  };
}

function requireBotToken() {
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!botToken) throw new Error('Telegram bot token is not configured.');
  return botToken;
}

function isPubliclyEligibleJob(job = {}, now = new Date()) {
  if (String(job.status || '').trim().toLowerCase() !== 'active') return false;
  if (job.isClosed === true || job.is_closed === true || ['true', '1'].includes(String(job.isClosed ?? job.is_closed ?? '').toLowerCase())) return false;
  if (![true, 1, '1'].includes(job.is_active)) return false;
  if (String(job.approval_status || '').trim().toLowerCase() !== 'approved') return false;
  if (![true, 1, '1'].includes(job.is_approved)) return false;
  const scheduledValue = job.scheduled_date || job.scheduledDate;
  if (scheduledValue && new Date(scheduledValue) > now) return false;

  const deadlineValue = job.broadcast_deadline || job.deadline || job.application_deadline;
  if (!deadlineValue) return true;
  const deadline = new Date(deadlineValue);
  if (Number.isNaN(deadline.getTime())) return false;
  deadline.setHours(23, 59, 59, 999);
  return deadline >= now;
}

function getAdminChatId() {
  return process.env.TELEGRAM_ADMIN_CHAT_ID
    || process.env.TELEGRAM_ADMIN_ID
    || process.env.TELEGRAM_CHAT_ID;
}

function getTelegramBotUsername() {
  return String(process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '');
}

async function sendTelegramMessage(chatId, payload, auditContext = {}) {
  const destination = String(chatId || '').trim();
  if (!destination) throw new Error('Telegram recipient chat ID is not configured.');
  const eventKey = String(auditContext.eventKey || '');
  if (!eventKey || eventKey.length > 120) {
    throw new Error('A valid Telegram idempotency event key is required.');
  }
  const botToken = requireBotToken();
  const text = String(payload?.text || '').trim();
  if (!text) throw new Error('Telegram alert message cannot be empty.');
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Telegram alert exceeds the ${MAX_MESSAGE_LENGTH}-character limit.`);
  }
  const [claim] = await db.execute(
    'INSERT IGNORE INTO dispatched_events (event_key, recipient_id) VALUES (?, ?)',
    [eventKey, destination.slice(0, 50)],
  );
  if (!claim.affectedRows) return { messageId: null, skipped: true, duplicate: true };

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { data } = await axios.post(
        `${TELEGRAM_API_BASE_URL}/bot${botToken}/sendMessage`,
        { ...payload, chat_id: destination },
        { timeout: 10000 },
      );
      if (data?.ok !== true) {
        const error = new Error(data?.description || 'Telegram rejected the notification.');
        error.telegramErrorCode = data?.error_code;
        error.retryAfter = data?.parameters?.retry_after;
        throw error;
      }
      console.log('Telegram API result:', {
        ok: data.ok,
        messageId: data.result?.message_id ?? null,
      });
      return { messageId: data.result?.message_id ?? null };
    } catch (error) {
      lastError = error;
      const responseStatus = Number(error.response?.status);
      const telegramErrorCode = Number(error.telegramErrorCode || error.response?.data?.error_code);
      const isRateLimited = responseStatus === 429 || telegramErrorCode === 429;
      const isRetryableNetworkOrServerError = (!error.response && !error.telegramErrorCode && Boolean(error.code || error.request))
        || responseStatus >= 500
        || ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'].includes(error.code);
      if (attempt === 3 || (!isRateLimited && !isRetryableNetworkOrServerError)) break;

      if (isRateLimited) {
        const retryAfter = Number(
          error.retryAfter
          || error.response?.data?.parameters?.retry_after
          || error.response?.headers?.['retry-after'],
        );
        await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : RETRY_DELAYS_MS[attempt - 1]);
      } else {
        await wait(RETRY_DELAYS_MS[attempt - 1]);
      }
    }
  }

  const errorCode = lastError?.telegramErrorCode
    || lastError?.response?.data?.error_code
    || lastError?.response?.status
    || lastError?.code
    || 'TELEGRAM_SEND_FAILED';
  const safeAuditPayload = JSON.stringify({
    eventType: String(auditContext.eventType || 'telegram_api').slice(0, 60),
    eventKey: eventKey.slice(0, 120),
    hasInlineButton: Boolean(payload.reply_markup?.inline_keyboard),
    text: '[REDACTED]',
  });
  try {
    await db.execute(
      `INSERT INTO notification_failure_logs
        (recipient_id, event_type, error_code, payload)
       VALUES (?, ?, ?, ?)`,
      [destination.slice(0, 50), String(auditContext.eventType || 'telegram_api').slice(0, 60), String(errorCode).slice(0, 60), safeAuditPayload],
    );
  } catch (loggingError) {
    console.error('Telegram delivery failure could not be persisted:', loggingError.message);
  }
  try {
    await db.execute(
      'DELETE FROM dispatched_events WHERE event_key = ? AND recipient_id = ?',
      [eventKey, destination.slice(0, 50)],
    );
  } catch (releaseError) {
    console.error('Telegram retry claim could not be released:', releaseError.message);
  }
  const description = lastError?.response?.data?.description || lastError?.message || 'Telegram notification delivery failed.';
  const safeDescription = String(description).split(botToken).join('[redacted]');
  const failure = new Error(safeDescription);
  failure.telegramErrorCode = errorCode;
  console.error('Telegram sendMessage failed:', {
    timestamp: new Date().toISOString(),
    eventType: auditContext.eventType || 'telegram_api',
    errorCode,
    description: failure.message,
  });
  throw failure;
}

async function sendTelegramWithButton(chatId, message, buttonText, buttonUrl, auditContext = {}, webApp = false) {
  const url = new URL(buttonUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Telegram button URL must use HTTP or HTTPS.');
  }
  return sendTelegramMessage(chatId, {
    text: String(message || '').trim(),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[{
        text: String(buttonText).slice(0, 64),
        ...(webApp ? { web_app: { url: url.toString() } } : { url: url.toString() }),
      }]],
    },
  }, auditContext);
}

async function sendTelegramAlert(message, recipientChatId = process.env.TELEGRAM_CHAT_ID, auditContext = {}) {
  return sendTelegramMessage(recipientChatId, {
    text: String(message || '').trim(),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }, auditContext);
}

async function triggerNewJobBroadcast(job = {}) {
  if (!job.id) throw new Error('A job id is required for an idempotent Telegram broadcast.');
  if (!isPubliclyEligibleJob(job)) return { skipped: true, ineligible: true };
  const channel = String(
    process.env.TELEGRAM_CHANNEL
      || process.env.TELEGRAM_PUBLIC_CHANNEL
      || process.env.TELEGRAM_CHANNEL_ID
      || '@yabsira_tech_jobs',
  ).trim();
  if (!channel) throw new Error('TELEGRAM_PUBLIC_CHANNEL is not configured.');
  let broadcastJob = job;
  const hasJobSkills = [job.required_skills, job.requiredSkills, job.skills]
    .some((value) => parseSkills(value).length > 0);
  if (!hasJobSkills) {
    const [skillRows] = await db.execute(
      'SELECT skill_name FROM job_required_skills WHERE job_id = ? ORDER BY id',
      [job.id],
    );
    broadcastJob = { ...job, required_skills: skillRows.map(({ skill_name }) => skill_name) };
  }
  const broadcast = formatAfriworkJobMessage(broadcastJob);
  const payload = {
    text: broadcast.text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[
        { text: '🔎 የሥራ ዝርዝር', url: broadcast.botApplyUrl },
        { text: '🌐 በድረ-ገጽ ማመልከት', url: broadcast.websiteUrl },
      ]],
    },
  };
  const auditContext = { eventType: 'PUBLIC_JOB_BROADCAST', eventKey: `public-job:${job.id}` };
  let result;
  try {
    result = await sendTelegramMessage(channel, payload, auditContext);
  } catch (primaryError) {
    const fallbackChannel = '-1003946237963';
    if (channel === fallbackChannel) throw primaryError;
    console.error(`Telegram channel ${channel} failed for job ${job.id}; trying the configured numeric fallback.`);
    result = await sendTelegramMessage(fallbackChannel, payload, auditContext);
  }
  if (!result?.skipped) {
    console.log('--> Broadcasted job to Telegram channel @yabsira_tech_jobs');
  }
  return result;
}

async function dispatchPublishedJobNotifications(job = {}) {
  if (!job.id) throw new Error('A job id is required for publication notifications.');
  if (!isPubliclyEligibleJob(job)) {
    return {
      skipped: true,
      message: 'Job is not currently eligible for publication notifications.',
      channel: { sent: false, skipped: true },
      privateAlert: { sent: false, skipped: true },
    };
  }

  const channel = { sent: false };
  try {
    const result = await triggerNewJobBroadcast(job);
    channel.sent = !result?.skipped;
    channel.duplicate = Boolean(result?.duplicate);
    channel.skipped = Boolean(result?.skipped);
  } catch (error) {
    console.error(`Telegram channel broadcast failed for published job ${job.id}:`, error.message);
    channel.message = 'Channel broadcast could not be delivered.';
  }

  const privateAlert = { sent: false };
  const privateChatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!privateChatId) {
    privateAlert.skipped = true;
    privateAlert.message = 'TELEGRAM_CHAT_ID is not configured.';
  } else {
    try {
      const jobUrl = new URL('/explore-jobs', getBaseUrl());
      jobUrl.searchParams.set('jobId', String(job.id));
      const result = await sendTelegramWithButton(
        privateChatId,
        [
          '🆕 <b>Job published</b>',
          `💼 <b>${escapeTelegramHtml(job.title || 'Open role')}</b>`,
          `🏢 ${escapeTelegramHtml(job.company_name || job.company || 'Company')}`,
        ].join('\n'),
        'View job',
        jobUrl.toString(),
        { eventType: 'PRIVATE_JOB_PUBLISHED', eventKey: `private-job-published:${job.id}` },
      );
      privateAlert.sent = !result?.skipped;
      privateAlert.duplicate = Boolean(result?.duplicate);
      privateAlert.skipped = Boolean(result?.skipped);
    } catch (error) {
      console.error(`Private Telegram publication alert failed for job ${job.id}:`, error.message);
      privateAlert.message = 'Private alert could not be delivered.';
    }
  }

  return { channel, privateAlert };
}

async function syncActiveJobsToPublicChannel() {
  const [allJobs] = await db.query(`
    SELECT j.*,
           COALESCE(NULLIF(j.company_name, ''), NULLIF(cp.company_name, ''), u.full_name, 'Company') AS broadcast_company_name,
           j.deadline AS broadcast_deadline
    FROM jobs j
    JOIN users u ON u.id = j.employer_id
    LEFT JOIN (
      SELECT employer_id, MAX(id) AS id
      FROM company_profiles
      GROUP BY employer_id
    ) latest_cp ON latest_cp.employer_id = j.employer_id
    LEFT JOIN company_profiles cp ON cp.id = latest_cp.id
    WHERE j.status = 'active'
      AND j.approval_status = 'approved'
      AND j.is_approved = TRUE
      AND j.is_active = TRUE
      AND (j.deadline IS NULL OR j.deadline >= CURDATE())
      AND (j.scheduled_date IS NULL OR j.scheduled_date <= NOW())
    ORDER BY j.created_at DESC, j.id DESC
  `);
  const uniqueJobs = [...new Map(allJobs.map((job) => [String(job.id), job])).values()];
  const eligibleJobs = uniqueJobs.filter((job) => isPubliclyEligibleJob(job));
  const summary = {
    scanned: uniqueJobs.length,
    eligible: eligibleJobs.length,
    sent: 0,
    alreadySent: 0,
    failed: 0,
    failures: [],
  };

  for (const job of eligibleJobs) {
    try {
      const result = await triggerNewJobBroadcast({
        ...job,
        company_name: job.broadcast_company_name,
        deadline: job.broadcast_deadline,
      });
      if (result?.duplicate || result?.skipped) summary.alreadySent += 1;
      else summary.sent += 1;
    } catch (error) {
      summary.failed += 1;
      summary.failures.push({ jobId: job.id, message: error.message });
    }
  }

  return summary;
}

async function triggerJobSubmissionAlert(job = {}) {
  const { notifyAdminNewJobSubmitted } = require('./telegramNotifier');
  return notifyAdminNewJobSubmitted(job);
}

async function triggerNewApplicantAlert(employerId, candidate = {}, job = {}, matchScore, applicationId = candidate.applicationId || candidate.application_id) {
  const { notifyEmployerNewApplicant } = require('./telegramNotifier');
  return notifyEmployerNewApplicant(employerId, {
    applicationId,
    candidateName: candidate.full_name || candidate.name,
    jobId: job.id || job.jobId,
    jobTitle: job.title,
    company: job.company_name || job.company,
    matchScore,
  });
}

async function triggerStatusChangeAlert(candidateId, candidateName, jobTitle, company, newStatus, applicationId) {
  const { notifyCandidateStatusUpdate } = require('./telegramNotifier');
  return notifyCandidateStatusUpdate(candidateId, {
    applicationId,
    candidateName,
    jobTitle,
    company,
    newStatus,
  });
}

function canonicalTelegramRole(role) {
  const normalized = String(role || '').toLowerCase();
  if (['candidate', 'job_seeker', 'seeker', 'jobseeker', 'user', 'employee'].includes(normalized)) return 'candidate';
  if (['employer', 'recruiter'].includes(normalized)) return 'employer';
  if (['admin', 'super_admin'].includes(normalized)) return 'admin';
  return '';
}

async function linkTelegramChat(tokenHash, chatId, username, expectedUserId = null, expectedRole = '') {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[tokenRow]] = await connection.execute(
      `SELECT user_id FROM telegram_bot_link_tokens
       WHERE token_hash = ? AND expires_at > NOW()
         AND (? IS NULL OR user_id = ?)
       FOR UPDATE`,
      [tokenHash, expectedUserId, expectedUserId],
    );
    if (!tokenRow) {
      await connection.rollback();
      return false;
    }
    if (expectedRole) {
      const [[user]] = await connection.execute('SELECT role FROM users WHERE id = ? LIMIT 1', [tokenRow.user_id]);
      if (canonicalTelegramRole(user?.role) !== expectedRole) {
        await connection.rollback();
        return false;
      }
    }
    const [[alreadyLinked]] = await connection.execute(
      'SELECT id FROM users WHERE telegram_chat_id = ? AND id <> ? LIMIT 1',
      [chatId, tokenRow.user_id],
    );
    if (alreadyLinked) {
      await connection.execute('DELETE FROM telegram_bot_link_tokens WHERE user_id = ?', [tokenRow.user_id]);
      await connection.commit();
      return false;
    }
    await connection.execute(
      `UPDATE users SET telegram_chat_id = ?, telegram_username = ?,
       is_telegram_alerts_active = TRUE, is_alerts_enabled = TRUE WHERE id = ?`,
      [chatId, username || null, tokenRow.user_id],
    );
    await connection.execute(
      `INSERT INTO notification_preferences (user_id, telegram_alerts_enabled)
       VALUES (?, TRUE)
       ON DUPLICATE KEY UPDATE telegram_alerts_enabled = TRUE`,
      [tokenRow.user_id],
    );
    await connection.execute('DELETE FROM telegram_bot_link_tokens WHERE user_id = ?', [tokenRow.user_id]);
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getTelegramOwner(chatId) {
  const configuredOwnerChatId = String(
    process.env.TELEGRAM_SUPER_ADMIN_CHAT_ID
    || process.env.TELEGRAM_ADMIN_CHAT_ID
    || process.env.TELEGRAM_ADMIN_ID
    || '6707730892',
  ).trim();
  if (String(chatId) !== configuredOwnerChatId) return null;

  const ownerEmail = String(
    process.env.TELEGRAM_ADMIN_EMAIL || 'yabsirademeke07@gmail.com',
  ).trim().toLowerCase();
  const [[owner]] = await db.execute(
    `SELECT id, full_name, email, role, is_active
     FROM users WHERE LOWER(email) = ? LIMIT 1`,
    [ownerEmail],
  );
  if (!owner || !owner.is_active) return null;
  if (canonicalTelegramRole(owner.role) !== 'admin') {
    await db.execute('UPDATE users SET role = ? WHERE id = ?', ['admin', owner.id]);
  }
  return { ...owner, role: 'admin' };
}

async function createTelegramAdminSsoLink(userId, action) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await db.execute('DELETE FROM telegram_admin_sso_tokens WHERE expires_at <= NOW()');
  await db.execute(
    `INSERT INTO telegram_admin_sso_tokens (token_hash, user_id, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
    [tokenHash, userId],
  );

  const url = new URL(buildPublicAppUrl({ tab: 'admin', admin_action: action }));
  url.searchParams.set('auth_token', token);
  return url.toString();
}

async function handleTelegramUpdate(update = {}) {
  const message = update.message;
  const text = String(message?.text || '').trim();
  const chatId = message?.chat?.id;
  const ownerCommand = text.match(/^\/(start|admin)(?:@\w+)?(?:\s+.*)?$/i);
  if (chatId && ownerCommand) {
    const owner = await getTelegramOwner(chatId);
    if (owner) {
      const [dashboardUrl, postJobUrl, statsUrl] = await Promise.all([
        createTelegramAdminSsoLink(owner.id, 'dashboard'),
        createTelegramAdminSsoLink(owner.id, 'post-job'),
        createTelegramAdminSsoLink(owner.id, 'application-stats'),
      ]);
      await sendTelegramMessage(chatId, {
        text: '👑 <b>Super Admin</b>\nYour secure admin workspace is ready.',
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Direct Admin Dashboard', url: dashboardUrl }],
            [{ text: '➕ Post & Broadcast Job', url: postJobUrl }],
            [{ text: '📊 Application Stats', url: statsUrl }],
          ],
        },
      }, {
        eventType: 'telegram_admin_sso',
        eventKey: `telegram-admin-sso:${String(update.update_id || `${chatId}-${Date.now()}`).slice(0, 100)}`,
      });
      return true;
    }
    if (/^\/admin(?:@\w+)?(?:\s+.*)?$/i.test(text)) {
      await sendTelegramAlert(
        'Admin access is restricted to the configured platform owner.',
        chatId,
        {
          eventType: 'telegram_admin_access_denied',
          eventKey: `telegram-admin-denied:${String(update.update_id || `${chatId}-${Date.now()}`).slice(0, 100)}`,
        },
      );
      return false;
    }
  }

  const jobStartMatch = text.match(/^\/start(?:@\w+)?\s+job_(\d+)$/);
  if (chatId && jobStartMatch) {
    const jobId = Number(jobStartMatch[1]);
    const [[job]] = await db.execute(
      `SELECT id, title, company_name, location, salary_min, salary_max, currency,
              salary_period, experience_level, description, deadline, approval_status, is_active, status
       FROM jobs
       WHERE id = ? AND status = 'active' AND approval_status = 'approved' AND is_approved = TRUE
         AND is_active = TRUE
         AND (deadline IS NULL OR deadline >= CURDATE())
         AND (scheduled_date IS NULL OR scheduled_date <= NOW())
       LIMIT 1`,
      [jobId],
    );
    const responseText = job
      ? [
        `📨 <b>${escapeTelegramHtml(job.title)}</b>`,
        `🏢 ${escapeTelegramHtml(job.company_name || 'Employer')}`,
        `📍 ${escapeTelegramHtml(job.location || 'Not specified')}`,
        `💰 ${escapeTelegramHtml(formatPublicJobSalary(job))}`,
        'Sign in to your candidate account to submit an application and have it recorded in your application history.',
      ].join('\n')
      : 'This job is no longer accepting applications.';
    await sendTelegramWithButton(
      chatId,
      responseText,
      job ? '🌐 Open job and apply' : '🔎 Browse available jobs',
      buildPublicAppUrl(job ? { tab: 'explore', jobId } : { tab: 'explore' }),
      {
        eventType: 'telegram_job_deep_link',
        eventKey: `job-start:${String(update.update_id || `${chatId}-${jobId}`).slice(0, 100)}`,
      },
      true,
    );
    return Boolean(job);
  }
  const secureStartMatch = text.match(/^\/start(?:@\w+)?\s+auth_(\d+)_(candidate|employer|admin)_([A-Za-z0-9_-]{20,50})$/);
  const legacyStartMatch = text.match(/^\/start(?:@\w+)?\s+link_([A-Za-z0-9_-]{20,50})$/);
  if (!chatId || (!secureStartMatch && !legacyStartMatch)) return false;

  const token = secureStartMatch?.[3] || legacyStartMatch[1];
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const linked = await linkTelegramChat(
    tokenHash,
    chatId,
    message.from?.username || null,
    secureStartMatch?.[1] || null,
    secureStartMatch?.[2] || '',
  );
  const confirmation = linked
    ? '🎉 <b>እንኳን ደስ አለዎት!</b> የቴሌግራም አካውንትዎ ከ MatchWise ጋር ተገናኝቷል! ከአሁን በኋላ የማመልከቻዎ ውጤቶች እና ቃለ-መጠይቆች እዚህ ይደርሱዎታል።'
    : 'This MatchWise link has expired or was already used. Create a new link from your account settings.';
  await sendTelegramAlert(confirmation, chatId, {
    eventType: 'telegram_link_confirmation',
    eventKey: `telegram-link-confirm:${tokenHash.slice(0, 48)}`,
  });
  return linked;
}

async function configureTelegramWebhook() {
  const secret = String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  telegramWebhookConfigured = false;
  if (!secret) return { configured: false, reason: 'TELEGRAM_WEBHOOK_SECRET is not configured.' };
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    throw new Error('TELEGRAM_WEBHOOK_SECRET contains unsupported characters.');
  }
  const botToken = requireBotToken();
  const webhookUrl = new URL('/api/telegram/webhook', getBaseUrl()).toString();
  try {
    const { data } = await axios.post(
      `${TELEGRAM_API_BASE_URL}/bot${botToken}/setWebhook`,
      { url: webhookUrl, secret_token: secret, allowed_updates: ['message'] },
      { timeout: 10000 },
    );
    if (data?.ok !== true) throw new Error('Telegram rejected the webhook configuration.');
    telegramWebhookConfigured = true;
    return { configured: true, url: webhookUrl };
  } catch {
    throw new Error('Telegram webhook registration failed.');
  }
}

function isTelegramWebhookConfigured() {
  return telegramWebhookConfigured;
}

async function triggerDeadlineReminder(employerId, job = {}, applicantCount = 0, topMatchCandidate = null) {
  const { notifyEmployerDeadlineReminder } = require('./telegramNotifier');
  return notifyEmployerDeadlineReminder(employerId, {
    jobId: job.id,
    jobTitle: job.title,
    deadline: job.deadline,
    applicantCount,
    topMatchCandidate,
  });
}

async function sendDeadlineReminders() {
  const [jobs] = await db.execute(`
        SELECT j.id, j.employer_id AS employerId, j.title,
          j.deadline AS deadline,
           COUNT(a.id) AS applicantCount,
           (SELECT candidate.full_name
            FROM applications ranked
            JOIN users candidate ON candidate.id = ranked.job_seeker_id
            WHERE ranked.job_id = j.id
            ORDER BY ranked.ai_match_score DESC, ranked.applied_at ASC
            LIMIT 1) AS topCandidateName,
           (SELECT ranked.ai_match_score
            FROM applications ranked
            WHERE ranked.job_id = j.id
            ORDER BY ranked.ai_match_score DESC, ranked.applied_at ASC
            LIMIT 1) AS topCandidateScore
    FROM jobs j
    JOIN users u ON u.id = j.employer_id
    LEFT JOIN applications a ON a.job_id = j.id
    WHERE j.deadline = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      AND j.status = 'active'
      AND j.approval_status = 'approved'
      AND j.is_approved = TRUE
      AND j.is_active = TRUE
      AND (j.scheduled_date IS NULL OR j.scheduled_date <= NOW())
      AND u.is_telegram_alerts_active = TRUE
      AND u.is_alerts_enabled = TRUE
      AND u.telegram_chat_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM telegram_notification_events telegram_event
        WHERE telegram_event.job_id = j.id
          AND telegram_event.event_type = 'deadline_reminder'
          AND telegram_event.event_date = CURDATE()
      )
    GROUP BY j.id, j.employer_id, j.title, j.deadline
  `);

  let sentCount = 0;
  for (const job of jobs) {
    try {
      const { notifyEmployerDeadlineReminder } = require('./telegramNotifier');
      const notification = await notifyEmployerDeadlineReminder(job.employerId, {
        jobId: job.id,
        jobTitle: job.title,
        deadline: job.deadline,
        applicantCount: Number(job.applicantCount || 0),
        topMatchCandidate: job.topCandidateName
          ? { name: job.topCandidateName, score: job.topCandidateScore }
          : null,
      });
      if (!notification) continue;
      await db.execute(
        `INSERT IGNORE INTO telegram_notification_events (job_id, event_type, event_date)
         VALUES (?, 'deadline_reminder', CURDATE())`,
        [job.id],
      );
      sentCount += 1;
    } catch (error) {
      console.error(`Telegram deadline reminder failed for job ${job.id}:`, error.message);
    }
  }
  return sentCount;
}

async function notifyNewJob(job) {
  return triggerNewJobBroadcast(job);
}

async function notifyHighMatchCandidate({ job = {}, candidate = {}, score, employerId, applicationId = candidate.applicationId || candidate.application_id } = {}) {
  if (!employerId) return null;
  return triggerNewApplicantAlert(employerId, candidate, job, score, applicationId);
}

function getTelegramStatus(user = {}) {
  const botConfigured = Boolean(
    String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
    && getTelegramBotUsername()
    && isTelegramWebhookConfigured(),
  );
  const botUsername = String(process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '');
  return {
    configured: botConfigured,
    botUsername,
    telegramChatId: user.telegram_chat_id || '',
    alertsActive: user.is_alerts_enabled === true
      || Number(user.is_alerts_enabled) === 1,
    personalChatLinked: Boolean(user.telegram_chat_id),
  };
}

module.exports = {
  sendTelegramWithButton,
  sendTelegramAlert,
  triggerNewJobBroadcast,
  dispatchPublishedJobNotifications,
  syncActiveJobsToPublicChannel,
  isPubliclyEligibleJob,
  triggerJobSubmissionAlert,
  triggerNewApplicantAlert,
  triggerStatusChangeAlert,
  handleTelegramUpdate,
  configureTelegramWebhook,
  isTelegramWebhookConfigured,
  getTelegramBotUsername,
  triggerDeadlineReminder,
  sendDeadlineReminders,
  notifyNewJob,
  notifyHighMatchCandidate,
  getTelegramStatus,
  buildAppUrl,
  buildPublicAppUrl,
  formatAfriworkJobMessage,
  formatPublicJobSalary,
};
