const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const p = process.env.DB_TABLE_PREFIX || 'pxa_';

// ── User ───────────────────────────────────────────────────────────────────
const userSchema = new Schema({
  parentId:           { type: Schema.Types.ObjectId, ref: 'User' },
  name:               String,
  email:              String,
  password:           String,
  contactNumber:      String,
  role:               { type: Number, default: 2 },  // 1=admin, 2=user
  profilePicture:     {},
  ip:                 String,
  source:             String,
  accessLevel:        [],
  resetPasswordToken: String,
  settings:           {},
  validityDate:       Date,
  planName:           String,
  status:             { type: Number, default: 0 },  // 0=inactive, 1=active
}, { timestamps: true });
userSchema.index({ name: 'text', email: 'text' });
const Users = mongoose.models.User || model('User', userSchema);

// ── Campaign (PixaURL Bio Page) ────────────────────────────────────────────
const campaignSchema = new Schema({
  userId:         { type: Schema.Types.ObjectId, ref: 'User' },
  title:          String,
  slug:           String,
  catId:          { type: Schema.Types.ObjectId, ref: `${p}templateCategory` },
  themeId:        { type: Schema.Types.ObjectId, ref: `${p}theme` },
  packId:         { type: Schema.Types.ObjectId, ref: `${p}socialPack` },
  profile:        Object,
  usedTemplateId: { type: Schema.Types.ObjectId, ref: `${p}template` },
  status:         { type: Number, default: 1 },
  templateData:   String,
  templateStyle:  Object,
  SocialIconData: Object,
  isCustomTheme:  { type: Number, default: 0 },
  html_theme_id:  String,
  thumb:          Object,
  otherBusiness:  Array,
}, { timestamps: true });
campaignSchema.index({ title: 'text' });
const tCampaign = `${p}campaign`;
const Campaigns = mongoose.models[tCampaign] || model(tCampaign, campaignSchema);

// ── Campaign Page ──────────────────────────────────────────────────────────
const campaignPageSchema = new Schema({
  campaignId: { type: Schema.Types.ObjectId, ref: tCampaign },
  userId:     { type: Schema.Types.ObjectId, ref: 'User' },
  title:      String,
  sort:       Number,
  slug:       String,
  seoData:    Object,
  status:     { type: Number, default: 1 },
}, { timestamps: true });
const tCampaignPage = `${p}campaignPage`;
const CampaignPage = mongoose.models[tCampaignPage] || model(tCampaignPage, campaignPageSchema);

// ── Campaign Section ───────────────────────────────────────────────────────
const campaignSectionSchema = new Schema({
  templateId:  { type: Schema.Types.ObjectId },
  pageId:      { type: Schema.Types.ObjectId },
  title:       String,
  type:        String,
  sectionData: {},
  sort:        Number,
  status:      { type: Number, default: 1 },
  animation:   {},
}, { timestamps: true });
const tCampaignSection = `${p}campaignSection`;
const CampaignSection = mongoose.models[tCampaignSection] || model(tCampaignSection, campaignSectionSchema);

// ── Campaign Link (click tracking) ────────────────────────────────────────
const campaignLinkSchema = new Schema({
  campaignId: { type: Schema.Types.ObjectId, ref: tCampaign },
  userId:     { type: Schema.Types.ObjectId, ref: 'User' },
  url:        String,
  label:      String,
  clicks:     { type: Number, default: 0 },
  status:     { type: Number, default: 1 },
}, { timestamps: true });
const tCampaignLink = `${p}campaignLink`;
const CampaignLink = mongoose.models[tCampaignLink] || model(tCampaignLink, campaignLinkSchema);

// ── Campaign Visits ────────────────────────────────────────────────────────
const campaignVisitSchema = new Schema({
  campaignId: { type: Schema.Types.ObjectId, ref: tCampaign },
  userId:     { type: Schema.Types.ObjectId, ref: 'User' },
  date:       String,
  count:      { type: Number, default: 0 },
}, { timestamps: true });
const tCampaignVisit = `${p}campaignVisit`;
const CampaignVisit = mongoose.models[tCampaignVisit] || model(tCampaignVisit, campaignVisitSchema);

const campaignVisitDetailSchema = new Schema({
  campaignId: { type: Schema.Types.ObjectId, ref: tCampaign },
  userId:     { type: Schema.Types.ObjectId, ref: 'User' },
  ip:         String,
  country:    String,
  device:     String,
}, { timestamps: true });
const tCampaignVisitDetail = `${p}campaignVisitDetail`;
const CampaignVisitDetail = mongoose.models[tCampaignVisitDetail] || model(tCampaignVisitDetail, campaignVisitDetailSchema);

const campaignPageVisitSchema = new Schema({
  campaignId: { type: Schema.Types.ObjectId, ref: tCampaign },
  pageId:     { type: Schema.Types.ObjectId },
  userId:     { type: Schema.Types.ObjectId, ref: 'User' },
  date:       String,
  count:      { type: Number, default: 0 },
}, { timestamps: true });
const tCampaignPageVisit = `${p}campaignPageVisit`;
const CampaignPageVisit = mongoose.models[tCampaignPageVisit] || model(tCampaignPageVisit, campaignPageVisitSchema);

const campaignPageVisitDetailSchema = new Schema({
  campaignId: { type: Schema.Types.ObjectId },
  pageId:     { type: Schema.Types.ObjectId },
  userId:     { type: Schema.Types.ObjectId },
  ip:         String,
  country:    String,
  device:     String,
}, { timestamps: true });
const tCampaignPageVisitDetail = `${p}campaignPageVisitDetail`;
const CampaignPageVisitDetail = mongoose.models[tCampaignPageVisitDetail] || model(tCampaignPageVisitDetail, campaignPageVisitDetailSchema);

const campaignLinkDetailSchema = new Schema({
  campaignId: { type: Schema.Types.ObjectId },
  sectionId:  { type: Schema.Types.ObjectId },
  userId:     { type: Schema.Types.ObjectId },
  ip:         String,
  country:    String,
  device:     String,
}, { timestamps: true });
const tCampaignLinkDetail = `${p}campaignLinkDetail`;
const CampaignLinkDetail = mongoose.models[tCampaignLinkDetail] || model(tCampaignLinkDetail, campaignLinkDetailSchema);

// ── Template ───────────────────────────────────────────────────────────────
const templateSchema = new Schema({
  title:       String,
  catId:       { type: Schema.Types.ObjectId, ref: `${p}templateCategory` },
  thumb:       Object,
  status:      { type: Number, default: 1 },
  sort:        Number,
  templateData: String,
  templateStyle: Object,
  profile:     Object,
}, { timestamps: true });
const tTemplate = `${p}template`;
const Templates = mongoose.models[tTemplate] || model(tTemplate, templateSchema);

// ── Template Page ──────────────────────────────────────────────────────────
const templatePageSchema = new Schema({
  templateId: { type: Schema.Types.ObjectId, ref: tTemplate },
  title:      String,
  sort:       Number,
  slug:       String,
  seoData:    Object,
  status:     { type: Number, default: 1 },
}, { timestamps: true });
const tTemplatePage = `${p}templatePage`;
const TemplatePage = mongoose.models[tTemplatePage] || model(tTemplatePage, templatePageSchema);

// ── Template Section ───────────────────────────────────────────────────────
const templateSectionSchema = new Schema({
  templateId:  { type: Schema.Types.ObjectId },
  pageId:      { type: Schema.Types.ObjectId },
  title:       String,
  type:        String,
  sectionData: {},
  sort:        Number,
  status:      { type: Number, default: 1 },
  animation:   {},
}, { timestamps: true });
const tTemplateSection = `${p}templateSection`;
const TemplateSection = mongoose.models[tTemplateSection] || model(tTemplateSection, templateSectionSchema);

// ── Template Category ──────────────────────────────────────────────────────
const templateCategorySchema = new Schema({
  title:  String,
  status: { type: Number, default: 1 },
  sort:   Number,
}, { timestamps: true });
const tTemplateCategory = `${p}templateCategory`;
const TemplateCategory = mongoose.models[tTemplateCategory] || model(tTemplateCategory, templateCategorySchema);

// ── Theme ──────────────────────────────────────────────────────────────────
const themeSchema = new Schema({
  title:     String,
  themeData: Object,
  thumb:     Object,
  status:    { type: Number, default: 1 },
}, { timestamps: true });
const tTheme = `${p}theme`;
const Theme = mongoose.models[tTheme] || model(tTheme, themeSchema);

// ── Social Pack ────────────────────────────────────────────────────────────
const socialPackSchema = new Schema({
  title:    String,
  thumb:    Object,
  icons:    Array,
  packData: Object,
  status:   { type: Number, default: 1 },
}, { timestamps: true });
const tSocialPack = `${p}socialPack`;
const SocialPack = mongoose.models[tSocialPack] || model(tSocialPack, socialPackSchema);

// ── Social Type ────────────────────────────────────────────────────────────
const socialTypeSchema = new Schema({
  title:     String,
  icon:      String,
  packId:    { type: Schema.Types.ObjectId, ref: tSocialPack },
  iconData:  Object,
  status:    { type: Number, default: 1 },
  sort:      Number,
}, { timestamps: true });
const tSocialType = `${p}socialType`;
const SocialType = mongoose.models[tSocialType] || model(tSocialType, socialTypeSchema);

// ── Plan ───────────────────────────────────────────────────────────────────
const planSchema = new Schema({
  planname:     String,
  price:        Number,
  features:     Object,
  status:       { type: Number, default: 1 },
  sort:         Number,
  validity:     Number,
  validityType: String,
}, { timestamps: true });
const tPlan = `${p}plan`;
const Plans = mongoose.models[tPlan] || model(tPlan, planSchema);

// ── Order / Billing ────────────────────────────────────────────────────────
const orderSchema = new Schema({
  customer_id:   { type: Schema.Types.ObjectId, ref: 'User' },
  plan_id:       { type: Schema.Types.ObjectId, ref: tPlan },
  amount:        Number,
  currency:      String,
  payment_id:    String,
  payment_mode:  String,
  couponCode:    String,
  invoiceFile:   String,
  status:        { type: Number, default: 0 }, // 0=pending, 1=approved, 2=rejected
}, { timestamps: true });
const tOrder = `${p}orderList`;
const OrderList = mongoose.models[tOrder] || model(tOrder, orderSchema);

// ── Admin Settings ─────────────────────────────────────────────────────────
const adminSettingsSchema = new Schema({
  siteName:       String,
  siteUrl:        String,
  logo:           Object,
  favicon:        Object,
  currency:       Object,
  smtpHost:       String,
  smtpPort:       Number,
  smtpUsername:   String,
  smtpPassword:   { type: String, select: false },
  smtpFrom:       String,
  mandrillKey:    { type: String, select: false },
  sendgridKey:    { type: String, select: false },
  emailService:   String,
  stripeSecret:   { type: String, select: false },
  stripeKey:      String,
  razorpayKey:    String,
  razorpaySecret: { type: String, select: false },
  paypalKey:      String,
  paypalSecret:   { type: String, select: false },
  paypalTestMode: Boolean,
  paystackKey:    String,
  paystackSecret: { type: String, select: false },
  paymentMethods: Array,
  registrationEnabled: { type: Boolean, default: true },
  maintenanceMode:     { type: Boolean, default: false },
  googleAnalytics:     String,
  customCss:           String,
}, { timestamps: true });
const tAdminSettings = `${p}adminSettings`;
const AdminSettings = mongoose.models[tAdminSettings] || model(tAdminSettings, adminSettingsSchema);

// ── Coupons ────────────────────────────────────────────────────────────────
const couponSchema = new Schema({
  couponCode:   String,
  discount:     Number,
  discountType: String,
  minAmount:    Number,
  duration:     String,
  status:       { type: Number, default: 1 },
  expiryDate:   Date,
}, { timestamps: true });
const tCoupon = `${p}coupon`;
const Coupons = mongoose.models[tCoupon] || model(tCoupon, couponSchema);

module.exports = {
  Users, Campaigns, CampaignPage, CampaignSection, CampaignLink,
  CampaignVisit, CampaignVisitDetail, CampaignPageVisit,
  CampaignPageVisitDetail, CampaignLinkDetail,
  Templates, TemplatePage, TemplateSection, TemplateCategory,
  Theme, SocialPack, SocialType, Plans, OrderList, AdminSettings, Coupons,
};
