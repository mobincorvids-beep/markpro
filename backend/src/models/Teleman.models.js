const mongoose = require('mongoose');

// ── Plan ──────────────────────────────────────────────────────
const telemPlanSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  price:          { type: Number, required: true },
  billingCycle:   { type: String, enum: ['monthly','yearly'], default: 'monthly' },
  stripePriceId:  { type: String, default: '' },
  maxAgents:      { type: Number, default: 5 },
  maxCampaigns:   { type: Number, default: 10 },
  maxContacts:    { type: Number, default: 1000 },
  maxMinutes:     { type: Number, default: 500 },
  maxSMS:         { type: Number, default: 500 },
  features:       [String],
  isActive:       { type: Boolean, default: true },
  isTrial:        { type: Boolean, default: false },
  trialDays:      { type: Number, default: 14 },
}, { timestamps: true });
const TelemPlan = mongoose.model('TelemPlan', telemPlanSchema);

// ── Tenant (company workspace) ────────────────────────────────
const telemTenantSchema = new mongoose.Schema({
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  planId:       { type: mongoose.Schema.Types.ObjectId, ref: 'TelemPlan', default: null },
  company:      { type: String, default: '' },
  phone:        { type: String, default: '' },
  address:      { type: String, default: '' },
  timezone:     { type: String, default: 'UTC' },
  subscriptionStatus: { type: String, enum: ['trial','active','past_due','canceled','inactive'], default: 'trial' },
  trialEndsAt:  { type: Date, default: null },
  currentPeriodEnd: { type: Date, default: null },
  isSuspended:  { type: Boolean, default: false },
  stripeCustomerId: { type: String, default: '' },
  subscriptionId:   { type: String, default: '' },
  usage: {
    minutesUsed:  { type: Number, default: 0 },
    smsSent:      { type: Number, default: 0 },
    periodStart:  { type: Date, default: Date.now },
  },
}, { timestamps: true });
const TelemTenant = mongoose.model('TelemTenant', telemTenantSchema);

// ── Department ────────────────────────────────────────────────
const telemDeptSchema = new mongoose.Schema({
  tenantId:     { type: mongoose.Schema.Types.ObjectId, ref: 'TelemTenant', required: true },
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  status:       { type: String, enum: ['active','inactive'], default: 'active' },
  twilioNumber: { type: String, default: '' },
}, { timestamps: true });
const TelemDept = mongoose.model('TelemDept', telemDeptSchema);

// ── Provider (per-tenant Twilio creds) ───────────────────────
const telemProviderSchema = new mongoose.Schema({
  tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'TelemTenant', required: true },
  name:       { type: String, required: true },
  type:       { type: String, enum: ['twilio','nexmo','plivo','custom'], default: 'twilio' },
  accountSid: { type: String, default: '' },
  authToken:  { type: String, default: '' },
  apiKey:     { type: String, default: '' },
  apiSecret:  { type: String, default: '' },
  appSid:     { type: String, default: '' },
  fromNumber: { type: String, default: '' },
  isDefault:  { type: Boolean, default: false },
  status:     { type: String, enum: ['active','inactive'], default: 'active' },
}, { timestamps: true });
const TelemProvider = mongoose.model('TelemProvider', telemProviderSchema);

// ── Contact ───────────────────────────────────────────────────
const telemContactSchema = new mongoose.Schema({
  tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'TelemTenant', required: true },
  firstName:  { type: String, required: true },
  lastName:   { type: String, default: '' },
  email:      { type: String, default: '' },
  phone:      { type: String, required: true },
  company:    { type: String, default: '' },
  jobTitle:   { type: String, default: '' },
  address:    { type: String, default: '' },
  city:       { type: String, default: '' },
  state:      { type: String, default: '' },
  country:    { type: String, default: '' },
  notes:      { type: String, default: '' },
  tags:       [String],
  status:     { type: String, enum: ['active','inactive','blocked','dnc'], default: 'active' },
  leadScore:  { type: Number, default: 0 },
  leadStatus: { type: String, enum: ['new','contacted','qualified','converted','lost'], default: 'new' },
  customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
telemContactSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
telemContactSchema.index({ tenantId: 1, tags: 1 });
const TelemContact = mongoose.model('TelemContact', telemContactSchema);

// ── Script ────────────────────────────────────────────────────
const telemScriptSchema = new mongoose.Schema({
  tenantId:  { type: mongoose.Schema.Types.ObjectId, ref: 'TelemTenant', required: true },
  name:      { type: String, required: true },
  content:   { type: String, required: true },
  category:  { type: String, default: '' },
  isActive:  { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
const TelemScript = mongoose.model('TelemScript', telemScriptSchema);

// ── Campaign ──────────────────────────────────────────────────
const telemCampaignSchema = new mongoose.Schema({
  tenantId:     { type: mongoose.Schema.Types.ObjectId, ref: 'TelemTenant', required: true },
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  type:         { type: String, enum: ['outbound_call','inbound_call','sms','mixed'], default: 'outbound_call' },
  status:       { type: String, enum: ['draft','active','paused','completed','archived'], default: 'draft' },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'TelemDept', default: null },
  agentIds:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  providerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'TelemProvider', default: null },
  startDate:    { type: Date, default: null },
  endDate:      { type: Date, default: null },
  callHoursStart:{ type: String, default: '09:00' },
  callHoursEnd:  { type: String, default: '18:00' },
  timezone:     { type: String, default: 'UTC' },
  workDays:     { type: [Number], default: [1,2,3,4,5] },
  maxAttempts:  { type: Number, default: 3 },
  callInterval: { type: Number, default: 60 },
  scriptId:     { type: mongoose.Schema.Types.ObjectId, ref: 'TelemScript', default: null },
  smsMessage:   { type: String, default: '' },
  totalContacts:  { type: Number, default: 0 },
  totalCalled:    { type: Number, default: 0 },
  totalAnswered:  { type: Number, default: 0 },
  totalConverted: { type: Number, default: 0 },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
const TelemCampaign = mongoose.model('TelemCampaign', telemCampaignSchema);

// ── Campaign Contact (join) ───────────────────────────────────
const telemCampaignContactSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'TelemCampaign', required: true },
  contactId:  { type: mongoose.Schema.Types.ObjectId, ref: 'TelemContact', required: true },
  tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'TelemTenant', required: true },
  status:     { type: String, enum: ['pending','called','answered','voicemail','failed','converted','dnc'], default: 'pending' },
  attempts:   { type: Number, default: 0 },
  lastAttempt:{ type: Date, default: null },
  nextAttempt:{ type: Date, default: null },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes:      { type: String, default: '' },
  disposition:{ type: String, default: '' },
}, { timestamps: true });
telemCampaignContactSchema.index({ campaignId: 1, status: 1 });
const TelemCampaignContact = mongoose.model('TelemCampaignContact', telemCampaignContactSchema);

// ── Call History ──────────────────────────────────────────────
const telemCallSchema = new mongoose.Schema({
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'TelemTenant', required: true },
  agentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  contactId:   { type: mongoose.Schema.Types.ObjectId, ref: 'TelemContact', default: null },
  campaignId:  { type: mongoose.Schema.Types.ObjectId, ref: 'TelemCampaign', default: null },
  providerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'TelemProvider', default: null },
  callSid:     { type: String, default: '' },
  from:        { type: String, required: true },
  to:          { type: String, required: true },
  direction:   { type: String, enum: ['inbound','outbound'], default: 'outbound' },
  status:      { type: String, default: 'pending' },
  duration:    { type: Number, default: 0 },
  recordingUrl:{ type: String, default: '' },
  cost:        { type: Number, default: 0 },
  disposition: { type: String, default: '' },
  notes:       { type: String, default: '' },
  startedAt:   { type: Date, default: null },
  endedAt:     { type: Date, default: null },
}, { timestamps: true });
telemCallSchema.index({ tenantId: 1, createdAt: -1 });
const TelemCall = mongoose.model('TelemCall', telemCallSchema);

// ── SMS Message ───────────────────────────────────────────────
const telemSmsSchema = new mongoose.Schema({
  tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'TelemTenant', required: true },
  agentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  contactId:  { type: mongoose.Schema.Types.ObjectId, ref: 'TelemContact', default: null },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'TelemCampaign', default: null },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'TelemProvider', default: null },
  messageSid: { type: String, default: '' },
  from:       { type: String, required: true },
  to:         { type: String, required: true },
  body:       { type: String, required: true },
  direction:  { type: String, enum: ['inbound','outbound'], default: 'outbound' },
  status:     { type: String, default: 'pending' },
  cost:       { type: Number, default: 0 },
  mediaUrls:  [String],
}, { timestamps: true });
const TelemSms = mongoose.model('TelemSms', telemSmsSchema);

// ── Ticket ────────────────────────────────────────────────────
const telemTicketSchema = new mongoose.Schema({
  tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'TelemTenant', required: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject:    { type: String, required: true },
  status:     { type: String, enum: ['open','in_progress','resolved','closed'], default: 'open' },
  priority:   { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  category:   { type: String, default: 'general' },
  messages: [{
    senderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role:        { type: String, enum: ['user','support'], default: 'user' },
    message:     { type: String, required: true },
    attachments: [String],
    createdAt:   { type: Date, default: Date.now },
  }],
  lastReplyAt: { type: Date, default: Date.now },
  closedAt:    { type: Date, default: null },
}, { timestamps: true });
const TelemTicket = mongoose.model('TelemTicket', telemTicketSchema);

module.exports = {
  TelemPlan, TelemTenant, TelemDept, TelemProvider,
  TelemContact, TelemScript, TelemCampaign, TelemCampaignContact,
  TelemCall, TelemSms, TelemTicket,
};
