const mongoose = require('mongoose');

// ── Image Gallery ─────────────────────────────────
const ImageSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  url:         { type: String, required: true },
  filename:    { type: String, default: '' },
  source:      { type: String, enum: ['upload', 'ai_generated', 'url'], default: 'upload' },
  aiPrompt:    { type: String, default: '' },
  size:        { type: Number, default: 0 },
  mimeType:    { type: String, default: '' },
  tags:        [{ type: String }],
}, { timestamps: true });
const Image = mongoose.models.BPImage || mongoose.model('BPImage', ImageSchema);

// ── Subscription / Payment ────────────────────────
const SubscriptionSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan:        { type: mongoose.Schema.Types.ObjectId, ref: 'BPPlan', required: true },
  stripeSubscriptionId: { type: String, default: '' },
  stripePaymentIntentId: { type: String, default: '' },
  status:      { type: String, enum: ['active', 'cancelled', 'past_due', 'trialing'], default: 'active' },
  interval:    { type: String, enum: ['monthly', 'yearly', 'unlimited'] },
  amount:      { type: Number, default: 0 },
  currency:    { type: String, default: 'USD' },
  startDate:   { type: Date },
  endDate:     { type: Date },
}, { timestamps: true });
const Subscription = mongoose.model('Subscription', SubscriptionSchema);

// ── Webhook ───────────────────────────────────────
const WebhookSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true },
  url:         { type: String, required: true },
  events:      [{ type: String }], // e.g. ['post.published', 'post.failed']
  secret:      { type: String, default: '' },
  active:      { type: Boolean, default: true },
  lastTriggeredAt: { type: Date, default: null },
  failCount:   { type: Number, default: 0 },
}, { timestamps: true });
const Webhook = mongoose.model('Webhook', WebhookSchema);

// ── Blog ──────────────────────────────────────────
const BlogSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  slug:        { type: String, required: true, unique: true },
  content:     { type: String, default: '' },
  excerpt:     { type: String, default: '' },
  coverImage:  { type: String, default: '' },
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  published:   { type: Boolean, default: false },
  publishedAt: { type: Date, default: null },
  tags:        [{ type: String }],
}, { timestamps: true });
const Blog = mongoose.model('Blog', BlogSchema);

// ── Notification ──────────────────────────────────
const NotificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:    { type: String, enum: ['post_published', 'post_failed', 'subscription', 'system', 'campaign'], required: true },
  title:   { type: String, required: true },
  message: { type: String, default: '' },
  link:    { type: String, default: '' },
  read:    { type: Boolean, default: false },
}, { timestamps: true });
const Notification = mongoose.models.BPNotification || mongoose.model('BPNotification', NotificationSchema);


// ── Affiliate Referral ────────────────────────────────────────
const ReferralSchema = new mongoose.Schema({
  referrer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referred:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  commission:  { type: Number, default: 0 },
  status:      { type: String, enum: ['pending','paid'], default: 'pending' },
}, { timestamps: true });
const Referral = mongoose.models.BPReferral || mongoose.model('BPReferral', ReferralSchema);

// ── Wallet Transaction ────────────────────────────────────────
const WalletTxSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:        { type: String, enum: ['deposit','withdrawal','refund','commission','deduction'], required: true },
  amount:      { type: Number, required: true },
  balance:     { type: Number, default: 0 },
  description: { type: String, default: '' },
  reference:   { type: String, default: '' },
  status:      { type: String, enum: ['pending','completed','failed'], default: 'completed' },
}, { timestamps: true });
const WalletTx = mongoose.models.BPWalletTx || mongoose.model('BPWalletTx', WalletTxSchema);

// ── Withdrawal Request ────────────────────────────────────────
const WithdrawalSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount:      { type: Number, required: true },
  method:      { type: String, required: true },
  account:     { type: String, required: true },
  status:      { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  note:        { type: String, default: '' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  processedAt: { type: Date, default: null },
}, { timestamps: true });
const Withdrawal = mongoose.models.BPWithdrawal || mongoose.model('BPWithdrawal', WithdrawalSchema);

module.exports = { Image, Subscription, Webhook, Blog, Notification, Referral, WalletTx, Withdrawal };
