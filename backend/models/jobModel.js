const db = require('../config/db');

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

async function findJobById(id) {
  const [rows] = await db.execute("SELECT *, DATE_FORMAT(scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt, CASE WHEN status = 'scheduled' AND scheduled_date IS NOT NULL THEN TRUE ELSE FALSE END AS isScheduled FROM jobs WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? { ...rows[0], isScheduled: Boolean(rows[0].isScheduled) } : null;
}

async function createJob(job) {
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

module.exports = { listJobs, findJobById, createJob };
