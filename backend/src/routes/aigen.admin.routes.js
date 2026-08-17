const express = require('express');
const router  = express.Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const User    = require('../models/User.model');
const Prompt  = require('../models/AIPrompt.model');
const CreditTransaction = require('../models/CreditTransaction.model');

router.use(protect, requireAdmin);

const ok  = (res, d)       => res.json({ success: true, ...d });
const err = (res, m, s=400)=> res.status(s).json({ success: false, message: m });

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [users, prompts, totalCreditsUsed, recentUsers, topUsage] = await Promise.all([
      User.countDocuments(),
      Prompt.countDocuments(),
      CreditTransaction.aggregate([{ $match:{ credits:{$lt:0} } }, { $group:{ _id:null, total:{ $sum:{ $abs:'$credits' } } } }]),
      User.find().sort({ createdAt:-1 }).limit(5).select('name email credits createdAt'),
      Prompt.aggregate([{ $group:{ _id:'$type', count:{$sum:1} } }, { $sort:{count:-1} }]),
    ]);
    ok(res, { users, prompts, creditsUsed: totalCreditsUsed[0]?.total || 0, recentUsers, topUsage });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page=1, limit=50, search } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name:new RegExp(search,'i') }, { email:new RegExp(search,'i') }];
    const skip = (Number(page)-1)*Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt:-1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
    ]);
    ok(res, { users, total, pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e.message, 500); }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { name, role, active, credits } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return err(res, 'User not found', 404);
    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (active !== undefined) user.active = active;
    if (credits !== undefined) user.credits = Number(credits);
    await user.save();
    ok(res, { user: user.toSafeObject() });
  } catch (e) { err(res, e.message, 500); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) return err(res, 'Cannot delete yourself');
    await User.findByIdAndDelete(req.params.id);
    ok(res, { message: 'Deleted' });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/admin/prompts
router.get('/prompts', async (req, res) => {
  try {
    const { page=1, limit=50, type } = req.query;
    const filter = type ? { type } : {};
    const skip = (Number(page)-1)*Number(limit);
    const [prompts, total] = await Promise.all([
      Prompt.find(filter).populate('user','name email').sort({createdAt:-1}).skip(skip).limit(Number(limit)),
      Prompt.countDocuments(filter),
    ]);
    ok(res, { prompts, total, pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e.message, 500); }
});

module.exports = router;
