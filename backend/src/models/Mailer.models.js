const mongoose = require('mongoose');

// ── Contact Group ─────────────────────────────────────────────────────────
const mailerGroupSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:         { type: String, required: true, trim: true },
  description:  { type: String, trim: true },
  color:        { type: String, default: '#6366f1' },
  contactCount: { type: Number, default: 0 },
  tags:         [String],
}, { timestamps: true });
const MailerGroup = mongoose.model('MailerGroup', mailerGroupSchema);

// ── Contact ───────────────────────────────────────────────────────────────
const mailerContactSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String, trim: true, default: '' },
  lastName:  { type: String, trim: true, default: '' },
  email:     { type: String, lowercase: true, trim: true },
  phone:     { type: String, trim: true },
  groups:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'MailerGroup' }],
  customFields: { type: Map, of: String },
  tags:      [String],
  status:    { type: String, enum: ['active','unsubscribed','bounced','complained'], default: 'active' },
  emailBounced: { type: Boolean, default: false },
  smsFailed:    { type: Boolean, default: false },
  unsubscribedAt: Date,
  source:    { type: String, enum: ['manual','csv','api','form'], default: 'manual' },
  stats: {
    emailsSent:   { type: Number, default: 0 },
    emailsOpened: { type: Number, default: 0 },
    emailsClicked:{ type: Number, default: 0 },
    smsSent:      { type: Number, default: 0 },
  },
}, { timestamps: true });
mailerContactSchema.index({ user: 1, email: 1 });
mailerContactSchema.index({ user: 1, phone: 1 });
mailerContactSchema.index({ user: 1, groups: 1 });
const MailerContact = mongoose.model('MailerContact', mailerContactSchema);

// ── Message Template ──────────────────────────────────────────────────────
const mailerTemplateSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true, trim: true },
  type:     { type: String, enum: ['email','sms'], required: true },
  subject:  { type: String, trim: true },
  body:     { type: String, required: true },
  htmlBody: String,
  category: { type: String, enum: ['marketing','transactional','newsletter','promotion','announcement','other'], default: 'marketing' },
  variables: [String],
  usageCount:{ type: Number, default: 0 },
}, { timestamps: true });
mailerTemplateSchema.index({ user: 1, type: 1 });
const MailerTemplate = mongoose.model('MailerTemplate', mailerTemplateSchema);

// ── Campaign ──────────────────────────────────────────────────────────────
const recipientSchema = new mongoose.Schema({
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'MailerContact' },
  email: String, phone: String,
  status: { type: String, enum: ['pending','sent','delivered','opened','clicked','bounced','failed','unsubscribed'], default: 'pending' },
  sentAt: Date, deliveredAt: Date, openedAt: Date, clickedAt: Date, failedReason: String, messageId: String,
}, { _id: false });

const mailerCampaignSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true, trim: true },
  type:     { type: String, enum: ['email','sms'], required: true },
  // Email fields
  subject: String, fromName: String, fromEmail: String, replyTo: String,
  htmlBody: String, textBody: String,
  emailProvider: { type: String, enum: ['smtp','sendgrid','mailgun'] },
  // SMS fields
  smsBody: String,
  smsProvider: { type: String, enum: ['twilio','vonage'] },
  // Targeting
  template:    { type: mongoose.Schema.Types.ObjectId, ref: 'MailerTemplate' },
  groups:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'MailerGroup' }],
  contacts:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'MailerContact' }],
  allContacts: { type: Boolean, default: false },
  recipients:  [recipientSchema],
  // Status & scheduling
  status:      { type: String, enum: ['draft','scheduled','sending','sent','paused','failed','canceled'], default: 'draft' },
  scheduledAt: Date, startedAt: Date, completedAt: Date,
  // Stats
  stats: {
    total: { type: Number, default: 0 }, sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 }, opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 }, bounced: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }, unsubscribed: { type: Number, default: 0 },
  },
  trackOpens: { type: Boolean, default: true },
  trackClicks: { type: Boolean, default: true },
  unsubscribeLink: { type: Boolean, default: true },
  tags: [String],
}, { timestamps: true });
mailerCampaignSchema.index({ user: 1, status: 1 });
mailerCampaignSchema.index({ scheduledAt: 1, status: 1 });
const MailerCampaign = mongoose.model('MailerCampaign', mailerCampaignSchema);

module.exports = { MailerGroup, MailerContact, MailerTemplate, MailerCampaign };
