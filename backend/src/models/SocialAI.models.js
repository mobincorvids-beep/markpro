const mongoose = require('mongoose');
const { Schema, model, models } = mongoose;

// ── User ──────────────────────────────────────────────────────────────────
const userSchema = new Schema({
  name:             { type: String, required: true, trim: true },
  username:         { type: String, unique: true, lowercase: true },
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:            String,
  address:          String,
  avatar:           String,
  password:         String,
  role:             { type: String, enum: ['admin', 'user'], default: 'user' },
  status:           { type: Number, default: 1 }, // 0=inactive, 1=active, 2=suspended
  meta:             { type: Schema.Types.Mixed, default: {} },
  // Plan
  plan_id:          { type: Schema.Types.ObjectId, ref: 'SAPlan' },
  plan_data:        { type: Schema.Types.Mixed, default: {} },
  plan_expired_at:  Date,
  credits:          { type: Number, default: 0 },
  // AI settings
  category_id:      { type: Schema.Types.ObjectId, ref: 'SACategory' },
  // Auth
  provider:         String,
  provider_id:      String,
  email_verified_at:Date,
  kyc_verified_at:  Date,
  password_reset_token: String,
  email_verify_token:   String,
  total_logins:     { type: Number, default: 0 },
  last_login_at:    Date,
}, { timestamps: true });
userSchema.index({ name: 'text', email: 'text' });
userSchema.pre('save', function (next) {
  if (this.isNew && !this.username) {
    this.username = this.name.toLowerCase().replace(/\s+/g, '') + Math.random().toString(36).slice(2, 5);
  }
  next();
});
const User = models.User || model('User', userSchema);

// ── Plan ──────────────────────────────────────────────────────────────────
const planSchema = new Schema({
  name:         { type: String, required: true },
  price:        { type: Number, default: 0 },
  type:         { type: String, enum: ['monthly', 'yearly', 'lifetime'], default: 'monthly' },
  description:  String,
  stripe_price_id: String,
  data: {
    brands:           { type: Number, default: 1 },
    posts:            { type: Number, default: 10 },
    credits:          { type: Number, default: 100 },
    ai_templates:     { type: Boolean, default: true },
    image_generation: { type: Boolean, default: false },
    video_generation: { type: Boolean, default: false },
    stock_content:    { type: Boolean, default: false },
    platforms:        { type: [String], default: ['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok'] },
  },
  status:       { type: Number, default: 1 },
  is_featured:  { type: Boolean, default: false },
  sort_order:   { type: Number, default: 0 },
  trial_days:   { type: Number, default: 0 },
}, { timestamps: true });
const Plan = models.SAPlan || model('SAPlan', planSchema);

// ── Category ──────────────────────────────────────────────────────────────
const categorySchema = new Schema({
  name:        { type: String, required: true },
  slug:        { type: String, unique: true },
  type:        { type: String, enum: ['brand', 'ai_template', 'blog', 'project', 'general'], default: 'brand' },
  description: String,
  icon:        String,
  status:      { type: Number, default: 1 },
}, { timestamps: true });
const Category = models.SACategory || model('SACategory', categorySchema);

// ── Brand ─────────────────────────────────────────────────────────────────
const brandSchema = new Schema({
  uuid:        { type: String, unique: true },
  user_id:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true },
  description: String,
  logo:        String,
  color:       { type: Schema.Types.Mixed, default: {} },
  // AI-generated brand assets
  slogan:      String,
  identities: {
    mission: String,
    vision:  String,
    values:  String,
  },
  audiences:   { type: Schema.Types.Mixed, default: [] },
  voices: {
    message: String,
    tones:   Schema.Types.Mixed,
  },
  strategy:    String,
  categories:  [{ type: Schema.Types.ObjectId, ref: 'SACategory' }],
  status:      { type: Number, default: 1 },
}, { timestamps: true });
brandSchema.pre('save', function (next) {
  if (this.isNew && !this.uuid) {
    this.uuid = require('crypto').randomBytes(8).toString('hex');
  }
  next();
});
const Brand = models.Brand || model('Brand', brandSchema);

// ── Brand Post ────────────────────────────────────────────────────────────
const brandPostSchema = new Schema({
  uuid:     { type: String, unique: true },
  brand_id: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
  user_id:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true },
  input:    String,
  slogan:   String,
  image:    String,
  status:   { type: String, enum: ['draft', 'scheduled', 'published', 'failed'], default: 'draft' },
}, { timestamps: true });
brandPostSchema.pre('save', function (next) {
  if (this.isNew && !this.uuid) {
    this.uuid = require('crypto').randomBytes(8).toString('hex');
  }
  next();
});
const BrandPost = models.BrandPost || model('BrandPost', brandPostSchema);

// ── Brand Post Platform (per-platform content + scheduling) ──────────────
const brandPostPlatformSchema = new Schema({
  brand_post_id: { type: Schema.Types.ObjectId, ref: 'BrandPost', required: true },
  user_platform_id: { type: Schema.Types.ObjectId, ref: 'UserPlatform' },
  platform:      { type: String, enum: ['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok'], required: true },
  content:       String,
  media:         { type: [String], default: [] },
  media_type:    { type: String, enum: ['text', 'image', 'video', 'carousel'], default: 'text' },
  status:        { type: String, enum: ['draft', 'scheduled', 'published', 'failed'], default: 'draft' },
  scheduled_at:  Date,
  published_at:  Date,
  data:          { type: Schema.Types.Mixed, default: {} },
  error:         String,
}, { timestamps: true });
const BrandPostPlatform = models.BrandPostPlatform || model('BrandPostPlatform', brandPostPlatformSchema);

// ── User Platform (connected social accounts) ─────────────────────────────
const userPlatformSchema = new Schema({
  user_id:                  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  platform:                 { type: String, enum: ['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok'], required: true },
  platform_id:              String,
  name:                     String,
  username:                 String,
  picture:                  String,
  type:                     String, // page, profile, etc.
  access_token:             String,
  access_token_expire_at:   Date,
  refresh_token:            String,
  refresh_token_expire_at:  Date,
  meta:                     { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
const UserPlatform = models.UserPlatform || model('UserPlatform', userPlatformSchema);

// ── AI Template ───────────────────────────────────────────────────────────
const aiTemplateSchema = new Schema({
  uuid:        { type: String, unique: true },
  name:        { type: String, required: true },
  slug:        { type: String, unique: true },
  description: String,
  icon:        String,
  preview:     String,
  type:        { type: String, enum: ['text', 'image', 'video', 'voice', 'audio', 'code', 'chat'], default: 'text' },
  prompt:      String,
  fields:      { type: Schema.Types.Mixed, default: [] },
  meta:        { type: Schema.Types.Mixed, default: {} },
  categories:  [{ type: Schema.Types.ObjectId, ref: 'SACategory' }],
  status:      { type: Number, default: 1 },
  is_featured: { type: Boolean, default: false },
  sort_order:  { type: Number, default: 0 },
}, { timestamps: true });
const AiTemplate = models.AiTemplate || model('AiTemplate', aiTemplateSchema);

// ── AI Generate (history) ─────────────────────────────────────────────────
const aiGenerateSchema = new Schema({
  uuid:       { type: String, unique: true },
  user_id:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  template_id:{ type: Schema.Types.ObjectId, ref: 'AiTemplate' },
  brand_id:   { type: Schema.Types.ObjectId, ref: 'Brand' },
  type:       { type: String, enum: ['text', 'image', 'video', 'voice', 'audio', 'code', 'chat', 'brand'], default: 'text' },
  prompt:     String,
  result:     { type: Schema.Types.Mixed },
  credits_used:{ type: Number, default: 0 },
  status:     { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  meta:       { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
aiGenerateSchema.pre('save', function (next) {
  if (this.isNew && !this.uuid) this.uuid = require('crypto').randomBytes(8).toString('hex');
  next();
});
const AiGenerate = models.AiGenerate || model('AiGenerate', aiGenerateSchema);

// ── Credit History ────────────────────────────────────────────────────────
const creditHistorySchema = new Schema({
  uuid:         { type: String, unique: true },
  user_id:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount:       { type: Number, required: true },
  type:         { type: String, enum: ['credit', 'debit'], required: true },
  description:  String,
  reference_id: Schema.Types.ObjectId,
  reference_type: String,
  balance_after: Number,
}, { timestamps: true });
creditHistorySchema.pre('save', function (next) {
  if (this.isNew && !this.uuid) this.uuid = require('crypto').randomBytes(8).toString('hex');
  next();
});
const CreditHistory = models.CreditHistory || model('CreditHistory', creditHistorySchema);

// ── Order ─────────────────────────────────────────────────────────────────
const orderSchema = new Schema({
  invoice_no:    { type: String, unique: true },
  user_id:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  plan_id:       { type: Schema.Types.ObjectId, ref: 'SAPlan', required: true },
  amount:        { type: Number, required: true },
  currency:      { type: String, default: 'USD' },
  payment_method:{ type: String, default: 'stripe' },
  payment_id:    String,
  status:        { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  meta:          { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoice_no) {
    const count = await Order.countDocuments();
    this.invoice_no = String(count + 1).padStart(7, '0');
  }
  next();
});
const Order = models.SAOrder || model('SAOrder', orderSchema);

// ── Prompt (AI prompt library) ────────────────────────────────────────────
const promptSchema = new Schema({
  title:       { type: String, required: true },
  content:     { type: String, required: true },
  type:        String,
  category_id: { type: Schema.Types.ObjectId, ref: 'SACategory' },
  status:      { type: Number, default: 1 },
}, { timestamps: true });
const Prompt = models.SAPrompt || model('SAPrompt', promptSchema);

// ── Asset (user uploaded files) ───────────────────────────────────────────
const assetSchema = new Schema({
  user_id:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:      String,
  url:       String,
  mime_type: String,
  size:      Number,
  type:      { type: String, enum: ['image', 'video', 'audio', 'document', 'other'], default: 'image' },
  meta:      { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
const Asset = models.Asset || model('Asset', assetSchema);

// ── Support Ticket ────────────────────────────────────────────────────────
const supportSchema = new Schema({
  user_id:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subject:  { type: String, required: true },
  message:  String,
  status:   { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  logs: [{
    user_id:    { type: Schema.Types.ObjectId, ref: 'User' },
    message:    String,
    created_at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });
const Support = models.Support || model('Support', supportSchema);

// ── Settings (site-wide key-value) ────────────────────────────────────────
const settingSchema = new Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed },
  group: { type: String, default: 'general' },
}, { timestamps: true });
const Setting = models.SASetting || model('SASetting', settingSchema);

// ── Notification ──────────────────────────────────────────────────────────
const notificationSchema = new Schema({
  user_id:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title:     String,
  message:   String,
  type:      { type: String, default: 'info' },
  read_at:   Date,
  data:      { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
const Notification = models.SANotification || model('SANotification', notificationSchema);

module.exports = {
  User, Plan, Category, Brand, BrandPost, BrandPostPlatform, UserPlatform,
  AiTemplate, AiGenerate, CreditHistory, Order, Prompt, Asset, Support,
  Setting, Notification,
};
