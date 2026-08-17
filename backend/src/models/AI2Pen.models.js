const mongoose = require('mongoose');
const { Schema, model, models } = mongoose;

// ── User ──────────────────────────────────────────────────────────────────
// NOTE: AI2Pen's User fields (package_id, token_used, image_used, audio_used,
// parent_id, is_agency, preferred_ai_model, etc.) have been merged into the
// platform's master User model (models/User.model.js) to avoid a duplicate
// Mongoose model registration conflict. We re-export it here so existing
// `require('../models/AI2Pen.models')` destructuring (`{ User }`) keeps working.
const User = require('./User.model');

// ── Template Group ────────────────────────────────────────────────────────
const templateGroupSchema = new Schema({
  user_id:         { type: Schema.Types.ObjectId, ref: 'User', required: true }, // admin owner
  group_name:      { type: String, required: true },
  group_slug:      { type: String, required: true, unique: true },
  group_icon:      String,
  group_color:     String,
  type:            { type: String, enum: ['text', 'image', 'audio', 'code', 'chat'], default: 'text' },
  description:     String,
  status:          { type: String, enum: ['1', '0'], default: '1' },
  sort_order:      { type: Number, default: 0 },
  is_featured:     { type: Boolean, default: false },
}, { timestamps: true });
const TemplateGroup = models.TemplateGroup || model('TemplateGroup', templateGroupSchema);

// ── AI Template ───────────────────────────────────────────────────────────
const aiTemplateSchema = new Schema({
  user_id:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  group_id:       { type: Schema.Types.ObjectId, ref: 'TemplateGroup' },
  template_name:  { type: String, required: true },
  template_slug:  { type: String, required: true, unique: true },
  template_icon:  String,
  template_color: String,
  about_text:     String,         // main prompt with {{field}} placeholders
  description:    String,
  prompt_fields:  { type: Schema.Types.Mixed, default: [] }, // [{name, label, type, placeholder, required}]
  type:           { type: String, enum: ['text', 'image', 'audio', 'code', 'chat'], default: 'text' },
  ai_model:       String,          // override model for this template
  api_group:      { type: String, default: 'gemini' }, // gemini | stable_diffusion | google_tts | azure_tts
  status:         { type: String, enum: ['1', '0'], default: '1' },
  sort_order:     { type: Number, default: 0 },
  is_featured:    { type: Boolean, default: false },
  module_id:      String,
}, { timestamps: true });
const AiTemplate = models.PenTemplate || model('PenTemplate', aiTemplateSchema);

// ── Search Content (generation history) ──────────────────────────────────
const searchContentSchema = new Schema({
  user_id:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parent_user_id:   { type: Schema.Types.ObjectId, ref: 'User' },
  ai_template_id:   { type: Schema.Types.ObjectId, ref: 'PenTemplate' },
  template_group_id:{ type: Schema.Types.ObjectId, ref: 'TemplateGroup' },
  document_name:    String,
  group_slug:       String,
  template_slug:    String,
  content_type:     { type: String, enum: ['text', 'image', 'audio', 'code', 'chat'], default: 'text' },
  // Text
  result:           String,
  tokens:           { type: Number, default: 0 },
  // Image
  image_urls:       [String],
  image_count:      { type: Number, default: 0 },
  // Audio
  audio_url:        String,
  audio_duration:   Number,
  // Chat
  messages:         { type: Schema.Types.Mixed, default: [] },
  // Meta
  api_group:        String,
  ai_model:         String,
  prompt:           String,
  language:         String,
  status:           { type: String, enum: ['1', '0'], default: '1' },
  searched_at:      { type: Date, default: Date.now },
}, { timestamps: true });
searchContentSchema.index({ user_id: 1, searched_at: -1 });
const SearchContent = models.SearchContent || model('SearchContent', searchContentSchema);

// ── Usage Log ─────────────────────────────────────────────────────────────
const usageLogSchema = new Schema({
  user_id:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parent_user_id:  { type: Schema.Types.ObjectId, ref: 'User' },
  module_id:       String,
  usage_type:      { type: String, enum: ['token', 'image', 'audio'], default: 'token' },
  amount:          { type: Number, default: 0 },
  description:     String,
  reference_id:    Schema.Types.ObjectId,
  balance_after:   Number,
}, { timestamps: true });
usageLogSchema.set('timestamps', { createdAt: 'created_at', updatedAt: false });
const UsageLog = models.UsageLog || model('UsageLog', usageLogSchema);

// ── Package (subscription plan) ───────────────────────────────────────────
const packageSchema = new Schema({
  user_id:           { type: Schema.Types.ObjectId, ref: 'User', required: true }, // admin who created it
  package_name:      { type: String, required: true },
  package_type:      { type: String, enum: ['monthly', 'yearly', 'lifetime', 'one_time'], default: 'monthly' },
  price:             { type: Number, default: 0 },
  stripe_price_id:   String,
  validity:          Number,    // days; null = lifetime
  validity_type:     String,    // 'days','months','years','lifetime'
  description:       String,
  // Limits per module
  token_limit:       { type: Number, default: 10000 },
  image_limit:       { type: Number, default: 20 },
  audio_limit:       { type: Number, default: 20 },
  chat_limit:        { type: Number, default: -1 },  // -1 = unlimited
  // Module access
  modules:           { type: [String], default: ['text', 'image', 'audio', 'code', 'chat'] },
  // Features
  team_members:      { type: Number, default: 0 },
  is_default:        { type: Boolean, default: false },
  is_featured:       { type: Boolean, default: false },
  sort_order:        { type: Number, default: 0 },
  deleted:           { type: String, default: '0' },
  status:            { type: String, enum: ['1', '0'], default: '1' },
}, { timestamps: true });
const Package = models.Package || model('Package', packageSchema);

// ── Order / Payment ───────────────────────────────────────────────────────
const orderSchema = new Schema({
  invoice_no:      { type: String, unique: true },
  user_id:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parent_user_id:  { type: Schema.Types.ObjectId, ref: 'User' },
  package_id:      { type: Schema.Types.ObjectId, ref: 'Package' },
  amount:          { type: Number, required: true },
  currency:        { type: String, default: 'USD' },
  payment_method:  { type: String, default: 'stripe' },
  payment_id:      String,
  subscription_id: String,
  status:          { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'], default: 'pending' },
  meta:            { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoice_no) {
    const n = await Order.countDocuments();
    this.invoice_no = 'INV-' + String(n + 1).padStart(6, '0');
  }
  next();
});
const Order = models.PenOrder || model('PenOrder', orderSchema);

// ── Team Member ───────────────────────────────────────────────────────────
const teamMemberSchema = new Schema({
  admin_user_id:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  member_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role:           { type: String, default: 'member' },
  permissions:    { type: Schema.Types.Mixed, default: {} },
  status:         { type: String, enum: ['1', '0'], default: '1' },
}, { timestamps: true });
const TeamMember = models.TeamMember || model('TeamMember', teamMemberSchema);

// ── Settings ──────────────────────────────────────────────────────────────
const settingSchema = new Schema({
  user_id:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  key:       { type: String, required: true },
  value:     { type: Schema.Types.Mixed },
  group:     { type: String, default: 'general' },
}, { timestamps: true });
settingSchema.index({ user_id: 1, key: 1 }, { unique: true });
const Setting = models.Setting || model('Setting', settingSchema);

// ── Saved Document ────────────────────────────────────────────────────────
const savedDocSchema = new Schema({
  user_id:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  search_content_id: { type: Schema.Types.ObjectId, ref: 'SearchContent' },
  title:           String,
  content:         String,
  type:            { type: String, enum: ['text', 'image', 'audio', 'code', 'chat'], default: 'text' },
  tags:            [String],
  is_favourite:    { type: Boolean, default: false },
}, { timestamps: true });
const SavedDoc = models.SavedDoc || model('SavedDoc', savedDocSchema);

// ── AI Chat Session ───────────────────────────────────────────────────────
const chatSessionSchema = new Schema({
  user_id:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  template_id: { type: Schema.Types.ObjectId, ref: 'PenTemplate' },
  title:       { type: String, default: 'New Chat' },
  messages:    [{ role: { type: String, enum: ['user','assistant','system'] }, content: String, created_at: { type: Date, default: Date.now } }],
  model:       String,
  tokens_used: { type: Number, default: 0 },
  status:      { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });
const ChatSession = models.ChatSession || model('ChatSession', chatSessionSchema);

// ── Affiliate ─────────────────────────────────────────────────────────────
const affiliateSchema = new Schema({
  user_id:         { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  referral_code:   { type: String, unique: true },
  commission_rate: { type: Number, default: 20 }, // %
  total_earned:    { type: Number, default: 0 },
  total_paid:      { type: Number, default: 0 },
  status:          { type: String, enum: ['active', 'pending', 'suspended'], default: 'pending' },
}, { timestamps: true });
const Affiliate = models.Affiliate || model('Affiliate', affiliateSchema);

module.exports = {
  User, TemplateGroup, AiTemplate, SearchContent, UsageLog,
  Package, Order, TeamMember, Setting, SavedDoc, ChatSession, Affiliate,
};
