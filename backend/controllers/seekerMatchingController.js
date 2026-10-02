const db = require('../config/db');
const { calculateJobMatches } = require('../services/cvAnalysisService');

const parseJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

async function getCandidateProfile(userId) {
  const [cvRows] = await db.execute(
    'SELECT ai_extracted_data FROM cvs WHERE user_id = ? AND is_active = TRUE ORDER BY is_primary DESC, upload_date DESC LIMIT 1',
    [userId]
  );
  const cv = parseJson(cvRows[0]?.ai_extracted_data, {});
  return { cv, hasUploadedCv: Boolean(cvRows[0]) };
}

async function getMatchedJobs(req, res) {
  try {
    const profile = await getCandidateProfile(req.user.id);
    const [jobs] = await db.query(
      `SELECT j.*, COALESCE(cp.company_name, u.full_name, 'Company') AS company_name,
              sj.id AS saved_id, a.id AS application_id
       FROM jobs j
       JOIN users u ON u.id = j.employer_id
       LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id
       LEFT JOIN saved_jobs sj ON sj.job_id = j.id AND sj.user_id = ?
       LEFT JOIN applications a ON a.job_id = j.id AND a.job_seeker_id = ?
      WHERE LOWER(j.status) IN ('active', 'published')
       ORDER BY j.created_at DESC`,
      [req.user.id, req.user.id]
    );
    const jobIds = jobs.map((job) => job.id);
    const skillsByJob = new Map();
    if (jobIds.length) {
      const [requiredSkills] = await db.query('SELECT job_id, skill_name, skill_weight FROM job_required_skills WHERE job_id IN (?) ORDER BY id', [jobIds]);
      requiredSkills.forEach((skill) => {
        const skills = skillsByJob.get(skill.job_id) || [];
        skills.push({ name: skill.skill_name, weight: skill.skill_weight });
        skillsByJob.set(skill.job_id, skills);
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
      isSaved: Boolean(job.saved_id),
      isApplied: Boolean(job.application_id),
      workSetup: job.work_mode,
      salary: job.salary_min || job.salary_max ? `${job.currency || 'ETB'} ${job.salary_min || ''}${job.salary_min && job.salary_max ? ' - ' : ''}${job.salary_max || ''}` : 'Negotiable',
      rationale: profile.hasUploadedCv && job.match_score !== null
        ? `${job.matched_skills.length} of ${job.required_skills.length} listed required skills match your uploaded CV.`
        : 'Upload a CV and add required skills to this job to calculate a match.',
      rank: index + 1,
    }));
    return res.json({ success: true, jobs: req.query?.all === 'true' ? matches : matches.slice(0, 3) });
  } catch (error) {
    console.error('Matched jobs query failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to calculate matched jobs.' });
  }
}

async function createApplication(req, res) {
  const { jobId, resumeSnapshot } = req.body || {};
  if (!jobId) return res.status(400).json({ success: false, message: 'jobId is required.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[job]] = await connection.query("SELECT id FROM jobs WHERE id = ? AND LOWER(status) IN ('active', 'published') LIMIT 1", [jobId]);
    if (!job) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'This job is no longer available.' });
    }
    const [[existing]] = await connection.query('SELECT id FROM applications WHERE job_id = ? AND job_seeker_id = ? LIMIT 1', [jobId, req.user.id]);
    if (existing) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'You have already applied for this job.', applicationId: existing.id });
    }
    const [[cv]] = await connection.query('SELECT id, file_name, ai_extracted_data FROM cvs WHERE user_id = ? AND is_active = TRUE ORDER BY is_primary DESC, upload_date DESC LIMIT 1', [req.user.id]);
    const snapshot = resumeSnapshot || { cvId: cv?.id || null, fileName: cv?.file_name || null, extractedData: parseJson(cv?.ai_extracted_data, {}) };
    const [result] = await connection.query("INSERT INTO applications (job_id, job_seeker_id, cv_id, status, resume_snapshot, applied_at) VALUES (?, ?, ?, 'under-review', ?, NOW())", [jobId, req.user.id, cv?.id || null, JSON.stringify(snapshot)]);
    await connection.query('UPDATE jobs SET application_count = application_count + 1 WHERE id = ?', [jobId]);
    await connection.commit();
    return res.status(201).json({ success: true, application: { id: result.insertId, jobId: Number(jobId), candidateId: req.user.id, appliedAt: new Date().toISOString(), status: 'Under Review', resumeSnapshot: snapshot } });
  } catch (error) {
    await connection.rollback();
    console.error('Application creation failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to submit application.' });
  } finally { connection.release(); }
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

module.exports = { getMatchedJobs, createApplication, saveJob, unsaveJob };
