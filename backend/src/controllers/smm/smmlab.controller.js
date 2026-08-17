const { Deposit, CronLog, ServiceFavorite, ProviderSyncLog } = require('../../models/SMMlab.models');
const { SMM_Service, SMM_Supporting } = require('../../models/SMM_Service.model');
const User = require('../../models/User.model');

// ── Deposits ──────────────────────────────────────────────────────────────
exports.getDeposits = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const q = { user: req.user._id };
    if (status) q.status = status;
    const [deposits, total] = await Promise.all([
      Deposit.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
      Deposit.countDocuments(q),
    ]);
    res.json({ success: true, deposits, total, page:+page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createDeposit = async (req, res) => {
  try {
    const { amount, gateway, reference } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const deposit = await Deposit.create({ user: req.user._id, amount, gateway, reference, status: gateway === 'manual' || gateway === 'bank' ? 'pending' : 'pending' });

    if (gateway === 'paypal') {
      // PayPal create order - uses existing paypal util if available
      res.status(201).json({ success: true, deposit, message: 'Deposit created - complete PayPal payment' });
    } else {
      res.status(201).json({ success: true, deposit, message: 'Deposit submitted for admin review' });
    }
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.capturePaypalDeposit = async (req, res) => {
  try {
    const { depositId, orderId, payerId } = req.body;
    const deposit = await Deposit.findOne({ _id: depositId, user: req.user._id, status: 'pending' });
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
    // In a real integration, verify with PayPal API here
    deposit.paypalOrderId = orderId;
    deposit.paypalPayerId = payerId;
    deposit.status = 'pending'; // admin still approves
    await deposit.save();
    res.json({ success: true, deposit, message: 'Payment captured - pending admin approval' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Admin Deposit Management ───────────────────────────────────────────────
exports.adminGetDeposits = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const q = {};
    if (status) q.status = status;
    const [deposits, total] = await Promise.all([
      Deposit.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit).populate('user','name email'),
      Deposit.countDocuments(q),
    ]);
    res.json({ success: true, deposits, total, page:+page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.adminApproveDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findOne({ _id: req.params.id, status: 'pending' });
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found or already processed' });
    deposit.status     = 'approved';
    deposit.approvedAt = new Date();
    deposit.approvedBy = req.user._id;
    deposit.note       = req.body.note || '';
    await deposit.save();
    // Credit user balance
    await User.findByIdAndUpdate(deposit.user, { $inc: { balance: deposit.amount } });
    res.json({ success: true, deposit, message: `$${deposit.amount} credited to user` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.adminRejectDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'rejected', rejectedAt: new Date(), note: req.body.note || '', approvedBy: req.user._id },
      { new: true }
    );
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found or already processed' });
    res.json({ success: true, deposit, message: 'Deposit rejected' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Service Favorites ─────────────────────────────────────────────────────
exports.getFavorites = async (req, res) => {
  try {
    const favs = await ServiceFavorite.find({ user: req.user._id })
      .populate({ path: 'service', populate: { path: 'category', select: 'name' } });
    res.json({ success: true, favorites: favs.map(f => f.service).filter(Boolean) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const existing = await ServiceFavorite.findOne({ user: req.user._id, service: serviceId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, favorited: false, message: 'Removed from favorites' });
    }
    await ServiceFavorite.create({ user: req.user._id, service: serviceId });
    res.json({ success: true, favorited: true, message: 'Added to favorites' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Cron Logs ─────────────────────────────────────────────────────────────
exports.getCronLogs = async (req, res) => {
  try {
    const { jobName, page = 1, limit = 50 } = req.query;
    const q = {};
    if (jobName) q.jobName = jobName;
    const [logs, total] = await Promise.all([
      CronLog.find(q).sort({ ranAt: -1 }).skip((page-1)*limit).limit(+limit),
      CronLog.countDocuments(q),
    ]);
    const jobNames = await CronLog.distinct('jobName');
    res.json({ success: true, logs, total, jobNames, page:+page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.clearCronLogs = async (req, res) => {
  try {
    const { days = 7 } = req.body;
    const cutoff = new Date(Date.now() - days * 86400000);
    const { deletedCount } = await CronLog.deleteMany({ ranAt: { $lt: cutoff } });
    res.json({ success: true, message: `Cleared ${deletedCount} logs older than ${days} days` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Provider Sync Logs ────────────────────────────────────────────────────
exports.getProviderSyncLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const [logs, total] = await Promise.all([
      ProviderSyncLog.find().sort({ ranAt: -1 }).skip((page-1)*limit).limit(+limit).populate('provider','name'),
      ProviderSyncLog.countDocuments(),
    ]);
    res.json({ success: true, logs, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Export helper for cron jobs to log
exports.logCronRun = async (jobName, status, message, details = {}, duration = 0) => {
  try {
    await CronLog.create({ jobName, status, message, details, duration });
  } catch (_) {}
};
