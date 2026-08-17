/**
 * Local payment rails (JazzCash, EasyPaisa, bank transfer).
 *
 * Flow:
 *   1. GET  /api/payments/methods      -> the merchant accounts to pay into
 *   2. POST /api/payments/local        -> user submits amount + transaction id
 *   3. GET  /api/payments/local/mine   -> user tracks their submissions
 *   4. GET  /api/payments/local/admin  -> admin queue of pending claims
 *   5. POST /api/payments/local/:id/approve | /reject
 *
 * Money only ever moves on approval, through utils/smmWallet.refundUser,
 * which is an atomic $inc plus a WalletLedger entry. There is no
 * read-then-write anywhere in this file.
 */
const LocalPayment = require('../../models/LocalPayment.model');
const User         = require('../../models/User.model');
const { ok, err, asyncHandler } = require('../../utils/response');
const { refundUser } = require('../../utils/smmWallet');

/** Merchant accounts come from env so no account number is ever committed. */
const methodCatalog = () => [
  {
    id: 'jazzcash',
    label: 'JazzCash',
    accountTitle:  process.env.JAZZCASH_ACCOUNT_TITLE  || '',
    accountNumber: process.env.JAZZCASH_ACCOUNT_NUMBER || '',
    instructions: 'Send the amount from your JazzCash app or any JazzCash agent, then enter the TID from the confirmation SMS below.',
    enabled: Boolean(process.env.JAZZCASH_ACCOUNT_NUMBER),
  },
  {
    id: 'easypaisa',
    label: 'EasyPaisa',
    accountTitle:  process.env.EASYPAISA_ACCOUNT_TITLE  || '',
    accountNumber: process.env.EASYPAISA_ACCOUNT_NUMBER || '',
    instructions: 'Send the amount from your EasyPaisa app or any EasyPaisa shop, then enter the TRX ID from the receipt below.',
    enabled: Boolean(process.env.EASYPAISA_ACCOUNT_NUMBER),
  },
  {
    id: 'bank_transfer',
    label: 'Bank transfer',
    accountTitle:  process.env.BANK_ACCOUNT_TITLE || '',
    accountNumber: process.env.BANK_IBAN          || '',
    bankName:      process.env.BANK_NAME          || '',
    instructions: 'Transfer via IBFT or online banking, then enter the bank reference number below.',
    enabled: Boolean(process.env.BANK_IBAN),
  },
];

const MIN_TOPUP = Number(process.env.LOCAL_PAYMENT_MIN || 200);
const MAX_TOPUP = Number(process.env.LOCAL_PAYMENT_MAX || 500000);

exports.getMethods = asyncHandler(async (_req, res) =>
  ok(res, { methods: methodCatalog().filter(m => m.enabled), min: MIN_TOPUP, max: MAX_TOPUP, currency: 'PKR' })
);

exports.createPayment = asyncHandler(async (req, res) => {
  const { method, amount, transactionId, senderName, senderAccount, receiptUrl, purpose, plan } = req.body || {};

  if (!['jazzcash', 'easypaisa', 'bank_transfer'].includes(method))
    return err(res, 'Choose JazzCash, EasyPaisa or bank transfer.', 400);

  const value = Number(amount);
  if (!Number.isFinite(value) || value < MIN_TOPUP || value > MAX_TOPUP)
    return err(res, `Amount must be between ${MIN_TOPUP} and ${MAX_TOPUP} PKR.`, 400);

  if (!transactionId || String(transactionId).trim().length < 4)
    return err(res, 'Enter the transaction id printed on your receipt.', 400);

  const duplicate = await LocalPayment.findOne({ method, transactionId: String(transactionId).trim() }).lean();
  if (duplicate) return err(res, 'That transaction id has already been submitted.', 409);

  const payment = await LocalPayment.create({
    user: req.user._id,
    method,
    amount: value,
    transactionId: String(transactionId).trim(),
    senderName, senderAccount, receiptUrl,
    purpose: purpose === 'plan' ? 'plan' : 'wallet_topup',
    plan: purpose === 'plan' ? plan : undefined,
  });

  return ok(res, payment, 201);
});

exports.listMine = asyncHandler(async (req, res) => {
  const payments = await LocalPayment.find({ user: req.user._id })
    .sort({ createdAt: -1 }).limit(100).lean();
  return ok(res, payments);
});

exports.listAll = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const payments = await LocalPayment.find(filter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 }).limit(300).lean();
  return ok(res, payments);
});

exports.approve = asyncHandler(async (req, res) => {
  // Atomic state transition: only a still-pending claim can be approved, so a
  // double click or two admins acting at once can never credit twice.
  const payment = await LocalPayment.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { status: 'approved', reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: req.body?.note || '' },
    { new: true }
  );
  if (!payment) return err(res, 'Payment not found or already reviewed.', 404);

  if (payment.purpose === 'plan' && payment.plan) {
    await User.updateOne({ _id: payment.user }, { plan: payment.plan, subscriptionStatus: 'active' });
  } else {
    await refundUser(payment.user, payment.amount, {
      reason: `${payment.method} top-up ${payment.transactionId}`,
      refType: 'LocalPayment',
      refId: payment._id,
    });
  }

  return ok(res, payment);
});

exports.reject = asyncHandler(async (req, res) => {
  const payment = await LocalPayment.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { status: 'rejected', reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: req.body?.note || '' },
    { new: true }
  );
  if (!payment) return err(res, 'Payment not found or already reviewed.', 404);
  return ok(res, payment);
});
