const db = require('../connection');
const { normalizeJobStatus } = require('../models/jobModel');

const safeExecute = async (query, params = [], fallback = []) => {
  try {
    return await db.execute(query, params);
  } catch (error) {
    console.warn('Admin optional query skipped:', error.message);
    return [fallback, []];
  }
};

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return String(value || '').toLowerCase() === 'true' || value === 1;
};

exports.getAdminDashboardStats = async (req, res) => {
  const emptyStats = { totalUsers: 0, jobSeekersCount: 0, employersCount: 0, activeJobs: 0, avgMatchScore: 0, moderationQueueCount: 0, pipeline: { pending: 0, shortlisted: 0, interviewing: 0, hired: 0, rejected: 0 } };
  try {
    const [[users], [seekers], [employers], [jobs], [verification], [reports], [average], [pipeline]] = await Promise.all([
      db.execute('SELECT COUNT(*) AS count FROM users'),
      db.execute("SELECT COUNT(*) AS count FROM users WHERE role IN ('job_seeker', 'employee', 'seeker')"),
      db.execute("SELECT COUNT(*) AS count FROM users WHERE role IN ('employer', 'company', 'recruiter')"),
      db.execute("SELECT COUNT(*) AS count FROM jobs WHERE LOWER(status) IN ('active', 'published')"),
      db.execute("SELECT COUNT(*) AS count FROM company_profiles WHERE verification_status = 'pending'"),
      db.execute("SELECT COUNT(*) AS count FROM reports WHERE status = 'pending'"),
      db.execute('SELECT AVG(ai_match_score) AS score FROM applications WHERE ai_match_score IS NOT NULL'),
      db.execute("SELECT status, COUNT(*) AS count FROM applications GROUP BY status"),
    ]);
    const pipelineStats = { pending: 0, shortlisted: 0, interviewing: 0, hired: 0, rejected: 0 };
    pipeline.forEach((row) => { const key = row.status === 'interview-scheduled' ? 'interviewing' : row.status; if (key in pipelineStats) pipelineStats[key] = Number(row.count || 0); });
    const [pendingJobs] = await db.execute("SELECT COUNT(*) AS count FROM jobs WHERE LOWER(status) IN ('pending', 'pending_approval', 'draft')");
    return res.status(200).json({ success: true, stats: { totalUsers: Number(users[0]?.count || 0), jobSeekersCount: Number(seekers[0]?.count || 0), employersCount: Number(employers[0]?.count || 0), activeJobs: Number(jobs[0]?.count || 0), avgMatchScore: average[0]?.score == null ? 0 : Number(Number(average[0].score).toFixed(1)), moderationQueueCount: Number(verification[0]?.count || 0) + Number(pendingJobs[0]?.count || 0) + Number(reports[0]?.count || 0), pipeline: pipelineStats } });
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
    const [profileResult] = await db.execute('UPDATE company_profiles SET is_verified = ?, verification_status = ?, verified_at = ? WHERE id = ? OR employer_id = ?', [status === 'verified' ? 1 : 0, status, status === 'verified' ? new Date() : null, id, id]);
    if (!profileResult.affectedRows) {
      await db.execute('UPDATE employers SET verification_status = ?, verificationStatus = ? WHERE id = ? OR user_id = ? OR userId = ?', [status, status, id, id, id]);
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
    const [analytics, companies, jobs, users, logs, applications, reports, notifications, performance, categories] = await Promise.all([
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
      `),
      safeExecute(`SELECT j.*, cp.company_name, cp.logo_url, cp.location AS company_location, COUNT(a.id) AS total_applicants FROM jobs j LEFT JOIN company_profiles cp ON j.employer_id = cp.employer_id LEFT JOIN applications a ON j.id = a.job_id GROUP BY j.id ORDER BY j.created_at DESC`),
      safeExecute('SELECT id, full_name, email, phone, role, is_verified, is_active, created_at FROM users ORDER BY created_at DESC'),
      safeExecute(`SELECT u.full_name, u.email, u.role, l.activity_type, l.related_job_id, l.created_at FROM user_activity_log l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC LIMIT 30`),
      safeExecute(`SELECT a.id, a.status, a.ai_match_score, a.skills_match_score, a.experience_match_score, a.education_match_score, a.location_match_score, a.applied_at, candidate.full_name AS candidate_name, j.title AS job_title, employer.full_name AS employer_name FROM applications a JOIN users candidate ON candidate.id = a.job_seeker_id JOIN jobs j ON j.id = a.job_id JOIN users employer ON employer.id = j.employer_id ORDER BY a.applied_at DESC LIMIT 100`),
      safeExecute(`SELECT r.*, reporter.full_name AS reporter_name, reporter.email AS reporter_email, target_user.full_name AS reported_user_name, target_job.title AS reported_job_title FROM reports r JOIN users reporter ON reporter.id = r.reporter_id LEFT JOIN users target_user ON target_user.id = r.reported_user_id LEFT JOIN jobs target_job ON target_job.id = r.reported_job_id ORDER BY r.created_at DESC LIMIT 100`),
      safeExecute(`SELECT n.*, u.full_name AS recipient_name FROM notifications n JOIN users u ON u.id = n.user_id ORDER BY n.created_at DESC LIMIT 100`),
      safeExecute(`SELECT DATE(applied_at) AS day, COUNT(*) AS applications, ROUND(AVG(COALESCE(ai_match_score, 0)), 1) AS average_score FROM applications WHERE applied_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(applied_at) ORDER BY day`),
      safeExecute(`SELECT COALESCE(NULLIF(category, ''), 'Other') AS category, COUNT(*) AS total FROM jobs GROUP BY COALESCE(NULLIF(category, ''), 'Other') ORDER BY total DESC LIMIT 6`),
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
  if (action === 'reject' && !reason) return res.status(422).json({ success: false, message: 'A rejection reason is required.' });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT j.id, j.title, j.employer_id, u.email AS employer_email FROM jobs j JOIN users u ON u.id = j.employer_id WHERE j.id = ? FOR UPDATE', [jobId]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Job not found.' }); }
    const job = rows[0];
    await connection.execute(
      `UPDATE jobs
       SET status = ?,
           is_approved = ?,
           rejection_reason = ?,
           approved_by = ?,
           approved_at = CASE WHEN ? = 'active' THEN NOW() ELSE NULL END,
           reviewed_by = ?,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
         [nextStatus, nextStatus === 'active', nextStatus === 'rejected' ? reason : null, nextStatus === 'active' ? req.user.id : null, nextStatus, req.user.id, jobId]
    );
    const message = nextStatus === 'active' ? `Your job listing '${job.title}' has been approved and is now live.` : `Your job listing '${job.title}' was rejected: ${reason}`;
    try {
      await connection.execute('INSERT INTO notifications (user_id, type, title, message, related_job_id, action_url) VALUES (?, \'company-update\', ?, ?, ?, ?)', [job.employer_id, nextStatus === 'active' ? 'Job approved' : 'Job listing needs changes', message, jobId, '/employer/jobs']);
    } catch (notificationError) {
      console.warn('Generic employer notification skipped:', notificationError.message);
    }
    try {
      await connection.execute('INSERT INTO employer_notifications (employerId, title, body, isRead, related_job_id) VALUES (?, ?, ?, FALSE, ?)', [job.employer_id, nextStatus === 'active' ? 'Job approved' : 'Job listing needs changes', message, jobId]);
    } catch (notificationError) {
      console.warn('Employer notification skipped:', notificationError.message);
    }
    try {
      await connection.execute('INSERT INTO admin_actions_log (admin_id, action_type, target_job_id, reason) VALUES (?, \'content-moderated\', ?, ?)', [req.user.id, jobId, reason || `Job status changed to ${nextStatus}`]);
    } catch (auditError) {
      console.warn('Admin moderation audit skipped:', auditError.message);
    }
    await connection.commit();
    return res.json({ success: true, status: nextStatus, message: nextStatus === 'active' ? 'Job approved and published successfully!' : 'Job posting has been rejected.' });
  } catch (error) {
    await connection.rollback();
    console.error('Admin job moderation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to persist job moderation action.' });
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
    const [rows] = await db.execute('SELECT is_active FROM users WHERE id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });

    const nextStatus = rows[0].is_active === 1 ? 0 : 1;
    await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [nextStatus, userId]);

    return res.status(200).json({
      success: true,
      message: nextStatus ? 'User activated successfully.' : 'User suspended successfully.',
      is_active: nextStatus,
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
    if (nextStatus === 'rejected' && !reason) {
      return res.status(422).json({ success: false, message: 'A rejection reason is required.' });
    }

    const [rows] = await db.execute('SELECT id, title, employer_id FROM jobs WHERE id = ?', [jobId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found.' });

    await db.execute(
      `UPDATE jobs
       SET status = ?,
           is_approved = ?,
           rejection_reason = CASE WHEN ? = 'rejected' THEN ? ELSE NULL END,
           approved_by = CASE WHEN ? = 'active' THEN ? ELSE approved_by END,
           approved_at = CASE WHEN ? = 'active' THEN NOW() ELSE approved_at END,
           reviewed_by = ?,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [nextStatus, nextStatus === 'active', nextStatus, reason, nextStatus, req.user.id, nextStatus, req.user.id, jobId]
    );

    if (nextStatus === 'active' || nextStatus === 'rejected') {
      const message = nextStatus === 'active'
        ? `Your job listing '${rows[0].title}' has been approved and is now live.`
        : `Your job listing '${rows[0].title}' was rejected: ${reason}`;
      const title = nextStatus === 'active' ? 'Job approved' : 'Job listing needs changes';
      try {
        await db.execute('INSERT INTO notifications (user_id, type, title, message, related_job_id, action_url) VALUES (?, \'company-update\', ?, ?, ?, ?)', [rows[0].employer_id, title, message, jobId, '/employer/jobs']);
      } catch (notificationError) {
        console.warn('Generic employer notification skipped:', notificationError.message);
      }
      try {
        await db.execute('INSERT INTO employer_notifications (employerId, title, body, isRead, related_job_id) VALUES (?, ?, ?, FALSE, ?)', [rows[0].employer_id, title, message, jobId]);
      } catch (notificationError) {
        console.warn('Employer notification skipped:', notificationError.message);
      }
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
