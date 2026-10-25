const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getApplications,
  withdrawApplication,
  saveApplicationNote,
  getApplicationInterview,
  requestInterviewReschedule,
} = require('../controllers/jobSeekerController');

const router = express.Router();
const rootAppRouter = express.Router();

router.use(authMiddleware);

router.get('/my-applications', getApplications);
router.post('/:applicationId/withdraw', withdrawApplication);
router.post('/:applicationId/notes', saveApplicationNote);
router.get('/:applicationId/interview', getApplicationInterview);
router.post('/:applicationId/interview/reschedule', requestInterviewReschedule);

rootAppRouter.get('/my-applications', authMiddleware, getApplications);

module.exports = { applicationRoutes: router, rootAppRouter };
