const db = require('../connection');

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return String(value || '').toLowerCase() === 'true' || value === 1;
};

exports.getPlatformAnalytics = async (req, res) => {
  try {
    const [seekerCount] = await db.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'job_seeker'");
    const [employerCount] = await db.execute("SELECT COUNT(*) AS total, SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) AS verified FROM company_profiles");
    const [activeJobsCount] = await db.execute("SELECT COUNT(*) AS count FROM jobs WHERE status = 'published'");
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
      SELECT cp.*, u.full_name AS rep_name, u.email AS rep_email, u.phone AS rep_phone
      FROM company_profiles cp
      JOIN users u ON cp.employer_id = u.id
      ORDER BY cp.created_at DESC
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
    await db.execute('UPDATE company_profiles SET is_verified = ?, verification_status = ?, verified_at = ? WHERE id = ?', [status === 'verified' ? 1 : 0, status, status === 'verified' ? new Date() : null, id]);
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
    const [analytics, companies, jobs, users, logs] = await Promise.all([
      exports.getPlatformAnalyticsData(),
      db.execute(`SELECT cp.*, u.full_name AS rep_name, u.email AS rep_email, u.phone AS rep_phone FROM company_profiles cp JOIN users u ON cp.employer_id = u.id ORDER BY cp.created_at DESC`),
      db.execute(`SELECT j.*, cp.company_name, cp.logo_url, cp.location AS company_location, COUNT(a.id) AS total_applicants FROM jobs j LEFT JOIN company_profiles cp ON j.employer_id = cp.employer_id LEFT JOIN applications a ON j.id = a.job_id GROUP BY j.id ORDER BY j.created_at DESC`),
      db.execute('SELECT id, full_name, email, phone, role, is_verified, is_active, created_at FROM users ORDER BY created_at DESC'),
      db.execute(`SELECT u.full_name, u.email, u.role, l.activity_type, l.related_job_id, l.created_at FROM user_activity_log l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC LIMIT 30`),
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
  const [jobs] = await db.execute("SELECT COUNT(*) AS active FROM jobs WHERE status = 'published'");
  const [apps] = await db.execute('SELECT COUNT(*) AS total, AVG(ai_match_score) AS avg_score FROM applications');
  const [skills] = await db.execute('SELECT skill_name, COUNT(*) AS usage_count FROM job_required_skills GROUP BY skill_name ORDER BY usage_count DESC LIMIT 1');
  const [placements] = await db.execute("SELECT AVG(DATEDIFF(a.updated_at, a.applied_at)) AS avg_days FROM applications a WHERE a.status = 'hired'");
  return {
    seekersCount: Number(seekers[0]?.count || 0),
    employersTotal: Number(employers[0]?.total || 0),
    employersVerified: Number(employers[0]?.verified || 0),
    activeJobsCount: Number(jobs[0]?.active || 0),
    totalApplications: Number(apps[0]?.total || 0),
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
    const [rows] = await db.execute(`SELECT j.id, j.title, j.description, j.required_education, j.years_of_experience_min, j.years_of_experience_max, j.category, j.work_mode, j.salary_min, j.salary_max, j.currency, j.benefits, j.location, cp.company_name FROM jobs j LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id WHERE j.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found.' });
    return res.json({ success: true, job: rows[0] });
  } catch (error) {
    console.error('Admin Job Preview Error:', error);
    return res.status(500).json({ success: false, message: 'Unable to preview job.' });
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
    const { jobId } = req.params;
    const { status } = req.body;
    const nextStatus = ['published', 'closed', 'suspended', 'draft'].includes(status) ? status : 'draft';

    const [rows] = await db.execute('SELECT id FROM jobs WHERE id = ?', [jobId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found.' });

    await db.execute('UPDATE jobs SET status = ? WHERE id = ?', [nextStatus, jobId]);

    return res.status(200).json({ success: true, status: nextStatus, message: 'Job moderation status updated.' });
  } catch (error) {
    console.error('Admin toggle job status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update job status.' });
  }
};
