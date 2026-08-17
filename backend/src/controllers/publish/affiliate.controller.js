const { Referral, WalletTx, Withdrawal } = require('../../models/BPOther.model');
const BPPost   = require('../../models/BPPost.model');
const BPPlan   = require('../../models/BPPlan.model');
const User     = require('../../models/User.model');
const crypto   = require('crypto');
const { ledger } = require('../../utils/wallet');

// ── Helpers ───────────────────────────────────────────────────
/**
 * Atomic wallet mutation (Section B.5). `amount` is signed; a negative amount
 * only succeeds when the wallet actually holds that much, so two concurrent
 * withdrawals can never both pass the balance check.
 */
async function addWalletTx(userId, type, amount, description, reference = '') {
  const filter = amount < 0
    ? { _id: userId, walletBalance: { $gte: Math.abs(amount) } }
    : { _id: userId };
  const user = await User.findOneAndUpdate(filter, { $inc: { walletBalance: amount } }, { new: true });
  if (!user) {
    const e = new Error('Insufficient wallet balance');
    e.statusCode = 400;
    throw e;
  }
  const newBalance = user.walletBalance;
  await WalletTx.create({ user: userId, type, amount, balance: newBalance, description, reference });
  await ledger({
    userId, module: 'publish', currencyType: 'walletBalance',
    amount, balanceAfter: newBalance, reason: description, refType: 'WalletTx',
  });
  return newBalance;
}

// ── Affiliate ─────────────────────────────────────────────────
exports.getAffiliateStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const referrals = await Referral.find({ referrer: req.user._id })
      .populate('referred', 'name email createdAt').sort({ createdAt: -1 });
    const totalEarned = referrals.reduce((sum, r) => sum + (r.commission || 0), 0);
    const pending = referrals.filter(r => r.status === 'pending').reduce((s, r) => s + r.commission, 0);
    res.json({
      success: true,
      affiliateCode:  user.affiliateCode || null,
      affiliateLink:  user.affiliateCode ? `${process.env.FRONTEND_URL}/register?ref=${user.affiliateCode}` : null,
      walletBalance:  user.walletBalance || 0,
      totalEarned,
      pendingPayout:  pending,
      referralsCount: referrals.length,
      referrals,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.generateAffiliateCode = async (req, res) => {
  try {
    let user = await User.findById(req.user._id);
    if (!user.affiliateCode) {
      user.affiliateCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      await user.save();
    }
    res.json({ success: true, affiliateCode: user.affiliateCode,
      affiliateLink: `${process.env.FRONTEND_URL}/register?ref=${user.affiliateCode}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Called from auth controller when new user registers with referral code
exports.processReferral = async (referralCode, newUserId) => {
  try {
    const referrer = await User.findOne({ affiliateCode: referralCode });
    if (!referrer || referrer._id.equals(newUserId)) return;
    const commissionRate = parseFloat(process.env.BP_AFFILIATE_COMMISSION_RATE || '0.1');
    const plan = await BPPlan.findOne({ price: { $gt: 0 } }).sort({ price: 1 });
    const commission = plan ? Math.round(plan.price * commissionRate * 100) / 100 : 0;
    await Referral.create({ referrer: referrer._id, referred: newUserId, commission, status: commission > 0 ? 'pending' : 'paid' });
    await User.findByIdAndUpdate(newUserId, { referredBy: referrer._id });
    if (commission > 0) {
      await addWalletTx(referrer._id, 'commission', commission, `Referral commission for new signup`, newUserId.toString());
    }
  } catch {}
};

// ── Wallet ────────────────────────────────────────────────────
exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('walletBalance');
    const { page = 1, limit = 30 } = req.query;
    const [txs, total] = await Promise.all([
      WalletTx.find({ user: req.user._id }).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
      WalletTx.countDocuments({ user: req.user._id }),
    ]);
    res.json({ success: true, balance: user.walletBalance || 0, transactions: txs, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.depositToWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Wallet Top-up' }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/wallet?topup=success&amount=${amount}`,
      cancel_url:  `${process.env.FRONTEND_URL}/wallet?topup=cancelled`,
      metadata: { userId: req.user._id.toString(), type: 'wallet_topup', amount: amount.toString() },
    });
    res.json({ success: true, url: session.url });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Called from Stripe webhook when wallet top-up payment succeeds
exports.handleWalletTopupWebhook = async (userId, amount) => {
  try {
    await addWalletTx(userId, 'deposit', amount, 'Wallet top-up via Stripe', '');
  } catch {}
};

// ── Withdrawals ───────────────────────────────────────────────
exports.getWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, withdrawals });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, method, account } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });
    // Deduct immediately (atomic - insufficient funds throws 400), refund if rejected
    await addWalletTx(req.user._id, 'deduction', -amount, `Withdrawal request via ${method}`, '');
    const w = await Withdrawal.create({ user: req.user._id, amount, method, account });
    res.status(201).json({ success: true, withdrawal: w });
  } catch (err) { res.status(err.statusCode || 500).json({ success: false, message: err.message }); }
};

// Admin: approve / reject withdrawal
exports.adminGetWithdrawals = async (req, res) => {
  try {
    const { status } = req.query;
    const q = {};
    if (status) q.status = status;
    const list = await Withdrawal.find(q).populate('user','name email').sort({ createdAt: -1 });
    res.json({ success: true, withdrawals: list });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.adminProcessWithdrawal = async (req, res) => {
  try {
    const { status, note } = req.body;
    const w = await Withdrawal.findByIdAndUpdate(req.params.id,
      { status, note: note || '', processedBy: req.user._id, processedAt: new Date() },
      { new: true }
    );
    if (!w) return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    if (status === 'rejected') {
      // Refund the deducted amount
      await addWalletTx(w.user, 'refund', w.amount, `Withdrawal rejected - refunded`, w._id.toString());
    }
    res.json({ success: true, withdrawal: w });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Failed-post credit refund ─────────────────────────────────
// Called from publish cron when a post fails
exports.refundFailedPost = async (postId, userId) => {
  try {
    const plan = await BPPlan.findById((await User.findById(userId)).plan);
    if (!plan) return;
    // Restore 1 post credit by decrementing postsUsed
    await User.findByIdAndUpdate(userId, { $inc: { postsUsedThisMonth: -1 } });
    // Log wallet refund if on credit-based plan
    if (plan.price > 0) {
      const creditPerPost = parseFloat(process.env.BP_CREDIT_PER_POST || '0');
      if (creditPerPost > 0) {
        await addWalletTx(userId, 'refund', creditPerPost, 'Failed post credit refund', postId.toString());
      }
    }
  } catch {}
};

// ── External HTTP cron endpoint ───────────────────────────────
// POST /api/publish/cron/run - trigger scheduler from external cron job (VPS cron / cPanel)
exports.externalCronRun = async (req, res) => {
  const secret = req.headers['x-cron-secret'] || req.body.secret;
  if (secret !== process.env.CRON_SECRET)
    return res.status(401).json({ success: false, message: 'Invalid cron secret' });

  res.json({ success: true, message: 'Cron triggered', startedAt: new Date() });

  // Run publish scheduler asynchronously
  setImmediate(async () => {
    try {
      const now   = new Date();
      const posts = await BPPost.find({ status: 'scheduled', scheduledAt: { $lte: now } })
        .populate('socialAccounts').limit(50);
      const { publishPostToNetworks } = require('../../services/socialPublisher.service');
      let published = 0, failed = 0;
      for (const post of posts) {
        try {
          post.status = 'processing';
          await post.save();
          await publishPostToNetworks(post);
          post.status = 'published';
          await post.save();
          published++;
        } catch (e) {
          post.status = 'failed';
          post.failReason = e.message;
          await post.save();
          failed++;
          // Refund post credit
          await exports.refundFailedPost(post._id, post.user);
        }
      }
      console.log(`[External Cron] Published: ${published}, Failed: ${failed}`);
    } catch (e) { console.error('[External Cron Error]', e.message); }
  });
};
