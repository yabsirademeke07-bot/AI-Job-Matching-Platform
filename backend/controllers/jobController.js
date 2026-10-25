const jobModel = require('../models/jobModel');
const { notifyAdminNewJobSubmitted } = require('../services/telegramNotifier');

function normalizeDeadlineDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  const datePart = text.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (text.length > 10 && Number.isNaN(new Date(text).getTime())) return null;
  return datePart;
}

async function getJobs(req, res) {
  try {
    const result = await jobModel.listJobs(req.query);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Public jobs listing failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load jobs.' });
  }
}

async function getJob(req, res) {
  try {
    const job = await jobModel.findPublicJobById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    return res.json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load job.' });
  }
}

async function createJob(req, res) {
  const { title, description, jobType } = req.body;
  if (!title || !description || !jobType) return res.status(400).json({ success: false, message: 'title, description, and jobType are required.' });
  const salaryPeriod = String(req.body.salary_period ?? req.body.salaryPeriod ?? req.body.salary_type ?? 'monthly').trim().toLowerCase();
  if (!['hourly', 'monthly', 'yearly'].includes(salaryPeriod)) return res.status(400).json({ success: false, message: 'Salary period must be hourly, monthly, or yearly.' });
  const category = String(req.body.category || req.body.sector || 'General').trim().slice(0, 100) || 'General';
  const subCategory = String(req.body.sub_category || req.body.subCategory || '').trim().slice(0, 100) || null;
  const deadlineValue = req.body.deadline ?? req.body.applicationDeadline ?? req.body.application_deadline;
  const deadline = normalizeDeadlineDate(deadlineValue);
  if (deadlineValue && !deadline) return res.status(400).json({ success: false, message: 'Provide a valid application deadline in YYYY-MM-DD format.' });
  if (deadline && deadline < new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({ success: false, message: 'Application deadline must be today or a future date.' });
  }
  const vacancies = Number(req.body.vacancies ?? 1);
  if (!Number.isInteger(vacancies) || vacancies < 1) return res.status(400).json({ success: false, message: 'Vacancies must be a whole number of at least 1.' });
  try {
    const job = await jobModel.createJob({
      ...req.body,
      deadline,
      category,
      sub_category: subCategory,
      salary_period: salaryPeriod,
      employerId: req.user.id,
    });
    try {
      await notifyAdminNewJobSubmitted({ ...job, jobId: job.id });
    } catch (error) {
      console.error('Telegram admin job-submission alert failed:', error.message);
    }
    return res.status(201).json({ success: true, status: job.status, approval_status: job.approval_status, message: 'Job submitted for admin approval.', job });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create job.' });
  }
}

module.exports = { getJobs, getJob, createJob };
