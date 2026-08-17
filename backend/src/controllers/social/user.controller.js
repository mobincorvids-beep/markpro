const User = require('../../models/User.model');
const { Domain, Lead, NotificationHandler, Payment } = require('../../models/secondary.models');
const Plan = require('../../models/Plan.model');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../../utils/logger');

/* ═══════════════════════ USER ═══════════════════════ */
exports.updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, avatar }, { new: true }).populate('plan');
    res.json({ success: true, data: user });
  } catch { res.status(500).json({ success: false, message: 'Failed to update profile' }); }
};

exports.updatePreferences = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id, { preferences: req.body }, { new: true }
    );
    res.json({ success: true, data: user.preferences });
  } catch { res.status(500).json({ success: false, message: 'Failed to update preferences' }); }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword)))
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed' });
  } catch { res.status(500).json({ success: false, message: 'Failed to change password' }); }
};

exports.regenerateApiKey = async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const apiKey = uuidv4().replace(/-/g, '');
    await User.findByIdAndUpdate(req.user._id, { apiKey });
    res.json({ success: true, data: { apiKey } });
  } catch { res.status(500).json({ success: false, message: 'Failed to regenerate API key' }); }
};

exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    res.json({ success: true, message: 'Account deactivated' });
  } catch { res.status(500).json({ success: false, message: 'Failed to delete account' }); }
};

/* ═══════════════════════ DOMAINS ═══════════════════ */
exports.listDomains = async (req, res) => {
  const domains = await Domain.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: domains });
};

exports.createDomain = async (req, res) => {
  try {
    const plan = req.user.plan;
    const limit = plan?.limits?.domains ?? 1;
    if (limit !== -1) {
      const count = await Domain.countDocuments({ user: req.user._id });
      if (count >= limit) return res.status(403).json({ success: false, message: `Domain limit reached. Upgrade to add more.` });
    }
    const existing = await Domain.findOne({ user: req.user._id, host: req.body.host.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Domain already added' });
    const domain = await Domain.create({ user: req.user._id, host: req.body.host.toLowerCase() });
    res.status(201).json({ success: true, data: domain });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteDomain = async (req, res) => {
  try {
    const d = await Domain.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!d) return res.status(404).json({ success: false, message: 'Domain not found' });
    res.json({ success: true, message: 'Domain deleted' });
  } catch { res.status(500).json({ success: false, message: 'Failed to delete domain' }); }
};

/* ═══════════════════════ NOTIFICATION HANDLERS ═════ */
exports.listHandlers = async (req, res) => {
  const handlers = await NotificationHandler.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: handlers });
};

exports.createHandler = async (req, res) => {
  try {
    const handler = await NotificationHandler.create({ user: req.user._id, ...req.body });
    res.status(201).json({ success: true, data: handler });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateHandler = async (req, res) => {
  try {
    const h = await NotificationHandler.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, req.body, { new: true }
    );
    if (!h) return res.status(404).json({ success: false, message: 'Handler not found' });
    res.json({ success: true, data: h });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteHandler = async (req, res) => {
  try {
    const h = await NotificationHandler.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!h) return res.status(404).json({ success: false, message: 'Handler not found' });
    res.json({ success: true, message: 'Handler deleted' });
  } catch { res.status(500).json({ success: false, message: 'Failed to delete handler' }); }
};

/* ═══════════════════════ LEADS ═════════════════════ */
exports.listLeads = async (req, res) => {
  try {
    const { page = 1, limit = 30, campaignId } = req.query;
    const filter = { user: req.user._id };
    if (campaignId) filter.campaign = campaignId;
    const total = await Lead.countDocuments(filter);
    const leads = await Lead.find(filter)
      .populate('campaign', 'name').populate('notification', 'name type')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit);
    res.json({ success: true, data: { leads, pagination: { total, page: +page, pages: Math.ceil(total / limit) } } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch leads' }); }
};

/* ═══════════════════════ PAYMENTS / SUBSCRIPTIONS ══ */
exports.getPlans = async (req, res) => {
  const plans = await Plan.find({ isActive: true }).sort('sortOrder');
  res.json({ success: true, data: plans });
};

exports.createCheckout = async (req, res) => {
  try {
    const { planId, billingInterval = 'monthly' } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    const priceId = billingInterval === 'yearly' ? plan.stripePriceId?.yearly : plan.stripePriceId?.monthly;
    if (!priceId) return res.status(400).json({ success: false, message: 'Price ID not configured' });

    let customerId = req.user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: req.user.email, name: req.user.name });
      customerId = customer.id;
      await User.findByIdAndUpdate(req.user._id, { stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId, mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?payment=canceled`,
      metadata: { module: 'core', userId: req.user._id.toString(), planId: planId.toString(), billingInterval },
    });
    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    logger.error('Checkout:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBillingPortal = async (req, res) => {
  try {
    if (!req.user.stripeCustomerId) return res.status(400).json({ success: false, message: 'No billing account' });
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard/settings`,
    });
    res.json({ success: true, data: { url: session.url } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.listPayments = async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).populate('plan', 'name').sort({ createdAt: -1 });
  res.json({ success: true, data: payments });
};

/* ═══════════════════════ LEAD CSV EXPORT ══════════════════ */
exports.exportLeads = async (req, res) => {
  try {
    const { campaignId } = req.query;
    const filter = { user: req.user._id };
    if (campaignId) filter.campaign = campaignId;

    const leads = await Lead.find(filter).populate('campaign','name').sort({ createdAt: -1 }).lean();

    const rows = [
      ['Email', 'Name', 'Phone', 'Campaign', 'Captured At'],
      ...leads.map(l => [
        l.email || '',
        l.name  || '',
        l.phone || '',
        l.campaign?.name || '',
        l.createdAt ? new Date(l.createdAt).toISOString() : '',
      ]),
    ];

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
