const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { buildPublicJobFilters, parsePagination } = require('../models/jobModel');
const { calculateJobMatches } = require('../services/cvAnalysisService');
const { calculateMatchScore } = require('../services/matchScoreService');
const { evaluateCvJobMatch } = require('../services/aiMatchService');
const { createNotification } = require('../services/databaseNotificationService');
const {
  notifyEmployerNewApplicant,
  notifyCandidateMatchingJob,
  notifyCandidateApplicationSubmitted,
} = require('../services/telegramNotifier');

const parseJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};
const parseList = (value) => {
  const parsed = parseJson(value, []);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return Object.values(parsed).flat();
  return [];
};

const buildAiMatchSummary = (evaluation) => {
  const basis = evaluation.provider === 'gemini' ? 'Gemini supplemental evaluation' : 'Evidence-based supplemental evaluation';
  const strengths = evaluation.strengths.length ? `Strengths: ${evaluation.strengths.join('; ')}.` : '';
  const gaps = evaluation.gaps.length ? `Gaps: ${evaluation.gaps.join('; ')}.` : '';
  return `${basis}; deterministic ATS scoring uses skills/experience/title/education weights of 45/30/15/10. ${strengths} ${gaps}`.trim().slice(0, 6000);
};

async function getCandidateProfile(userId) {
  const [[cvRow]] = await db.execute(
    'SELECT ai_extracted_data FROM cvs WHERE user_id = ? AND is_active = TRUE ORDER BY is_primary DESC, upload_date DESC LIMIT 1',
    [userId]
  );
  const [[profileRow]] = await db.execute(
    `SELECT skills, education, education_level, experience_level, headline, parsed_json_payload
     FROM job_seeker_profiles WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  const cv = parseJson(cvRow?.ai_extracted_data, {});
  const profileData = parseJson(profileRow?.parsed_json_payload, {});
  const savedSkills = parseList(profileRow?.skills);
  const cvSkills = parseList(cv.skills);
  const skills = [...new Map([...savedSkills, ...cvSkills].map((skill) => {
    const name = typeof skill === 'string' ? skill : skill?.skill_name || skill?.name || skill?.skill || '';
    return [String(name).trim().toLowerCase(), skill];
  }).filter(([name]) => name)).values()];
  const education = [
    ...parseList(profileRow?.education),
    ...parseList(cv.education),
  ];
  const experience = [
    ...parseList(profileData.experience),
    ...parseList(cv.experience),
  ];
  return {
    cv,
    hasUploadedCv: Boolean(cvRow),
    skills,
    education,
    experience,
    profile: {
      ...profileData,
      headline: profileRow?.headline || profileData.headline || '',
      education_level: profileRow?.education_level || '',
      experience_level: profileRow?.experience_level || '',
      education,
      experience,
    },
  };
}

async function notifyCandidatesMatchingJob(job = {}) {
  if (!job.id) return { notified: 0, skipped: 0 };
  const [candidates] = await db.execute(
    `SELECT u.id, u.telegram_chat_id
     FROM users u
     WHERE u.role IN ('candidate', 'job_seeker', 'seeker', 'jobseeker', 'user', 'employee')
       AND u.telegram_chat_id IS NOT NULL
       AND u.is_telegram_alerts_active = TRUE
       AND u.is_alerts_enabled = TRUE
       AND COALESCE((
         SELECT p.telegram_alerts_enabled AND p.matching_job_recommendations
         FROM notification_preferences p WHERE p.user_id = u.id LIMIT 1
       ), FALSE) = TRUE`,
  );
  const [skillRows] = await db.execute(
    'SELECT skill_name, skill_weight FROM job_required_skills WHERE job_id = ? ORDER BY id',
    [job.id],
  );
  const requiredSkills = skillRows.map((skill) => ({ name: skill.skill_name, weight: skill.skill_weight }));
  let notified = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    try {
      const profile = await getCandidateProfile(candidate.id);
      if (!profile.hasUploadedCv) {
        skipped += 1;
        continue;
      }
      const match = calculateMatchScore(profile, { ...job, requiredSkills });
      if (Number(match.skillsMatchScore) < 80) {
        skipped += 1;
        continue;
      }
      const [existing] = await db.execute(
        'SELECT 1 FROM telegram_candidate_match_events WHERE user_id = ? AND job_id = ? LIMIT 1',
        [candidate.id, job.id],
      );
      if (existing.length) {
        skipped += 1;
        continue;
      }
      const result = await notifyCandidateMatchingJob(candidate.telegram_chat_id, {
        userId: candidate.id,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company_name || job.company || 'Company',
        matchScore: match.overallScore,
        skillsMatchScore: match.skillsMatchScore,
      });
      if (result) {
        await db.execute(
          'INSERT IGNORE INTO telegram_candidate_match_events (user_id, job_id) VALUES (?, ?)',
          [candidate.id, job.id],
        );
        notified += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      console.error(`Telegram matching-job notification failed for candidate ${candidate.id}, job ${job.id}:`, error.message);
    }
  }
  return { notified, skipped };
}

async function getMatchedJobs(req, res) {
  try {
    const profile = await getCandidateProfile(req.user.id);
    const paginated = req.query?.all === 'true';
    const pagination = parsePagination(req.query);
    const filters = buildPublicJobFilters(req.query);
    const from = `FROM jobs j
       JOIN users u ON u.id = j.employer_id
       LEFT JOIN (
         SELECT employer_id, MAX(id) AS id
         FROM company_profiles
         GROUP BY employer_id
       ) latest_cp ON latest_cp.employer_id = j.employer_id
       LEFT JOIN company_profiles cp ON cp.id = latest_cp.id
       WHERE ${filters.where}`;
    let paginationMetadata = null;
    if (paginated) {
      const [[countRow]] = await db.query(
        `SELECT COUNT(DISTINCT j.id) AS total ${from}`,
        filters.params
      );
      const totalJobs = Number(countRow?.total || 0);
      paginationMetadata = {
        currentPage: pagination.page,
        totalPages: Math.ceil(totalJobs / pagination.limit),
        totalJobs,
        hasMore: pagination.page * pagination.limit < totalJobs,
      };
    }
    const [jobs] = await db.query(
      `SELECT j.*,
        CASE WHEN j.deadline < CURRENT_DATE THEN TRUE ELSE FALSE END AS is_expired,
        COALESCE(
         NULLIF(NULLIF(j.company_name, ''), CONCAT(u.full_name, CHAR(39), 's Company')),
         NULLIF(NULLIF(cp.company_name, ''), CONCAT(u.full_name, CHAR(39), 's Company')),
         'Company'
       ) AS company_name
       ${from}
       ORDER BY j.created_at DESC, j.id DESC
       ${paginated ? 'LIMIT ? OFFSET ?' : ''}`,
      paginated
        ? [...filters.params, pagination.limit, pagination.offset]
        : filters.params
    );
    const [saved] = await db.query('SELECT job_id FROM saved_jobs WHERE user_id = ?', [req.user.id]);
    const savedIds = new Set(saved.map((item) => String(item.job_id)));
    const [applied] = await db.query('SELECT job_id FROM applications WHERE job_seeker_id = ?', [req.user.id]);
    const appliedIds = new Set(applied.map((item) => String(item.job_id)));
    const jobIds = jobs.map((job) => job.id);
    const skillsByJob = new Map();
    if (jobIds.length) {
      const [requiredSkills] = await db.query('SELECT job_id, skill_name, skill_weight FROM job_required_skills WHERE job_id IN (?) ORDER BY id', [jobIds]);
      requiredSkills.forEach((skill) => {
        const skills = skillsByJob.get(skill.job_id) || [];
        skills.push({ name: skill.skill_name, weight: skill.skill_weight });
        skillsByJob.set(skill.job_id, skills);
      });
      jobs.forEach((job) => {
        if (skillsByJob.has(job.id)) return;
        const legacySkills = String(job.required_skills || '').split(/[,;|]/).map((skill) => skill.trim()).filter(Boolean);
        skillsByJob.set(job.id, legacySkills.map((name) => ({ name, weight: 1 })));
      });
    }
    const scoredJobs = calculateJobMatches(profile.cv, jobs.map((job) => ({
      ...job,
      additional_required_skills: skillsByJob.get(job.id) || [],
    })));
    const matches = scoredJobs.map((job, index) => ({
      ...job,
      matchScore: profile.hasUploadedCv ? job.match_score : null,
      matchedSkills: job.matched_skills,
      missingSkills: job.missing_skills,
      requiredSkills: job.required_skills,
      isSaved: savedIds.has(String(job.id)),
      isApplied: appliedIds.has(String(job.id)),
      workSetup: job.work_mode,
      salary: job.is_salary_negotiable
        ? 'Negotiable'
        : job.salary_min || job.salary_max
          ? `${job.currency || 'ETB'} ${job.salary_min || ''}${job.salary_min && job.salary_max ? ' - ' : ''}${job.salary_max || ''}`
          : 'Compensation disclosed upon application',
      rationale: profile.hasUploadedCv && job.match_score !== null
        ? `${job.matched_skills.length} of ${job.required_skills.length} listed required skills match your uploaded CV.`
        : 'Upload a CV and add required skills to this job to calculate a match.',
      rank: (paginationMetadata ? pagination.offset : 0) + index + 1,
    }));
    return res.json({
      success: true,
      jobs: paginated ? matches : matches.slice(0, 3),
      ...(paginationMetadata ? { pagination: paginationMetadata } : {}),
    });
  } catch (error) {
    console.error('Matched jobs query failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to calculate matched jobs.' });
  }
}

async function getSeekerNotifications(req, res) {
  try {
    const userId = req.user.id;
    const [notifications] = await db.execute(
      `SELECT n.id, n.type, n.title, n.message, n.action_url, n.related_job_id,
              n.related_application_id, n.reference_id, n.related_user_id,
              n.is_read, n.created_at,
              COALESCE(NULLIF(j.company_name, ''), NULLIF(cp.company_name, '')) AS companyName,
              sender.full_name AS senderName,
              (SELECT m.conversation_id FROM messages m
               WHERE m.id = n.reference_id AND UPPER(n.type) = 'MESSAGE' LIMIT 1) AS relatedConversationId
       FROM notifications n
       LEFT JOIN jobs j ON j.id = n.related_job_id
       LEFT JOIN users sender ON sender.id = n.related_user_id
       LEFT JOIN company_profiles cp ON cp.employer_id = COALESCE(j.employer_id, n.related_user_id)
       WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 20`,
      [userId]
    );
    const [[unread]] = await db.execute(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return res.json({ success: true, notifications, unreadCount: Number(unread?.count || 0) });
  } catch (error) {
    console.error('Seeker notifications lookup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load notifications.' });
  }
}

async function changeSeekerPassword(req, res) {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
  }
  if (newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72 || !/\d/.test(newPassword) || !/[^A-Za-z0-9\s]/.test(newPassword)) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters and include a number and symbol.' });
  }

  try {
    const [[user]] = await db.execute('SELECT password FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (!user?.password) {
      return res.status(400).json({ success: false, message: 'This account does not have a password. Use the account recovery flow to set one.' });
    }
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ success: false, message: 'Choose a new password that is different from your current password.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [passwordHash, req.user.id]);
    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Seeker password update failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update your password.' });
  }
}

async function markSeekerNotificationRead(req, res) {
  try {
    const [existing] = await db.execute(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ? LIMIT 1',
      [req.params.notificationId, req.user.id]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Notification not found.' });
    await db.execute(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
      [req.params.notificationId, req.user.id]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Mark seeker notification read failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update notification.' });
  }
}

async function getSeekerUnreadMessageCount(req, res) {
  try {
    const [[row]] = await db.execute(
      `SELECT COUNT(*) AS count
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE c.job_seeker_id = ? AND m.receiver_id = ? AND m.sender_id <> ? AND m.is_read = FALSE`,
      [req.user.id, req.user.id, req.user.id]
    );
    return res.json({ success: true, unreadCount: Number(row?.count || 0) });
  } catch (error) {
    console.error('Seeker unread messages lookup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load unread messages.' });
  }
}

async function getSeekerConversations(req, res) {
  try {
    const [conversations] = await db.execute(
      `SELECT c.id AS conversationId, c.employer_id AS employerId,
              employer.full_name AS employerName,
              COALESCE(NULLIF(j.company_name, ''), employer.full_name, 'Employer') AS companyName,
              j.title AS jobTitle,
              (SELECT m.message_text FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS lastMessage,
              COALESCE(c.last_message_at, c.updated_at, c.created_at) AS lastMessageTime,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.receiver_id = ? AND m.is_read = FALSE) AS unreadCount
       FROM conversations c
       JOIN users employer ON employer.id = c.employer_id
       LEFT JOIN jobs j ON j.id = c.job_id
       WHERE c.job_seeker_id = ? AND c.status <> 'archived'
       ORDER BY lastMessageTime DESC`,
      [req.user.id, req.user.id],
    );
    return res.json({ success: true, conversations });
  } catch (error) {
    console.error('Seeker conversations lookup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load conversations.' });
  }
}

async function getSeekerConversation(req, res) {
  try {
    const [[conversation]] = await db.execute(
      `SELECT c.id AS conversationId, c.employer_id AS employerId,
              employer.full_name AS employerName,
              COALESCE(NULLIF(j.company_name, ''), employer.full_name, 'Employer') AS companyName,
              j.title AS jobTitle
       FROM conversations c
       JOIN users employer ON employer.id = c.employer_id
       LEFT JOIN jobs j ON j.id = c.job_id
       WHERE c.id = ? AND c.job_seeker_id = ? AND c.status <> 'archived'
       LIMIT 1`,
      [req.params.conversationId, req.user.id],
    );
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found.' });

    const [messages] = await db.execute(
      `SELECT id, conversation_id AS conversationId, sender_id AS senderId,
              receiver_id AS receiverId, message_text AS text, is_read AS isRead,
              created_at AS createdAt
       FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conversation.conversationId],
    );
    await db.execute(
      'UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE conversation_id = ? AND receiver_id = ?',
      [conversation.conversationId, req.user.id],
    );
    return res.json({ success: true, conversation, messages });
  } catch (error) {
    console.error('Seeker conversation lookup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load conversation.' });
  }
}

async function sendSeekerMessage(req, res) {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ success: false, message: 'Please enter a message.' });
  if (message.length > 5000) return res.status(400).json({ success: false, message: 'Message is too large.' });

  try {
    const [[conversation]] = await db.execute(
      `SELECT id, employer_id AS employerId FROM conversations
       WHERE id = ? AND job_seeker_id = ? AND status <> 'archived' LIMIT 1`,
      [req.params.conversationId, req.user.id],
    );
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found.' });

    const [result] = await db.execute(
      `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text, is_read)
       VALUES (?, ?, ?, ?, FALSE)`,
      [conversation.id, req.user.id, conversation.employerId, message],
    );
    await db.execute(
      'UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ? AND job_seeker_id = ?',
      [conversation.id, req.user.id],
    );
    await createNotification({
      userId: conversation.employerId,
      type: 'MESSAGE',
      title: 'New Message',
      message: 'You received a new message from a candidate.',
      referenceType: 'MESSAGE',
      referenceId: result.insertId,
      relatedUserId: req.user.id,
    });
    const [[saved]] = await db.execute(
      `SELECT id, conversation_id AS conversationId, sender_id AS senderId,
              receiver_id AS receiverId, message_text AS text, is_read AS isRead,
              created_at AS createdAt
       FROM messages WHERE id = ?`,
      [result.insertId],
    );
    return res.status(201).json({ success: true, message: saved });
  } catch (error) {
    console.error('Seeker message send failed:', error.message);
    return res.status(500).json({ success: false, message: 'Message could not be sent.' });
  }
}

async function createApplication(req, res) {
  const { jobId, coverLetter = '' } = req.body || {};
  const numericJobId = Number(jobId);
  if (!Number.isSafeInteger(numericJobId) || numericJobId <= 0) {
    return res.status(400).json({ success: false, message: 'A valid jobId is required.' });
  }
  console.info('Application submission received:', {
    jobId: numericJobId,
    candidateId: req.user.id,
    suppliedJobDetails: Boolean(req.body?.jobTitle || req.body?.company),
  });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[job]] = await connection.query(
      `SELECT j.*,
              COALESCE(NULLIF(j.company_name, ''), NULLIF(cp.company_name, '')) AS company_name
       FROM jobs j
       LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id
       WHERE j.id = ?
         AND j.status = 'active'
         AND j.approval_status = 'approved'
         AND j.is_approved = TRUE
         AND j.is_active = TRUE
         AND (j.deadline IS NULL OR j.deadline >= CURDATE())
         AND (j.scheduled_date IS NULL OR j.scheduled_date <= NOW())
       LIMIT 1`,
      [numericJobId],
    );
    if (!job) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'This job is no longer available.' });
    }
    console.info('Applying to job:', {
      jobId: Number(job.id),
      candidateId: req.user.id,
      jobTitle: job.title,
      company: job.company_name || null,
    });
    const [[existing]] = await connection.query('SELECT id FROM applications WHERE job_id = ? AND job_seeker_id = ? LIMIT 1', [numericJobId, req.user.id]);
    if (existing) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'You have already applied for this job.', applicationId: existing.id });
    }
    const [[cv]] = await connection.query('SELECT id, file_name, file_url, parsed_text, ai_extracted_data FROM cvs WHERE user_id = ? AND is_active = TRUE ORDER BY is_primary DESC, upload_date DESC LIMIT 1', [req.user.id]);
    if (!cv?.id) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Upload your CV before submitting an application.' });
    }
    const [[candidate]] = await connection.query(
      `SELECT u.full_name, u.email, u.phone, jsp.headline, jsp.education_level, jsp.education, jsp.skills,
              jsp.experience_level, jsp.parsed_json_payload
       FROM users u LEFT JOIN job_seeker_profiles jsp ON jsp.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [req.user.id]
    );
    const extractedData = parseJson(cv?.ai_extracted_data, {});
    const candidateTitle = candidate?.headline || extractedData.professional_title || '';
    const parsedCandidateProfile = parseJson(candidate?.parsed_json_payload, {});
    const candidateSkillsValue = [
      ...parseList(candidate?.skills),
      ...parseList(extractedData.skills),
    ];
    const candidateEducationValue = [
      ...parseList(candidate?.education),
      ...parseList(extractedData.education),
    ];
    const candidateExperience = [
      ...parseList(parsedCandidateProfile.experience),
      ...parseList(extractedData.experience),
    ];
    const uniqueBySkillName = (skills) => [...new Map(skills.map((skill) => {
      const name = typeof skill === 'string' ? skill : skill?.skill_name || skill?.name || skill?.skill || '';
      return [String(name).trim().toLowerCase(), skill];
    }).filter(([name]) => name)).values()];
    const candidateSkills = uniqueBySkillName(candidateSkillsValue);
    const candidateEducation = candidateEducationValue;
    const candidateSnapshot = {
      name: candidate?.full_name || '',
      email: candidate?.email || '',
      phone: candidate?.phone || '',
      headline: candidateTitle,
      educationLevel: candidate?.education_level || '',
      education: candidateEducation,
      skills: candidateSkills,
      experienceLevel: candidate?.experience_level || '',
      experience: candidateExperience,
    };
    const snapshot = {
      cvId: cv?.id || null,
      fileName: cv?.file_name || null,
      fileUrl: cv?.file_url || null,
      extractedData,
      candidate: candidateSnapshot,
    };
    const [requiredSkills] = await connection.query('SELECT skill_name, skill_weight FROM job_required_skills WHERE job_id = ? ORDER BY id', [numericJobId]);
    const normalizedRequiredSkills = requiredSkills.length
      ? requiredSkills.map((skill) => ({ name: skill.skill_name, weight: skill.skill_weight }))
      : String(job.required_skills || '').split(/[,;|]/).map((name) => ({ name: name.trim(), weight: 1 })).filter((skill) => skill.name);
    const localMatch = calculateMatchScore({
      cv: extractedData,
      title: candidateTitle,
      skills: candidateSkills,
      education: candidateEducation,
      experience: candidateExperience,
      profile: {
        education_level: candidate?.education_level,
        experience_level: candidate?.experience_level,
        education: candidateEducation,
        experience: candidateExperience,
      },
    }, { ...job, requiredSkills: normalizedRequiredSkills });
    const aiInput = {
      cvText: cv?.parsed_text || extractedData.rawText || '',
      candidate: {
        fullName: candidate?.full_name || '',
        headline: candidateTitle,
        skills: candidateSkills,
        education: candidateEducation,
        educationLevel: candidate?.education_level || '',
        experience: candidateExperience,
        experienceLevel: candidate?.experience_level || '',
      },
      job: {
        title: job.title,
        category: job.category,
        description: job.description,
        requiredSkills: normalizedRequiredSkills.map((skill) => skill.name),
        required_education: job.education_qualification,
        experience_level: job.experience_level,
      },
      localMatch,
    };
    let aiEvaluation = await evaluateCvJobMatch({ ...aiInput, useGemini: false });
    const mergeAiEvaluation = (evaluation) => ({
      ...localMatch,
      domainMatchScore: evaluation.domain,
      softSkillsMatchScore: evaluation.softSkills,
      breakdown: {
        ...localMatch.breakdown,
        domain: evaluation.domain,
        softSkills: evaluation.softSkills,
      },
      strengths: evaluation.strengths,
      gaps: evaluation.gaps,
      provider: evaluation.provider,
    });
    let match = mergeAiEvaluation(aiEvaluation);
    const requiredSkillNames = match.evidence.skills.requirements;
    snapshot.matchedSkills = match.matchedSkills;
    snapshot.missingSkills = match.missingSkills;
    snapshot.atsEvaluation = match;
    snapshot.aiMatch = aiEvaluation;
    snapshot.job = {
      id: Number(job.id),
      title: job.title,
      company: job.company_name || '',
      location: job.location || '',
      description: job.description || '',
      job_type: job.job_type || '',
      work_mode: job.work_mode || '',
      required_skills: requiredSkillNames,
      required_education: job.education_qualification || '',
      experience_level: job.experience_level || '',
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      currency: job.currency || 'ETB',
    };
    const [result] = await connection.query(
      `INSERT INTO applications (
         job_id, job_seeker_id, candidate_id, employer_id, cv_id, status, resume_snapshot,
         ai_match_score, skills_match_score, experience_match_score, title_match_score,
         domain_match_score, education_match_score, soft_skills_match_score,
         location_match_score, ai_match_summary, ai_strengths, ai_missing_skills,
         evaluated_at, seeker_cover_letter, applied_at
       ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NOW(), ?, NOW())`,
      [
        numericJobId,
        req.user.id,
        req.user.id,
        job.employer_id,
        cv?.id || null,
        JSON.stringify(snapshot),
        match.overallScore,
        match.skillsMatchScore,
        match.experienceMatchScore,
        match.titleMatchScore,
        match.domainMatchScore,
        match.educationMatchScore,
        match.softSkillsMatchScore,
        buildAiMatchSummary(aiEvaluation),
        JSON.stringify(aiEvaluation.strengths),
        JSON.stringify(aiEvaluation.gaps),
        String(coverLetter || ''),
      ]
    );
    await connection.query(
      `INSERT INTO application_timeline_events (application_id, stage_name, status_note)
       VALUES (?, 'Applied', 'Application submitted.')`,
      [result.insertId]
    );
    await connection.query('UPDATE jobs SET application_count = application_count + 1 WHERE id = ?', [numericJobId]);
    await createNotification({
      executor: connection,
      userId: req.user.id,
      type: 'APPLICATION',
      title: 'Application submitted',
      message: `Your application for ${job.title} was submitted successfully.`,
      referenceType: 'APPLICATION',
      referenceId: result.insertId,
      jobId: numericJobId,
      applicationId: result.insertId,
      actionUrl: '/applications',
    });
    await createNotification({
      executor: connection,
      userId: job.employer_id,
      type: 'NEW_APPLICATION',
      title: 'New Application',
      message: `${candidate.full_name} applied for ${job.title}.`,
      referenceType: 'APPLICATION',
      referenceId: result.insertId,
      jobId: numericJobId,
      applicationId: result.insertId,
      relatedUserId: req.user.id,
      actionUrl: '/employer/dashboard?view=applications',
    });
    try {
      await connection.query(`
        INSERT INTO user_activity_log
          (user_id, activity_type, description, details, related_job_id, ip_address, user_agent)
        VALUES (?, 'job-apply', ?, ?, ?, ?, ?)
      `, [req.user.id, `Applied for ${job.title}`.slice(0, 255), JSON.stringify({ recordId: result.insertId, applicationId: result.insertId, relatedJobId: numericJobId, oldValues: null, newValues: { status: 'pending' }, ipAddress: req.ip, userAgent: req.get('user-agent') }), numericJobId, req.ip, req.get('user-agent')]);
    } catch (auditError) {
      console.warn('Application audit log skipped:', auditError.message);
    }
    await connection.commit();
    const geminiConsent = req.body?.consentToAiProcessing === true;
    if (geminiConsent) {
      const aiResult = await evaluateCvJobMatch({ ...aiInput, useGemini: true });
      aiEvaluation = aiResult;
      if (aiResult.provider === 'gemini') {
        try {
          aiEvaluation = aiResult;
          match = mergeAiEvaluation(aiEvaluation);
          snapshot.atsEvaluation = match;
          snapshot.aiMatch = aiEvaluation;
          await db.execute(
            `UPDATE applications
             SET ai_match_summary = ?, ai_strengths = ?, ai_missing_skills = ?,
                 resume_snapshot = ?, evaluated_at = NOW()
             WHERE id = ?`,
            [
              buildAiMatchSummary(aiEvaluation),
              JSON.stringify(aiEvaluation.strengths),
              JSON.stringify(aiEvaluation.gaps),
              JSON.stringify(snapshot),
              result.insertId,
            ],
          );
        } catch (persistenceError) {
          console.error('Gemini match could not be stored; retaining the evidence-based score:', persistenceError.message);
          aiEvaluation = await evaluateCvJobMatch({ ...aiInput, useGemini: false });
          match = mergeAiEvaluation(aiEvaluation);
          snapshot.atsEvaluation = match;
          snapshot.aiMatch = aiEvaluation;
        }
      }
    }
    let telegramNotification = { sent: false, message: 'Telegram notification was not delivered.' };
    if (job.employer_id) {
      try {
        const telegramResult = await notifyEmployerNewApplicant(job.employer_id, {
          applicationId: result.insertId,
          candidateId: req.user.id,
          candidateName: candidate.full_name,
          jobId: numericJobId,
          jobTitle: job.title,
          company: job.company_name || 'Company',
          matchScore: match.overallScore,
        });
        telegramNotification = {
          sent: Boolean(telegramResult?.delivered),
          message: telegramResult?.delivered
            ? 'Application alert sent on Telegram.'
            : 'Telegram application alert was not delivered.',
        };
      } catch (notificationError) {
        console.error('Unable to send Telegram alert for new application:', notificationError.message);
        telegramNotification = {
          sent: false,
          message: `Application submitted, but the employer Telegram alert could not be delivered: ${notificationError.message}`,
        };
      }
    }
    try {
      await notifyCandidateApplicationSubmitted(req.user.id, {
        applicationId: result.insertId,
        jobId: numericJobId,
        jobTitle: job.title,
        company: job.company_name || 'Company',
      });
    } catch (notificationError) {
      console.error('Unable to send Telegram confirmation for application:', notificationError.message);
    }
    return res.status(201).json({
      success: true,
      telegramSent: telegramNotification.sent,
      telegramNotification,
      aiMatch: {
        provider: aiEvaluation.provider,
        score: match.overallScore,
        breakdown: match.breakdown,
        strengths: aiEvaluation.strengths,
        gaps: aiEvaluation.gaps,
        weights: match.evidence.weights,
        ...(aiEvaluation.warning ? { warning: aiEvaluation.warning } : {}),
      },
      application: {
        id: result.insertId,
        jobId: numericJobId,
        seekerId: req.user.id,
        appliedAt: new Date().toISOString(),
        status: 'pending',
        hasCv: Boolean(cv?.id),
        resumeSnapshot: snapshot,
        matchScore: match.overallScore,
        overallScore: match.overallScore,
        matchBreakdown: match.breakdown,
        skillsMatchScore: match.skillsMatchScore,
        experienceMatchScore: match.experienceMatchScore,
        titleMatchScore: match.titleMatchScore,
        educationMatchScore: match.educationMatchScore,
        domainMatchScore: match.domainMatchScore,
        softSkillsMatchScore: match.softSkillsMatchScore,
        atsEvaluation: match,
        coverLetter: String(coverLetter || ''),
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Application creation failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to submit application.' });
  } finally { connection.release(); }
}

async function getApplicationMatchScore(req, res) {
  try {
    const [[job]] = await db.query("SELECT j.*, COALESCE(NULLIF(NULLIF(j.company_name, ''), CONCAT(u.full_name, CHAR(39), 's Company')), NULLIF(NULLIF(cp.company_name, ''), CONCAT(u.full_name, CHAR(39), 's Company')), 'Company') AS company_name FROM jobs j JOIN users u ON u.id = j.employer_id LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id WHERE j.id = ? AND j.status = 'active' AND j.approval_status = 'approved' AND j.is_approved = TRUE AND j.is_active = TRUE AND (j.deadline IS NULL OR j.deadline >= CURDATE()) AND (j.scheduled_date IS NULL OR j.scheduled_date <= NOW()) LIMIT 1", [req.params.jobId]);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    const profile = await getCandidateProfile(req.user.id);
    const [requiredSkills] = await db.query('SELECT skill_name, skill_weight FROM job_required_skills WHERE job_id = ? ORDER BY id', [req.params.jobId]);
    const result = calculateMatchScore(profile, { ...job, requiredSkills: requiredSkills.length ? requiredSkills.map((skill) => ({ name: skill.skill_name, weight: skill.skill_weight })) : job.required_skills });
    return res.json({
      success: true,
      skillsMatchScore: result.skillsMatchScore,
      experienceMatchScore: result.experienceMatchScore,
      titleMatchScore: result.titleMatchScore,
      educationMatchScore: result.educationMatchScore,
      overallScore: result.overallScore,
      score: result.overallScore,
      breakdown: result.breakdown,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      evidence: result.evidence,
      job,
    });
  } catch (error) {
    console.error('Application match score failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to calculate match score.' });
  }
}

async function saveJob(req, res) {
  const { jobId } = req.body || {};
  if (!jobId) return res.status(400).json({ success: false, message: 'jobId is required.' });
  try {
    const [result] = await db.query('INSERT IGNORE INTO saved_jobs (user_id, job_id) VALUES (?, ?)', [req.user.id, jobId]);
    return res.status(201).json({ success: true, saved: true, id: result.insertId || null });
  } catch (error) { return res.status(500).json({ success: false, message: 'Unable to save job.' }); }
}

async function unsaveJob(req, res) {
  try {
    await db.query('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?', [req.user.id, req.params.jobId]);
    return res.json({ success: true, saved: false });
  } catch (error) { return res.status(500).json({ success: false, message: 'Unable to remove saved job.' }); }
}

async function getSavedJobs(req, res) {
  try {
    const [jobs] = await db.query(
      `SELECT j.*, COALESCE(
         NULLIF(NULLIF(j.company_name, ''), CONCAT(u.full_name, CHAR(39), 's Company')),
         NULLIF(NULLIF(cp.company_name, ''), CONCAT(u.full_name, CHAR(39), 's Company')),
         'Company'
       ) AS company_name,
              s.saved_at
       FROM saved_jobs s
       JOIN jobs j ON j.id = s.job_id
       JOIN users u ON u.id = j.employer_id
       LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id
       WHERE s.user_id = ?
       ORDER BY s.saved_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, jobs });
  } catch (error) {
    console.error('Saved jobs lookup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load saved jobs.' });
  }
}

async function withdrawApplication(req, res) {
  try {
    const [result] = await db.query(
      "UPDATE applications SET status = 'withdrawn' WHERE id = ? AND job_seeker_id = ? AND LOWER(status) NOT IN ('hired', 'rejected', 'withdrawn')",
      [req.params.applicationId, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Application not found or cannot be withdrawn.' });
    await db.query(
      `INSERT INTO application_timeline_events (application_id, stage_name, status_note)
       VALUES (?, 'Withdrawn', 'Application withdrawn by candidate.')`,
      [req.params.applicationId]
    );
    return res.json({ success: true, message: 'Application withdrawn.', status: 'withdrawn' });
  } catch (error) {
    console.error('Application withdrawal failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to withdraw application.' });
  }
}

module.exports = {
  notifyCandidatesMatchingJob,
  getMatchedJobs,
  getSeekerNotifications,
  changeSeekerPassword,
  markSeekerNotificationRead,
  getSeekerUnreadMessageCount,
  getSeekerConversations,
  getSeekerConversation,
  sendSeekerMessage,
  createApplication,
  getApplicationMatchScore,
  saveJob,
  unsaveJob,
  getSavedJobs,
  withdrawApplication,
};
