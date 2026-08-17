const mongoose = require('mongoose');

// ── CRM Contact ───────────────────────────────────────────────
const zamContactSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  firstName:   { type: String, required: true, trim: true },
  lastName:    { type: String, default: '', trim: true },
  email:       { type: String, default: '', lowercase: true, trim: true },
  phone:       { type: String, default: '' },
  company:     { type: String, default: '' },
  jobTitle:    { type: String, default: '' },
  website:     { type: String, default: '' },
  linkedin:    { type: String, default: '' },
  twitter:     { type: String, default: '' },
  address:     { type: String, default: '' },
  city:        { type: String, default: '' },
  state:       { type: String, default: '' },
  country:     { type: String, default: '' },
  postalCode:  { type: String, default: '' },
  latitude:    { type: Number, default: null },
  longitude:   { type: Number, default: null },
  tags:        [String],
  source:      { type: String, enum: ['manual','import','scrape','linkedin','api'], default: 'manual' },
  status:      { type: String, enum: ['active','inactive','lead','prospect','customer'], default: 'active' },
  notes:       { type: String, default: '' },
  avatar:      { type: String, default: '' },
  rating:      { type: Number, min: 0, max: 5, default: null },
  customFields:{ type: mongoose.Schema.Types.Mixed, default: {} },
  enrichedAt:  { type: Date, default: null },
  mergedInto:  { type: mongoose.Schema.Types.ObjectId, ref: 'ZAMContact', default: null },
  isDuplicate: { type: Boolean, default: false },
}, { timestamps: true });
zamContactSchema.index({ user: 1, email: 1 });
zamContactSchema.index({ user: 1, company: 1 });
zamContactSchema.index({ user: 1, tags: 1 });
zamContactSchema.index({ user: 1, status: 1 });
const ZAMContact = mongoose.model('ZAMContact', zamContactSchema);

// ── Contact Note ──────────────────────────────────────────────
const zamNoteSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'ZAMContact', required: true, index: true },
  content: { type: String, required: true },
  type:    { type: String, enum: ['note','call','email','meeting','task'], default: 'note' },
}, { timestamps: true });
const ZAMNote = mongoose.model('ZAMNote', zamNoteSchema);

// ── Lead (scrape/search result) ───────────────────────────────
const zamLeadSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  searchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'ZAMLeadSearch', default: null },
  name:        { type: String, default: '' },
  email:       { type: String, default: '' },
  phone:       { type: String, default: '' },
  company:     { type: String, default: '' },
  jobTitle:    { type: String, default: '' },
  website:     { type: String, default: '' },
  address:     { type: String, default: '' },
  city:        { type: String, default: '' },
  state:       { type: String, default: '' },
  country:     { type: String, default: '' },
  postalCode:  { type: String, default: '' },
  latitude:    { type: Number, default: null },
  longitude:   { type: Number, default: null },
  rating:      { type: Number, default: null },
  reviewCount: { type: Number, default: 0 },
  category:    { type: String, default: '' },
  placeId:     { type: String, default: '' },
  linkedin:    { type: String, default: '' },
  source:      { type: String, enum: ['google_maps','linkedin','website','manual','openstreetmap'], default: 'openstreetmap' },
  exported:    { type: Boolean, default: false },
  importedToContacts: { type: Boolean, default: false },
}, { timestamps: true });
zamLeadSchema.index({ user: 1, createdAt: -1 });
const ZAMLead = mongoose.model('ZAMLead', zamLeadSchema);

// ── Lead Search Job ───────────────────────────────────────────
const zamLeadSearchSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  keyword:     { type: String, required: true },
  country:     { type: String, default: '' },
  state:       { type: String, default: '' },
  city:        { type: String, default: '' },
  postalCode:  { type: String, default: '' },
  jobTitle:    { type: String, default: '' },
  company:     { type: String, default: '' },
  industry:    { type: String, default: '' },
  source:      { type: String, enum: ['google_maps','linkedin','website','openstreetmap'], default: 'openstreetmap' },
  status:      { type: String, enum: ['queued','running','completed','failed'], default: 'queued' },
  resultsCount:{ type: Number, default: 0 },
  errorMessage:{ type: String, default: '' },
}, { timestamps: true });
const ZAMLeadSearch = mongoose.model('ZAMLeadSearch', zamLeadSearchSchema);

// ── Gemini SEO Tool Run ───────────────────────────────────────
const zamSeoRunSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  toolSlug: { type: String, required: true },
  inputs:   { type: mongoose.Schema.Types.Mixed, default: {} },
  result:   { type: mongoose.Schema.Types.Mixed, default: null },
  model:    { type: String, default: 'gemini-flash-latest' },
  tokensUsed:{ type: Number, default: 0 },
  duration: { type: Number, default: 0 },
}, { timestamps: true });
zamSeoRunSchema.index({ user: 1, toolSlug: 1, createdAt: -1 });
const ZAMSeoRun = mongoose.model('ZAMSeoRun', zamSeoRunSchema);

// ── Asset Library ─────────────────────────────────────────────
const zamAssetSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:     { type: String, required: true },
  type:     { type: String, enum: ['image','document','video','audio','other'], default: 'other' },
  url:      { type: String, required: true },
  filename: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  size:     { type: Number, default: 0 },
  tags:     [String],
}, { timestamps: true });
const ZAMAsset = mongoose.model('ZAMAsset', zamAssetSchema);

module.exports = { ZAMContact, ZAMNote, ZAMLead, ZAMLeadSearch, ZAMSeoRun, ZAMAsset };
