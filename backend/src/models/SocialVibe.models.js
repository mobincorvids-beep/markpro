const mongoose = require('mongoose');

// ── Plan ──────────────────────────────────────────────────────
const svPlanSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  price:         { type: Number, required: true },
  billingCycle:  { type: String, enum: ['monthly','yearly'], default: 'monthly' },
  stripePriceId: { type: String, default: '' },
  trialDays:     { type: Number, default: 14 },
  limits: {
    socialAccounts: { type: Number, default: 3 },
    scheduledPosts: { type: Number, default: 30 },
    teamMembers:    { type: Number, default: 1 },
    aiGenerations:  { type: Number, default: 50 },
    postTemplates:  { type: Number, default: 10 },
  },
  features:  [String],
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });
const SVPlan = mongoose.model('SVPlan', svPlanSchema);

// ── Social Account ────────────────────────────────────────────
const svSocialAccountSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  platform:      { type: String, enum: ['facebook','instagram','twitter','linkedin'], required: true },
  accountId:     { type: String, required: true },
  accountName:   { type: String, required: true },
  username:      String,
  avatar:        String,
  accessToken:   { type: String, required: true, select: false },
  refreshToken:  { type: String, select: false },
  tokenExpiresAt:Date,
  accountType:   { type: String, enum: ['page','profile','business'], default: 'profile' },
  isActive:      { type: Boolean, default: true },
  followers:     { type: Number, default: 0 },
  metadata:      mongoose.Schema.Types.Mixed,
}, { timestamps: true });
svSocialAccountSchema.index({ user: 1, platform: 1 });
const SVSocialAccount = mongoose.model('SVSocialAccount', svSocialAccountSchema);

// ── Post ──────────────────────────────────────────────────────
const svPostSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content:    { type: String, required: true, maxlength: 5000 },
  mediaUrls:  [String],
  mediaType:  { type: String, enum: ['none','image','video','carousel'], default: 'none' },
  accounts: [{
    socialAccount:  { type: mongoose.Schema.Types.ObjectId, ref: 'SVSocialAccount' },
    platform:       String,
    status:         { type: String, enum: ['pending','published','failed'], default: 'pending' },
    platformPostId: String,
    publishedAt:    Date,
    errorMessage:   String,
    stats: {
      likes:       { type: Number, default: 0 },
      comments:    { type: Number, default: 0 },
      shares:      { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
    },
  }],
  status:      { type: String, enum: ['draft','scheduled','publishing','published','failed','partial'], default: 'draft' },
  scheduledAt: { type: Date, default: null },
  publishedAt: { type: Date, default: null },
  tags:        [String],
  isAiGenerated: { type: Boolean, default: false },
  fromTemplate:  { type: mongoose.Schema.Types.ObjectId, ref: 'SVPostTemplate', default: null },
}, { timestamps: true });
svPostSchema.index({ user: 1, createdAt: -1 });
svPostSchema.index({ status: 1, scheduledAt: 1 });
const SVPost = mongoose.model('SVPost', svPostSchema);

// ── Post Template ─────────────────────────────────────────────
const svPostTemplateSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:      { type: String, required: true, trim: true },
  content:   { type: String, required: true },
  mediaUrls: [String],
  category:  { type: String, default: 'general' },
  platforms: [String],
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });
const SVPostTemplate = mongoose.model('SVPostTemplate', svPostTemplateSchema);

// ── Team ──────────────────────────────────────────────────────
const svTeamSchema = new mongoose.Schema({
  owner:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  member:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  email:   { type: String, required: true },
  name:    String,
  role:    { type: String, enum: ['admin','editor','viewer'], default: 'editor' },
  status:  { type: String, enum: ['pending','active','removed'], default: 'pending' },
  inviteToken:    String,
  inviteExpiresAt:Date,
  permissions: {
    canPost:           { type: Boolean, default: true },
    canSchedule:       { type: Boolean, default: true },
    canManageAccounts: { type: Boolean, default: false },
    canViewAnalytics:  { type: Boolean, default: true },
    canManageTeam:     { type: Boolean, default: false },
  },
}, { timestamps: true });
const SVTeam = mongoose.model('SVTeam', svTeamSchema);

// ── Bot Reply ─────────────────────────────────────────────────
const svBotReplySchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  socialAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'SVSocialAccount', required: true },
  name:          { type: String, required: true },
  triggerType:   { type: String, enum: ['keyword','any_comment','any_dm'], default: 'keyword' },
  keywords:      [String],
  replyType:     { type: String, enum: ['comment_reply','dm_reply','both'], default: 'comment_reply' },
  replyMessage:  { type: String, required: true },
  isActive:      { type: Boolean, default: true },
  triggeredCount:{ type: Number, default: 0 },
}, { timestamps: true });
const SVBotReply = mongoose.model('SVBotReply', svBotReplySchema);

// ── Ticket ────────────────────────────────────────────────────
const svTicketSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject:    { type: String, required: true },
  department: { type: String, default: 'general' },
  priority:   { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  status:     { type: String, enum: ['open','pending','answered','closed'], default: 'open' },
  messages: [{
    sender:     { type: String, enum: ['user','admin'], required: true },
    senderName: String,
    message:    String,
    attachments:[String],
    createdAt:  { type: Date, default: Date.now },
  }],
}, { timestamps: true });
const SVTicket = mongoose.model('SVTicket', svTicketSchema);

// ── Payment ───────────────────────────────────────────────────
const svPaymentSchema = new mongoose.Schema({
  user:               { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan:               { type: mongoose.Schema.Types.ObjectId, ref: 'SVPlan', required: true },
  processor:          { type: String, enum: ['stripe','paypal','free'], default: 'stripe' },
  processorPaymentId: String,
  billingInterval:    { type: String, enum: ['monthly','yearly'], default: 'monthly' },
  amount:             { type: Number, required: true },
  currency:           { type: String, default: 'USD' },
  status:             { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
  periodStart: Date,
  periodEnd:   Date,
}, { timestamps: true });
const SVPayment = mongoose.model('SVPayment', svPaymentSchema);

module.exports = {
  SVPlan, SVSocialAccount, SVPost, SVPostTemplate,
  SVTeam, SVBotReply, SVTicket, SVPayment,
};
