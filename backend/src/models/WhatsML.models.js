const mongoose = require('mongoose');

// ── Workspace (multi-tenant) ──────────────────────────────────
const workspaceSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  owner:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  logo:   { type: String, default: '' },
  members: [{
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role:      { type: String, enum: ['owner','admin','member'], default: 'member' },
    invitedAt: { type: Date, default: Date.now },
    acceptedAt:{ type: Date, default: null },
    status:    { type: String, enum: ['pending','active'], default: 'pending' },
  }],
  active: { type: Boolean, default: true },
}, { timestamps: true });
const WMLWorkspace = mongoose.model('WMLWorkspace', workspaceSchema);

// ── Cloud API connection (Meta WhatsApp Business) ─────────────
const cloudAppSchema = new mongoose.Schema({
  user:               { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workspace:          { type: mongoose.Schema.Types.ObjectId, ref: 'WMLWorkspace', default: null },
  name:               { type: String, default: 'My WhatsApp Business' },
  phoneNumberId:      { type: String, required: true },
  wabaId:             { type: String, default: '' },
  businessId:         { type: String, default: '' },
  accessToken:        { type: String, required: true },
  webhookVerifyToken: { type: String, default: '' },
  appId:              { type: String, default: '' },
  appSecret:          { type: String, default: '' },
  displayPhoneNumber: { type: String, default: '' },
  verifiedName:       { type: String, default: '' },
  qualityRating:      { type: String, default: 'UNKNOWN' },
  status:  { type: String, enum: ['connected','disconnected','pending','error'], default: 'pending' },
  errorMessage: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
  active:    { type: Boolean, default: true },
}, { timestamps: true });
cloudAppSchema.index({ phoneNumberId: 1 }, { unique: true });
const WMLCloudApp = mongoose.model('WMLCloudApp', cloudAppSchema);

// ── WhatsApp Web session (Baileys) ────────────────────────────
const webAppSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workspace:  { type: mongoose.Schema.Types.ObjectId, ref: 'WMLWorkspace', default: null },
  name:       { type: String, default: 'My WhatsApp' },
  sessionId:  { type: String, required: true, unique: true },
  phoneNumber:{ type: String, default: '' },
  profileName:{ type: String, default: '' },
  profilePicUrl:{ type: String, default: '' },
  status:     { type: String, enum: ['initializing','qr_pending','connected','disconnected','logged_out','banned'], default: 'initializing' },
  qrCode:     { type: String, default: '' },
  lastSeenAt: { type: Date, default: null },
  isDefault:  { type: Boolean, default: false },
  active:     { type: Boolean, default: true },
  settings: {
    autoReplyEnabled: { type: Boolean, default: false },
    warmerEnabled:    { type: Boolean, default: false },
    webhookUrl:       { type: String, default: '' },
  },
}, { timestamps: true });
const WMLWebApp = mongoose.model('WMLWebApp', webAppSchema);

// ── Customer (CRM contact) ────────────────────────────────────
const customerSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:       { type: String, default: '' },
  phone:      { type: String, required: true },
  email:      { type: String, default: '' },
  countryCode:{ type: String, default: '' },
  avatar:     { type: String, default: '' },
  tags:       [String],
  groups:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'WMLGroup' }],
  source:     { type: String, enum: ['manual','import','api','widget','scraping'], default: 'manual' },
  customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  optedOut:   { type: Boolean, default: false },
  lastContactedAt: { type: Date, default: null },
  notes:      { type: String, default: '' },
}, { timestamps: true });
customerSchema.index({ user: 1, phone: 1 }, { unique: true });
customerSchema.index({ user: 1, tags: 1 });
const WMLCustomer = mongoose.model('WMLCustomer', customerSchema);

// ── Group ─────────────────────────────────────────────────────
const groupSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:          { type: String, required: true },
  description:   { type: String, default: '' },
  color:         { type: String, default: '#25D366' },
  customerCount: { type: Number, default: 0 },
}, { timestamps: true });
const WMLGroup = mongoose.model('WMLGroup', groupSchema);

// ── Conversation + Message (unified inbox) ────────────────────
const conversationSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  customer:   { type: mongoose.Schema.Types.ObjectId, ref: 'WMLCustomer', required: true },
  channel:    { type: String, enum: ['cloud_api','whatsapp_web'], required: true },
  channelApp: { type: mongoose.Schema.Types.ObjectId, required: true },
  lastMessage:   { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  unreadCount:   { type: Number, default: 0 },
  status:      { type: String, enum: ['open','pending','resolved'], default: 'open' },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isAiHandled: { type: Boolean, default: false },
}, { timestamps: true });
conversationSchema.index({ user: 1, channel: 1, channelApp: 1, customer: 1 }, { unique: true });
conversationSchema.index({ user: 1, lastMessageAt: -1 });
const WMLConversation = mongoose.model('WMLConversation', conversationSchema);

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'WMLConversation', required: true, index: true },
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  direction:    { type: String, enum: ['inbound','outbound'], required: true },
  sender:       { type: String, enum: ['customer','agent','ai','system'], default: 'customer' },
  type:         { type: String, enum: ['text','image','video','audio','document','location','template','interactive','sticker'], default: 'text' },
  body:         { type: String, default: '' },
  mediaUrl:     { type: String, default: '' },
  caption:      { type: String, default: '' },
  wamid:        { type: String, default: '' },
  status:       { type: String, enum: ['queued','sent','delivered','read','failed'], default: 'sent' },
  errorMessage: { type: String, default: '' },
  isAiGenerated:{ type: Boolean, default: false },
}, { timestamps: true });
messageSchema.index({ conversation: 1, createdAt: 1 });
const WMLMessage = mongoose.model('WMLMessage', messageSchema);

// ── Campaign ──────────────────────────────────────────────────
const campaignSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:       { type: String, required: true },
  channel:    { type: String, enum: ['cloud_api','whatsapp_web'], required: true },
  channelApp: { type: mongoose.Schema.Types.ObjectId, required: true },
  groups:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'WMLGroup' }],
  customers:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'WMLCustomer' }],
  tags:       [String],
  template:   { type: mongoose.Schema.Types.ObjectId, default: null },
  messageBody:{ type: String, default: '' },
  mediaUrl:   { type: String, default: '' },
  variables:  { type: mongoose.Schema.Types.Mixed, default: {} },
  status:     { type: String, enum: ['draft','scheduled','sending','completed','failed','paused','cancelled'], default: 'draft' },
  scheduledAt:{ type: Date, default: null },
  startedAt:  { type: Date, default: null },
  completedAt:{ type: Date, default: null },
  delaySeconds:{ type: Number, default: 5 },
  stats: {
    total:     { type: Number, default: 0 },
    sent:      { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    read:      { type: Number, default: 0 },
    failed:    { type: Number, default: 0 },
  },
}, { timestamps: true });
const WMLCampaign = mongoose.model('WMLCampaign', campaignSchema);

const campaignLogSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'WMLCampaign', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'WMLCustomer', required: true },
  phone:    { type: String, required: true },
  status:   { type: String, enum: ['pending','sent','delivered','read','failed'], default: 'pending' },
  errorMessage:{ type: String, default: '' },
  sentAt:   { type: Date, default: null },
}, { timestamps: true });
const WMLCampaignLog = mongoose.model('WMLCampaignLog', campaignLogSchema);

// ── Auto-Response (keyword + AI bots) ────────────────────────
const autoResponseSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:        { type: String, required: true },
  channel:     { type: String, enum: ['cloud_api','whatsapp_web','both'], default: 'both' },
  channelApps: [mongoose.Schema.Types.ObjectId],
  mode:        { type: String, enum: ['keyword','ai'], default: 'keyword' },
  items: [{
    keywords:     [String],
    matchType:    { type: String, enum: ['exact','contains','starts_with','regex'], default: 'contains' },
    replyText:    { type: String, default: '' },
    replyMediaUrl:{ type: String, default: '' },
    priority:     { type: Number, default: 0 },
    active:       { type: Boolean, default: true },
  }],
  aiSystemPrompt:    { type: String, default: 'You are a helpful customer support assistant.' },
  aiFallbackMessage: { type: String, default: "I'm not sure how to help with that." },
  activeHoursOnly: { type: Boolean, default: false },
  activeHours: { start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
  status:     { type: String, enum: ['active','paused'], default: 'active' },
  triggeredCount:{ type: Number, default: 0 },
}, { timestamps: true });
const WMLAutoResponse = mongoose.model('WMLAutoResponse', autoResponseSchema);

// ── AI Training (RAG knowledge base) ─────────────────────────
const aiTrainingSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:       { type: String, required: true },
  sourceType: { type: String, enum: ['text','file','url','qa_pairs'], default: 'text' },
  content:    { type: String, default: '' },
  qaPairs:    [{ question: String, answer: String }],
  fileUrl:    { type: String, default: '' },
  status:     { type: String, enum: ['processing','ready','failed'], default: 'processing' },
  vectorCount:{ type: Number, default: 0 },
  active:     { type: Boolean, default: true },
}, { timestamps: true });
const WMLAiTraining = mongoose.model('WMLAiTraining', aiTrainingSchema);

// ── Number Scanner ────────────────────────────────────────────
const numberScannerSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:            { type: String, default: 'Number Check' },
  numbersTotal:    { type: Number, default: 0 },
  numbersValid:    { type: Number, default: 0 },
  numbersInvalid:  { type: Number, default: 0 },
  status:          { type: String, enum: ['queued','running','completed','failed'], default: 'queued' },
  results: [{
    phone:        String,
    hasWhatsapp:  Boolean,
    name:         String,
    checkedAt:    Date,
  }],
}, { timestamps: true });
const WMLNumberScanner = mongoose.model('WMLNumberScanner', numberScannerSchema);

// ── Web Scraping ──────────────────────────────────────────────
const webScrapingSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:         { type: String, required: true },
  sourceType:   { type: String, enum: ['google_maps','website','csv_url'], default: 'google_maps' },
  query:        { type: String, default: '' },
  targetUrl:    { type: String, default: '' },
  status:       { type: String, enum: ['queued','running','completed','failed'], default: 'queued' },
  resultsCount: { type: Number, default: 0 },
  errorMessage: { type: String, default: '' },
  startedAt:    { type: Date, default: null },
  completedAt:  { type: Date, default: null },
}, { timestamps: true });
const WMLWebScraping = mongoose.model('WMLWebScraping', webScrapingSchema);

const webScrapedDataSchema = new mongoose.Schema({
  job:      { type: mongoose.Schema.Types.ObjectId, ref: 'WMLWebScraping', required: true, index: true },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, default: '' },
  phone:    { type: String, default: '' },
  email:    { type: String, default: '' },
  address:  { type: String, default: '' },
  website:  { type: String, default: '' },
  rating:   { type: Number, default: null },
  imported: { type: Boolean, default: false },
}, { timestamps: true });
const WMLWebScrapedData = mongoose.model('WMLWebScrapedData', webScrapedDataSchema);

// ── Bulk Send Log ─────────────────────────────────────────────
const bulkSendLogSchema = new mongoose.Schema({
  app:              { type: mongoose.Schema.Types.ObjectId, required: true },
  user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaign:         { type: mongoose.Schema.Types.ObjectId, ref: 'WMLCampaign', default: null },
  totalRecipients:  { type: Number, default: 0 },
  sentCount:        { type: Number, default: 0 },
  failedCount:      { type: Number, default: 0 },
  status:           { type: String, enum: ['queued','processing','completed','failed','cancelled'], default: 'queued' },
  startedAt:        { type: Date, default: null },
  completedAt:      { type: Date, default: null },
}, { timestamps: true });
const WMLBulkSendLog = mongoose.model('WMLBulkSendLog', bulkSendLogSchema);

module.exports = {
  WMLWorkspace, WMLCloudApp, WMLWebApp,
  WMLCustomer, WMLGroup, WMLConversation, WMLMessage,
  WMLCampaign, WMLCampaignLog, WMLAutoResponse,
  WMLAiTraining, WMLNumberScanner,
  WMLWebScraping, WMLWebScrapedData, WMLBulkSendLog,
};
