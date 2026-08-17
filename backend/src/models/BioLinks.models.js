const mongoose = require('mongoose');
const { Schema, model, models } = mongoose;

// ── Settings (singleton) ──────────────────────────────────────────────────
const settingsSchema = new Schema({
  main: {
    title: { type: String, default: 'BioLinks' },
    description: String,
    keywords: String,
    email: String,
    default_timezone: { type: String, default: 'UTC' },
    index_url: String,
    default_domain_id: Number,
    avatar_size_limit: { type: Number, default: 2 }, // MB
    favicon: String,
    logo: String,
    opengraph_image: String,
    terms_and_conditions_url: String,
    privacy_policy_url: String,
    cookie_consent_is_enabled: { type: Boolean, default: false },
    smtp_host: String, smtp_port: Number, smtp_username: String,
    smtp_password: String, smtp_from: String, smtp_from_name: String,
    smtp_encryption: String,
  },
  links: {
    biolinks_is_enabled: { type: Boolean, default: true },
    shortener_is_enabled: { type: Boolean, default: true },
    qr_codes_is_enabled: { type: Boolean, default: true },
    domains_is_enabled: { type: Boolean, default: true },
    projects_is_enabled: { type: Boolean, default: true },
    pixels_is_enabled: { type: Boolean, default: true },
    additional_domains_is_enabled: { type: Boolean, default: false },
  },
  users: {
    email_confirmation: { type: Boolean, default: false },
    register_is_enabled: { type: Boolean, default: true },
    auto_delete_unconfirmed_users_after_days: { type: Number, default: 30 },
  },
  stripe: {
    is_enabled: { type: Boolean, default: false },
    publishable_key: String,
    secret_key: String,
    webhook_secret: String,
  },
  plan_free: { type: Schema.Types.Mixed, default: {} },
  plan_custom: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
const Settings = models.BLSettings || model('BLSettings', settingsSchema);

// ── Plan ──────────────────────────────────────────────────────────────────
const planSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  monthly_price: { type: Number, default: 0 },
  annual_price: { type: Number, default: 0 },
  lifetime_price: { type: Number, default: 0 },
  stripe_monthly_price_id: String,
  stripe_annual_price_id: String,
  stripe_lifetime_price_id: String,
  settings: {
    // Links limits
    biolinks_limit: { type: Number, default: 1 },
    links_limit: { type: Number, default: 5 },
    qr_codes_limit: { type: Number, default: 1 },
    pixels_limit: { type: Number, default: 0 },
    domains_limit: { type: Number, default: 0 },
    projects_limit: { type: Number, default: 1 },
    // Features
    removable_branding_is_enabled: { type: Boolean, default: false },
    custom_backgrounds_is_enabled: { type: Boolean, default: false },
    custom_fonts_is_enabled: { type: Boolean, default: false },
    custom_css_is_enabled: { type: Boolean, default: false },
    statistics: { type: Boolean, default: false },
    analytics: { type: Boolean, default: false },
    scheduling: { type: Boolean, default: false },
    sensitive_content: { type: Boolean, default: false },
    utm_parameters: { type: Boolean, default: false },
    password_protection: { type: Boolean, default: false },
    seo_is_enabled: { type: Boolean, default: false },
    team_members_limit: { type: Number, default: 0 },
    // Block types
    enabled_biolink_blocks: { type: [String], default: ['link','header','divider','text','socials'] },
    extra: { type: Schema.Types.Mixed, default: {} },
  },
  taxes_ids: [Number],
  is_enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  color: { type: String, default: '#5b21b6' },
  trial_days: { type: Number, default: 0 },
}, { timestamps: true });
const Plan = models.BLPlan || model('BLPlan', planSchema);

// ── User ──────────────────────────────────────────────────────────────────
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },
  name: { type: String, required: true, trim: true },
  avatar: String,
  api_key: { type: String, unique: true },
  referral_key: String,
  referred_by: { type: Schema.Types.ObjectId, ref: 'User' },
  plan_id: { type: Schema.Types.ObjectId, ref: 'BLPlan', default: null },
  plan_type: { type: String, enum: ['free', 'monthly', 'annual', 'lifetime'], default: 'free' },
  plan_expiry: Date,
  plan_settings: { type: Schema.Types.Mixed, default: {} },
  payment_subscription_id: String,
  payment_processor: String,
  stripe_customer_id: String,
  billing: { type: Schema.Types.Mixed, default: {} },
  preferences: { type: Schema.Types.Mixed, default: {} },
  timezone: { type: String, default: 'UTC' },
  language: { type: String, default: 'en' },
  status: { type: Number, default: 0 }, // 0=unverified,1=active,2=suspended
  is_admin: { type: Boolean, default: false },
  email_confirmation_code: String,
  lost_password_code: String,
  twofa_secret: String,
  twofa_enabled: { type: Boolean, default: false },
  is_newsletter_subscribed: { type: Boolean, default: false },
  source: String, // google,github,email
  ip: String,
  country: String,
  city_name: String,
  device_type: String,
  os_name: String,
  browser_name: String,
  browser_language: String,
  total_logins: { type: Number, default: 0 },
  last_activity: Date,
  user_deletion_reminder: { type: Boolean, default: false },
  extra: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
userSchema.index({ email: 'text', name: 'text' });
const User = models.User || model('User', userSchema);

// ── Domain ────────────────────────────────────────────────────────────────
const domainSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  scheme: { type: String, default: 'https://' },
  host: { type: String, required: true },
  link_id: { type: Schema.Types.ObjectId, ref: 'Link' },
  type: { type: Number, default: 0 }, // 0=user, 1=system additional
  is_enabled: { type: Boolean, default: true },
}, { timestamps: true });
const Domain = models.BLDomain || model('BLDomain', domainSchema);

// ── Project ───────────────────────────────────────────────────────────────
const projectSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  color: { type: String, default: '#5b21b6' },
  description: String,
}, { timestamps: true });
const Project = models.BLProject || model('BLProject', projectSchema);

// ── Pixel (tracking) ──────────────────────────────────────────────────────
const pixelSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['facebook', 'google_analytics', 'tiktok', 'twitter', 'linkedin', 'pinterest', 'snapchat', 'google_tag_manager', 'hotjar', 'microsoft_clarity'], required: true },
  name: { type: String, required: true },
  pixel: { type: String, required: true }, // the tracking ID / pixel ID
  is_enabled: { type: Boolean, default: true },
}, { timestamps: true });
const Pixel = models.Pixel || model('Pixel', pixelSchema);

// ── Link (shortener + biolink + qr container) ─────────────────────────────
const linkSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  project_id: { type: Schema.Types.ObjectId, ref: 'BLProject' },
  domain_id: { type: Schema.Types.ObjectId, ref: 'BLDomain' },
  pixels_ids: [{ type: Schema.Types.ObjectId, ref: 'Pixel' }],
  type: {
    type: String,
    enum: ['link', 'biolink', 'file', 'vcard', 'event', 'static', 'cloaked'],
    default: 'link'
  },
  url: { type: String, required: true }, // short slug
  location_url: String,                  // destination URL for shortener
  settings: { type: Schema.Types.Mixed, default: {} },
  clicks: { type: Number, default: 0 },
  is_enabled: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: false },
  start_date: Date,
  end_date: Date,
  last_datetime: Date,
  // Biolink-specific
  biolink_theme_id: { type: Schema.Types.ObjectId },
}, { timestamps: true });
linkSchema.index({ url: 1 });
linkSchema.index({ user_id: 1, type: 1 });
const Link = models.Link || model('Link', linkSchema);

// ── Biolink Block ─────────────────────────────────────────────────────────
const biolinkBlockSchema = new Schema({
  link_id: { type: Schema.Types.ObjectId, ref: 'Link', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'link', 'big_link', 'header', 'avatar', 'text', 'html', 'image',
      'image_grid', 'divider', 'socials', 'email_collector', 'video',
      'audio', 'file', 'pdf_document', 'countdown', 'map', 'tweet',
      'spotify', 'soundcloud', 'youtube', 'tiktok', 'instagram_media',
      'review', 'vcard', 'paypal_payment', 'discord',
      'whatsapp', 'telegram', 'phone', 'email', 'address',
      'cta', 'faq', 'alert', 'newsletter', 'product',
    ],
    required: true
  },
  settings: { type: Schema.Types.Mixed, default: {} },
  order: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  is_enabled: { type: Boolean, default: true },
}, { timestamps: true });
biolinkBlockSchema.index({ link_id: 1, order: 1 });
const BiolinkBlock = models.BiolinkBlock || model('BiolinkBlock', biolinkBlockSchema);

// ── Biolink Theme ─────────────────────────────────────────────────────────
const biolinkThemeSchema = new Schema({
  name: { type: String, required: true },
  settings: { type: Schema.Types.Mixed, default: {} },
  preview_image: String,
  is_enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });
const BiolinkTheme = models.BiolinkTheme || model('BiolinkTheme', biolinkThemeSchema);

// ── Biolink Template ──────────────────────────────────────────────────────
const biolinkTemplateSchema = new Schema({
  category_id: { type: Schema.Types.ObjectId },
  name: { type: String, required: true },
  preview_image: String,
  link_settings: { type: Schema.Types.Mixed, default: {} },
  blocks: [{ type: Schema.Types.Mixed }],
  is_enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });
const BiolinkTemplate = models.BiolinkTemplate || model('BiolinkTemplate', biolinkTemplateSchema);

// ── Biolink Template Category ─────────────────────────────────────────────
const biolinkTemplateCategorySchema = new Schema({
  name: { type: String, required: true },
  order: { type: Number, default: 0 },
  is_enabled: { type: Boolean, default: true },
}, { timestamps: true });
const BiolinkTemplateCategory = models.BiolinkTemplateCategory || model('BiolinkTemplateCategory', biolinkTemplateCategorySchema);

// ── QR Code ───────────────────────────────────────────────────────────────
const qrCodeSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  project_id: { type: Schema.Types.ObjectId, ref: 'BLProject' },
  link_id: { type: Schema.Types.ObjectId, ref: 'Link' },
  name: { type: String, required: true },
  type: { type: String, enum: ['url', 'biolink', 'vcard', 'text', 'email', 'phone', 'sms', 'wifi', 'event'], default: 'url' },
  data: String,
  settings: { type: Schema.Types.Mixed, default: {} },
  qr_code: String,             // filename
  qr_code_logo: String,
  qr_code_background: String,
  qr_code_foreground: String,
  scans: { type: Number, default: 0 },
  is_enabled: { type: Boolean, default: true },
}, { timestamps: true });
const QrCode = models.QrCode || model('QrCode', qrCodeSchema);

// ── Track Links (clicks) ──────────────────────────────────────────────────
const trackLinkSchema = new Schema({
  link_id: { type: Schema.Types.ObjectId, ref: 'Link' },
  biolink_block_id: { type: Schema.Types.ObjectId, ref: 'BiolinkBlock' },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  country_code: String,
  city_name: String,
  os_name: String,
  browser_name: String,
  device_type: String,
  referrer_host: String,
  referrer_path: String,
  referer: String,
  browser_language: String,
  utm_source: String,
  utm_medium: String,
  utm_campaign: String,
}, { timestamps: true });
trackLinkSchema.index({ link_id: 1, createdAt: -1 });
const TrackLink = models.TrackLink || model('TrackLink', trackLinkSchema);

// ── Payment ───────────────────────────────────────────────────────────────
const paymentSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  plan_id: { type: Schema.Types.ObjectId, ref: 'BLPlan', required: true },
  processor: { type: String, default: 'stripe' },
  type: { type: String, enum: ['one_time', 'recurring'], default: 'one_time' },
  frequency: { type: String, enum: ['monthly', 'annual', 'lifetime'] },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  payment_id: String,
  subscription_id: String,
  coupon_code: String,
  discount_amount: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'], default: 'pending' },
  invoice_url: String,
  billing_snapshot: { type: Schema.Types.Mixed },
  plan_snapshot: { type: Schema.Types.Mixed },
}, { timestamps: true });
const Payment = models.BLPayment || model('BLPayment', paymentSchema);

// ── Coupon / Redeem Code ──────────────────────────────────────────────────
const codeSchema = new Schema({
  code: { type: String, required: true, unique: true },
  discount: { type: Number, default: 0 },
  discount_type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  minimum_amount: { type: Number, default: 0 },
  plan_id: { type: Schema.Types.ObjectId, ref: 'BLPlan' },
  redeemed_times: { type: Number, default: 0 },
  max_uses: { type: Number, default: 0 }, // 0 = unlimited
  expiry_date: Date,
  is_enabled: { type: Boolean, default: true },
  type: { type: String, enum: ['coupon', 'redeem'], default: 'coupon' },
}, { timestamps: true });
const Code = models.Code || model('Code', codeSchema);

// ── Email Collector ───────────────────────────────────────────────────────
const emailCollectorSchema = new Schema({
  biolink_block_id: { type: Schema.Types.ObjectId, ref: 'BiolinkBlock', required: true },
  link_id: { type: Schema.Types.ObjectId, ref: 'Link', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
}, { timestamps: true });
const EmailCollector = models.EmailCollector || model('EmailCollector', emailCollectorSchema);

module.exports = {
  Settings, Plan, User, Domain, Project, Pixel, Link,
  BiolinkBlock, BiolinkTheme, BiolinkTemplate, BiolinkTemplateCategory,
  QrCode, TrackLink, Payment, Code, EmailCollector,
};
