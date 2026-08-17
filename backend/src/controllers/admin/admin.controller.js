const User = require('../../models/User.model');
const Plan = require('../../models/Plan.model');
const Campaign = require('../../models/Campaign.model');
const Notification = require('../../models/Notification.model');
const { NotificationLog, Payment, Lead } = require('../../models/secondary.models');

exports.getDashboard = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalUsers, newUsers, totalCampaigns, totalLogs, activeSubscriptions,
      revenueByPlan, dailySignups] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', createdAt: { $gte: thirtyDaysAgo } }),
      Campaign.countDocuments(),
      NotificationLog.countDocuments(),
      User.countDocuments({ subscriptionStatus: 'active' }),
      User.aggregate([
        { $match: { subscriptionStatus: 'active', plan: { $ne: null } } },
        { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'plan' } },
        { $unwind: '$plan' },
        { $group: { _id: '$plan.name', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, role: 'user' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    res.json({ success: true, data: { totalUsers, newUsers, totalCampaigns, totalLogs, activeSubscriptions, revenueByPlan, dailySignups } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, role } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (status) filter.subscriptionStatus = status;
    if (role) filter.role = role;
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).populate('plan', 'name slug').select('-password -refreshToken')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit);
    res.json({ success: true, data: { users, pagination: { total, page: +page, pages: Math.ceil(total / limit) } } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch users' }); }
};

exports.updateUser = async (req, res) => {
  try {
    const { isActive, role, plan, subscriptionStatus } = req.body;
    const update = {};
    if (isActive !== undefined) update.isActive = isActive;
    if (role) update.role = role;
    if (plan !== undefined) update.plan = plan;
    if (subscriptionStatus) update.subscriptionStatus = subscriptionStatus;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).populate('plan');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot delete admin' });
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'User deactivated' });
  } catch { res.status(500).json({ success: false, message: 'Failed to delete user' }); }
};

// Plan CRUD
exports.listPlans = async (req, res) => {
  const plans = await Plan.find().sort('sortOrder');
  res.json({ success: true, data: plans });
};

exports.createPlan = async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, data: plan });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deletePlan = async (req, res) => {
  try {
    await Plan.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Plan deactivated' });
  } catch { res.status(500).json({ success: false, message: 'Failed to delete plan' }); }
};

// Payments
exports.listPayments = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const total = await Payment.countDocuments();
    const payments = await Payment.find().populate('user', 'name email').populate('plan', 'name')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit);
    res.json({ success: true, data: { payments, pagination: { total, page: +page, pages: Math.ceil(total / limit) } } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch payments' }); }
};

// All campaigns
exports.listCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await Campaign.countDocuments();
    const campaigns = await Campaign.find().populate('user', 'name email')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit);
    res.json({ success: true, data: { campaigns, pagination: { total, page: +page, pages: Math.ceil(total / limit) } } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch campaigns' }); }
};
