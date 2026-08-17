const router = require('express').Router();
const axios  = require('axios');
const User   = require('../models/User.model');
const { Transaction, PaymentMethod, Coupon, Option } = require('../models/SMM_Supporting.model');
const { protect, requireAdmin } = require('../middleware/auth.middleware');

// GET /api/add-funds/methods
router.get('/methods', async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ status: 1 }).sort('sort').select('-config');
    res.json(methods);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/add-funds/validate-coupon
router.post('/validate-coupon', protect, async (req, res) => {
  try {
    const { code, amount } = req.body;
    const coupon = await Coupon.findOne({ code: code?.toUpperCase(), status: 1 });
    if (!coupon) return res.status(404).json({ error: 'Invalid or expired coupon' });
    if (coupon.expiresAt && coupon.expiresAt < Date.now())
      return res.status(400).json({ error: 'Coupon has expired' });
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    if (amount < coupon.minDeposit)
      return res.status(400).json({ error: `Minimum deposit for this coupon is ${coupon.minDeposit}` });

    const bonus = coupon.type === 'percent'
      ? (amount * coupon.amount) / 100
      : coupon.amount;

    res.json({ valid: true, bonus, coupon: { code: coupon.code, type: coupon.type, amount: coupon.amount } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/add-funds/manual - record manual deposit (admin confirms later)
router.post('/manual', protect, async (req, res) => {
  try {
    const { amount, methodId, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const tx = await Transaction.create({
      userId: req.user._id, type: 'deposit',
      amount, balanceBefore: req.user.balance, balanceAfter: req.user.balance,
      note: notes || 'Manual deposit request',
      paymentMethod: methodId || 'manual',
      status: 'pending',
    });
    res.status(201).json({ message: 'Deposit request submitted. Awaiting admin confirmation.', txId: tx._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/add-funds/paypal/create - create PayPal order
router.post('/paypal/create', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
    const tokenRes = await axios.post(
      process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com/v1/oauth2/token'
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      'grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const orderRes = await axios.post(
      process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com/v2/checkout/orders'
        : 'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: process.env.CURRENCY_CODE || 'USD', value: String(amount) } }],
        application_context: {
          return_url: `${process.env.APP_URL}/add-funds/success`,
          cancel_url: `${process.env.APP_URL}/add-funds`,
        },
      },
      { headers: { Authorization: `Bearer ${tokenRes.data.access_token}`, 'Content-Type': 'application/json' } }
    );

    res.json({ orderId: orderRes.data.id });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// POST /api/add-funds/paypal/capture
router.post('/paypal/capture', protect, async (req, res) => {
  try {
    const { orderId } = req.body;
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
    const tokenRes = await axios.post(
      process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com/v1/oauth2/token'
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      'grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const captureRes = await axios.post(
      `${process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'}/v2/checkout/orders/${orderId}/capture`,
      {},
      { headers: { Authorization: `Bearer ${tokenRes.data.access_token}`, 'Content-Type': 'application/json' } }
    );

    const amount = parseFloat(captureRes.data.purchase_units[0].payments.captures[0].amount.value);
    const user   = await User.findById(req.user._id);
    const newBal = user.balance + amount;
    await User.findByIdAndUpdate(user._id, { balance: newBal });
    await Transaction.create({
      userId: user._id, type: 'deposit',
      amount, balanceBefore: user.balance, balanceAfter: newBal,
      note: 'PayPal deposit', paymentMethod: 'paypal',
      paymentRef: orderId, status: 'completed',
    });

    res.json({ success: true, amount, newBalance: newBal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: manual deposit approval ──────────────────────────────────────
// IMPORTANT FIX: manual deposit requests (created above via POST /manual)
// were created with status:'pending' but nothing anywhere in the codebase
// ever moved them to 'completed' or credited the user's balance — meaning
// every manual deposit request was permanently stuck and the user's balance
// never actually increased. These three endpoints close that gap.

router.get('/admin/pending', protect, requireAdmin, async (req, res) => {
  try {
    const pending = await Transaction.find({ type: 'deposit', status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('userId', 'username email balance');
    res.json({ success: true, deposits: pending });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/admin/:id/approve', protect, requireAdmin, async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, status: 'pending' });
    if (!tx) return res.status(404).json({ success: false, message: 'Pending deposit not found or already processed' });
    const user = await User.findById(tx.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const before = user.balance || 0;
    const after = before + tx.amount;
    user.balance = after;
    await user.save();

    tx.status = 'completed';
    tx.balanceBefore = before;
    tx.balanceAfter = after;
    tx.note = (tx.note ? tx.note + ' — ' : '') + `Approved by admin ${req.user.username || req.user._id}`;
    await tx.save();

    res.json({ success: true, message: `$${tx.amount} credited to ${user.username}`, transaction: tx });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/admin/:id/reject', protect, requireAdmin, async (req, res) => {
  try {
    const tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'failed', note: req.body.note || 'Rejected by admin' },
      { new: true }
    );
    if (!tx) return res.status(404).json({ success: false, message: 'Pending deposit not found or already processed' });
    res.json({ success: true, message: 'Deposit rejected', transaction: tx });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
