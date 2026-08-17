const bcrypt = require('bcryptjs');
const { User, Plan, AiTemplate, AiGenerate, Order, Setting, Category, Brand, BrandPost, CreditHistory } = require('../../models/SocialAI.models');
const { addCredits } = require('../../utils/credits');

// ── Dashboard stats ───────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const [users, brands, posts, revenue] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Brand.countDocuments(),
      BrandPost.countDocuments(),
      Order.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    const recentUsers = await User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(5).select('name email plan_id createdAt status');
    const recentOrders = await Order.find({ status: 'paid' }).sort({ createdAt: -1 }).limit(5).populate('user_id', 'name email').populate('plan_id', 'name price');
    const userGrowth = await User.aggregate([
      { $match: { role: 'user', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ status: 'success', data: { users, brands, posts, revenue: revenue[0]?.total || 0, recentUsers, recentOrders, userGrowth } });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Users ─────────────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const q = { role: 'user' };
    if (status !== undefined) q.status = +status;
    if (search) q.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      User.find(q).skip(skip).limit(+limit).sort({ createdAt: -1 }).populate('plan_id', 'name').select('-password -password_reset_token'),
      User.countDocuments(q),
    ]);
    res.json({ status: 'success', data, total, page: +page });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('plan_id').select('-password -password_reset_token');
    if (!user) return res.json({ status: 'error', message: 'User not found.' });
    res.json({ status: 'success', data: user });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    if (password) rest.password = await bcrypt.hash(password, 12);
    const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true }).select('-password -password_reset_token');
    if (!user) return res.json({ status: 'error', message: 'User not found.' });
    res.json({ status: 'success', message: 'User updated.', data: user });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateUserStatus = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ status: 'success', message: 'Status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Brand.deleteMany({ user_id: req.params.id });
    await BrandPost.deleteMany({ user_id: req.params.id });
    res.json({ status: 'success', message: 'User deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.assignPlan = async (req, res) => {
  try {
    const { plan_id, credits_bonus = 0, expiry_days } = req.body;
    const plan = await Plan.findById(plan_id);
    if (!plan) return res.json({ status: 'error', message: 'Plan not found.' });
    let expired = null;
    if (plan.type !== 'lifetime' && expiry_days) {
      expired = new Date(); expired.setDate(expired.getDate() + +expiry_days);
    }
    await User.findByIdAndUpdate(req.params.id, { plan_id, plan_data: plan.data, plan_expired_at: expired, $inc: { credits: +plan.data?.credits || 0 } });
    if (credits_bonus > 0) await addCredits(req.params.id, credits_bonus, 'Admin bonus credits');
    res.json({ status: 'success', message: 'Plan assigned.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.addUserCredits = async (req, res) => {
  try {
    const { amount, description } = req.body;
    const balance = await addCredits(req.params.id, +amount, description || 'Admin credit adjustment');
    res.json({ status: 'success', message: `${amount} credits added.`, data: { balance } });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Plans ─────────────────────────────────────────────────────────────────
exports.getPlans = async (req, res) => {
  try {
    const data = await Plan.find().sort({ sort_order: 1 });
    res.json({ status: 'success', data });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createPlan = async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.json({ status: 'success', message: 'Plan created.', data: plan });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.json({ status: 'error', message: 'Plan not found.' });
    res.json({ status: 'success', message: 'Plan updated.', data: plan });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deletePlan = async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Plan deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── AI Templates ──────────────────────────────────────────────────────────
exports.getTemplates = async (req, res) => {
  try {
    const data = await AiTemplate.find().sort({ sort_order: 1 }).populate('categories', 'name');
    res.json({ status: 'success', data });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createTemplate = async (req, res) => {
  try {
    const t = await AiTemplate.create(req.body);
    res.json({ status: 'success', message: 'Template created.', data: t });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateTemplate = async (req, res) => {
  try {
    const t = await AiTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!t) return res.json({ status: 'error', message: 'Template not found.' });
    res.json({ status: 'success', message: 'Template updated.', data: t });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteTemplate = async (req, res) => {
  try {
    await AiTemplate.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Template deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Categories ────────────────────────────────────────────────────────────
exports.getCategories = async (req, res) => {
  try {
    const data = await Category.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createCategory = async (req, res) => {
  try {
    const cat = await Category.create(req.body);
    res.json({ status: 'success', data: cat });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateCategory = async (req, res) => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ status: 'success', data: cat });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Category deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Settings ──────────────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.find();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json({ status: 'success', data: obj });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateSettings = async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await Setting.findOneAndUpdate({ key }, { key, value, group: req.body._group || 'general' }, { upsert: true });
    }
    res.json({ status: 'success', message: 'Settings saved.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Orders ────────────────────────────────────────────────────────────────
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Order.find().skip(skip).limit(+limit).sort({ createdAt: -1 }).populate('user_id', 'name email').populate('plan_id', 'name price'),
      Order.countDocuments(),
    ]);
    res.json({ status: 'success', data, total });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};
