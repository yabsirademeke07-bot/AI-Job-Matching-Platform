const express = require('express');
const controller = require('../controllers/companyFeedbackController');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:companyId/reputation', controller.getReputation);
router.get('/:companyId/reviews', controller.getReviews);
router.post('/:companyId/reviews', authenticate, controller.submitReview);
router.post('/:companyId/reviews/:reviewId/response', authenticate, controller.respondToReview);
router.get('/:companyId/questions', controller.getQuestions);
router.post('/:companyId/questions', authenticate, controller.askQuestion);
router.post('/:companyId/questions/:questionId/answer', authenticate, controller.answerQuestion);

module.exports = router;
