const db = require('../config/db');

const normalizeJobStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  if (['draft', 'pending', 'published', 'active', 'paused', 'closed', 'expired'].includes(value)) return value;
  if (value === 'scheduled') return 'published';
  if (['pending_approval', 'rejected', 'declined'].includes(value)) return value === 'pending_approval' ? 'pending' : 'rejected';
  if (['approved', 'open'].includes(value)) return 'active';
  if (value === 'inactive') return 'paused';
  return 'draft';
};

const normalizeJobRecord = (job = {}) => ({
  ...job,
  status: normalizeJobStatus(job.status),
  rejectionReason: job.rejectionReason ?? job.rejection_reason ?? null,
  reviewedAt: job.reviewedAt ?? job.reviewed_at ?? null,
  reviewedBy: job.reviewedBy ?? job.reviewed_by ?? null,
});

const parsePagination = (query = {}) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 50)
    : 4;
  return { page, limit, offset: (page - 1) * limit };
};

function buildPublicJobFilters(filters = {}) {
  const clauses = [
    "LOWER(j.status) = 'active'",
    "LOWER(j.approval_status) = 'approved'",
    'j.is_approved = TRUE',
    'j.is_active = TRUE',
    '(j.deadline IS NULL OR j.deadline >= CURDATE())',
    '(j.scheduled_date IS NULL OR j.scheduled_date <= NOW())',
  ];
  const params = [];
  const addLike = (expression, value) => {
    const normalizedValue = String(value || '').trim().toLowerCase();
    if (!normalizedValue) return;
    const escapedValue = normalizedValue.replace(/[\\%_]/g, '\\$&');
    clauses.push(`${expression} LIKE ?`);
    params.push(`%${escapedValue}%`);
  };

  const search = String(filters.search || filters.q || '').trim().toLowerCase();
  if (search) {
    const escapedSearch = search.replace(/[\\%_]/g, '\\$&');
    clauses.push(`(
      LOWER(j.title) LIKE ? OR LOWER(j.required_skills) LIKE ?
      OR LOWER(COALESCE(j.sector, '')) LIKE ?
      OR LOWER(j.company_name) LIKE ? OR LOWER(cp.company_name) LIKE ? OR LOWER(u.full_name) LIKE ?
    )`);
    params.push(...Array(6).fill(`%${escapedSearch}%`));
  }

  addLike("LOWER(COALESCE(j.sector, ''))", filters.sector || filters.category);
  addLike("LOWER(COALESCE(j.location, ''))", filters.location);
  const requestedTypes = String(filters.jobTypes || filters.jobType || filters.job_type || '')
    .split('|')
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean);
  if (requestedTypes.length) {
    clauses.push(`(${requestedTypes.map(() => "LOWER(COALESCE(j.job_type, '')) LIKE ?").join(' OR ')})`);
    requestedTypes.forEach((type) => {
      params.push(`%${type.replace(/[\\%_]/g, '\\$&')}%`);
    });
  }
  addLike("LOWER(COALESCE(j.work_mode, ''))", filters.workMode || filters.work_mode);
  addLike("LOWER(REPLACE(COALESCE(j.experience_level, ''), '-', ' '))", filters.experience);
  addLike("LOWER(COALESCE(j.gender_preference, ''))", filters.gender);

  const education = String(filters.education || '').trim().toLowerCase();
  if (education && education !== 'select education level') {
    const educationTerm = education.includes('bachelor') ? 'bachelor'
      : education.includes('master') ? 'master'
        : education.includes('phd') ? 'phd'
          : education.includes('high school') ? 'high'
            : education.includes('not required') || education.includes('any') ? 'any'
              : education.replace(/[’']/g, '');
    addLike("LOWER(COALESCE(j.education_qualification, ''))", educationTerm);
  }

  const minimumSalary = Number(filters.minSalary ?? filters.min_salary);
  const currency = String(filters.currency || '').trim();
  if (Number.isFinite(minimumSalary) && minimumSalary > 0 && currency) {
    clauses.push('(LOWER(j.currency) <> LOWER(?) OR COALESCE(j.salary_min, 0) >= ?)');
    params.push(currency, minimumSalary);
  }

  const datePosted = String(filters.datePosted || '').toLowerCase();
  const dateIntervals = { '24h': 1, '7d': 7, '30d': 30 };
  if (dateIntervals[datePosted]) {
    clauses.push('j.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
    params.push(dateIntervals[datePosted]);
  }

  return { where: clauses.join(' AND '), params };
}

async function listJobs(query = {}) {
  const pagination = parsePagination(query);
  const [activeJobs] = await db.execute(
    `SELECT * FROM jobs
     WHERE approval_status = 'approved'
       AND is_approved = TRUE
       AND status = 'active'
       AND is_active = TRUE
       AND (deadline IS NULL OR deadline >= CURDATE())
       AND (scheduled_date IS NULL OR scheduled_date <= NOW())
     ORDER BY created_at DESC`,
  );
  const search = String(query.search || query.q || '').trim().toLowerCase();
  const requestedTypes = String(query.jobTypes || query.jobType || query.job_type || '')
    .split('|').map((value) => value.trim().toLowerCase()).filter(Boolean);
  const minimumSalary = Number(query.minSalary ?? query.min_salary);
  const currency = String(query.currency || '').trim().toLowerCase();
  const dateDays = { '24h': 1, '7d': 7, '30d': 30 }[String(query.datePosted || '').toLowerCase()];
  const filteredJobs = activeJobs.filter((job) => {
    if (String(job.approval_status || '').toLowerCase() !== 'approved'
      || ![true, 1, '1'].includes(job.is_approved)
      || String(job.status || '').toLowerCase() !== 'active'
      || ![true, 1, '1'].includes(job.is_active)) return false;
    const skills = String(job.required_skills || '');
    const company = String(job.company_name || '');
    const sector = String(job.sector || job.category || '');
    const searchable = [job.title, skills, sector, company].join(' ').toLowerCase();
    if (search && !searchable.includes(search)) return false;
    if (query.sector && !sector.toLowerCase().includes(String(query.sector).trim().toLowerCase())) return false;
    if (query.location && !String(job.location || '').toLowerCase().includes(String(query.location).trim().toLowerCase())) return false;
    if (requestedTypes.length && !requestedTypes.some((type) => String(job.job_type || '').toLowerCase().includes(type))) return false;
    if (query.workMode && !String(job.work_mode || '').toLowerCase().includes(String(query.workMode).trim().toLowerCase())) return false;
    if (query.experience && !String(job.experience_level || '').toLowerCase().replace(/-/g, ' ').includes(String(query.experience).trim().toLowerCase())) return false;
    if (query.gender && !String(job.gender_preference || '').toLowerCase().includes(String(query.gender).trim().toLowerCase())) return false;
    if (query.education && !String(job.education_qualification || '').toLowerCase().includes(String(query.education).trim().toLowerCase())) return false;
    if (Number.isFinite(minimumSalary) && minimumSalary > 0 && currency
      && String(job.currency || '').toLowerCase() === currency
      && Number(job.salary_min || 0) < minimumSalary) return false;
    if (dateDays) {
      const createdAt = new Date(job.created_at).getTime();
      if (Number.isFinite(createdAt) && createdAt < Date.now() - dateDays * 24 * 60 * 60 * 1000) return false;
    }
    return true;
  }).sort((first, second) => (
    new Date(second.created_at || 0).getTime() - new Date(first.created_at || 0).getTime()
      || Number(second.id) - Number(first.id)
  ));
  const totalJobs = filteredJobs.length;
  const rows = filteredJobs.slice(pagination.offset, pagination.offset + pagination.limit);
  return {
    jobs: rows.map((job) => ({
      ...job,
      category: job.category || job.sector,
      sub_category: job.sub_category || job.sub_sectors,
      isScheduled: Boolean(job.scheduled_date && new Date(job.scheduled_date).getTime() > Date.now()),
    })),
    pagination: {
      currentPage: pagination.page,
      totalPages: Math.ceil(totalJobs / pagination.limit),
      totalJobs,
      hasMore: pagination.page * pagination.limit < totalJobs,
    },
  };
}

async function findPublicJobById(id) {
  const [rows] = await db.execute(
    `SELECT j.id, j.employer_id, j.title, j.description, j.sector AS category, j.sub_sectors AS sub_category, j.job_type, j.experience_level,
      j.required_skills, j.education_qualification,
        COALESCE(
          NULLIF(NULLIF(j.company_name, ''), CONCAT(u.full_name, CHAR(39), 's Company')),
          NULLIF(NULLIF(cp.company_name, ''), CONCAT(u.full_name, CHAR(39), 's Company')),
          'Company'
        ) AS company_name,
        j.location, j.work_address, j.state_province, j.work_mode, j.salary_min, j.salary_max, j.currency, j.salary_period, j.is_salary_negotiable, j.benefits, j.vacancies, j.status, j.approval_status, j.is_approved, j.is_active, j.deadline,
        CASE WHEN j.deadline < CURRENT_DATE THEN TRUE ELSE FALSE END AS is_expired,
        j.scheduled_date, DATE_FORMAT(j.scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt,
        CASE WHEN j.scheduled_date IS NOT NULL AND j.scheduled_date > NOW() THEN TRUE ELSE FALSE END AS isScheduled,
        j.created_at
     FROM jobs j
     JOIN users u ON u.id = j.employer_id
     LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id
     WHERE j.id = ?
       AND j.approval_status = 'approved'
       AND j.is_approved = TRUE
       AND j.status = 'active'
       AND j.is_active = TRUE
       AND (j.deadline IS NULL OR j.deadline >= CURDATE())
       AND (j.scheduled_date IS NULL OR j.scheduled_date <= NOW())
     LIMIT 1`,
    [id]
  );
  return rows[0] ? {
    ...rows[0],
    isScheduled: Boolean(rows[0].isScheduled),
  } : null;
}

async function findJobById(id) {
  const [rows] = await db.execute("SELECT *, DATE_FORMAT(scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt, CASE WHEN scheduled_date IS NOT NULL AND scheduled_date > NOW() THEN TRUE ELSE FALSE END AS isScheduled FROM jobs WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? {
    ...rows[0],
    isScheduled: Boolean(rows[0].isScheduled),
  } : null;
}

async function createJob(job) {
  const title = String(job.title || '').trim();
  const company = String(job.company_name || job.company || '').trim();
  const sector = String(job.sector || job.category || 'General').trim() || 'General';
  const subSectors = job.sub_sectors || job.subSectors || null;
  const salaryPeriod = ['hourly', 'monthly', 'yearly'].includes(String(job.salary_period || job.salary_type || '').toLowerCase())
    ? String(job.salary_period || job.salary_type).toLowerCase()
    : 'monthly';
  const salaryNegotiable = job.is_salary_negotiable ?? job.is_negotiable ?? true;
  const educationQualification = job.education_qualification || job.educationQualification || job.required_education || job.education || 'Bachelor\'s Degree';
  const vacancies = Number(job.vacancies ?? 1);
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
      employer_id, title, company_name, description, sector, sub_sectors, job_type,
      experience_level, location, work_address, work_mode, gender_preference, salary_min,
      salary_max, currency, salary_period, is_salary_negotiable, benefits,
      education_qualification, vacancies, deadline, required_skills, status, approval_status, is_approved, is_active, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', FALSE, FALSE, NULL)`,
    [
      job.employerId,
      job.title,
      company || null,
      job.description,
      sector,
      subSectors,
      job.jobType,
      job.experienceLevel || 'mid-level',
      job.location || null,
      job.work_address || job.workAddress || null,
      job.workMode || 'hybrid',
      job.gender || 'any',
      job.salaryMin || null,
      job.salaryMax || null,
      job.currency || 'ETB',
      salaryPeriod,
      salaryNegotiable,
      job.benefits || null,
      educationQualification,
      vacancies,
      job.deadline || job.applicationDeadline || null,
      job.requiredSkills || null,
    ]
  );
  return findJobById(result.insertId);
}

module.exports = { listJobs, findJobById, findPublicJobById, createJob, normalizeJobStatus, normalizeJobRecord, buildPublicJobFilters, parsePagination };
