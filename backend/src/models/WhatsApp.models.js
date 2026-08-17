const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── User ──────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  firstname:   { type: String, required: true },
  lastname:    { type: String, required: true },
  email:       { type: String, required: true, unique: true, lowercase: true },
  password:    { type: String, required: true },
  is_admin:    { type: Boolean, default: false },
  is_enabled:  { type: Boolean, default: true },
  role:        { type: String, default: 'agent' },       // admin | agent | readonly
  permissions: [String],                                  // e.g. ['chat.view','contact.create']
  createdAt:   { type: Date, default: Date.now },
});
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.matchPassword = function(p) { return bcrypt.compare(p, this.password); };
// ── User ──────────────────────────────────────────────────────
// NOTE: WhatsApp's own User fields (firstname, lastname, is_admin, is_enabled,
// permissions) are NOT merged into the platform's master User model since
// WhatsApp's auth/admin pages are not yet wired to use them platform-wide.
// We guard registration so this never throws OverwriteModelError when the
// master User.model.js has already registered 'User' (which it always will,
// since /auth routes load first). This re-exports the MASTER User model -
// any WhatsApp-specific fields referenced below will simply be undefined
// unless also added to models/User.model.js.
const User = mongoose.models.User || mongoose.model('User', userSchema);

// ── Contact ───────────────────────────────────────────────────
const contactSchema = new mongoose.Schema({
  firstname:      { type: String, required: true },
  lastname:       { type: String, default: '' },
  company:        { type: String, default: '' },
  phone:          { type: String, required: true },       // WhatsApp number e.g. 919876543210
  email:          { type: String, default: '' },
  website:        { type: String, default: '' },
  description:    { type: String, default: '' },
  type:           { type: String, enum: ['lead','customer','contact'], default: 'lead' },
  statusId:       { type: mongoose.Schema.Types.ObjectId, ref: 'ContactStatus' },
  sourceId:       { type: mongoose.Schema.Types.ObjectId, ref: 'ContactSource' },
  assignedId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  addedFrom:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  country:        { type: String, default: '' },
  city:           { type: String, default: '' },
  state:          { type: String, default: '' },
  address:        { type: String, default: '' },
  zip:            { type: String, default: '' },
  is_enabled:     { type: Boolean, default: true },
  defaultLanguage:{ type: String, default: 'en' },
  tags:           [String],
  customFields:   { type: mongoose.Schema.Types.Mixed, default: {} },
  lastStatusChange: { type: Date },
  dateAssigned:   { type: Date },
  createdAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now },
});
const Contact = mongoose.model('Contact', contactSchema);

// ── ContactNote ───────────────────────────────────────────────
const contactNoteSchema = new mongoose.Schema({
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  addedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const ContactNote = mongoose.model('ContactNote', contactNoteSchema);

// ── ContactStatus ─────────────────────────────────────────────
const contactStatusSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  color:     { type: String, default: '#6366f1' },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const ContactStatus = mongoose.model('ContactStatus', contactStatusSchema);

// ── ContactSource ─────────────────────────────────────────────
const contactSourceSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const ContactSource = mongoose.model('ContactSource', contactSourceSchema);

// ── WhatsApp Template ─────────────────────────────────────────
const whatsappTemplateSchema = new mongoose.Schema({
  templateId:        { type: String, required: true, unique: true }, // id from Meta API
  templateName:      { type: String, required: true },
  language:          { type: String, default: 'en_US' },
  status:            { type: String, default: 'PENDING' },          // APPROVED | REJECTED | PENDING
  category:          { type: String, default: 'MARKETING' },
  headerDataFormat:  { type: String, default: '' },                  // TEXT | IMAGE | VIDEO | DOCUMENT
  headerDataText:    { type: String, default: '' },
  headerParamsCount: { type: Number, default: 0 },
  bodyData:          { type: String, required: true },
  bodyParamsCount:   { type: Number, default: 0 },
  footerData:        { type: String, default: '' },
  footerParamsCount: { type: Number, default: 0 },
  buttonsData:       { type: String, default: '' },
  createdAt:         { type: Date, default: Date.now },
  updatedAt:         { type: Date, default: Date.now },
});
const WhatsappTemplate = mongoose.model('WhatsappTemplate', whatsappTemplateSchema);

// ── Campaign ──────────────────────────────────────────────────
const campaignSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  relType:           { type: String, enum: ['lead','customer','csv'], required: true },
  templateId:        { type: String, default: null },               // WhatsApp template_id
  scheduledSendTime: { type: Date, default: null },
  sendNow:           { type: Boolean, default: false },
  headerParams:      { type: mongoose.Schema.Types.Mixed, default: [] },
  bodyParams:        { type: mongoose.Schema.Types.Mixed, default: [] },
  footerParams:      { type: mongoose.Schema.Types.Mixed, default: [] },
  relData:           { type: mongoose.Schema.Types.Mixed, default: null },
  pauseCampaign:     { type: Boolean, default: false },
  selectAll:         { type: Boolean, default: false },
  isSent:            { type: Boolean, default: false },
  sendingCount:      { type: Number, default: 0 },
  filename:          { type: String, default: null },              // CSV file for csv campaigns
  createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:         { type: Date, default: Date.now },
  updatedAt:         { type: Date, default: Date.now },
});
const Campaign = mongoose.models.WACampaign || mongoose.model('WACampaign', campaignSchema);

// ── CampaignDetail ────────────────────────────────────────────
const campaignDetailSchema = new mongoose.Schema({
  campaignId:      { type: mongoose.Schema.Types.ObjectId, ref: 'WACampaign', required: true },
  relId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
  relType:         { type: String, default: 'lead' },
  headerMessage:   { type: String, default: '' },
  bodyMessage:     { type: String, default: '' },
  footerMessage:   { type: String, default: '' },
  status:          { type: Number, default: 0 },      // 0=pending 1=sent 2=failed
  responseMessage: { type: String, default: '' },
  whatsappId:      { type: String, default: '' },     // WAMID from Meta
  messageStatus:   { type: String, default: '' },     // sent|delivered|read|failed
  createdAt:       { type: Date, default: Date.now },
  updatedAt:       { type: Date, default: Date.now },
});
const CampaignDetail = mongoose.model('CampaignDetail', campaignDetailSchema);

// ── Chat ──────────────────────────────────────────────────────
const chatSchema = new mongoose.Schema({
  name:          { type: String, default: '' },
  receiverId:    { type: String, required: true },     // WhatsApp phone number
  lastMessage:   { type: String, default: '' },
  lastMsgTime:   { type: Date },
  waNo:          { type: String, default: '' },        // Our WhatsApp number
  waNoId:        { type: String, default: '' },        // Our phone_number_id
  type:          { type: String, enum: ['lead','customer','contact','unknown'], default: 'unknown' },
  typeId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
  agent:         { type: String, default: '' },        // assigned agent ids (csv)
  isAiChat:      { type: Boolean, default: false },
  aiMessageJson: { type: String, default: null },      // conversation history JSON
  isBotStopped:  { type: Boolean, default: false },
  botStoppedTime:{ type: Date, default: null },
  unreadCount:   { type: Number, default: 0 },
  createdAt:     { type: Date, default: Date.now },
  updatedAt:     { type: Date, default: Date.now },
});
const Chat = mongoose.model('Chat', chatSchema);

// ── ChatMessage ───────────────────────────────────────────────
const chatMessageSchema = new mongoose.Schema({
  chatId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId:     { type: String, required: true },     // phone number OR user id
  direction:    { type: String, enum: ['in','out'], default: 'in' },
  message:      { type: String, default: '' },
  url:          { type: String, default: '' },        // media attachment path
  messageType:  { type: String, default: 'text' },   // text|image|video|audio|document|sticker
  status:       { type: String, default: '' },        // sent|delivered|read|failed
  statusMessage:{ type: String, default: '' },
  isRead:       { type: Boolean, default: false },
  messageId:    { type: String, default: '' },        // WAMID from Meta
  refMessageId: { type: String, default: '' },        // reply-to WAMID
  staffId:      { type: String, default: '' },
  timeSent:     { type: Date, default: Date.now },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// ── MessageBot ────────────────────────────────────────────────
const messageBotSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  relType:      { type: String, enum: ['lead','customer','all'], default: 'all' },
  replyText:    { type: String, required: true },
  replyType:    { type: Number, default: 1 },         // 1=text 2=media 3=interactive
  trigger:      { type: mongoose.Schema.Types.Mixed, default: [] }, // keyword array
  botHeader:    { type: String, default: '' },
  botFooter:    { type: String, default: '' },
  button1:      { type: String, default: '' },
  button1Id:    { type: String, default: '' },
  button2:      { type: String, default: '' },
  button2Id:    { type: String, default: '' },
  button3:      { type: String, default: '' },
  button3Id:    { type: String, default: '' },
  buttonName:   { type: String, default: '' },
  buttonUrl:    { type: String, default: '' },
  filename:     { type: String, default: '' },
  isBotActive:  { type: Boolean, default: true },
  sendingCount: { type: Number, default: 0 },
  addedFrom:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});
const MessageBot = mongoose.model('MessageBot', messageBotSchema);

// ── TemplateBot ───────────────────────────────────────────────
const templateBotSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  relType:      { type: String, default: 'all' },
  templateId:   { type: String, default: null },
  headerParams: { type: mongoose.Schema.Types.Mixed, default: [] },
  bodyParams:   { type: mongoose.Schema.Types.Mixed, default: [] },
  footerParams: { type: mongoose.Schema.Types.Mixed, default: [] },
  filename:     { type: String, default: '' },
  trigger:      { type: mongoose.Schema.Types.Mixed, default: [] },
  replyType:    { type: Number, default: 1 },
  isBotActive:  { type: Boolean, default: true },
  sendingCount: { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});
const TemplateBot = mongoose.model('TemplateBot', templateBotSchema);

// ── CannedReply ───────────────────────────────────────────────
const cannedReplySchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  isPublic:    { type: Boolean, default: true },
  addedFrom:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});
const CannedReply = mongoose.model('CannedReply', cannedReplySchema);

// ── AiPrompt ──────────────────────────────────────────────────
const aiPromptSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  action:    { type: String, required: true },    // system prompt text
  isPublic:  { type: Boolean, default: true },
  addedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const AiPrompt = mongoose.model('AiPrompt', aiPromptSchema);

// ── Setting (key-value store) ─────────────────────────────────
const settingSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed },
});
const Setting = mongoose.models.WASetting || mongoose.model('WASetting', settingSchema);
Setting.get = async (key, def = null) => {
  const d = await Setting.findOne({ key });
  return d ? d.value : def;
};
Setting.set = async (key, value) =>
  Setting.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });

// ── ApiToken ──────────────────────────────────────────────────
const apiTokenSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  token:       { type: String, required: true, unique: true },
  permissions: [String],
  lastUsed:    { type: Date },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now },
});
const ApiToken = mongoose.model('ApiToken', apiTokenSchema);

// ── WebhookLog ────────────────────────────────────────────────
const webhookLogSchema = new mongoose.Schema({
  event:     { type: String },
  payload:   { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});
const WebhookLog = mongoose.model('WebhookLog', webhookLogSchema);

// ── ActivityLog ───────────────────────────────────────────────
const activityLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:    { type: String },
  subject:   { type: String },
  subjectId: { type: String },
  data:      { type: mongoose.Schema.Types.Mixed },
  ip:        { type: String },
  createdAt: { type: Date, default: Date.now },
});
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = {
  User, Contact, ContactNote, ContactStatus, ContactSource,
  WhatsappTemplate, Campaign, CampaignDetail,
  Chat, ChatMessage, MessageBot, TemplateBot,
  CannedReply, AiPrompt, Setting, ApiToken, WebhookLog, ActivityLog,
};
