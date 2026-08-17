const mongoose = require('mongoose');

/* ── Domain ─────────────────────────────────────────────── */
const domainSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  host: { type: String, required: true, trim: true, lowercase: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  customSsl: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
domainSchema.index({ host: 1, user: 1 }, { unique: true });

/* ── NotificationHandler ────────────────────────────────── */
const notificationHandlerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['webhook', 'email', 'slack', 'discord', 'telegram', 'twilio_sms'],
    required: true,
  },
  settings: {
    // webhook
    webhookUrl: String,
    webhookMethod: { type: String, enum: ['GET', 'POST'], default: 'POST' },
    // email
    emailAddress: String,
    // slack / discord
    slackWebhookUrl: String,
    discordWebhookUrl: String,
    // telegram
    telegramBotToken: String,
    telegramChatId: String,
    // twilio
    twilioAccountSid: String,
    twilioAuthToken: String,
    twilioFromNumber: String,
    twilioToNumber: String,
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

/* ── NotificationLog (pixel tracking) ──────────────────── */
const notificationLogSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
  notification: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['impression', 'click', 'conversion', 'lead'], required: true },
  // Visitor info
  visitorId: String,
  ip: String,
  country: String,
  city: String,
  device: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
  browser: String,
  os: String,
  referrer: String,
  pageUrl: String,
  // Extra conversion data
  conversionValue: { type: Number, default: 0 },
  metadata: mongoose.Schema.Types.Mixed,
  date: { type: Date, default: Date.now, index: true },
}, { timestamps: false });
notificationLogSchema.index({ campaign: 1, date: -1 });
notificationLogSchema.index({ notification: 1, date: -1 });
notificationLogSchema.index({ user: 1, date: -1 });

/* ── Lead (collected from collector notifications) ───────── */
const leadSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  notification: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: String,
  name: String,
  phone: String,
  message: String,
  ip: String,
  country: String,
  referrer: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
leadSchema.index({ campaign: 1, createdAt: -1 });
leadSchema.index({ user: 1, createdAt: -1 });

/* ── Payment ─────────────────────────────────────────────── */
const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  processor: {
    type: String,
    enum: ['stripe', 'paypal', 'offline', 'free'],
    default: 'stripe',
  },
  processorPaymentId: String,
  billingInterval: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'canceled'],
    default: 'pending',
  },
  periodStart: Date,
  periodEnd: Date,
  invoiceUrl: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = {
  Domain: mongoose.model('Domain', domainSchema),
  NotificationHandler: mongoose.model('NotificationHandler', notificationHandlerSchema),
  NotificationLog: mongoose.model('NotificationLog', notificationLogSchema),
  Lead: mongoose.model('Lead', leadSchema),
  Payment: mongoose.model('Payment', paymentSchema),
};
