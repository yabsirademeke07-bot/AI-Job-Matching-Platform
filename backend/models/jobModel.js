const db = require('../config/db');

const normalizeJobStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  if (['pending', 'pending_approval', 'draft'].includes(value)) return 'pending_approval';
  if (['published', 'active'].includes(value)) return 'active';
  if (['rejected', 'declined'].includes(value)) return 'rejected';
  return 'pending_approval';
};

const normalizeJobRecord = (job = {}) => ({
  ...job,
  status: normalizeJobStatus(job.status),
  rejectionReason: job.rejectionReason ?? job.rejection_reason ?? null,
  reviewedAt: job.reviewedAt ?? job.reviewed_at ?? job.approved_at ?? null,
  reviewedBy: job.reviewedBy ?? job.reviewed_by ?? job.approved_by ?? null,
});

async function listJobs() {
  const [rows] = await db.execute(
    `SELECT j.id, j.employer_id, j.title, j.description, j.category, j.job_type, j.experience_level,
        j.required_skills, j.required_education,
        COALESCE(cp.company_name, j.company_name, u.full_name, 'Company') AS company_name,
        j.location, j.work_mode, j.salary_min, j.salary_max, j.currency, j.status, j.application_deadline,
        j.scheduled_date, DATE_FORMAT(j.scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt,
        CASE WHEN j.status = 'scheduled' AND j.scheduled_date IS NOT NULL THEN TRUE ELSE FALSE END AS isScheduled,
        j.created_at
     FROM jobs j
     JOIN users u ON u.id = j.employer_id
     LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id
     WHERE LOWER(j.status) IN ('active', 'published')
     ORDER BY j.created_at DESC`
  );
  return rows.map((job) => ({ ...job, isScheduled: Boolean(job.isScheduled) }));
}

async function findPublicJobById(id) {
  const [rows] = await db.execute(
    `SELECT j.id, j.employer_id, j.title, j.description, j.category, j.job_type, j.experience_level,
        j.required_skills, j.required_education,
        COALESCE(cp.company_name, j.company_name, u.full_name, 'Company') AS company_name,
        j.location, j.work_mode, j.salary_min, j.salary_max, j.currency, j.status, j.application_deadline,
        j.scheduled_date, DATE_FORMAT(j.scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt,
        CASE WHEN j.status = 'scheduled' AND j.scheduled_date IS NOT NULL THEN TRUE ELSE FALSE END AS isScheduled,
        j.created_at
     FROM jobs j
     JOIN users u ON u.id = j.employer_id
     LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id
     WHERE j.id = ? AND LOWER(j.status) IN ('active', 'published')
     LIMIT 1`,
    [id]
  );
  return rows[0] ? { ...rows[0], isScheduled: Boolean(rows[0].isScheduled) } : null;
}

async function findJobById(id) {
  const [rows] = await db.execute("SELECT *, DATE_FORMAT(scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt, CASE WHEN status = 'scheduled' AND scheduled_date IS NOT NULL THEN TRUE ELSE FALSE END AS isScheduled FROM jobs WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? { ...rows[0], isScheduled: Boolean(rows[0].isScheduled) } : null;
}

async function createJob(job) {
  const title = String(job.title || '').trim();
  const company = String(job.company || job.company_name || '').trim();
  const titleKey = title.toLowerCase();
  const companyKey = company.toLowerCase();

  if (titleKey && companyKey) {
    const [recent] = await db.execute(
      `SELECT id FROM jobs WHERE LOWER(title) = ? AND LOWER(COALESCE(company_name, '')) = ? AND TIMESTAMPDIFF(SECOND, created_at, NOW()) <= 15 LIMIT 1`,
      [titleKey, companyKey]
    );
    if (recent[0]) {
      const error = new Error('Duplicate job detected. This job was already submitted recently.');
      error.statusCode = 409;
      throw error;
    }
  }

  const [result] = await db.execute(
    `INSERT INTO jobs (
      employer_id, title, company_name, description, category, sector, job_type,
      experience_level, location, work_mode, gender_preference, salary_min,
      salary_max, currency, required_education, application_deadline,
      required_skills, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      job.employerId,
      job.title,
      job.company || null,
      job.description,
      job.category || job.sector || null,
      job.sector || null,
      job.jobType,
      job.experienceLevel || 'mid-level',
      job.location || null,
      job.workMode || 'hybrid',
      job.gender || 'any',
      job.salaryMin || null,
      job.salaryMax || null,
      job.currency || 'ETB',
      job.education || 'any',
      job.applicationDeadline || null,
      job.requiredSkills || null,
    ]
  );
  return findJobById(result.insertId);
}

module.exports = { listJobs, findJobById, findPublicJobById, createJob, normalizeJobStatus, normalizeJobRecord };
