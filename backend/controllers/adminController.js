const db = require('../connection');
const fs = require('node:fs/promises');
const { normalizeJobStatus } = require('../models/jobModel');
const { createNotification } = require('../services/databaseNotificationService');
const { sendJobRejectionEmail } = require('../services/notificationService');

const safeExecute = async (query, params = [], fallback = []) => {
  try {
    return await db.execute(query, params);
  } catch (error) {
    console.warn('Admin optional query skipped:', error.message);
    return [fallback, []];
  }
};

const jobEmployerLegalFields = `
  COALESCE(
    (SELECT NULLIF(cp.tin_number, '') FROM company_profiles cp WHERE cp.employer_id = j.employer_id LIMIT 1),
    (SELECT COALESCE(NULLIF(e.tin_number, ''), NULLIF(e.tinNumber, '')) FROM employers e WHERE e.user_id = j.employer_id OR e.userId = j.employer_id LIMIT 1)
  ) AS employer_tin_number,
  COALESCE(
    (SELECT COALESCE(NULLIF(cp.company_registration_number, ''), NULLIF(cp.trade_license_number, '')) FROM company_profiles cp WHERE cp.employer_id = j.employer_id LIMIT 1),
    (SELECT COALESCE(NULLIF(e.trade_license_document, ''), NULLIF(e.licenseDocumentUrl, '')) FROM employers e WHERE e.user_id = j.employer_id OR e.userId = j.employer_id LIMIT 1)
  ) AS employer_trade_license_number,
  COALESCE(
    (SELECT NULLIF(cp.trade_license_url, '') FROM company_profiles cp WHERE cp.employer_id = j.employer_id LIMIT 1),
    (SELECT COALESCE(NULLIF(e.licenseDocumentUrl, ''), NULLIF(e.trade_license_document, '')) FROM employers e WHERE e.user_id = j.employer_id OR e.userId = j.employer_id LIMIT 1)
  ) AS employer_trade_license_url,
  COALESCE(
    (SELECT cp.verification_status FROM company_profiles cp WHERE cp.employer_id = j.employer_id LIMIT 1),
    (SELECT COALESCE(e.verification_status, e.verificationStatus) FROM employers e WHERE e.user_id = j.employer_id OR e.userId = j.employer_id LIMIT 1)
  ) AS employer_verification_status
`;

const hasEmployerLegalDocuments = (job) =>
  Boolean(String(job?.employer_tin_number || '').trim() && (
    String(job?.employer_trade_license_number || '').trim() ||
    String(job?.employer_trade_license_url || '').trim()
  ));

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return String(value || '').toLowerCase() === 'true' || value === 1;
};

const createJobModerationNotifications = async (executor, { employerId, jobId, jobTitle, status, reason }) => {
  const rejected = status === 'rejected';
  const title = rejected ? 'Job listing needs changes' : 'Job approved';
  const message = rejected
    ? `Your job listing '${jobTitle}' was rejected: ${reason}`
    : `Your job listing '${jobTitle}' has been approved and is now live.`;
  try {
    await executor.execute(
      `INSERT INTO notifications
        (user_id, type, title, message, reference_type, reference_id, related_job_id, action_url)
       VALUES (?, 'JOB_STATUS', ?, ?, 'JOB_STATUS', ?, ?, ?)`,
      [employerId, title, message, jobId, jobId, '/employer/jobs']
    );
  } catch (error) {
    console.warn('Generic employer notification skipped:', error.message);
  }
  try {
    await executor.execute(
      'INSERT INTO employer_notifications (employerId, title, body, isRead, related_job_id) VALUES (?, ?, ?, FALSE, ?)',
      [employerId, title, message, jobId]
    );
  } catch (error) {
    console.warn('Employer notification skipped:', error.message);
  }
  return { rejected, title, message };
};

const createJobSeekerOpportunityNotifications = async (executor, { jobId, jobTitle, companyName, location }) => {
  const message = `${jobTitle} was just posted by ${companyName || 'a company'} in ${location || 'a location not specified'}.`;
  try {
    await executor.execute(
      `INSERT INTO notifications
        (user_id, type, title, message, reference_type, reference_id, related_job_id, action_url)
       SELECT id, 'JOB_STATUS', '💼 New Job Opportunity', ?, 'JOB', ?, ?, ?
       FROM users WHERE role = 'job_seeker'`,
      [message, jobId, jobId, `/jobs/${jobId}`]
    );
  } catch (error) {
    console.warn('Job seeker opportunity notifications skipped:', error.message);
  }
};

const sendJobRejectionEmailSafely = async (job, reason) => {
  try {
    await sendJobRejectionEmail({ toEmail: job.employer_email, jobTitle: job.title, reason });
  } catch (error) {
    console.warn('Job rejection email skipped:', error.message);
  }
};

exports.getAdminDashboardStats = async (req, res) => {
  const emptyStats = { totalUsers: 0, jobSeekersCount: 0, employersCount: 0, activeJobs: 0, avgMatchScore: 0, candidateGrowthPercent: 0, newJobsThisWeek: 0, moderationQueueCount: 0, pipeline: { pending: 0, shortlisted: 0, interviewing: 0, hired: 0, rejected: 0 } };
  try {
    const [[users], [seekers], [employers], [jobs], [verification], [reports], [average], [pipeline], [candidateGrowth], [newJobs]] = await Promise.all([
      db.execute('SELECT COUNT(*) AS count FROM users'),
      db.execute("SELECT COUNT(*) AS count FROM users WHERE role IN ('job_seeker', 'employee', 'seeker')"),
      db.execute("SELECT COUNT(*) AS count FROM users WHERE role IN ('employer', 'company', 'recruiter')"),
      db.execute("SELECT COUNT(*) AS count FROM jobs WHERE LOWER(status) IN ('active', 'published')"),
      db.execute("SELECT COUNT(*) AS count FROM company_profiles WHERE verification_status = 'pending'"),
      db.execute("SELECT COUNT(*) AS count FROM reports WHERE status = 'pending'"),
      db.execute('SELECT AVG(ai_match_score) AS score FROM applications WHERE ai_match_score IS NOT NULL'),
      db.execute("SELECT status, COUNT(*) AS count FROM applications GROUP BY status"),
      db.execute(`SELECT
        SUM(CASE WHEN created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END) AS current_month,
        SUM(CASE WHEN created_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
          AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END) AS previous_month
        FROM users WHERE role IN ('job_seeker', 'employee', 'seeker')`),
      db.execute('SELECT COUNT(*) AS count FROM jobs WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)'),
    ]);
    const pipelineStats = { pending: 0, shortlisted: 0, interviewing: 0, hired: 0, rejected: 0 };
    pipeline.forEach((row) => { const key = row.status === 'interview-scheduled' ? 'interviewing' : row.status; if (key in pipelineStats) pipelineStats[key] = Number(row.count || 0); });
    const [pendingJobs] = await db.execute("SELECT COUNT(*) AS count FROM jobs WHERE LOWER(status) IN ('pending', 'pending_approval', 'draft')");
    const currentMonthCandidates = Number(candidateGrowth[0]?.current_month || 0);
    const previousMonthCandidates = Number(candidateGrowth[0]?.previous_month || 0);
    const candidateGrowthPercent = previousMonthCandidates
      ? Math.round(((currentMonthCandidates - previousMonthCandidates) / previousMonthCandidates) * 100)
      : currentMonthCandidates ? 100 : 0;
    return res.status(200).json({ success: true, stats: { totalUsers: Number(users[0]?.count || 0), jobSeekersCount: Number(seekers[0]?.count || 0), employersCount: Number(employers[0]?.count || 0), activeJobs: Number(jobs[0]?.count || 0), avgMatchScore: average[0]?.score == null ? 0 : Number(Number(average[0].score).toFixed(1)), candidateGrowthPercent, newJobsThisWeek: Number(newJobs[0]?.count || 0), moderationQueueCount: Number(verification[0]?.count || 0) + Number(pendingJobs[0]?.count || 0) + Number(reports[0]?.count || 0), pipeline: pipelineStats } });
  } catch (error) {
    console.error('Dashboard stats error:', error.message);
    return res.status(200).json({ success: true, stats: emptyStats, databaseError: true });
  }
};

exports.getPlatformAnalytics = async (req, res) => {
  try {
    const [seekerCount] = await db.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'job_seeker'");
    const [employerCount] = await db.execute("SELECT COUNT(*) AS total, SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) AS verified FROM company_profiles");
    const [activeJobsCount] = await db.execute("SELECT COUNT(*) AS count FROM jobs WHERE LOWER(status) IN ('active', 'published')");
    const [totalAppsCount] = await db.execute("SELECT COUNT(*) AS count, AVG(ai_match_score) AS avg_score FROM applications");

    return res.status(200).json({
      success: true,
      data: {
        seekersCount: Number(seekerCount[0]?.count || 0),
        employersTotal: Number(employerCount[0]?.total || 0),
        employersVerified: Number(employerCount[0]?.verified || 0),
        activeJobsCount: Number(activeJobsCount[0]?.count || 0),
        totalApplications: Number(totalAppsCount[0]?.count || 0),
        avgMatchScore: totalAppsCount[0]?.avg_score ? Number(parseFloat(totalAppsCount[0].avg_score).toFixed(1)) : 0,
        topMatchedSkill: 'No skill data yet',
        placementVelocity: 'No placement data yet',
      },
    });
  } catch (error) {
    console.error('Admin Analytics Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve platform analytics.' });
  }
};

exports.getPendingCompanies = async (req, res) => {
  try {
    const [companies] = await db.execute(`
      SELECT
        COALESCE(cp.id, e.id, he.id) AS id,
        cp.id AS company_profile_id,
        u.id AS employer_id,
        COALESCE(cp.company_name, e.company_name, e.companyName, he.household_name, u.full_name) AS company_name,
        COALESCE(cp.representative_name, e.representative_name, he.full_name, u.full_name) AS rep_name,
        u.email AS rep_email,
        COALESCE(cp.phone, e.phone_number, e.phoneNumber, he.phone_number, u.phone) AS rep_phone,
        COALESCE(cp.industry, e.industry, he.industry) AS industry,
        COALESCE(cp.location, e.location, e.headquarters_location, he.residence_location) AS location,
        COALESCE(cp.verification_status, e.verification_status, e.verificationStatus, 'pending') AS verification_status,
        COALESCE(cp.is_verified, 0) AS is_verified,
        COALESCE(cp.created_at, e.created_at, he.created_at, u.created_at) AS created_at
      FROM users u
      LEFT JOIN company_profiles cp ON cp.employer_id = u.id
      LEFT JOIN employers e ON e.user_id = u.id OR e.userId = u.id
      LEFT JOIN household_employers he ON he.user_id = u.id
      WHERE u.role IN ('employer', 'company', 'recruiter')
      ORDER BY created_at DESC
    `);
    return res.json({ success: true, companies });
  } catch (error) {
    console.error('Admin Companies Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve companies.' });
  }
};

exports.updateVerificationStatus = async (req, res) => {
  const { id } = req.params;
  const status = req.body?.status;
  if (!['verified', 'rejected'].includes(status)) {
    return res.status(422).json({ success: false, message: 'Verification status must be verified or rejected.' });
  }

  try {
    if (status === 'verified') {
      const [companyRows] = await db.execute(`
        SELECT cp.employer_type,
               COALESCE(NULLIF(cp.tin_number, ''), NULLIF(e.tin_number, ''), NULLIF(e.tinNumber, '')) AS tin_number,
               COALESCE(NULLIF(cp.company_registration_number, ''), NULLIF(cp.trade_license_number, ''), NULLIF(e.trade_license_document, ''), NULLIF(e.licenseDocumentUrl, '')) AS trade_license_number,
               COALESCE(NULLIF(cp.trade_license_url, ''), NULLIF(e.licenseDocumentUrl, ''), NULLIF(e.trade_license_document, '')) AS trade_license_url
        FROM company_profiles cp
        LEFT JOIN employers e ON e.user_id = cp.employer_id OR e.userId = cp.employer_id
        WHERE cp.id = ? OR cp.employer_id = ?
        LIMIT 1`,
      [id, id]);
      let profile = companyRows[0];
      if (!profile) {
        const [legacyRows] = await db.execute(`
          SELECT employer_type,
                 COALESCE(NULLIF(tin_number, ''), NULLIF(tinNumber, '')) AS tin_number,
                 COALESCE(NULLIF(trade_license_document, ''), NULLIF(licenseDocumentUrl, '')) AS trade_license_number,
                 COALESCE(NULLIF(licenseDocumentUrl, ''), NULLIF(trade_license_document, '')) AS trade_license_url
          FROM employers WHERE id = ? OR user_id = ? OR userId = ? LIMIT 1`,
        [id, id, id]);
        profile = legacyRows[0];
      }
      if (profile && String(profile.employer_type || 'company').toLowerCase() !== 'individual' &&
          (!profile.tin_number || (!profile.trade_license_number && !profile.trade_license_url))) {
        return res.status(422).json({
          success: false,
          message: 'A TIN number and trade license number or document are required before approving this company.',
        });
      }
    }
    const [profileResult] = await db.execute('UPDATE company_profiles SET is_verified = ?, verification_status = ?, verified_at = ? WHERE id = ? OR employer_id = ?', [status === 'verified' ? 1 : 0, status, status === 'verified' ? new Date() : null, id, id]);
    if (!profileResult.affectedRows) {
      await db.execute('UPDATE employers SET verification_status = ?, verificationStatus = ? WHERE id = ? OR user_id = ? OR userId = ?', [status, status, id, id, id]);
    }
    const [[employer]] = await db.execute('SELECT employer_id FROM company_profiles WHERE id = ? OR employer_id = ? LIMIT 1', [id, id]);
    if (employer?.employer_id) {
      await createNotification({
        userId: employer.employer_id,
        type: 'VERIFICATION',
        title: 'Company Verification Updated',
        message: `Your company verification status is now ${status}.`,
        referenceType: 'VERIFICATION',
        referenceId: employer.employer_id,
        relatedUserId: req.user.id,
      });
    }
    return res.json({ success: true, message: `Company marked as ${status}` });
  } catch (error) {
    console.error('Admin Company Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update company status.' });
  }
};

exports.getAllJobsForModeration = async (req, res) => {
  try {
    const [jobs] = await db.execute(`
      SELECT j.*, cp.company_name, cp.logo_url, cp.location AS company_location,
              ${jobEmployerLegalFields},
             COUNT(a.id) AS total_applicants
      FROM jobs j
      LEFT JOIN company_profiles cp ON j.employer_id = cp.employer_id
      LEFT JOIN applications a ON j.id = a.job_id
      GROUP BY j.id
      ORDER BY j.created_at DESC
    `);
    return res.json({ success: true, jobs });
  } catch (error) {
    console.error('Admin Jobs Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve jobs.' });
  }
};

exports.getAdminDashboardData = async (req, res) => {
  try {
    const emptyAnalytics = { seekersCount: 0, employersTotal: 0, employersVerified: 0, activeJobsCount: 0, totalApplications: 0, avgMatchScore: 0 };
    const [analytics, companies, jobs, users, logs, applications, reports, notifications, performance, categories, candidateCategories] = await Promise.all([
      exports.getPlatformAnalyticsData().catch((error) => {
        console.warn('Admin analytics query skipped:', error.message);
        return emptyAnalytics;
      }),
      safeExecute(`
        SELECT
          COALESCE(cp.id, e.id, he.id) AS id,
          cp.id AS company_profile_id,
          u.id AS employer_id,
          COALESCE(cp.company_name, e.company_name, e.companyName, he.household_name, u.full_name) AS company_name,
          COALESCE(cp.representative_name, e.representative_name, he.full_name, u.full_name) AS rep_name,
          u.email AS rep_email,
          COALESCE(cp.phone, e.phone_number, e.phoneNumber, he.phone_number, u.phone) AS rep_phone,
          COALESCE(cp.employer_type, e.employer_type, he.employer_type, 'company') AS employer_type,
          COALESCE(cp.industry, e.industry, he.industry) AS industry,
          COALESCE(cp.location, e.location, e.headquarters_location, he.residence_location) AS location,
          COALESCE(cp.tin_number, e.tin_number, e.tinNumber) AS tin_number,
          COALESCE(cp.company_registration_number, cp.trade_license_number, e.trade_license_document, e.licenseDocumentUrl) AS trade_license_number,
          COALESCE(cp.trade_license_url, e.licenseDocumentUrl, e.trade_license_document) AS trade_license_url,
          COALESCE(cp.description, cp.company_summary, e.about_company, e.description, he.about_household) AS profile_description,
          COALESCE(cp.website, e.website) AS website,
          COALESCE(cp.social_media_urls, e.social_media) AS social_media,
          cp.hiring_volume,
          COALESCE(cp.verification_status, e.verification_status, e.verificationStatus, 'pending') AS verification_status,
          COALESCE(cp.is_verified, 0) AS is_verified,
          COALESCE(cp.created_at, e.created_at, he.created_at, u.created_at) AS created_at
        FROM users u
        LEFT JOIN company_profiles cp ON cp.employer_id = u.id
        LEFT JOIN employers e ON e.user_id = u.id OR e.userId = u.id
        LEFT JOIN household_employers he ON he.user_id = u.id
        WHERE u.role IN ('employer', 'company', 'recruiter')
        ORDER BY created_at DESC
      `),
      safeExecute(`
         SELECT j.*, cp.company_name, cp.logo_url, cp.location AS company_location,
           ${jobEmployerLegalFields},
               COUNT(a.id) AS total_applicants
        FROM jobs j
        LEFT JOIN company_profiles cp ON j.employer_id = cp.employer_id
        LEFT JOIN applications a ON j.id = a.job_id
        GROUP BY j.id
        ORDER BY j.created_at DESC
      `),
      safeExecute(`SELECT id, full_name, email, phone, role, is_verified, is_active,
        CASE WHEN is_active = TRUE THEN 'active' ELSE 'suspended' END AS status,
        created_at FROM users ORDER BY created_at DESC`),
      safeExecute(`SELECT u.full_name, u.email, u.role, l.activity_type, l.related_job_id, l.created_at FROM user_activity_log l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC LIMIT 30`),
      safeExecute(`SELECT a.id, a.status, a.ai_match_score, a.skills_match_score, a.experience_match_score, a.education_match_score, a.location_match_score, a.applied_at, candidate.full_name AS candidate_name, j.title AS job_title, employer.full_name AS employer_name FROM applications a JOIN users candidate ON candidate.id = a.job_seeker_id JOIN jobs j ON j.id = a.job_id JOIN users employer ON employer.id = j.employer_id ORDER BY a.applied_at DESC LIMIT 100`),
      safeExecute(`SELECT r.*, reporter.full_name AS reporter_name, reporter.email AS reporter_email, target_user.full_name AS reported_user_name, target_job.title AS reported_job_title FROM reports r JOIN users reporter ON reporter.id = r.reporter_id LEFT JOIN users target_user ON target_user.id = r.reported_user_id LEFT JOIN jobs target_job ON target_job.id = r.reported_job_id ORDER BY r.created_at DESC LIMIT 100`),
      safeExecute(`SELECT n.*, u.full_name AS recipient_name FROM notifications n JOIN users u ON u.id = n.user_id ORDER BY n.created_at DESC LIMIT 100`),
      safeExecute(`SELECT DATE(applied_at) AS day, COUNT(*) AS applications,
        SUM(CASE WHEN ai_match_score IS NOT NULL THEN 1 ELSE 0 END) AS matches,
        ROUND(AVG(ai_match_score), 1) AS average_score
        FROM applications WHERE applied_at IS NOT NULL GROUP BY DATE(applied_at) ORDER BY day`),
      safeExecute(`SELECT COALESCE(NULLIF(category, ''), 'Other') AS category, COUNT(*) AS total FROM jobs GROUP BY COALESCE(NULLIF(category, ''), 'Other') ORDER BY total DESC LIMIT 6`),
      safeExecute(`SELECT TRIM(job_category) AS category, COUNT(*) AS total
        FROM job_seeker_profiles
        WHERE job_category IS NOT NULL AND TRIM(job_category) <> ''
          AND LOWER(TRIM(job_category)) <> 'select sector'
        GROUP BY TRIM(job_category) ORDER BY total DESC`),
    ]);

    return res.status(200).json({
      success: true,
      data: analytics,
      metrics: {
        totalSeekers: analytics.seekersCount,
        totalEmployers: analytics.employersTotal,
        verifiedEmployers: analytics.employersVerified,
        activeJobs: analytics.activeJobsCount,
        totalApplications: analytics.totalApplications,
        avgMatchScore: analytics.avgMatchScore,
      },
      companies: companies[0],
      jobs: jobs[0],
      users: users[0],
      logs: logs[0],
      applications: applications[0],
      reports: reports[0],
      notifications: notifications[0],
      performance: performance[0],
      categories: categories[0],
      candidateCategories: candidateCategories[0],
      pendingEmployers: companies[0].filter((company) => company.verification_status === 'pending'),
      recentJobs: jobs[0].slice(0, 10),
      recentUsers: users[0].slice(0, 10),
      recentLogs: logs[0].slice(0, 12),
    });
  } catch (error) {
    console.error('Admin Data Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin data.' });
  }
};

exports.getAdminActivityLogs = async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
  const offset = (page - 1) * limit;
  const search = String(req.query.search || '').trim();
  const type = String(req.query.type || '').trim().toLowerCase();
  const date = String(req.query.date || 'all').trim().toLowerCase();
  const typeGroups = {
    role_selection: ['role_selection'],
    profile_updates: ['profile_update'],
    job_applications: ['job_application'],
    admin_actions: ['admin_action'],
  };

  const activityUnion = `
    SELECT CONCAT('user-', activity.id) AS id, activity.user_id, actor.full_name,
           actor.email, actor.role, activity.activity_type AS action,
           CASE
             WHEN activity.activity_type = 'role_selected' AND activity.description IN ('User selected a role', 'role selected')
               THEN CONCAT('User selected ', REPLACE(COALESCE(actor.role, 'a'), '_', ' '), ' role')
             WHEN activity.activity_type = 'job-apply' AND activity.description IN ('Applied for a job', 'job apply')
               THEN CONCAT('Applied for ', COALESCE(job.title, CONCAT('job #', activity.related_job_id)))
             ELSE COALESCE(activity.description,
               CASE activity.activity_type
                 WHEN 'login' THEN 'User signed in'
                 WHEN 'role_selected' THEN CONCAT('User selected ', REPLACE(COALESCE(actor.role, 'a'), '_', ' '), ' role')
                 WHEN 'profile-update' THEN 'Updated profile information'
                 WHEN 'job-apply' THEN CONCAT('Applied for ', COALESCE(job.title, CONCAT('job #', activity.related_job_id)))
                 WHEN 'job-view' THEN 'Viewed a job listing'
                 WHEN 'profile-view' THEN 'Viewed a profile'
                 WHEN 'message-sent' THEN 'Sent a message'
                 WHEN 'cv-upload' THEN 'Uploaded a CV'
                 ELSE REPLACE(activity.activity_type, '-', ' ')
               END)
           END AS description,
           COALESCE(activity.details, JSON_OBJECT(
             'recordId', activity.id,
             'relatedJobId', activity.related_job_id,
             'relatedUserId', activity.related_user_id,
             'ipAddress', activity.ip_address,
             'userAgent', activity.user_agent
           )) AS details,
           activity.ip_address, activity.user_agent, activity.created_at,
           CASE activity.activity_type
             WHEN 'role_selected' THEN 'role_selection'
             WHEN 'profile-update' THEN 'profile_update'
             WHEN 'job-apply' THEN 'job_application'
             ELSE 'other'
           END AS event_type
    FROM user_activity_log activity
    LEFT JOIN users actor ON actor.id = activity.user_id
    LEFT JOIN jobs job ON job.id = activity.related_job_id
    UNION ALL
    SELECT CONCAT('admin-', action.id) AS id, action.admin_id AS user_id,
           actor.full_name, actor.email, actor.role, action.action_type AS action,
           COALESCE(NULLIF(action.reason, ''), CONCAT('Admin performed ', REPLACE(action.action_type, '-', ' '))) AS description,
           JSON_OBJECT('recordId', action.id, 'reason', action.reason,
             'targetUserId', action.target_user_id,
             'targetJobId', action.target_job_id,
             'targetCompanyId', action.target_company_id,
             'ipAddress', NULL, 'userAgent', NULL) AS details,
           NULL AS ip_address, NULL AS user_agent, action.created_at,
           'admin_action' AS event_type
    FROM admin_actions_log action
    LEFT JOIN users actor ON actor.id = action.admin_id
  `;

  const conditions = [];
  const values = [];
  if (typeGroups[type]) {
    conditions.push(`event_type IN (${typeGroups[type].map(() => '?').join(', ')})`);
    values.push(...typeGroups[type]);
  }
  if (search) {
    conditions.push(`(LOWER(COALESCE(full_name, '')) LIKE ? OR LOWER(COALESCE(email, '')) LIKE ? OR LOWER(action) LIKE ? OR LOWER(description) LIKE ? OR LOWER(CAST(details AS CHAR)) LIKE ?)`);
    const term = `%${search.toLowerCase()}%`;
    values.push(term, term, term, term, term);
  }
  if (date === 'today') conditions.push('DATE(created_at) = CURDATE()');
  else if (date === '7d') conditions.push('created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM (${activityUnion}) AS audit ${where}`, values);
    const [logs] = await db.execute(`
      SELECT id, user_id, full_name, email, role, action, description, details,
             ip_address, user_agent, created_at, event_type
      FROM (${activityUnion}) AS audit ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `, [...values, limit, offset]);
    const total = Number(countRows[0]?.total || 0);
    return res.json({ success: true, logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Admin activity log error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load activity logs.' });
  }
};

exports.getPlatformAnalyticsData = async () => {
  const [seekers] = await db.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'job_seeker'");
  const [employers] = await db.execute("SELECT COUNT(*) AS total, SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) AS verified FROM company_profiles");
  const [jobs] = await db.execute("SELECT COUNT(*) AS active FROM jobs WHERE status = 'active' AND is_approved = TRUE");
  const [allJobs] = await db.execute('SELECT COUNT(*) AS total FROM jobs');
  const [allUsers] = await db.execute('SELECT COUNT(*) AS total FROM users');
  const [apps] = await db.execute('SELECT COUNT(*) AS total, AVG(ai_match_score) AS avg_score FROM applications');
  const [hires] = await db.execute("SELECT COUNT(*) AS total FROM applications WHERE status = 'hired'");
  const [reports] = await db.execute("SELECT COUNT(*) AS total FROM reports WHERE status = 'pending'");
  const [skills] = await db.execute('SELECT skill_name, COUNT(*) AS usage_count FROM job_required_skills GROUP BY skill_name ORDER BY usage_count DESC LIMIT 1');
  const [placements] = await db.execute("SELECT AVG(DATEDIFF(a.updated_at, a.applied_at)) AS avg_days FROM applications a WHERE a.status = 'hired'");
  return {
    seekersCount: Number(seekers[0]?.count || 0),
    usersCount: Number(allUsers[0]?.total || 0),
    employersTotal: Number(employers[0]?.total || 0),
    employersVerified: Number(employers[0]?.verified || 0),
    activeJobsCount: Number(jobs[0]?.active || 0),
    totalJobs: Number(allJobs[0]?.total || 0),
    totalApplications: Number(apps[0]?.total || 0),
    successfulHires: Number(hires[0]?.total || 0),
    pendingReports: Number(reports[0]?.total || 0),
    avgMatchScore: apps[0]?.avg_score ? Number(parseFloat(apps[0].avg_score).toFixed(1)) : 0,
    topMatchedSkill: skills[0]?.skill_name || 'No skill data yet',
    placementVelocity: placements[0]?.avg_days !== null && placements[0]?.avg_days !== undefined ? `${Number(placements[0].avg_days).toFixed(1)} days` : 'No placement data yet',
  };
};

exports.deleteJob = async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM jobs WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Job not found.' });
    return res.json({ success: true, message: 'Job deleted successfully.' });
  } catch (error) {
    console.error('Admin Delete Job Error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete job.' });
  }
};

exports.getJobPreview = async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT j.id, j.title, j.description, j.required_education, j.years_of_experience_min, j.years_of_experience_max, j.category, j.job_type, j.work_mode, j.salary_min, j.salary_max, j.currency, j.benefits, j.location, j.application_deadline, j.status, j.rejection_reason, u.email AS employer_email, cp.company_name, cp.is_verified AS company_verified, cp.verification_status, GROUP_CONCAT(DISTINCT s.skill_name ORDER BY s.skill_name SEPARATOR ',') AS required_skills FROM jobs j LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id LEFT JOIN users u ON u.id = j.employer_id LEFT JOIN job_required_skills s ON s.job_id = j.id WHERE j.id = ? GROUP BY j.id`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found.' });
    return res.json({ success: true, job: rows[0] });
  } catch (error) {
    console.error('Admin Job Preview Error:', error);
    return res.status(500).json({ success: false, message: 'Unable to preview job.' });
  }
};

exports.moderateJob = async (req, res) => {
  const jobId = req.params.id || req.params.jobId;
  const action = String(req.body?.action || '').trim().toLowerCase();
  const reason = String(req.body?.reason || '').trim();
  const statusByAction = { publish: 'active', approve: 'active', reject: 'rejected' };
  const nextStatus = normalizeJobStatus(statusByAction[action]);
  if (!statusByAction[action]) return res.status(422).json({ success: false, message: 'Moderation action must be approve or reject.' });
  if (['active', 'rejected'].includes(nextStatus) && reason.length < 20) {
    return res.status(422).json({ success: false, message: 'Please provide an approval or rejection reason of at least 20 characters.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(`
            SELECT j.id, j.title, j.employer_id, j.status, j.location,
              COALESCE(cp.company_name, j.company_name, u.full_name, 'Company') AS company_name,
              u.email AS employer_email,
             ${jobEmployerLegalFields}
            FROM jobs j JOIN users u ON u.id = j.employer_id
            LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id
            WHERE j.id = ? FOR UPDATE`, [jobId]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Job not found.' }); }
    const job = rows[0];
    if (nextStatus === 'active' && !hasEmployerLegalDocuments(job)) {
      await connection.rollback();
      return res.status(422).json({ success: false, message: 'Employer TIN and trade license details are required before approving this job.' });
    }
    await connection.execute(
      `UPDATE jobs
       SET status = ?,
           is_approved = ?,
           approval_status = ?,
           rejection_reason = ?,
           approved_by = ?,
           approved_at = CASE WHEN ? = 'active' THEN NOW() ELSE NULL END,
           reviewed_by = ?,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
         [nextStatus, nextStatus === 'active', nextStatus === 'active' ? 'approved' : nextStatus === 'rejected' ? 'rejected' : 'pending', nextStatus === 'rejected' ? reason : null, nextStatus === 'active' ? req.user.id : null, nextStatus, req.user.id, jobId]
    );
    await createJobModerationNotifications(connection, {
      employerId: job.employer_id,
      jobId,
      jobTitle: job.title,
      status: nextStatus,
      reason,
    });
    if (nextStatus === 'active' && normalizeJobStatus(job.status) !== 'active') {
      await createJobSeekerOpportunityNotifications(connection, {
        jobId,
        jobTitle: job.title,
        companyName: job.company_name,
        location: job.location,
      });
    }
    try {
      await connection.execute('INSERT INTO admin_actions_log (admin_id, action_type, target_job_id, reason) VALUES (?, \'content-moderated\', ?, ?)', [req.user.id, jobId, reason || `Job status changed to ${nextStatus}`]);
    } catch (auditError) {
      console.warn('Admin moderation audit skipped:', auditError.message);
    }
    await connection.commit();
    if (nextStatus === 'rejected') await sendJobRejectionEmailSafely(job, reason);
    return res.json({ success: true, status: nextStatus, message: nextStatus === 'active' ? 'Job approved and published successfully!' : 'Job posting has been rejected.' });
  } catch (error) {
    await connection.rollback();
    console.error('Admin job moderation error:', error);
    const message = process.env.NODE_ENV === 'production'
      ? 'Failed to persist job moderation action.'
      : `Failed to persist job moderation action: ${error.message}`;
    return res.status(500).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'production' ? {} : { code: error.code }),
    });
  } finally {
    connection.release();
  }
};

exports.verifyCompany = async (req, res) => {
  req.params.id = req.params.companyId;
  req.body = { status: normalizeBoolean(req.body?.is_verified) ? 'verified' : 'rejected' };
  return exports.updateVerificationStatus(req, res);
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!['active', 'suspended'].includes(status)) {
      return res.status(422).json({ success: false, message: 'Status must be active or suspended.' });
    }

    const [rows] = await db.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });

    const isActive = status === 'active' ? 1 : 0;
    await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive, userId]);

    return res.status(200).json({
      success: true,
      message: status === 'active' ? 'User activated successfully.' : 'User suspended successfully.',
      status,
      is_active: isActive,
    });
  } catch (error) {
    console.error('Admin toggle user status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
};

exports.toggleJobStatus = async (req, res) => {
  try {
    const jobId = req.params.jobId || req.params.id;
    const { status } = req.body;
    const reason = String(req.body?.reason || '').trim();
    const nextStatus = normalizeJobStatus(status);
    if (!['pending_approval', 'active', 'rejected'].includes(nextStatus)) {
      return res.status(422).json({ success: false, message: 'Invalid job moderation status.' });
    }
    if (['active', 'rejected'].includes(nextStatus) && reason.length < 20) {
      return res.status(422).json({ success: false, message: 'Please provide an approval or rejection reason of at least 20 characters.' });
    }

    const [rows] = await db.execute(`
            SELECT j.id, j.title, j.employer_id, j.status, j.location,
              COALESCE(cp.company_name, j.company_name, u.full_name, 'Company') AS company_name,
              u.email AS employer_email,
             ${jobEmployerLegalFields}
            FROM jobs j JOIN users u ON u.id = j.employer_id
            LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id
            WHERE j.id = ?`, [jobId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (nextStatus === 'active' && !hasEmployerLegalDocuments(rows[0])) {
      return res.status(422).json({ success: false, message: 'Employer TIN and trade license details are required before approving this job.' });
    }

    await db.execute(
      `UPDATE jobs
       SET status = ?,
           is_approved = ?,
           approval_status = ?,
           rejection_reason = CASE WHEN ? = 'rejected' THEN ? ELSE NULL END,
           approved_by = CASE WHEN ? = 'active' THEN ? ELSE approved_by END,
           approved_at = CASE WHEN ? = 'active' THEN NOW() ELSE approved_at END,
           reviewed_by = ?,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [nextStatus, nextStatus === 'active', nextStatus === 'active' ? 'approved' : nextStatus === 'rejected' ? 'rejected' : 'pending', nextStatus, reason, nextStatus, req.user.id, nextStatus, req.user.id, jobId]
    );

    if (nextStatus === 'active' || nextStatus === 'rejected') {
      await createJobModerationNotifications(db, {
        employerId: rows[0].employer_id,
        jobId,
        jobTitle: rows[0].title,
        status: nextStatus,
        reason,
      });
      if (nextStatus === 'active' && normalizeJobStatus(rows[0].status) !== 'active') {
        await createJobSeekerOpportunityNotifications(db, {
          jobId,
          jobTitle: rows[0].title,
          companyName: rows[0].company_name,
          location: rows[0].location,
        });
      }
      if (nextStatus === 'rejected') await sendJobRejectionEmailSafely(rows[0], reason);
      try {
        await db.execute('INSERT INTO admin_actions_log (admin_id, action_type, target_job_id, reason) VALUES (?, \'content-moderated\', ?, ?)', [req.user.id, jobId, reason || `Job status changed to ${nextStatus}`]);
      } catch (auditError) {
        console.warn('Admin moderation audit skipped:', auditError.message);
      }
    }

    return res.status(200).json({ success: true, status: nextStatus, message: 'Job moderation status updated.' });
  } catch (error) {
    console.error('Admin toggle job status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update job status.' });
  }
};

exports.updateReportStatus = async (req, res) => {
  const status = req.body?.status;
  if (!['pending', 'under-review', 'resolved', 'dismissed'].includes(status)) return res.status(422).json({ success: false, message: 'Invalid report status.' });
  try {
    const [result] = await db.execute('UPDATE reports SET status = ?, resolved_by = ?, resolved_at = CASE WHEN ? IN (\'resolved\', \'dismissed\') THEN NOW() ELSE NULL END WHERE id = ?', [status, req.user.id, status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Report not found.' });
    return res.json({ success: true, status });
  } catch (error) {
    console.error('Admin report status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update report status.' });
  }
};

exports.createReport = async (req, res) => {
  if (req.file?.path) {
    res.on('finish', () => {
      if (res.statusCode >= 400) fs.unlink(req.file.path).catch(() => {});
    });
  }
  const role = String(req.user?.role || '').toLowerCase();
  const reporterRole = ['employer', 'company', 'recruiter'].includes(role) ? 'employer' : ['job_seeker', 'seeker', 'jobseeker', 'employee', 'user'].includes(role) ? 'seeker' : null;
  const targetType = String(req.body?.targetType || '').trim().toLowerCase();
  const targetId = req.body?.targetId ? Number(req.body.targetId) : null;
  const issueCategory = String(req.body?.issueCategory || '').trim().toLowerCase();
  const description = String(req.body?.description || '').trim();
  const evidenceUrl = req.file ? `/uploads/reports/${req.file.filename}` : null;
  const seekerReasons = new Set(['scam_fraud', 'upfront_fee', 'misleading_description', 'harassment', 'system_bug', 'other']);
  const employerReasons = new Set(['fake_credentials', 'unprofessional_conduct', 'interview_no_show', 'spam_applications', 'system_bug', 'other']);

  if (!reporterRole) return res.status(403).json({ success: false, message: 'Only job seekers and employers can submit reports.' });
  if (!['job', 'candidate', 'employer', 'platform'].includes(targetType)) return res.status(422).json({ success: false, message: 'Invalid report target type.' });
  if (targetType !== 'platform' && (!Number.isInteger(targetId) || targetId < 1)) return res.status(422).json({ success: false, message: 'A valid report target is required.' });
  if ((targetType === 'job' || targetType === 'employer') && reporterRole !== 'seeker') return res.status(403).json({ success: false, message: 'Employers can report candidates or platform issues.' });
  if (targetType === 'candidate' && reporterRole !== 'employer') return res.status(403).json({ success: false, message: 'Only employers can report candidates.' });
  if (!(reporterRole === 'seeker' ? seekerReasons : employerReasons).has(issueCategory)) return res.status(422).json({ success: false, message: 'Select a valid reason for your report.' });
  if (description.length < 20 || description.length > 5000) return res.status(422).json({ success: false, message: 'Describe the issue in 20 to 5000 characters.' });

  const reportTypeByCategory = {
    scam_fraud: 'fraud', upfront_fee: 'fraud', misleading_description: 'other', harassment: 'offensive-language',
    system_bug: 'other', fake_credentials: 'fraud', unprofessional_conduct: 'offensive-language',
    interview_no_show: 'other', spam_applications: 'spam', other: 'other',
  };
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    let reportedUserId = null;
    let reportedJobId = null;
    if (targetType === 'job') {
      const [jobs] = await connection.execute('SELECT id, employer_id FROM jobs WHERE id = ? LIMIT 1', [targetId]);
      if (!jobs.length) { await connection.rollback(); return res.status(404).json({ success: false, message: 'The reported job was not found.' }); }
      reportedJobId = jobs[0].id;
    } else if (targetType === 'candidate' || targetType === 'employer') {
      const [targets] = await connection.execute('SELECT id, role FROM users WHERE id = ? LIMIT 1', [targetId]);
      if (!targets.length) { await connection.rollback(); return res.status(404).json({ success: false, message: 'The reported account was not found.' }); }
      if (Number(targetId) === Number(req.user.id)) { await connection.rollback(); return res.status(422).json({ success: false, message: 'You cannot report your own account.' }); }
      const targetRole = String(targets[0].role || '').toLowerCase();
      const validTarget = targetType === 'candidate'
        ? ['job_seeker', 'seeker', 'jobseeker', 'employee', 'user'].includes(targetRole)
        : ['employer', 'company', 'recruiter'].includes(targetRole);
      if (!validTarget) { await connection.rollback(); return res.status(422).json({ success: false, message: 'The target account does not match this report type.' }); }
      reportedUserId = targets[0].id;
    }

    const [result] = await connection.execute(`
      INSERT INTO reports
        (reporter_id, reporter_role, target_type, target_id, reported_user_id, reported_job_id,
         report_type, issue_category, description, evidence_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [req.user.id, reporterRole, targetType, targetId, reportedUserId, reportedJobId, reportTypeByCategory[issueCategory], issueCategory, description, evidenceUrl]);

    await connection.commit();
    return res.status(201).json({ success: true, reportId: result.insertId, message: 'Your report was sent to the platform moderation team.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Report submission failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit your report.' });
  } finally {
    if (connection) connection.release();
  }
};

exports.getAdminReports = async (req, res) => {
  try {
    const conditions = [];
    const values = [];
    const reporterRole = String(req.query.reporter_role || '').trim().toLowerCase();
    const targetType = String(req.query.target_type || '').trim().toLowerCase();
    const statusInput = String(req.query.status || '').trim().toLowerCase();
    const status = statusInput === 'under_review' ? 'under-review' : statusInput;
    if (['seeker', 'employer', 'admin'].includes(reporterRole)) { conditions.push('r.reporter_role = ?'); values.push(reporterRole); }
    if (['job', 'candidate', 'employer', 'platform'].includes(targetType)) { conditions.push('r.target_type = ?'); values.push(targetType); }
    if (['pending', 'under-review', 'resolved', 'dismissed'].includes(status)) { conditions.push('r.status = ?'); values.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [reports] = await db.execute(`
      SELECT r.id, r.reporter_id, r.reporter_role, r.target_type,
             COALESCE(r.target_id, r.reported_job_id, r.reported_user_id) AS target_id,
             r.reported_user_id, r.reported_job_id,
             COALESCE(r.issue_category, r.report_type) AS issue_type,
             r.description, r.evidence_url, r.status, r.admin_notes, r.created_at, r.resolved_at,
             reporter.full_name AS reporter_name, reporter.email AS reporter_email,
             reporter.phone AS reporter_phone,
             target_user.id AS target_user_id, target_user.role AS target_user_role,
             target_user.full_name AS reported_user_name, target_user.email AS reported_user_email,
             job.title AS reported_job_title, job.company_name AS reported_company_name,
             job.location AS reported_job_location, job.status AS reported_job_status,
             COALESCE(job.employer_id, CASE WHEN r.target_type IN ('candidate', 'employer') THEN target_user.id ELSE NULL END) AS accused_user_id,
             accused.full_name AS accused_name, accused.email AS accused_email, accused.role AS accused_role,
             COALESCE(job.title, target_user.full_name, 'Platform') AS target_title
      FROM reports r
      JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN users target_user ON target_user.id = CASE WHEN r.target_type IN ('candidate', 'employer') THEN COALESCE(r.target_id, r.reported_user_id) ELSE r.reported_user_id END
      LEFT JOIN jobs job ON job.id = CASE WHEN r.target_type = 'job' THEN COALESCE(r.target_id, r.reported_job_id) ELSE r.reported_job_id END
      LEFT JOIN users accused ON accused.id = COALESCE(job.employer_id, target_user.id)
      ${where}
      ORDER BY FIELD(r.status, 'pending', 'under-review', 'resolved', 'dismissed'), r.created_at DESC
    `, values);
    return res.json({ success: true, reports });
  } catch (error) {
    console.error('Admin reports list error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load reports.' });
  }
};

exports.getReportMessages = async (req, res) => {
  try {
    const [reports] = await db.execute('SELECT id FROM reports WHERE id = ?', [req.params.id]);
    if (!reports.length) return res.status(404).json({ success: false, message: 'Report not found.' });

    const [messages] = await db.execute(`
      SELECT message.id, message.report_id, message.sender_type, message.sender_id,
             message.message, message.created_at, sender.full_name AS sender_name,
             sender.email AS sender_email
      FROM report_messages message
      JOIN users sender ON sender.id = message.sender_id
      WHERE message.report_id = ?
      ORDER BY message.created_at ASC, message.id ASC
    `, [req.params.id]);
    return res.json({ success: true, messages });
  } catch (error) {
    console.error('Admin report messages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load report messages.' });
  }
};

exports.replyToReport = async (req, res) => {
  const reportId = Number(req.params.id);
  const message = String(req.body?.message || '').trim();
  const requestedStatus = String(req.body?.newStatus || 'investigating').trim().toLowerCase();
  const statusByRequest = { pending: 'pending', investigating: 'under-review', 'under-review': 'under-review', resolved: 'resolved' };
  const status = statusByRequest[requestedStatus];
  const actionTaken = String(req.body?.actionTaken || 'none').trim().toLowerCase();

  if (!Number.isInteger(reportId) || reportId < 1) return res.status(422).json({ success: false, message: 'Invalid report ID.' });
  if (!message || message.length > 5000) return res.status(422).json({ success: false, message: 'Reply must contain 1 to 5000 characters.' });
  if (!status) return res.status(422).json({ success: false, message: 'Status must be pending, investigating, or resolved.' });
  if (!['none', 'take_down_job'].includes(actionTaken)) return res.status(422).json({ success: false, message: 'Invalid report action.' });

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [reports] = await connection.execute(`
      SELECT id, reporter_id, reported_job_id
      FROM reports WHERE id = ? FOR UPDATE
    `, [reportId]);
    const report = reports[0];
    if (!report) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    if (actionTaken === 'take_down_job' && !report.reported_job_id) {
      await connection.rollback();
      return res.status(422).json({ success: false, message: 'This report does not reference a job.' });
    }

    if (actionTaken === 'take_down_job') {
      const [jobs] = await connection.execute('SELECT id FROM jobs WHERE id = ? FOR UPDATE', [report.reported_job_id]);
      if (!jobs.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Reported job no longer exists.' });
      }
      await connection.execute(`
        UPDATE jobs
        SET status = 'rejected', is_approved = FALSE,
            rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `, [`Taken down while investigating report #${reportId}.`, req.user.id, report.reported_job_id]);
    }

    await connection.execute(
      'INSERT INTO report_messages (report_id, sender_type, sender_id, message) VALUES (?, \'admin\', ?, ?)',
      [reportId, req.user.id, message]
    );
    await connection.execute(`
      UPDATE reports
      SET status = ?,
          resolved_by = CASE WHEN ? = 'resolved' THEN ? ELSE resolved_by END,
          resolved_at = CASE WHEN ? = 'resolved' THEN NOW() ELSE NULL END,
          resolution_notes = CASE WHEN ? = 'resolved' THEN ? ELSE resolution_notes END
      WHERE id = ?
    `, [status, status, req.user.id, status, status, message, reportId]);
    await connection.execute(`
      INSERT INTO notifications
        (user_id, type, title, message, reference_type, reference_id, related_job_id, action_url)
      VALUES (?, 'SYSTEM', 'Update to your report', ?, 'REPORT', ?, ?, '/notifications')
    `, [report.reporter_id, message, reportId, report.reported_job_id || null]);

    await connection.commit();
    return res.json({
      success: true,
      message: 'Reply sent and report updated.',
      status: requestedStatus === 'under-review' ? 'investigating' : requestedStatus,
      actionTaken,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Admin report reply error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send report reply.' });
  } finally {
    if (connection) connection.release();
  }
};

exports.resolveAdminReport = async (req, res) => {
  const reportId = Number(req.params.id);
  const resolutionMessage = String(req.body?.resolutionMessage || '').trim();
  const warningToTarget = String(req.body?.warningToTarget || '').trim();
  const requestedStatus = String(req.body?.newStatus || 'resolved').trim().toLowerCase();
  const statusByRequest = { pending: 'pending', under_review: 'under-review', 'under-review': 'under-review', resolved: 'resolved', dismissed: 'dismissed' };
  const status = statusByRequest[requestedStatus];
  const targetPenalty = String(req.body?.targetPenalty || 'none').trim().toLowerCase();

  if (!Number.isInteger(reportId) || reportId < 1) return res.status(422).json({ success: false, message: 'Invalid report ID.' });
  if (!status) return res.status(422).json({ success: false, message: 'Invalid report status.' });
  if (!['none', 'suspend_user', 'take_down_job'].includes(targetPenalty)) return res.status(422).json({ success: false, message: 'Invalid target penalty.' });
  if (resolutionMessage.length > 5000 || warningToTarget.length > 2000) return res.status(422).json({ success: false, message: 'Resolution and warning messages are too long.' });
  if (!resolutionMessage && !warningToTarget && targetPenalty === 'none' && !['dismissed', 'under-review'].includes(status)) return res.status(422).json({ success: false, message: 'Add a resolution message or moderation action.' });

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute(`
            SELECT id, reporter_id, target_type, issue_category,
             COALESCE(target_id, reported_job_id, reported_user_id) AS target_id,
              COALESCE(reported_job_id, CASE WHEN target_type = 'job' THEN target_id END) AS reported_job_id,
              reported_user_id
      FROM reports WHERE id = ? FOR UPDATE
    `, [reportId]);
    const report = rows[0];
    if (!report) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Report not found.' }); }

    let accusedUserId = report.reported_user_id;
    if (report.target_type === 'job' && report.reported_job_id) {
      const [jobs] = await connection.execute('SELECT id, employer_id FROM jobs WHERE id = ? FOR UPDATE', [report.reported_job_id]);
      if (!jobs.length && targetPenalty === 'take_down_job') { await connection.rollback(); return res.status(404).json({ success: false, message: 'Reported job no longer exists.' }); }
      accusedUserId = jobs[0]?.employer_id || accusedUserId;
    } else if (['candidate', 'employer'].includes(report.target_type)) {
      accusedUserId = report.target_id;
    }

    if (targetPenalty === 'suspend_user') {
      if (!accusedUserId) { await connection.rollback(); return res.status(422).json({ success: false, message: 'This report does not identify an account to suspend.' }); }
      const [targets] = await connection.execute('SELECT id, role FROM users WHERE id = ? FOR UPDATE', [accusedUserId]);
      if (!targets.length) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Reported account no longer exists.' }); }
      if (['admin', 'super_admin'].includes(String(targets[0].role).toLowerCase())) { await connection.rollback(); return res.status(403).json({ success: false, message: 'Admin accounts cannot be suspended through report resolution.' }); }
      await connection.execute('UPDATE users SET is_active = FALSE WHERE id = ?', [accusedUserId]);
      await connection.execute(`INSERT INTO admin_actions_log (admin_id, action_type, target_user_id, reason)
        VALUES (?, 'user-blocked', ?, ?)
        ON DUPLICATE KEY UPDATE reason = VALUES(reason)`, [req.user.id, accusedUserId, `Suspended while resolving report #${reportId}`]);
    }

    if (targetPenalty === 'take_down_job') {
      const jobId = report.reported_job_id || (report.target_type === 'job' ? report.target_id : null);
      if (!jobId) { await connection.rollback(); return res.status(422).json({ success: false, message: 'This report does not reference a job.' }); }
      const [jobs] = await connection.execute('SELECT id FROM jobs WHERE id = ? FOR UPDATE', [jobId]);
      if (!jobs.length) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Reported job no longer exists.' }); }
      await connection.execute(`UPDATE jobs SET status = 'rejected', is_approved = FALSE,
        rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [`Taken down while resolving report #${reportId}`, req.user.id, jobId]);
      try {
        await connection.execute(`INSERT INTO admin_actions_log (admin_id, action_type, target_job_id, reason)
          VALUES (?, 'content-moderated', ?, ?)`, [req.user.id, jobId, `Taken down while resolving report #${reportId}`]);
      } catch (auditError) { console.warn('Report job takedown audit skipped:', auditError.message); }
    }

    const reporterMessage = resolutionMessage || (status === 'dismissed' ? 'The report was reviewed and dismissed by the moderation team.' : `Your report was updated to ${status.replace('-', ' ')}.`);
    await connection.execute(`INSERT INTO report_messages (report_id, sender_type, sender_id, message)
      VALUES (?, 'admin', ?, ?)`, [reportId, req.user.id, reporterMessage]);
    await connection.execute(`UPDATE reports SET status = ?, resolved_by = ?,
      resolved_at = CASE WHEN ? IN ('resolved', 'dismissed') THEN NOW() ELSE NULL END,
      resolution_notes = CASE WHEN ? IN ('resolved', 'dismissed') THEN ? ELSE resolution_notes END,
      admin_notes = CASE WHEN ? <> '' THEN CONCAT(COALESCE(admin_notes, ''), CASE WHEN admin_notes IS NULL OR admin_notes = '' THEN '' ELSE '\n' END, ?) ELSE admin_notes END
      WHERE id = ?`, [status, req.user.id, status, status, resolutionMessage || reporterMessage, warningToTarget, warningToTarget, reportId]);

    await connection.execute(`INSERT INTO notifications
      (user_id, type, title, message, reference_type, reference_id, related_job_id, related_user_id, action_url)
      VALUES (?, 'SYSTEM', 'Admin reviewed your report', ?, 'REPORT', ?, ?, ?, '/notifications')`,
    [report.reporter_id, `Admin reviewed your report regarding ${report.target_type}: ${reporterMessage}`, reportId, report.reported_job_id || null, accusedUserId || null]);

    if (accusedUserId && (warningToTarget || targetPenalty !== 'none')) {
      const targetMessage = warningToTarget || (targetPenalty === 'suspend_user'
        ? 'Your account has been suspended following a platform moderation review.'
        : 'Your job listing has been taken down following a platform moderation review.');
      await connection.execute(`INSERT INTO notifications
        (user_id, type, title, message, reference_type, reference_id, related_job_id, related_user_id, action_url)
        VALUES (?, 'SYSTEM', 'Platform moderation notice', ?, 'REPORT', ?, ?, ?, '/notifications')`,
      [accusedUserId, `Your account or listing was reported for ${report.issue_category || 'a policy concern'}: ${targetMessage}`, reportId, report.reported_job_id || null, report.reporter_id]);
    }

    await connection.commit();
    return res.json({ success: true, status, targetPenalty, message: 'Report resolution and notifications were saved.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Admin report resolution error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resolve report.' });
  } finally {
    if (connection) connection.release();
  }
};
