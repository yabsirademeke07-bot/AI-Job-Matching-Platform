const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const controller = require('../controllers/seekerMatchingController');

const router = express.Router();
router.use(authMiddleware);
router.get('/seeker/matched-jobs', controller.getMatchedJobs);
router.get('/seeker/notifications', controller.getSeekerNotifications);
router.patch('/seeker/notifications/:notificationId/read', controller.markSeekerNotificationRead);
router.get('/seeker/messages/unread-count', controller.getSeekerUnreadMessageCount);
router.get('/jobs/:jobId/match-score', controller.getApplicationMatchScore);
router.post('/applications', controller.createApplication);
router.post('/seeker/saved-jobs', controller.saveJob);
router.delete('/seeker/saved-jobs/:jobId', controller.unsaveJob);

module.exports = router;
