const express = require('express');
const router  = express.Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const CreditPackage     = require('../models/CreditPackage.model');
const CreditTransaction = require('../models/CreditTransaction.model');
const { creditCredits } = require('../services/creditEngine.service');

const ok  = (res, d)   => res.json({ success: true, ...d });
const err = (res, m, s=400) => res.status(s).json({ success: false, message: m });

// GET /api/credits/packages - list active packages
router.get('/packages', async (req, res) => {
  try {
    const packages = await CreditPackage.find({ active: true }).sort({ price: 1 });
    ok(res, { packages });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/credits/wallet - user's transaction history
router.get('/wallet', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [transactions, total] = await Promise.all([
      CreditTransaction.find({ user: req.user._id })
        .populate('packageId', 'title credits price')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      CreditTransaction.countDocuments({ user: req.user._id }),
    ]);
    ok(res, { transactions, total, balance: req.user.credits });
  } catch (e) { err(res, e.message, 500); }
});

// POST /api/credits/checkout - create Stripe checkout session
router.post('/checkout', protect, async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = await CreditPackage.findById(packageId);
    if (!pkg) return err(res, 'Package not found', 404);

    if (!process.env.STRIPE_SECRET_KEY)
      return err(res, 'Stripe not configured. Set STRIPE_SECRET_KEY in .env');

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: req.user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${pkg.title} - ${pkg.credits} Credits`, description: `AIGen credit package` },
          unit_amount: Math.round(pkg.price * 100),
        },
        quantity: 1,
      }],
      metadata: { module: 'aigen', userId: req.user._id.toString(), packageId: pkg._id.toString(), credits: pkg.credits.toString() },
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/credits?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.FRONTEND_URL || 'http://localhost:3000'}/credits?cancelled=1`,
    });

    ok(res, { url: session.url, sessionId: session.id });
  } catch (e) { err(res, e.message, 500); }
});

// NOTE (Section B.3): the former POST /api/credits/webhook endpoint was removed.
// Credit-package purchases are dispatched from POST /api/webhooks/stripe →
// controllers/webhooks/handlers/aigen.credits.js.

// POST /api/credits/verify-session - verify after Stripe redirect
router.post('/verify-session', protect, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!process.env.STRIPE_SECRET_KEY) return err(res, 'Stripe not configured');
    const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const { userId, credits, packageId } = session.metadata;
      // Check not already processed
      const existing = await CreditTransaction.findOne({ paymentId: session.payment_intent });
      if (!existing) {
        const pkg = await CreditPackage.findById(packageId);
        await creditCredits(userId, Number(credits), {
          type: 'purchase', description: `Purchased: ${pkg?.title}`,
          packageId, paymentId: session.payment_intent, amount: session.amount_total / 100,
        });
      }
      const User = require('../models/User.model');
      const user = await User.findById(userId);
      ok(res, { paid: true, credits: user.credits });
    } else {
      ok(res, { paid: false });
    }
  } catch (e) { err(res, e.message, 500); }
});

// ── Admin only ──────────────────────────────────

// POST /api/credits/packages - create package (admin)
router.post('/packages', protect, requireAdmin, async (req, res) => {
  try {
    const pkg = await CreditPackage.create(req.body);
    ok(res, { package: pkg });
  } catch (e) { err(res, e.message, 500); }
});

// PUT /api/credits/packages/:id
router.put('/packages/:id', protect, requireAdmin, async (req, res) => {
  try {
    const pkg = await CreditPackage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    ok(res, { package: pkg });
  } catch (e) { err(res, e.message, 500); }
});

// DELETE /api/credits/packages/:id
router.delete('/packages/:id', protect, requireAdmin, async (req, res) => {
  try {
    await CreditPackage.findByIdAndDelete(req.params.id);
    ok(res, { message: 'Deleted' });
  } catch (e) { err(res, e.message, 500); }
});

// POST /api/credits/grant - grant credits to a user (admin)
router.post('/grant', protect, requireAdmin, async (req, res) => {
  try {
    const { userId, credits, description } = req.body;
    if (!userId || !credits) return err(res, 'userId and credits required');
    const balance = await creditCredits(userId, Number(credits), { type: 'admin_grant', description: description || 'Admin credit grant' });
    ok(res, { balance });
  } catch (e) { err(res, e.message, 500); }
});


// GET /api/ai/credits/balance - alias of /wallet
router.get('/balance', protect, async (req, res) => {
  try {
    ok(res, { balance: req.user.credits, credits: req.user.credits });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/ai/credits/transactions - user's credit transaction history
router.get('/transactions', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      CreditTransaction.find({ user: req.user._id })
        .populate('packageId', 'title credits price')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      CreditTransaction.countDocuments({ user: req.user._id }),
    ]);
    ok(res, { items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (e) { err(res, e.message, 500); }
});

module.exports = router;
