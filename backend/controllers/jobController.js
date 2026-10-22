const jobModel = require('../models/jobModel');

async function getJobs(req, res) {
  try {
    return res.json({ success: true, jobs: await jobModel.listJobs() });
  } catch (error) {
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
  const vacancies = Number(req.body.vacancies ?? req.body.vacancy_count ?? 1);
  const minExperience = req.body.min_experience ?? req.body.minExperience;
  if (!Number.isInteger(vacancies) || vacancies < 1) return res.status(400).json({ success: false, message: 'Vacancies must be a whole number of at least 1.' });
  if (minExperience !== undefined && minExperience !== null && minExperience !== '' && (!Number.isInteger(Number(minExperience)) || Number(minExperience) < 0)) {
    return res.status(400).json({ success: false, message: 'Minimum experience must be a non-negative whole number.' });
  }
  try {
    const job = await jobModel.createJob({ ...req.body, employerId: req.user.id });
    return res.status(201).json({ success: true, status: 'pending_approval', message: 'Job submitted for admin approval.', job });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create job.' });
  }
}

module.exports = { getJobs, getJob, createJob };
