const mongoose = require('mongoose');

// ════════════════════════════════════════════════════
//  TOOLSAI MODELS
// ════════════════════════════════════════════════════

// ── AI Template ───────────────────────────────────────────────
const toolsAiTemplateSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  slug:        { type: String, unique: true, required: true },
  description: { type: String, default: '' },
  icon:        { type: String, default: null },
  type:        { type: String, enum: ['AiWrite','AiChat','AiCode'], default: 'AiWrite' },
  status:      { type: String, enum: ['approved','pending','rejected'], default: 'pending' },
  categories:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'ToolsAiCategory' }],
  data:        { type: mongoose.Schema.Types.Mixed, default: {} },   // form fields / prompt config
  isFeatured:  { type: Boolean, default: false },
  isBuiltin:   { type: Boolean, default: false },
  usageCount:  { type: Number, default: 0 },
}, { timestamps: true });
const ToolsAiTemplate = mongoose.model('ToolsAiTemplate', toolsAiTemplateSchema);

// ── Category ──────────────────────────────────────────────────
const toolsAiCategorySchema = new mongoose.Schema({
  name:   { type: String, required: true },
  slug:   { type: String, unique: true, required: true },
  icon:   { type: String, default: '' },
  status: { type: String, enum: ['active','inactive'], default: 'active' },
}, { timestamps: true });
const ToolsAiCategory = mongoose.model('ToolsAiCategory', toolsAiCategorySchema);

// ── Generated Document ────────────────────────────────────────
const toolsAiDocSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  template:   { type: mongoose.Schema.Types.ObjectId, ref: 'ToolsAiTemplate', default: null },
  title:      { type: String, default: '' },
  slug:       { type: String, default: '' },
  type:       { type: String, enum: ['aiWrite','aiImage','aiCode','aiSpeech'], default: 'aiWrite' },
  content:    { type: String, default: '' },
  data:       { type: mongoose.Schema.Types.Mixed, default: {} },
  usedTokens: { type: Number, default: 0 },
  isBookmark: { type: Boolean, default: false },
}, { timestamps: true });
toolsAiDocSchema.index({ user: 1, createdAt: -1 });
const ToolsAiDoc = mongoose.model('ToolsAiDoc', toolsAiDocSchema);

// ── Conversation (AI Chat) ────────────────────────────────────
const toolsAiConvSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'ToolsAiTemplate', required: true },
  title:    { type: String, default: 'New Conversation' },
  messages: [{
    content: { type: String, required: true },
    role:    { type: String, enum: ['user','assistant'], required: true },
    createdAt:{ type: Date, default: Date.now },
  }],
}, { timestamps: true });
toolsAiConvSchema.index({ user: 1, createdAt: -1 });
const ToolsAiConv = mongoose.model('ToolsAiConv', toolsAiConvSchema);

// ── Support Ticket ────────────────────────────────────────────
const toolsAiSupportSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject:  { type: String, required: true },
  message:  { type: String, required: true },
  status:   { type: String, enum: ['open','answered','closed'], default: 'open' },
  priority: { type: String, enum: ['low','medium','high'], default: 'medium' },
  replies: [{
    author:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    createdAt:{ type: Date, default: Date.now },
  }],
}, { timestamps: true });
const ToolsAiSupport = mongoose.model('ToolsAiSupport', toolsAiSupportSchema);

// ── Blog ──────────────────────────────────────────────────────
const toolsAiBlogSchema = new mongoose.Schema({
  title:           { type: String, required: true },
  slug:            { type: String, unique: true, required: true },
  excerpt:         { type: String, default: '' },
  content:         { type: String, default: '' },
  thumbnail:       { type: String, default: null },
  author:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  categories:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'ToolsAiCategory' }],
  status:          { type: String, enum: ['published','draft'], default: 'draft' },
  metaTitle:       { type: String, default: '' },
  metaDescription: { type: String, default: '' },
  views:           { type: Number, default: 0 },
}, { timestamps: true });
toolsAiBlogSchema.index({ status: 1, createdAt: -1 });
const ToolsAiBlog = mongoose.model('ToolsAiBlog', toolsAiBlogSchema);

// ── Transaction (plan billing) ────────────────────────────────
const toolsAiTxSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan:      { type: mongoose.Schema.Types.ObjectId, ref: 'ToolsAiPlan', default: null },
  amount:    { type: Number, required: true },
  currency:  { type: String, default: 'USD' },
  processor: { type: String, enum: ['stripe','free'], default: 'stripe' },
  processorId: String,
  status:    { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
}, { timestamps: true });
const ToolsAiTx = mongoose.model('ToolsAiTx', toolsAiTxSchema);

// ── Plan ─────────────────────────────────────────────────────
const toolsAiPlanSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  price:          { type: Number, required: true },
  billingCycle:   { type: String, enum: ['monthly','yearly'], default: 'monthly' },
  stripePriceId:  { type: String, default: '' },
  limits: {
    documentsPerMonth:   { type: Number, default: 50 },
    wordsPerMonth:       { type: Number, default: 50000 },
    imagesPerMonth:      { type: Number, default: 20 },
    speechMinutesPerMonth:{ type: Number, default: 10 },
    maxTemplates:        { type: Number, default: 30 },
    chatMessages:        { type: Number, default: 200 },
  },
  features:  [String],
  isActive:  { type: Boolean, default: true },
  isFeatured:{ type: Boolean, default: false },
}, { timestamps: true });
const ToolsAiPlan = mongoose.model('ToolsAiPlan', toolsAiPlanSchema);

// ════════════════════════════════════════════════════
//  SITESPY MODELS
// ════════════════════════════════════════════════════

// ── Tracked Website ───────────────────────────────────────────
const sspWebsiteSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  domainName:   { type: String, required: true, trim: true },
  trackingCode: { type: String, required: true, unique: true },
  isActive:     { type: Boolean, default: true },
  showOnDash:   { type: Boolean, default: true },
  timezone:     { type: String, default: 'UTC' },
  notes:        { type: String, default: '' },
}, { timestamps: true });
const SSPWebsite = mongoose.model('SSPWebsite', sspWebsiteSchema);

// ── Visitor Event ─────────────────────────────────────────────
const sspVisitorSchema = new mongoose.Schema({
  websiteId:   { type: mongoose.Schema.Types.ObjectId, ref: 'SSPWebsite', required: true, index: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cookieValue: { type: String, default: '' },
  sessionValue:{ type: String, default: '' },
  isNewVisitor:{ type: Boolean, default: true },
  visitUrl:    { type: String, default: '' },
  referrer:    { type: String, default: '' },
  pageTitle:   { type: String, default: '' },
  ip:          { type: String, default: '' },
  country:     { type: String, default: '' },
  countryCode: { type: String, default: '' },
  city:        { type: String, default: '' },
  region:      { type: String, default: '' },
  latitude:    { type: Number, default: null },
  longitude:   { type: Number, default: null },
  browser:     { type: String, default: '' },
  browserVersion:{ type: String, default: '' },
  os:          { type: String, default: '' },
  device:      { type: String, default: 'desktop' },
  userAgent:   { type: String, default: '' },
  trafficSource:{ type: String, enum: ['organic','direct','referral','social','email','paid','unknown'], default: 'unknown' },
  dateTime:    { type: Date, default: Date.now, index: true },
}, { timestamps: false });
sspVisitorSchema.index({ websiteId: 1, dateTime: -1 });
sspVisitorSchema.index({ userId: 1, dateTime: -1 });
const SSPVisitor = mongoose.model('SSPVisitor', sspVisitorSchema);

// ── URL Shortener ─────────────────────────────────────────────
const sspUrlSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalUrl:{ type: String, required: true },
  shortCode:  { type: String, unique: true },
  provider:   { type: String, enum: ['internal','bitly','rebrandly'], default: 'internal' },
  shortUrl:   { type: String, default: '' },
  externalId: { type: String, default: '' },
  clicks:     { type: Number, default: 0 },
  clickData: [{
    ip:        String,
    country:   String,
    browser:   String,
    referrer:  String,
    clickedAt: { type: Date, default: Date.now },
  }],
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });
const SSPUrl = mongoose.model('SSPUrl', sspUrlSchema);

// ── WHOIS Search ──────────────────────────────────────────────
const sspWhoisSchema = new mongoose.Schema({
  userId:                 { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  domainName:             { type: String, required: true },
  adminName:              { type: String, default: '' },
  adminEmail:             { type: String, default: '' },
  adminCountry:           { type: String, default: '' },
  registrantName:         { type: String, default: '' },
  registrantOrganization: { type: String, default: '' },
  registrantEmail:        { type: String, default: '' },
  registrantCountry:      { type: String, default: '' },
  registrarUrl:           { type: String, default: '' },
  isRegistered:           { type: Boolean, default: false },
  nameServers:            [String],
  createdAt_domain:       { type: Date, default: null },
  changedAt:              { type: Date, default: null },
  expireAt:               { type: Date, default: null },
  rawData:                { type: String, default: '' },
}, { timestamps: true });
const SSPWhois = mongoose.model('SSPWhois', sspWhoisSchema);

// ── Keyword Tracking ──────────────────────────────────────────
const sspKeywordSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  keyword:      { type: String, required: true },
  domain:       { type: String, required: true },
  searchEngine: { type: String, default: 'google' },
  isActive:     { type: Boolean, default: true },
  history: [{
    position:  Number,
    checkedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });
const SSPKeyword = mongoose.model('SSPKeyword', sspKeywordSchema);

// ── SiteSpy Plan ─────────────────────────────────────────────
const sspPlanSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  price:         { type: Number, required: true },
  billingCycle:  { type: String, enum: ['monthly','yearly'], default: 'monthly' },
  stripePriceId: { type: String, default: '' },
  limits: {
    websites:      { type: Number, default: 3 },
    shortUrls:     { type: Number, default: 50 },
    visitorEvents: { type: Number, default: 10000 },
    keywords:      { type: Number, default: 20 },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const SSPPlan = mongoose.model('SSPPlan', sspPlanSchema);

module.exports = {
  // ToolsAI
  ToolsAiTemplate, ToolsAiCategory, ToolsAiDoc,
  ToolsAiConv, ToolsAiSupport, ToolsAiBlog, ToolsAiTx, ToolsAiPlan,
  // SiteSpy
  SSPWebsite, SSPVisitor, SSPUrl, SSPWhois, SSPKeyword, SSPPlan,
};
