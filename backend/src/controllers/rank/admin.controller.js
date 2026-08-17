const User = require('../../models/User.model');
const Plan = require('../../models/Plan.model');
const { Report, ToolRun, Payment, Project } = require('../../models/PHPRank.models');

exports.getDashboard = async (req, res) => {
  try {
    const ago30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalUsers, newUsers, totalReports, totalToolRuns, activeSubs, revenueByPlan, dailySignups, topTools] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', createdAt: { $gte: ago30 } }),
      Report.countDocuments(),
      ToolRun.countDocuments(),
      User.countDocuments({ subscriptionStatus: 'active' }),
      User.aggregate([
        { $match: { subscriptionStatus: 'active', plan: { $ne: null } } },
        { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'plan' } },
        { $unwind: '$plan' },
        { $group: { _id: '$plan.name', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: ago30 }, role: 'user' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      ToolRun.aggregate([
        { $group: { _id: '$tool', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
      ]),
    ]);
    res.json({ success: true, data: { totalUsers, newUsers, totalReports, totalToolRuns, activeSubs, revenueByPlan, dailySignups, topTools } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (status) filter.subscriptionStatus = status;
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).populate('plan', 'name slug').select('-password -refreshToken')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit);
    res.json({ success: true, data: { users, pagination: { total, page: +page, pages: Math.ceil(total / limit) } } });
  } catch { res.status(500).json({ success: false, message: 'Failed' }); }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('plan');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

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
  } catch { res.status(500).json({ success: false, message: 'Failed' }); }
};

exports.listPayments = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const total = await Payment.countDocuments();
    const payments = await Payment.find().populate('user', 'name email').populate('plan', 'name')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit);
    res.json({ success: true, data: { payments, pagination: { total, page: +page, pages: Math.ceil(total / limit) } } });
  } catch { res.status(500).json({ success: false, message: 'Failed' }); }
};
