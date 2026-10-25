const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const controller = require('../controllers/employerController');
const smsController = require('../controllers/smsController');
const matchingController = require('../controllers/employerMatchingController');
const db = require('../connection');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();
const companyLogoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
});
const employerDocumentDir = path.resolve(__dirname, '..', 'private', 'employer-documents');
fs.mkdirSync(employerDocumentDir, { recursive: true });
const tinCertificateUpload = multer({
  storage: multer.diskStorage({
    destination: employerDocumentDir,
    filename: (_req, file, callback) => {
      callback(null, `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedFiles = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    if (allowedFiles[extension] === file.mimetype) return callback(null, true);
    return callback(new Error('Upload a PDF, JPG, or PNG certificate.'));
  },
});

const tradeLicenseUpload = multer({
  storage: multer.diskStorage({
    destination: employerDocumentDir,
    filename: (_req, file, callback) => {
      callback(null, `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedFiles = {
      '.pdf': ['application/pdf', 'application/x-pdf'],
      '.jpg': ['image/jpeg', 'image/jpg'],
      '.jpeg': ['image/jpeg', 'image/jpg'],
      '.png': ['image/png'],
    };
    const mimeType = String(file.mimetype || '').toLowerCase();
    const hasAllowedExtension = Boolean(allowedFiles[extension]);
    const hasAllowedMimeType = !mimeType
      || ['application/octet-stream', 'binary/octet-stream'].includes(mimeType)
      || allowedFiles[extension]?.includes(mimeType);
    if (hasAllowedExtension && hasAllowedMimeType) return callback(null, true);
    return callback(new Error('Please upload a valid document (PDF, PNG, or JPG between 20KB and 10MB).'));
  },
});

const parseTinCertificateUpload = (req, res, next) => {
  tinCertificateUpload.single('certificate')(req, res, (error) => {
    if (!error) return next();
    const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Unable to process the certificate upload.' });
  });
};

const parseTradeLicenseUpload = (req, res, next) => {
  tradeLicenseUpload.single('document')(req, res, async (error) => {
    const validationMessage = 'Please upload a valid document (PDF, PNG, or JPG between 20KB and 10MB).';
    if (error) {
      const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 'The business document must be 10 MB or smaller.'
        : error.message || validationMessage;
      return res.status(status).json({ success: false, message });
    }
    if (!req.file) return res.status(400).json({ success: false, message: validationMessage });
    if (req.file.size < 20 * 1024) {
      await fs.promises.unlink(req.file.path).catch((unlinkError) => {
        console.error('Unable to remove undersized trade-license document:', unlinkError.message);
      });
      return res.status(400).json({ success: false, message: validationMessage });
    }
    let fileHeader;
    try {
      const fileHandle = await fs.promises.open(req.file.path, 'r');
      try {
        fileHeader = Buffer.alloc(8);
        await fileHandle.read(fileHeader, 0, fileHeader.length, 0);
      } finally {
        await fileHandle.close();
      }
    } catch (inspectionError) {
      await fs.promises.unlink(req.file.path).catch((unlinkError) => {
        console.error('Unable to remove unreadable trade-license document:', unlinkError.message);
      });
      console.error('Unable to inspect uploaded trade-license document:', inspectionError.message);
      return res.status(500).json({ success: false, message: 'Unable to inspect the business document.' });
    }
    const extension = path.extname(req.file.originalname).toLowerCase();
    const hasValidSignature = extension === '.pdf'
      ? fileHeader.subarray(0, 5).toString('ascii') === '%PDF-'
      : extension === '.png'
        ? fileHeader.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        : fileHeader[0] === 0xff && fileHeader[1] === 0xd8 && fileHeader[2] === 0xff;
    if (!hasValidSignature) {
      await fs.promises.unlink(req.file.path).catch((unlinkError) => {
        console.error('Unable to remove invalid trade-license document:', unlinkError.message);
      });
      return res.status(400).json({ success: false, message: 'The selected file is not a valid PDF, PNG, or JPG document.' });
    }
    return next();
  });
};

const employerOnly = async (req, res, next) => {
  const employerRoles = ['employer', 'company', 'recruiter'];
  if (employerRoles.includes(String(req.user.role || '').toLowerCase())) return next();

  const userId = req.user.id || req.user.userId || req.user.user_id || req.user.sub;
  if (!userId) return res.status(403).json({ success: false, message: 'Employer access required.' });

  try {
    const [rows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [userId]);
    if (employerRoles.includes(String(rows[0]?.role || '').toLowerCase())) {
      req.user.role = rows[0].role;
      return next();
    }
  } catch (error) {
    console.error('Employer role lookup failed:', error.message);
  }

  return res.status(403).json({ success: false, message: 'Employer access required.' });
};
const isEmployerApiPath = (path) => path === '/jobs' || path.startsWith('/jobs/') || path === '/interviews' || path.startsWith('/interviews/') || path === '/employer' || path.startsWith('/employer/') || path === '/applications' || path.startsWith('/applications/');

router.use((req, res, next) => {
  const isPublicJobsListing = req.path === '/jobs' && req.method === 'GET';

  if (isPublicJobsListing) return next();

  return isEmployerApiPath(req.path)
    ? authenticate(req, res, (error) => error ? next(error) : employerOnly(req, res, next))
    : next();
});
router.get('/employer/profile', controller.getCompanyProfile);
router.post('/employer/profile/logo', (req, res, next) => {
  companyLogoUpload.single('logo')(req, res, (error) => {
    if (!error) return next();
    const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Unable to process the company logo.' });
  });
}, controller.uploadCompanyLogo);
router.get('/employer/profile/tin-certificate/:filename', controller.getTinCertificate);
router.get('/employer/profile/trade-license/:filename', controller.getTradeLicense);
router.put('/employer/profile', controller.updateCompanyProfile);
router.post('/employer/profile', controller.updateCompanyProfile);
router.post('/employer/profile/tin-certificate', parseTinCertificateUpload, controller.uploadTinCertificate);
router.post('/employer/profile/trade-license', parseTradeLicenseUpload, controller.uploadTradeLicense);
router.get('/employer/stats', controller.getDashboardStats);
router.get('/employer/dashboard-stats', controller.getEmployerDashboardStats);
router.get('/employer/matching/jobs', matchingController.getJobs);
router.get('/employer/matching/candidates/:jobId', matchingController.getCandidates);
router.post('/employer/matching/run/:jobId', matchingController.runMatching);
router.post('/employer/jobs/:jobId/ai-match-rank', matchingController.rankCandidates);
router.post('/employer/applications/bulk-status', matchingController.bulkUpdateApplicationStatus);
router.post('/employer/matching/shortlist', matchingController.shortlist);
router.get('/employer/dashboard', controller.getDashboardOverview);
router.get('/employer/applications', controller.getEmployerApplications);
router.get('/employer/applications/:applicationId/sms', smsController.getEmployerSms);
router.post('/employer/applications/:applicationId/sms', smsController.dispatchEmployerSms);
router.patch('/applications/:applicationId/status', controller.updateApplicationStatus);
router.patch('/employer/applications/:applicationId/status', controller.updateApplicationStatus);
router.patch('/employer/applications/:applicationId/stage', controller.updateApplicationStatus);
router.post('/employer/update-status', (req, res, next) => {
  const applicationId = req.body.applicationId || req.body.application_id;
  if (!applicationId) return res.status(400).json({ success: false, message: 'An application id is required.' });
  req.params.applicationId = String(applicationId);
  return controller.updateApplicationStatus(req, res, next);
});
router.get('/employer/jobs', controller.getEmployerJobs);
router.post('/employer/jobs', controller.createJob);
router.put('/employer/jobs/:jobId', controller.updateJob);
router.get('/employer/jobs/:jobId/applications', controller.getJobApplicants);
router.patch('/applications/:applicationId/notes', controller.saveEmployerApplicationNotes);
router.get('/jobs/:jobId/top-candidates', controller.getTopCandidates);
router.get('/employer/jobs/:jobId/top-candidates', controller.getTopCandidates);
router.get('/employer/job-invitations', controller.getJobInvitations);
router.post('/employer/job-invitations', controller.createJobInvitation);
router.get('/employer/talent-pool', controller.getTalentPool);
router.post('/employer/talent-pool/save', controller.saveTalentPoolCandidate);
router.get('/employer/jobs/:jobId/ai-talent-pool', controller.getTopCandidates);
router.get('/employer/pipeline', controller.getEmployerPipeline);
router.get('/employer/offers', controller.getEmployerOffers);
router.post('/employer/offers', controller.createEmployerOffer);
router.get('/employer/onboarding', controller.getEmployerOnboarding);
router.patch('/employer/onboarding/:taskId', controller.updateEmployerOnboardingTask);
router.patch('/employer/applications/:applicationId/finalize', controller.finalizeEmployerEmployee);
router.patch('/employer/jobs/:jobId/status', controller.setJobStatus);
router.patch('/employer/jobs/:jobId/publish-now', controller.publishJobNow);
router.delete('/employer/jobs/:jobId', controller.deleteJob);
router.post('/jobs', controller.createJob);
router.put('/jobs/:jobId', controller.updateJob);
router.patch('/jobs/:jobId/publish', (req, res) => { req.body.status = 'published'; return controller.setJobStatus(req, res); });
router.patch('/jobs/:jobId/schedule', (req, res) => { req.body.status = 'scheduled'; return controller.setJobStatus(req, res); });
router.patch('/applications/:applicationId/shortlist', (req, res) => { req.body.status = 'shortlisted'; return controller.updateApplicationStatus(req, res); });
router.patch('/applications/:applicationId/hire', (req, res) => { req.body.status = 'hired'; return controller.updateApplicationStatus(req, res); });
router.patch('/applications/:applicationId/reject', (req, res) => { req.body.status = 'rejected'; return controller.updateApplicationStatus(req, res); });
router.post('/interviews', controller.scheduleInterview);
router.post('/employer/interviews', controller.scheduleInterview);
router.get('/employer/interviews', controller.getUpcomingInterviews);
router.get('/employer/messages', controller.getEmployerMessages);
router.post('/employer/messages', controller.sendEmployerMessage);
router.get('/employer/messages/conversations', controller.getEmployerConversations);
router.get('/employer/messages/conversations/unread-count', controller.getEmployerUnreadMessageCount);
router.get('/employer/messages/conversations/:conversationId', controller.getEmployerConversation);
router.post('/employer/messages/conversations/:conversationId/messages', controller.sendConversationMessage);
router.patch('/employer/messages/conversations/:conversationId/read', controller.markEmployerConversationRead);
router.delete('/employer/messages/conversations/:conversationId', controller.deleteEmployerConversation);
router.get('/employer/notifications', controller.getEmployerNotifications);
router.get('/employer/notifications/unread-count', controller.getEmployerUnreadNotificationCount);
router.patch('/employer/notifications/:id/read', controller.markEmployerNotificationRead);
router.patch('/employer/notifications/read-all', controller.markAllEmployerNotificationsRead);
router.delete('/employer/notifications/read', controller.deleteReadEmployerNotifications);
router.delete('/employer/notifications/:id', controller.deleteEmployerNotification);
router.get('/employer/settings', controller.getEmployerSettings);
router.put('/employer/settings', controller.updateEmployerSettings);
router.post('/employer/settings', controller.updateEmployerSettings);
module.exports = router;