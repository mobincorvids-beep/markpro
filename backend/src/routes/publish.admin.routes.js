const express  = require('express');
const router   = express.Router();
const User     = require('../models/User.model');
const Plan     = require('../models/BPPlan.model');
const Post     = require('../models/BPPost.model');
const Campaign = require('../models/BPCampaign.model');
const AITemplate = require('../models/AITemplate.model');
const { Subscription, Blog, Notification } = require('../models/BPOther.model');
const { protect, requireAdmin: adminOnly } = require('../middleware/auth.middleware');

const ok  = (res, d)        => res.json({ success: true, ...d });
const err = (res, m, s=400) => res.status(s).json({ success: false, message: m });

// ── Admin routes ──────────────────────────────────
const admin = express.Router();
admin.use(protect, adminOnly);

admin.get('/stats', async (req, res) => {
  try {
    const [users, posts, plans, activeSubs] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Plan.find({ active: true }),
      Subscription.countDocuments({ status: 'active' }),
    ]);
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt plan').populate('plan','name');
    const revenue = await Subscription.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    ok(res, { users, posts, plans: plans.length, activeSubs, recentUsers, revenue: revenue[0]?.total || 0 });
  } catch (e) { err(res, e.message, 500); }
});

admin.get('/users', async (req, res) => {
  try {
    const { page=1, limit=50, search } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name:new RegExp(search,'i') }, { email:new RegExp(search,'i') }];
    const skip = (Number(page)-1)*Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').populate('plan','name price interval').sort({createdAt:-1}).skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
    ]);
    ok(res, { users, total, pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e.message, 500); }
});

admin.put('/users/:id', async (req, res) => {
  try {
    const { active, role, plan } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return err(res, 'User not found', 404);
    if (active !== undefined) user.active = active;
    if (role   !== undefined) user.role   = role;
    if (plan   !== undefined) user.plan   = plan || null;
    await user.save();
    ok(res, { user: user.toSafeObject() });
  } catch (e) { err(res, e.message, 500); }
});

admin.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) return err(res, 'Cannot delete yourself');
    await User.findByIdAndDelete(req.params.id);
    ok(res, { message: 'User deleted' });
  } catch (e) { err(res, e.message, 500); }
});

// Plan CRUD (admin)
admin.get('/plans', async (req, res) => {
  try { ok(res, { plans: await Plan.find().sort({ sortOrder:1 }) }); }
  catch (e) { err(res, e.message, 500); }
});
admin.post('/plans', async (req, res) => {
  try { const plan = await Plan.create(req.body); ok(res, { plan }); }
  catch (e) { err(res, e.message, 500); }
});
admin.put('/plans/:id', async (req, res) => {
  try { const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new:true }); ok(res, { plan }); }
  catch (e) { err(res, e.message, 500); }
});
admin.delete('/plans/:id', async (req, res) => {
  try { await Plan.findByIdAndDelete(req.params.id); ok(res, { message:'Deleted' }); }
  catch (e) { err(res, e.message, 500); }
});

// AI Template CRUD (admin)
admin.get('/templates', async (req, res) => {
  try { ok(res, { templates: await AITemplate.find().sort({ category:1, name:1 }) }); }
  catch (e) { err(res, e.message, 500); }
});
admin.post('/templates', async (req, res) => {
  try { const t = await AITemplate.create(req.body); ok(res, { template: t }); }
  catch (e) { err(res, e.message, 500); }
});
admin.put('/templates/:id', async (req, res) => {
  try { const t = await AITemplate.findByIdAndUpdate(req.params.id, req.body, { new:true }); ok(res, { template: t }); }
  catch (e) { err(res, e.message, 500); }
});
admin.delete('/templates/:id', async (req, res) => {
  try { await AITemplate.findByIdAndDelete(req.params.id); ok(res, { message:'Deleted' }); }
  catch (e) { err(res, e.message, 500); }
});

// Blogs (admin)
admin.get('/blogs', async (req, res) => {
  try { ok(res, { blogs: await Blog.find().populate('author','name').sort({ createdAt:-1 }) }); }
  catch (e) { err(res, e.message, 500); }
});
admin.post('/blogs', async (req, res) => {
  try { const blog = await Blog.create({ ...req.body, author: req.user._id }); ok(res, { blog }); }
  catch (e) { err(res, e.message, 500); }
});
admin.put('/blogs/:id', async (req, res) => {
  try { const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new:true }); ok(res, { blog }); }
  catch (e) { err(res, e.message, 500); }
});
admin.delete('/blogs/:id', async (req, res) => {
  try { await Blog.findByIdAndDelete(req.params.id); ok(res, { message:'Deleted' }); }
  catch (e) { err(res, e.message, 500); }
});

// ── Campaign (Autopilot) routes ───────────────────
const campaigns = express.Router();

campaigns.get('/', protect, async (req, res) => {
  try {
    const list = await Campaign.find({ user: req.user._id }).populate('accounts','platform accountName avatar').sort({ createdAt:-1 });
    ok(res, { campaigns: list });
  } catch (e) { err(res, e.message, 500); }
});

campaigns.post('/', protect, async (req, res) => {
  try {
    const c = await Campaign.create({ ...req.body, user: req.user._id });
    ok(res, { campaign: c });
  } catch (e) { err(res, e.message, 500); }
});

campaigns.put('/:id', protect, async (req, res) => {
  try {
    const c = await Campaign.findOneAndUpdate({ _id:req.params.id, user:req.user._id }, req.body, { new:true });
    if (!c) return err(res, 'Not found', 404);
    ok(res, { campaign: c });
  } catch (e) { err(res, e.message, 500); }
});

campaigns.delete('/:id', protect, async (req, res) => {
  try {
    await Campaign.findOneAndDelete({ _id:req.params.id, user:req.user._id });
    ok(res, { message:'Deleted' });
  } catch (e) { err(res, e.message, 500); }
});

// Public blog routes
const blogs = express.Router();
blogs.get('/', async (req, res) => {
  try { ok(res, { blogs: await Blog.find({ published:true }).populate('author','name').sort({ publishedAt:-1 }).limit(20) }); }
  catch (e) { err(res, e.message, 500); }
});
blogs.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug:req.params.slug, published:true }).populate('author','name');
    if (!blog) return err(res, 'Not found', 404);
    ok(res, { blog });
  } catch (e) { err(res, e.message, 500); }
});

router.use('/admin', admin);
router.use('/campaigns', campaigns);
router.use('/blogs', blogs);

module.exports = router;
