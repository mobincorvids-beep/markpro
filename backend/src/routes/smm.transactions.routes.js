const router = require('express').Router();
const { Transaction } = require('../models/SMM_Supporting.model');
const { protect } = require('../middleware/auth.middleware');

// GET /api/transactions
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [txs, total] = await Promise.all([
      Transaction.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(+limit),
      Transaction.countDocuments({ userId: req.user._id }),
    ]);
    res.json({ transactions: txs, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
