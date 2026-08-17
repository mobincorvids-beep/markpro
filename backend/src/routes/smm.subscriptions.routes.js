const router = require('express').Router();
const Order  = require('../models/SMM_Order.model');
const { protect } = require('../middleware/auth.middleware');

// GET /api/subscriptions - user's subscription orders
router.get('/', protect, async (req, res) => {
  try {
    const subs = await Order.find({ userId: req.user._id, serviceType: 'subscriptions' })
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 });
    res.json(subs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/subscriptions/:id/pause
router.patch('/:id/pause', protect, async (req, res) => {
  try {
    const sub = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, serviceType: 'subscriptions' },
      { subStatus: 'paused', updatedAt: Date.now() }, { new: true }
    );
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    res.json(sub);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/subscriptions/:id/resume
router.patch('/:id/resume', protect, async (req, res) => {
  try {
    const sub = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, serviceType: 'subscriptions' },
      { subStatus: 'active', updatedAt: Date.now() }, { new: true }
    );
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    res.json(sub);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
