const { randomUUID } = require('node:crypto');
const db = require('../config/db');
const { buildAppUrl, sendTelegramAlert, sendTelegramWithButton } = require('./telegramService');

const candidateRoles = new Set(['candidate', 'job_seeker', 'seeker', 'jobseeker', 'user', 'employee']);
const employerRoles = new Set(['employer', 'recruiter']);
const preferenceByEvent = {
  SEEKER_APPLICATION_SUBMITTED: ['seeker', 'application_updates'],
  SEEKER_STATUS_CHANGED: ['seeker', 'application_updates'],
  SEEKER_INTERVIEW_SCHEDULED: ['seeker', 'interview_reminders'],
  SEEKER_RECOMMENDED_JOBS: ['seeker', 'matching_job_recommendations'],
  SEEKER_NEW_MESSAGE: ['seeker', 'chat_messages'],
  EMPLOYER_NEW_APPLICATION: ['employer', 'application_updates'],
  EMPLOYER_INTERVIEW_RESPONSE: ['employer', 'interview_reminders'],
  EMPLOYER_NEW_MESSAGE: ['employer', 'chat_messages'],
  EMPLOYER_JOB_STATUS_CHANGE: ['employer', 'application_updates'],
  EMPLOYER_DEADLINE_REMINDER: ['employer', 'application_updates'],
};

function escapeHtml(value) {
  const dates = [];
  let sanitized = String(value ?? '').replace(
    /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?\b/g,
    (date) => {
      dates.push(date);
      return `__SAFE_DATE_${dates.length - 1}__`;
    },
  );
  sanitized = sanitized
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted]')
    .replace(/\b\d{8,}\b/g, '[redacted]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[redacted]')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  dates.forEach((date, index) => {
    sanitized = sanitized.replace(`__SAFE_DATE_${index}__`, date);
  });
  return sanitized;
}

function firstName(value) {
  return String(value || '').trim().split(/\s+/)[0] || 'Candidate';
}

function eventKeyFor(eventType, data) {
  if (data.eventKey) return String(data.eventKey);
  const applicationId = data.applicationId;
  const messageId = data.messageId;
  const userId = data.userId;
  const jobId = data.jobId;
  const reportId = data.reportId;
  const date = data.statDate || data.deadline || data.eventDate;
  switch (eventType) {
    case 'SEEKER_APPLICATION_SUBMITTED':
    case 'EMPLOYER_NEW_APPLICATION':
      return applicationId ? `${eventType.toLowerCase()}:${applicationId}` : '';
    case 'SEEKER_STATUS_CHANGED':
      return applicationId ? `${eventType.toLowerCase()}:${applicationId}:${data.newStatus || data.status || 'updated'}` : '';
    case 'SEEKER_INTERVIEW_SCHEDULED':
      return applicationId ? `${eventType.toLowerCase()}:${applicationId}:${data.interviewDate || 'scheduled'}` : '';
    case 'SEEKER_RECOMMENDED_JOBS':
      return userId && jobId ? `${eventType.toLowerCase()}:${userId}:${jobId}` : '';
    case 'SEEKER_NEW_MESSAGE':
    case 'EMPLOYER_NEW_MESSAGE':
      return messageId ? `${eventType.toLowerCase()}:${messageId}` : '';
    case 'EMPLOYER_INTERVIEW_RESPONSE':
      return applicationId ? `${eventType.toLowerCase()}:${applicationId}:${data.responseVerdict || 'responded'}` : '';
    case 'EMPLOYER_JOB_STATUS_CHANGE':
      return jobId ? `${eventType.toLowerCase()}:${jobId}:${data.status || 'updated'}` : '';
    case 'EMPLOYER_DEADLINE_REMINDER':
      return jobId && date ? `${eventType.toLowerCase()}:${jobId}:${date}` : '';
    case 'ADMIN_NEW_REGISTRATION':
      return userId ? `${eventType.toLowerCase()}:${userId}` : '';
    case 'ADMIN_PENDING_APPROVAL':
      return jobId ? `${eventType.toLowerCase()}:${jobId}` : '';
    case 'ADMIN_REPORT_COMPLAINT':
      return reportId ? `${eventType.toLowerCase()}:${reportId}` : '';
    case 'ADMIN_DAILY_SUMMARY':
      return date ? `${eventType.toLowerCase()}:${date}` : '';
    default:
      return '';
  }
}

function appPath(pathname, parameters = {}) {
  const url = new URL(buildAppUrl());
  url.pathname = pathname;
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function numericScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
}

function eventContent(eventType, data = {}) {
  const safe = (value) => {
    const escaped = escapeHtml(value ?? '');
    if (escaped.length <= 350) return escaped;
    return `${escaped.slice(0, 350).replace(/&(?:[A-Za-z0-9#]+)?$/, '')}…`;
  };
  const join = (lines) => lines.join('\n');
  const events = {
    SEEKER_APPLICATION_SUBMITTED: {
      title: 'Application submitted',
      buttonText: '📄 ማመልከቻዬን እይ',
      buttonUrl: appPath('/', { tab: 'applications', jobId: data.jobId }),
      message: join([
        '✅ <b>ማመልከቻዎ በተሳካ ሁኔታ ገብቷል!</b>',
        `ለ <b>${safe(data.jobTitle || 'Open role')}</b> (${safe(data.company || 'Company')}) ያቀረቡት ማመልከቻ ደርሷል። ሁኔታውን በዳሽቦርድዎ ይከታተሉ።`,
      ]),
    },
    SEEKER_STATUS_CHANGED: {
      title: 'Application status changed',
      buttonText: '📋 ማመልከቻዎን በድረ-ገጹ ይመልከቱ (View Application)',
      buttonUrl: appPath('/my-applications'),
      message: join([
        '🎉 <b>የማመልከቻዎ ሁኔታ ተቀይሯል!</b>',
        `ሰላም <b>${safe(firstName(data.candidateName))}</b>፣`,
        `ለ <b>${safe(data.jobTitle || 'Open role')}</b> (${safe(data.company || data.companyName || 'Company')}) ያቀረቡት ማመልከቻ ወደ <b>${safe(data.newStatus || data.status || 'Updated')}</b> ተሸጋግሯል!`,
      ]),
    },
    SEEKER_INTERVIEW_SCHEDULED: {
      title: 'Interview scheduled',
      buttonText: '🎯 ቀጠሮውን አረጋግጥ / Confirm',
      buttonUrl: appPath('/', { tab: 'applications' }),
      message: join([
        '🗓️ <b>የቃለ-መጠይቅ (Interview) ቀጠሮ ተይዞልዎታል!</b>',
        `ድርጅት: <b>${safe(data.company || 'Company')}</b> | ስራ: <b>${safe(data.jobTitle || 'Open role')}</b>`,
        `⏰ ቀንና ሰዓት: <b>${safe(data.interviewDate || 'To be confirmed')}</b>`,
        `📍 የቃለ-መጠይቅ አይነት: ${safe(['video', 'phone', 'in-person'].includes(String(data.interviewType || '').toLowerCase()) ? data.interviewType : 'Details in your account')}`,
      ]),
    },
    SEEKER_RECOMMENDED_JOBS: {
      title: 'Recommended job match',
      buttonText: '⚡ አሁኑኑ አፕላይ አድርግ',
      buttonUrl: appPath(`/jobs/${encodeURIComponent(data.jobId || '')}`),
      message: join([
        '🔥 <b>ከሙያዎ ጋር የሚስማማ አዲስ ስራ ወጥቷል!</b>',
        `💼 <b>${safe(data.jobTitle || 'Open role')}</b> (${safe(data.company || 'Company')})`,
        `📊 የ AI Match ውጤት: <b>${safe(data.matchScore ?? 0)}%</b>`,
      ]),
    },
    SEEKER_NEW_MESSAGE: {
      title: 'New employer message',
      buttonText: '💬 መልስ ስጥ / Reply',
      buttonUrl: appPath('/', { tab: 'seeker' }),
      message: join([
        '💬 <b>ከአሰሪው አዲስ መልእክት ደርሶዎታል!</b>',
        `ላኪ: <b>${safe(data.company || 'Employer')}</b>`,
      ]),
    },
    EMPLOYER_NEW_APPLICATION: {
      title: 'New applicant',
      buttonText: '👥 እጩዎችን ይገምግሙ (Review Applicants)',
      buttonUrl: appPath('/employer/dashboard', {
        view: 'applications',
        jobId: data.jobId,
      }),
      message: join([
        '📬 <b>አዲስ አመልካች ደርሶዎታል!</b>',
        `👤 እጩ: <b>${safe(firstName(data.candidateName))}</b>`,
        `🎯 ስራ: <b>${safe(data.jobTitle || 'Open role')}</b>`,
        `🔥 AI Match ውጤት: <b>${data.matchScore === undefined || data.matchScore === null || data.matchScore === 'N/A' ? 'N/A' : `${safe(data.matchScore)}%`} (${safe(data.matchGrade || 'Matched')})</b>`,
      ]),
    },
    EMPLOYER_INTERVIEW_RESPONSE: {
      title: 'Candidate interview response',
      buttonText: '📋 የቀጠሮ ዝርዝር',
      buttonUrl: appPath('/employer/dashboard', { view: 'interviews' }),
      message: join([
        '🗓️ <b>የእጩው የቃለ-መጠይቅ ምላሽ:</b>',
        `እጩ <b>${safe(firstName(data.candidateName))}</b> ለ <b>${safe(data.jobTitle || 'Open role')}</b> የተያዘውን ቃለ-መጠይቅ <b>${safe(data.responseVerdict || 'responded')}</b> አድርጓል።`,
      ]),
    },
    EMPLOYER_NEW_MESSAGE: {
      title: 'New candidate message',
      buttonText: '💬 መልእክቱን ክፈት',
      buttonUrl: appPath('/employer/messages', { conversationId: data.threadId }),
      message: `💬 <b>ከእጩው ${safe(firstName(data.candidateName))} አዲስ መልእክት አለዎት።</b>`,
    },
    EMPLOYER_JOB_STATUS_CHANGE: {
      title: 'Job status changed',
      buttonText: '💼 ስራዎችን አስተዳድር',
      buttonUrl: appPath('/employer/jobs'),
      message: join([
        '📌 <b>የስራ ማስታወቂያዎ ሁኔታ:</b>',
        `የለጠፉት <b>${safe(data.jobTitle || 'Open role')}</b> ስራ <b>${safe(data.status || 'updated')}</b> ሆኗል።`,
      ]),
    },
    EMPLOYER_DEADLINE_REMINDER: {
      title: 'Job deadline reminder',
      buttonText: '🏆 Top AI Matches ይመልከቱ',
      buttonUrl: appPath('/employer/dashboard', { view: 'applications', job_id: data.jobId }),
      message: join([
        '⏰ <b>Job deadline reminder — 24 hours left</b>',
        `💼 <b>Job:</b> ${safe(data.jobTitle || 'Open role')}`,
        `📅 <b>Deadline:</b> ${safe(data.deadline || 'Tomorrow')}`,
        `👥 <b>Applicants:</b> ${safe(data.applicantCount ?? 0)}`,
        `🏆 <b>Top AI match:</b> ${safe(data.topCandidate ? `${firstName(data.topCandidate)}${data.topCandidateScore === undefined ? '' : ` (${safe(data.topCandidateScore)}%)`}` : 'No ranked candidates yet')}`,
      ]),
    },
    ADMIN_NEW_REGISTRATION: {
      title: 'New registration',
      message: '👤 <b>አዲስ አሰሪ ተመዝግቧል!</b>',
    },
    ADMIN_PENDING_APPROVAL: {
      title: 'Job awaiting approval',
      buttonText: '🔍 ገምግም እና አጽድቅ',
      buttonUrl: appPath('/', { tab: 'admin' }),
      message: join([
        '🛡️ <b>ማጽደቅ የሚፈልግ አዲስ ስራ:</b>',
        `ስራ: <b>${safe(data.jobTitle || 'Open role')}</b> (${safe(data.company || 'Company')})`,
      ]),
    },
    ADMIN_REPORT_COMPLAINT: {
      title: 'New report or complaint',
      buttonText: '⚠️ አጣራ / Investigate',
      buttonUrl: appPath('/', { tab: 'admin' }),
      message: `🚨 <b>አዲስ ሪፖርት / ቅሬታ ቀርቧል!</b> ዓይነት: ${safe(data.reportType || 'report')}.`,
    },
    ADMIN_CRITICAL_SYSTEM_ERROR: {
      title: 'Critical system alert',
      message: `💥 <b>CRITICAL SYSTEM ALERT:</b> A system error occurred at ${safe(data.timestamp || new Date().toISOString())}. Review the authenticated server logs.`,
    },
    ADMIN_DAILY_SUMMARY: {
      title: 'Daily recruitment summary',
      buttonText: '📈 Admin Dashboard',
      buttonUrl: appPath('/', { tab: 'admin' }),
      message: join([
        '📊 <b>MatchWise ዕለታዊ የሲስተም ሪፖርት</b>',
        `• አዳዲስ ተጠቃሚዎች: ${safe(data.newUsers ?? 0)}`,
        `• አዳዲስ ስራዎች: ${safe(data.newJobs ?? 0)}`,
        `• የተደረጉ ማመልከቻዎች: ${safe(data.totalApplications ?? 0)}`,
        `• የተቀጠሩ እጩዎች: ${safe(data.hiredCount ?? 0)}`,
      ]),
    },
  };
  return events[eventType] || null;
}

async function sendTelegramEvent(chatId, eventType, data = {}, buttonUrl = null, { adminFallback = false } = {}) {
  const config = eventContent(eventType, data);
  if (!config) throw new Error(`Unsupported Telegram event type: ${eventType}`);
  const destination = String(chatId || '').trim();
  if (!destination) throw new Error(`Telegram recipient is not configured for ${eventType}.`);
  const baseEventKey = eventKeyFor(eventType, data);
  if (!baseEventKey || baseEventKey.length > 120) {
    throw new Error(`A valid idempotency event key is required for ${eventType}.`);
  }
  const eventKey = adminFallback ? `${baseEventKey.slice(0, 100)}:admin-fallback` : baseEventKey;
  if (!eventKey || eventKey.length > 120) {
    throw new Error(`A valid idempotency event key is required for ${eventType}.`);
  }

  const preference = preferenceByEvent[eventType];
  let role = adminFallback ? 'admin' : preference?.[0] || 'admin';
  let userId = null;
  if (preference && !adminFallback) {
    const [expectedRole, preferenceColumn] = preference;
    const [[recipient]] = await db.execute(
      `SELECT u.id, u.role, u.is_telegram_alerts_active, u.is_alerts_enabled,
              COALESCE(p.telegram_alerts_enabled, TRUE) AS telegram_alerts_enabled,
              COALESCE(p.${preferenceColumn}, ${preferenceColumn === 'matching_job_recommendations' ? 'FALSE' : 'TRUE'}) AS event_enabled
       FROM users u
       LEFT JOIN notification_preferences p ON p.user_id = u.id
       WHERE u.telegram_chat_id = ? LIMIT 1`,
      [destination],
    );
    userId = recipient?.id || null;
    const roles = expectedRole === 'seeker' ? candidateRoles : employerRoles;
    const enabled = recipient
      && roles.has(String(recipient.role || '').toLowerCase())
      && Boolean(recipient.telegram_chat_id)
      && Number(recipient.is_alerts_enabled) === 1
      && Number(recipient.is_telegram_alerts_active) !== 0
      && Number(recipient.telegram_alerts_enabled) !== 0
      && Number(recipient.event_enabled) !== 0;
    if (!enabled) {
      await db.execute(
        `INSERT INTO notification_logs
          (recipient_role, recipient_chat_id, event_type, title, delivered)
         VALUES (?, ?, ?, ?, FALSE)`,
        [role, destination.slice(0, 50), eventType, config.title.slice(0, 150)],
      );
      return { delivered: false, skipped: true, messageId: null };
    }
  }

  let delivered = false;
  try {
    const message = `${adminFallback ? '[ 🔔 Admin notification copy ]\n' : ''}${String(config.message || '').trim()}`;
    if (!message) throw new Error(`Telegram event ${eventType} produced an empty message.`);
    if (message.length > 4096) throw new Error(`Telegram event ${eventType} exceeds the 4096-character limit.`);
    let targetUrl = null;
    if (config.buttonText) {
      const appOrigin = new URL(buildAppUrl());
      targetUrl = new URL(buttonUrl || config.buttonUrl, appOrigin);
      if (targetUrl.origin !== appOrigin.origin) {
        throw new Error('Telegram event button URL must use the configured application origin.');
      }
    }
    const result = config.buttonText
      ? await sendTelegramWithButton(destination, message, config.buttonText, targetUrl.toString(), { eventType, eventKey })
      : await sendTelegramAlert(message, destination, { eventType, eventKey });
    if (result.skipped) {
      return { delivered: false, skipped: true, duplicate: true, messageId: null };
    }
    delivered = true;
    if (eventType === 'SEEKER_STATUS_CHANGED') {
      console.log('[Status Update Response]:', {
        ok: true,
        messageId: result.messageId ?? null,
      });
    }
    return { ...result, delivered: true, skipped: false };
  } finally {
    try {
      await db.execute(
        `INSERT INTO notification_logs
          (recipient_role, recipient_chat_id, event_type, title, delivered)
         VALUES (?, ?, ?, ?, ?)`,
        [role, destination.slice(0, 50), eventType, config.title.slice(0, 150), delivered],
      );
    } catch (loggingError) {
      console.error(`Telegram notification audit log failed for ${eventType}:`, loggingError.message);
    }
    if (userId && !delivered) console.error(`Telegram event ${eventType} failed for user ${userId}.`);
  }
}

async function notifyCandidateStatusUpdate(candidateId, data = {}, fallbackChatId) {
  const eventKey = data.eventKey || `seeker-status:${data.applicationId || 'unknown'}:${randomUUID()}`;
  return sendCandidateEvent(
    candidateId,
    'SEEKER_STATUS_CHANGED',
    { ...data, eventKey },
    fallbackChatId,
  );
}

async function notifyCandidateApplicationSubmitted(candidateId, data = {}) {
  return sendCandidateEvent(candidateId, 'SEEKER_APPLICATION_SUBMITTED', data);
}

async function notifyCandidateInterviewScheduled(candidateChatId, data = {}) {
  return sendTelegramEvent(candidateChatId, 'SEEKER_INTERVIEW_SCHEDULED', data);
}

async function notifyCandidateNewMessage(candidateChatId, data = {}) {
  return sendTelegramEvent(candidateChatId, 'SEEKER_NEW_MESSAGE', data);
}

async function notifyCandidateMatchingJob(candidateChatId, data = {}) {
  const score = numericScore(data.matchScore ?? data.score);
  const skillsScore = numericScore(data.skillsMatchScore ?? score);
  if (score === null || skillsScore === null || skillsScore < 80) return null;
  return sendTelegramEvent(candidateChatId, 'SEEKER_RECOMMENDED_JOBS', { ...data, matchScore: score });
}

async function notifyEmployerNewApplicant(employerId, data = {}) {
  const score = numericScore(data.matchScore ?? data.score);
  const matchGrade = data.matchGrade || (score === null ? 'Not scored' : score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Fair');
  return sendEmployerEvent(employerId, 'EMPLOYER_NEW_APPLICATION', {
    ...data,
    matchScore: score === null ? 'N/A' : score,
    matchGrade,
  });
}

async function notifyEmployerInterviewResponse(employerId, data = {}) {
  return sendEmployerEvent(employerId, 'EMPLOYER_INTERVIEW_RESPONSE', data);
}

async function notifyEmployerNewMessage(employerId, data = {}) {
  return sendEmployerEvent(employerId, 'EMPLOYER_NEW_MESSAGE', data);
}

async function notifyEmployerJobStatusChange(employerId, data = {}) {
  return sendEmployerEvent(employerId, 'EMPLOYER_JOB_STATUS_CHANGE', data);
}

async function notifyEmployerDeadlineReminder(employerId, data = {}) {
  const score = numericScore(data.topMatchCandidate?.score);
  const topCandidate = data.topMatchCandidate
    ? `${firstName(data.topMatchCandidate.name || data.topMatchCandidate.full_name || 'Candidate')}${score === null ? '' : ` (${score}%)`}`
    : 'No ranked candidates yet';
  return sendEmployerEvent(employerId, 'EMPLOYER_DEADLINE_REMINDER', {
    ...data,
    jobTitle: data.jobTitle || data.title,
    topCandidate,
    topCandidateScore: score,
  });
}

async function sendAdminFallbackEvent(eventType, data, targetChatId = getAdminPrivateChatId()) {
  const buttonUrl = eventType === 'SEEKER_STATUS_CHANGED'
    ? appPath('/my-applications')
    : buildAppUrl({ tab: 'admin' });
  return sendTelegramEvent(targetChatId, eventType, data, buttonUrl, { adminFallback: true });
}

function getAdminPrivateChatId() {
  const adminChatId = String(
    process.env.TELEGRAM_CHAT_ID
      || process.env.TELEGRAM_ADMIN_CHAT_ID
      || process.env.TELEGRAM_ADMIN_ID
      || '6707730892',
  ).trim();
  if (!/^\d{1,20}$/.test(adminChatId) || Number(adminChatId) <= 0) {
    throw new Error('TELEGRAM_CHAT_ID or TELEGRAM_ADMIN_CHAT_ID must be configured as the Bot Owner private chat ID.');
  }
  return adminChatId;
}

function isValidChatId(chatId) {
  const value = String(chatId || '').trim();
  return /^-?\d{1,20}$/.test(value) && Number(value) !== 0;
}

async function sendCandidateEvent(candidateId, eventType, data, fallbackChatId) {
  const numericCandidateId = Number(candidateId);
  if (!Number.isSafeInteger(numericCandidateId) || numericCandidateId < 1) {
    throw new Error('A valid candidate user ID is required for Telegram delivery.');
  }
  const [[candidate]] = await db.execute(
    `SELECT telegram_chat_id FROM users
     WHERE id = ? AND LOWER(role) IN ('candidate', 'job_seeker', 'seeker', 'jobseeker', 'user', 'employee')
     LIMIT 1`,
    [numericCandidateId],
  );
  const candidateChatId = isValidChatId(candidate?.telegram_chat_id)
    ? String(candidate.telegram_chat_id).trim()
    : null;
  const configuredFallbackChatId = isValidChatId(fallbackChatId)
    ? String(fallbackChatId).trim()
    : getAdminPrivateChatId();
  const targetChatId = candidateChatId || configuredFallbackChatId;
  if (candidateChatId) {
    try {
      const result = await sendTelegramEvent(candidateChatId, eventType, data);
      if (result?.delivered || result?.duplicate || eventType !== 'SEEKER_STATUS_CHANGED') return result;
      console.warn(`Candidate Telegram alert was skipped; sending ${eventType} to the admin fallback chat.`);
    } catch (error) {
      if (eventType !== 'SEEKER_STATUS_CHANGED') throw error;
      console.error(`Candidate Telegram alert failed; sending ${eventType} to the admin fallback chat:`, error.message);
    }
  } else if (eventType !== 'SEEKER_STATUS_CHANGED') {
    return sendAdminFallbackEvent(eventType, data, targetChatId);
  }
  const fallbackResult = await sendAdminFallbackEvent(eventType, data, targetChatId);
  return { ...fallbackResult, fallback: true };
}

async function sendEmployerEvent(employerId, eventType, data) {
  const numericEmployerId = Number(employerId);
  if (!Number.isSafeInteger(numericEmployerId) || numericEmployerId < 1) {
    throw new Error('A valid employer user ID is required for Telegram delivery.');
  }
  const [[employer]] = await db.execute(
    `SELECT telegram_chat_id FROM users
     WHERE id = ? AND LOWER(role) IN ('employer', 'recruiter')
       AND telegram_chat_id IS NOT NULL
     LIMIT 1`,
    [numericEmployerId],
  );
  if (isValidChatId(employer?.telegram_chat_id)) return sendTelegramEvent(employer.telegram_chat_id, eventType, data);
  return sendAdminFallbackEvent(eventType, data);
}

async function notifyAdminNewJobSubmitted(data = {}) {
  const chatId = getAdminPrivateChatId();
  return sendTelegramEvent(chatId, 'ADMIN_PENDING_APPROVAL', {
    ...data,
    jobTitle: data.jobTitle || data.title,
    company: data.company || data.company_name,
    jobId: data.jobId || data.id,
  });
}

async function notifyAdminEvent(eventType, data = {}) {
  const chatId = getAdminPrivateChatId();
  return sendTelegramEvent(chatId, eventType, data);
}

async function notifyAdminDailyStats(data = {}) {
  const chatId = getAdminPrivateChatId();
  let stats = data;
  if (data.newUsers === undefined || data.newJobs === undefined
      || data.totalApplications === undefined || data.hiredCount === undefined) {
    const [rows] = await db.execute(`
      SELECT
        CURDATE() AS statDate,
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()) AS newUsers,
        (SELECT COUNT(*) FROM jobs WHERE DATE(created_at) = CURDATE()) AS newJobs,
        (SELECT COUNT(*) FROM applications WHERE DATE(applied_at) = CURDATE()) AS totalApplications,
        (SELECT COUNT(*) FROM applications WHERE LOWER(status) = 'hired') AS hiredCount
    `);
    stats = { ...data, ...(rows[0] || {}) };
  } else if (!stats.statDate) {
    const [[clock]] = await db.execute('SELECT CURDATE() AS statDate');
    stats = { ...stats, statDate: clock.statDate };
  }
  return sendTelegramEvent(chatId, 'ADMIN_DAILY_SUMMARY', stats);
}

async function sendDailyAdminStatsOnce() {
  const [[clock]] = await db.execute('SELECT CURDATE() AS statDate, HOUR(NOW()) AS currentHour');
  const reportHour = Number.parseInt(process.env.TELEGRAM_DAILY_STATS_HOUR || '8', 10);
  if (!Number.isInteger(reportHour) || reportHour < 0 || reportHour > 23) {
    throw new Error('TELEGRAM_DAILY_STATS_HOUR must be an hour from 0 through 23.');
  }
  if (Number(clock.currentHour) < reportHour) return false;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT IGNORE INTO telegram_admin_daily_stats (stat_date, status, locked_at)
       VALUES (CURDATE(), 'sending', NOW())`,
    );
    const [[claim]] = await connection.execute(
      `SELECT status, locked_at <= DATE_SUB(NOW(), INTERVAL 10 MINUTE) AS is_stale
       FROM telegram_admin_daily_stats WHERE stat_date = CURDATE() FOR UPDATE`,
    );
    if (claim.status === 'sent' || (claim.status === 'sending' && !Number(claim.is_stale))) {
      await connection.commit();
      return false;
    }
    await connection.execute(
      `UPDATE telegram_admin_daily_stats SET status = 'sending', locked_at = NOW()
       WHERE stat_date = CURDATE()`,
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  try {
    await notifyAdminDailyStats();
    await db.execute(
      `UPDATE telegram_admin_daily_stats SET status = 'sent', sent_at = NOW()
       WHERE stat_date = CURDATE()`,
    );
    return true;
  } catch (error) {
    await db.execute(
      `UPDATE telegram_admin_daily_stats SET status = 'failed',
       locked_at = DATE_SUB(NOW(), INTERVAL 11 MINUTE)
       WHERE stat_date = CURDATE()`,
    );
    throw error;
  }
}

module.exports = {
  notifyCandidateStatusUpdate,
  notifyCandidateApplicationSubmitted,
  notifyCandidateInterviewScheduled,
  notifyCandidateNewMessage,
  notifyCandidateMatchingJob,
  notifyEmployerNewApplicant,
  notifyEmployerInterviewResponse,
  notifyEmployerNewMessage,
  notifyEmployerJobStatusChange,
  notifyEmployerDeadlineReminder,
  notifyAdminEvent,
  notifyAdminNewJobSubmitted,
  notifyAdminDailyStats,
  sendDailyAdminStatsOnce,
  sendTelegramEvent,
};
