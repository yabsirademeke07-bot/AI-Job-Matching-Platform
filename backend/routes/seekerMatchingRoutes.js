const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const controller = require('../controllers/seekerMatchingController');
const smsController = require('../controllers/smsController');

const router = express.Router();
router.use(authMiddleware);
router.get('/seeker/matched-jobs', controller.getMatchedJobs);
router.get('/seeker/notifications', controller.getSeekerNotifications);
router.put('/seeker/password', controller.changeSeekerPassword);
router.get('/seeker/sms', smsController.getSeekerSms);
router.put('/seeker/sms/preference', smsController.updateSeekerSmsPreference);
router.post('/seeker/sms/:communicationId/reply', smsController.replyToSms);
router.patch('/seeker/notifications/:notificationId/read', controller.markSeekerNotificationRead);
router.get('/seeker/messages/unread-count', controller.getSeekerUnreadMessageCount);
router.get('/seeker/messages/conversations', controller.getSeekerConversations);
router.get('/seeker/messages/conversations/:conversationId', controller.getSeekerConversation);
router.post('/seeker/messages/conversations/:conversationId/messages', controller.sendSeekerMessage);
router.get('/jobs/:jobId/match-score', controller.getApplicationMatchScore);
router.post('/applications', controller.createApplication);
router.post('/applications/apply', controller.createApplication);
router.post('/seeker/saved-jobs', controller.saveJob);
router.get('/seeker/saved-jobs', controller.getSavedJobs);
router.delete('/seeker/saved-jobs/:jobId', controller.unsaveJob);
router.delete('/seeker/applications/:applicationId', controller.withdrawApplication);

module.exports = router;
