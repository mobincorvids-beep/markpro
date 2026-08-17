const express = require('express');
const router  = express.Router();
const User    = require('../models/User.model');
const ToolUsage = require('../models/ToolUsage.model');
const { protect, requireAdmin } = require('../middleware/auth.middleware');

// All admin routes require auth + admin role
router.use(protect, requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [users, totalUsage, recentUsage] = await Promise.all([
      User.countDocuments(),
      ToolUsage.countDocuments(),
      ToolUsage.find().sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    // Top tools
    const topTools = await ToolUsage.aggregate([
      { $group: { _id: '$toolName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    res.json({ success: true, stats: { users, totalUsage, topTools, recentUsage } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json({ success: true, users });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/admin/users/:id/toggle
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.active = !user.active;
    await user.save();
    res.json({ success: true, active: user.active });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/admin/history
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 50, tool } = req.query;
    const filter = tool ? { toolId: tool } : {};
    const [records, total] = await Promise.all([
      ToolUsage.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)).lean(),
      ToolUsage.countDocuments(filter),
    ]);
    res.json({ success: true, records, total, pages: Math.ceil(total/limit) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
