const mongoose = require('mongoose');

// ── Tenant (each business) ────────────────────────────────────
const tenantSchema = new mongoose.Schema({
  businessName:       { type: String, required: true, trim: true },
  owner:              { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  plan:               { type: mongoose.Schema.Types.ObjectId, ref: 'CFPlan' },
  subscriptionStatus: { type: String, enum: ['trialing','active','past_due','canceled'], default: 'trialing' },
  trialEndsAt:        { type: Date },
  currentPeriodEnd:   { type: Date },
  isSuspended:        { type: Boolean, default: false },
}, { timestamps: true });
const CFTenant = mongoose.model('CFTenant', tenantSchema);

// ── Plan ──────────────────────────────────────────────────────
const planSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  price:        { type: Number, required: true },
  billingCycle: { type: String, enum: ['monthly','yearly'], default: 'monthly' },
  features:     [String],
  limits: {
    pages:       { type: Number, default: 1 },
    subscribers: { type: Number, default: 1000 },
    broadcasts:  { type: Number, default: 10 },
    sequences:   { type: Number, default: 5 },
    products:    { type: Number, default: 20 },
  },
  isActive:   { type: Boolean, default: true },
  isTrial:    { type: Boolean, default: false },
  trialDays:  { type: Number, default: 14 },
}, { timestamps: true });
const CFPlan = mongoose.model('CFPlan', planSchema);

// ── Facebook Page ─────────────────────────────────────────────
const pageSchema = new mongoose.Schema({
  tenant:         { type: mongoose.Schema.Types.ObjectId, ref: 'CFTenant', required: true },
  name:           { type: String, required: true },
  facebookPageId: { type: String, required: true },
  accessToken:    { type: String, default: '' },
  avatarUrl:      { type: String, default: '' },
  connectionMode: { type: String, enum: ['mock','live'], default: 'mock' },
  isActive:       { type: Boolean, default: true },
  welcomeMessage: { type: String, default: 'Hi! Thanks for messaging us. How can we help today?' },
  defaultReply:   { type: String, default: 'Sorry, I didn\'t understand that. Please contact us for help.' },
  persistentMenu: [{ title: String, payload: String }],
}, { timestamps: true });
pageSchema.index({ tenant: 1, facebookPageId: 1 }, { unique: true });
const CFPage = mongoose.model('CFPage', pageSchema);

// ── Subscriber ────────────────────────────────────────────────
const subscriberSchema = new mongoose.Schema({
  tenant:     { type: mongoose.Schema.Types.ObjectId, ref: 'CFTenant', required: true },
  page:       { type: mongoose.Schema.Types.ObjectId, ref: 'CFPage', required: true },
  psid:       { type: String, required: true },
  name:       { type: String, default: 'Facebook User' },
  profilePic: { type: String, default: '' },
  tags:       [String],
  locale:     { type: String, default: 'en_US' },
  optedOut:   { type: Boolean, default: false },
  lastInteractionAt: { type: Date, default: Date.now },
}, { timestamps: true });
subscriberSchema.index({ page: 1, psid: 1 }, { unique: true });
const CFSubscriber = mongoose.model('CFSubscriber', subscriberSchema);

// ── Message ───────────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  tenant:     { type: mongoose.Schema.Types.ObjectId, ref: 'CFTenant', required: true },
  page:       { type: mongoose.Schema.Types.ObjectId, ref: 'CFPage', required: true },
  subscriber: { type: mongoose.Schema.Types.ObjectId, ref: 'CFSubscriber', required: true },
  direction:  { type: String, enum: ['inbound','outbound'], required: true },
  text:       { type: String, required: true },
  source:     { type: String, enum: ['user','automation','sequence','broadcast','agent','comment_reply'], default: 'user' },
  meta:       { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
messageSchema.index({ page: 1, subscriber: 1, createdAt: -1 });
const CFMessage = mongoose.model('CFMessage', messageSchema);

// ── Automation Rule ───────────────────────────────────────────
const automationRuleSchema = new mongoose.Schema({
  tenant:      { type: mongoose.Schema.Types.ObjectId, ref: 'CFTenant', required: true },
  page:        { type: mongoose.Schema.Types.ObjectId, ref: 'CFPage', required: true },
  name:        { type: String, required: true },
  triggerType: { type: String, enum: ['keyword','welcome','default_reply','comment_to_message'], default: 'keyword' },
  keywords:    [String],
  matchType:   { type: String, enum: ['exact','contains','any'], default: 'contains' },
  replyMessages:[String],
  enrollInSequence: { type: mongoose.Schema.Types.ObjectId, ref: 'CFSequence', default: null },
  isActive:    { type: Boolean, default: true },
  triggerCount:{ type: Number, default: 0 },
}, { timestamps: true });
const CFAutomationRule = mongoose.model('CFAutomationRule', automationRuleSchema);

// ── Sequence ──────────────────────────────────────────────────
const sequenceSchema = new mongoose.Schema({
  tenant:      { type: mongoose.Schema.Types.ObjectId, ref: 'CFTenant', required: true },
  page:        { type: mongoose.Schema.Types.ObjectId, ref: 'CFPage', required: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  steps: [{
    order:        { type: Number, required: true },
    delayMinutes: { type: Number, default: 0 },
    message:      { type: String, required: true },
  }],
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });
const CFSequence = mongoose.model('CFSequence', sequenceSchema);

const sequenceEnrollmentSchema = new mongoose.Schema({
  tenant:           { type: mongoose.Schema.Types.ObjectId, ref: 'CFTenant', required: true },
  sequence:         { type: mongoose.Schema.Types.ObjectId, ref: 'CFSequence', required: true },
  subscriber:       { type: mongoose.Schema.Types.ObjectId, ref: 'CFSubscriber', required: true },
  currentStepIndex: { type: Number, default: 0 },
  nextSendAt:       { type: Date, required: true },
  status:           { type: String, enum: ['active','completed','stopped'], default: 'active' },
}, { timestamps: true });
sequenceEnrollmentSchema.index({ status: 1, nextSendAt: 1 });
const CFSequenceEnrollment = mongoose.model('CFSequenceEnrollment', sequenceEnrollmentSchema);

// ── Broadcast ─────────────────────────────────────────────────
const broadcastSchema = new mongoose.Schema({
  tenant:         { type: mongoose.Schema.Types.ObjectId, ref: 'CFTenant', required: true },
  page:           { type: mongoose.Schema.Types.ObjectId, ref: 'CFPage', required: true },
  name:           { type: String, required: true },
  message:        { type: String, required: true },
  targetTag:      { type: String, default: '' },
  status:         { type: String, enum: ['draft','queued','sending','sent','failed'], default: 'draft' },
  scheduledAt:    { type: Date, default: null },
  sentAt:         { type: Date, default: null },
  recipientCount: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  failedCount:    { type: Number, default: 0 },
}, { timestamps: true });
broadcastSchema.index({ status: 1, scheduledAt: 1 });
const CFBroadcast = mongoose.model('CFBroadcast', broadcastSchema);

// ── E-commerce ────────────────────────────────────────────────
const categorySchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'CFTenant', required: true },
  name:   { type: String, required: true },
  slug:   { type: String, required: true },
}, { timestamps: true });
categorySchema.index({ tenant: 1, slug: 1 }, { unique: true });
const CFCategory = mongoose.model('CFCategory', categorySchema);

const productSchema = new mongoose.Schema({
  tenant:         { type: mongoose.Schema.Types.ObjectId, ref: 'CFTenant', required: true },
  name:           { type: String, required: true },
  slug:           { type: String, required: true },
  description:    { type: String, default: '' },
  price:          { type: Number, required: true },
  compareAtPrice: { type: Number, default: null },
  sku:            { type: String, default: '' },
  stock:          { type: Number, default: 0 },
  images:         [String],
  category:       { type: mongoose.Schema.Types.ObjectId, ref: 'CFCategory', default: null },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });
productSchema.index({ tenant: 1, slug: 1 }, { unique: true });
const CFProduct = mongoose.model('CFProduct', productSchema);

const orderSchema = new mongoose.Schema({
  tenant:      { type: mongoose.Schema.Types.ObjectId, ref: 'CFTenant', required: true },
  orderNumber: { type: String, required: true, unique: true },
  customer: {
    name:    { type: String, required: true },
    phone:   { type: String, required: true },
    email:   { type: String, default: '' },
    address: { type: String, default: '' },
  },
  subscriber:    { type: mongoose.Schema.Types.ObjectId, ref: 'CFSubscriber', default: null },
  items: [{
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'CFProduct', required: true },
    name:     { type: String, required: true },
    price:    { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  }],
  subtotal:      { type: Number, required: true },
  total:         { type: Number, required: true },
  status:        { type: String, enum: ['pending','confirmed','processing','shipped','delivered','cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['unpaid','paid','refunded'], default: 'unpaid' },
  paymentMethod: { type: String, enum: ['cod','mock_card'], default: 'cod' },
  notes:         { type: String, default: '' },
}, { timestamps: true });
orderSchema.index({ tenant: 1, createdAt: -1 });
const CFOrder = mongoose.model('CFOrder', orderSchema);

module.exports = {
  CFTenant, CFPlan, CFPage, CFSubscriber, CFMessage,
  CFAutomationRule, CFSequence, CFSequenceEnrollment, CFBroadcast,
  CFCategory, CFProduct, CFOrder,
};
