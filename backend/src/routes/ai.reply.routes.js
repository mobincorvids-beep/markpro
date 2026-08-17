const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ai/reply.controller');
const { protect } = require('../middleware/auth.middleware');

const rateLimit = require('express-rate-limit');

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many generation requests. Please slow down.' },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

router.use(protect);
router.post('/generate', generateLimiter, ctrl.generate);
router.get('/history', ctrl.getHistory);
router.get('/stats', ctrl.getStats);
router.get('/:id', ctrl.getOne);
router.patch('/:id/favorite', ctrl.toggleFavorite);
router.patch('/:id/feedback', ctrl.submitFeedback);
router.delete('/:id', ctrl.deleteReply);

module.exports = router;
