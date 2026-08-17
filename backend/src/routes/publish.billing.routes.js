const express = require('express');
const router  = express.Router();
const Plan    = require('../models/BPPlan.model');
const User    = require('../models/User.model');
const { Subscription, Webhook } = require('../models/BPOther.model');
const { protect, requireAdmin: adminOnly } = require('../middleware/auth.middleware');
const affiliateCtrl = require('../controllers/publish/affiliate.controller');

const ok  = (res, d)        => res.json({ success: true, ...d });
const err = (res, m, s=400) => res.status(s).json({ success: false, message: m });

// ══════════════════════════════════════════════
// PLANS (public)
// ══════════════════════════════════════════════

// GET /api/plans
router.get('/plans', async (req, res) => {
  try {
    const { interval } = req.query;
    const filter = { active: true };
    if (interval) filter.interval = interval;
    const plans = await Plan.find(filter).sort({ sortOrder: 1, price: 1 });
    ok(res, { plans });
  } catch (e) { err(res, e.message, 500); }
});

// POST /api/plans/checkout - create Stripe checkout session
router.post('/plans/checkout', protect, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan) return err(res, 'Plan not found', 404);
    if (plan.price === 0) {
      // Free plan - assign directly
      req.user.plan = plan._id;
      req.user.planInterval = plan.interval;
      await req.user.save();
      return ok(res, { free: true, message: 'Free plan activated' });
    }

    if (!process.env.STRIPE_SECRET_KEY)
      return err(res, 'Stripe not configured. Set STRIPE_SECRET_KEY in .env');

    const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: plan.interval === 'unlimited' ? 'payment' : 'subscription',
      customer_email: req.user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${plan.name} Plan`, description: plan.description },
          ...(plan.interval === 'unlimited' ? {} : {
            recurring: { interval: plan.interval === 'yearly' ? 'year' : 'month' },
          }),
          unit_amount: Math.round(plan.price * 100),
        },
        quantity: 1,
      }],
      metadata: { module: 'publish', userId: req.user._id.toString(), planId: plan._id.toString(), interval: plan.interval },
      success_url: `${process.env.FRONTEND_URL}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.FRONTEND_URL}/billing?cancelled=1`,
    });

    ok(res, { url: session.url });
  } catch (e) { err(res, e.message, 500); }
});

// NOTE (Section B.3): the former POST /api/plans/webhook endpoint was removed.
// Publish plan events are dispatched from the single consolidated endpoint
// POST /api/webhooks/stripe → controllers/webhooks/handlers/publish.plans.js.

// GET /api/webhooks
router.get('/webhooks', protect, async (req, res) => {
  try {
    // Check plan
    const plan = req.user.plan;
    if (plan && !plan.webhookAccess) return err(res, 'Webhook access is not included in your plan');
    const webhooks = await Webhook.find({ user: req.user._id }).sort({ createdAt: -1 });
    ok(res, { webhooks });
  } catch (e) { err(res, e.message, 500); }
});

// POST /api/webhooks
router.post('/webhooks', protect, async (req, res) => {
  try {
    const plan = req.user.plan;
    if (plan && !plan.webhookAccess) return err(res, 'Webhook access requires a higher plan');
    const { name, url, events = ['post.published', 'post.failed'], secret = '' } = req.body;
    if (!name || !url) return err(res, 'Name and URL are required');
    const webhook = await Webhook.create({ user: req.user._id, name, url, events, secret });
    ok(res, { webhook });
  } catch (e) { err(res, e.message, 500); }
});

// PUT /api/webhooks/:id
router.put('/webhooks/:id', protect, async (req, res) => {
  try {
    const wh = await Webhook.findOne({ _id: req.params.id, user: req.user._id });
    if (!wh) return err(res, 'Webhook not found', 404);
    const { name, url, events, secret, active } = req.body;
    if (name !== undefined)   wh.name = name;
    if (url !== undefined)    wh.url = url;
    if (events !== undefined) wh.events = events;
    if (secret !== undefined) wh.secret = secret;
    if (active !== undefined) wh.active = active;
    await wh.save();
    ok(res, { webhook: wh });
  } catch (e) { err(res, e.message, 500); }
});

// DELETE /api/webhooks/:id
router.delete('/webhooks/:id', protect, async (req, res) => {
  try {
    await Webhook.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    ok(res, { message: 'Webhook deleted' });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/notifications
router.get('/notifications', protect, async (req, res) => {
  try {
    const { Notification } = require('../models/BPOther.model');
    const [notifications, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    ok(res, { notifications, unread });
  } catch (e) { err(res, e.message, 500); }
});

router.put('/notifications/read-all', protect, async (req, res) => {
  try {
    const { Notification } = require('../models/BPOther.model');
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    ok(res, {});
  } catch (e) { err(res, e.message, 500); }
});

module.exports = router;

// ═══════════════════════════════════════════════
// AFFILIATE
// ═══════════════════════════════════════════════
router.get ('/affiliate',                  protect, affiliateCtrl.getAffiliateStats);
router.post('/affiliate/generate-code',    protect, affiliateCtrl.generateAffiliateCode);

// ═══════════════════════════════════════════════
// WALLET
// ═══════════════════════════════════════════════
router.get ('/wallet',                     protect, affiliateCtrl.getWallet);
router.post('/wallet/deposit',             protect, affiliateCtrl.depositToWallet);
router.get ('/wallet/withdrawals',         protect, affiliateCtrl.getWithdrawals);
router.post('/wallet/withdrawals',         protect, affiliateCtrl.requestWithdrawal);

// Admin wallet & withdrawal management
router.get ('/admin/withdrawals',          protect, adminOnly, affiliateCtrl.adminGetWithdrawals);
router.put ('/admin/withdrawals/:id',      protect, adminOnly, affiliateCtrl.adminProcessWithdrawal);

// ═══════════════════════════════════════════════
// EXTERNAL HTTP CRON (VPS / cPanel cron job)
// ═══════════════════════════════════════════════
router.post('/cron/run', affiliateCtrl.externalCronRun);
