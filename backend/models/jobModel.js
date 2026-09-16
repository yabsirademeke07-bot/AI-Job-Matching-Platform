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
    `SELECT id, employer_id, title, company_name, description, category, sector,
            job_type, vacancy_level AS experience_level, location, work_mode,
            salary_min, salary_max, compensation_currency AS currency, required_skills,
            status, rejection_reason AS rejectionReason, approved_at AS reviewedAt,
            approved_by AS reviewedBy, application_deadline, deadline, created_at
    FROM jobs WHERE LOWER(status) = 'active' AND is_approved = TRUE ORDER BY created_at DESC`
  );
  return rows.map(normalizeJobRecord);
}

async function findJobById(id) {
  const [rows] = await db.execute(
    `SELECT j.*, j.rejection_reason AS rejectionReason, j.approved_at AS reviewedAt, j.approved_by AS reviewedBy
     FROM jobs j WHERE j.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? normalizeJobRecord(rows[0]) : null;
}

async function findPublicJobById(id) {
  const [rows] = await db.execute(
    `SELECT j.*, j.rejection_reason AS rejectionReason, j.approved_at AS reviewedAt, j.approved_by AS reviewedBy
     FROM jobs j WHERE j.id = ? AND LOWER(j.status) = 'active' AND j.is_approved = TRUE LIMIT 1`,
    [id]
  );
  return rows[0] ? normalizeJobRecord(rows[0]) : null;
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
