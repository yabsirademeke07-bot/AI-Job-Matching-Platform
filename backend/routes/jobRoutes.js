const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getJobs, getJob } = require('../controllers/jobController');
const employerController = require('../controllers/employerController');
const { createJob: createEmployerJob } = employerController;
const { getMatchedJobs } = require('../controllers/seekerMatchingController');
const { applyToJob } = require('../controllers/matchController');

router.get('/', getJobs);
router.post('/', authMiddleware, createEmployerJob);
router.get('/match', authMiddleware, getMatchedJobs);

router.post('/apply', authMiddleware, applyToJob);

router.get('/:jobId/applicants', authMiddleware, employerController.getJobApplicants);

router.get('/:id', getJob);

module.exports = router;
