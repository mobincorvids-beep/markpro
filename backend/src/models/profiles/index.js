/**
 * Per-module user profiles.
 *
 * Section B.1 fix: User.model.js used to carry ~90 fields belonging to ~15
 * different modules. Each module now owns its own profile document keyed by
 * userId. Use getProfile(Model, userId) to lazily create-on-read.
 *
 * Migration of existing rows: `node scripts/migrate-user-profiles.js`
 */
const mongoose = require('mongoose');
const { encryptedField, withGetters } = require('../../utils/encryption');

const base = () => ({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
});

function model(name, fields, opts = {}) {
  const schema = new mongoose.Schema({ ...base(), ...fields }, { timestamps: true, ...opts });
  withGetters(schema);
  return mongoose.models[name] || mongoose.model(name, schema);
}

/* ── SMM Panel ─────────────────────────────────────────────────────── */
const SmmProfile = model('SmmProfile', {
  balance:  { type: Number, default: 0, min: 0 },
  apiKey:   { type: String, unique: true, sparse: true },
  currency: { type: String, default: 'USD' },
  spent:    { type: Number, default: 0 },
});

/* ── Social Proof (plan usage counters) ────────────────────────────── */
const SocialProofProfile = model('SocialProofProfile', {
  campaigns:     { type: Number, default: 0 },
  notifications: { type: Number, default: 0 },
  domains:       { type: Number, default: 0 },
  bioPages:      { type: Number, default: 0 },
  seoUsage:      { type: Number, default: 0 },
  cyberUsage:    { type: Number, default: 0 },
  aiReplies:     { type: Number, default: 0 },
  aiImages:      { type: Number, default: 0 },
  lastResetAt:   { type: Date, default: Date.now },
});

/* ── Rank Tracker (PHPRank) ────────────────────────────────────────── */
const RankProfile = model('RankProfile', {
  apiKey:       encryptedField(),
  projectsUsed: { type: Number, default: 0 },
  reportsUsed:  { type: Number, default: 0 },
});

/* ── BioLinks ──────────────────────────────────────────────────────── */
const BioLinksProfile = model('BioLinksProfile', {
  apiKey: encryptedField(),
  email:  String,
});

/* ── Bio Pages (PixaURL) ───────────────────────────────────────────── */
const BioProfile = model('BioProfile', {
  bioRole:       { type: Number, default: 2 },
  parentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  contactNumber: String,
  profilePicture:{},
  accessLevel:   [],
  validityDate:  Date,
  planName:      String,
  ip:            String,
  source:        { type: String, default: 'Self' },
  settings:      {},
});

/* ── Document Vault ────────────────────────────────────────────────── */
const DocsProfile = model('DocsProfile', {
  storageUsed:  { type: Number, default: 0 },
  storageLimit: { type: Number, default: 5 * 1024 * 1024 * 1024 },
});

/* ── WhatsApp Marketing (Cloud API credentials - encrypted) ────────── */
const WhatsAppProfile = model('WhatsAppProfile', {
  phoneId:     encryptedField(),
  businessId:  encryptedField(),
  accessToken: encryptedField(),
  isEnabled:   { type: Boolean, default: true },
});

/* ── Publish / BeePost (wallet, tokens, affiliate) ─────────────────── */
const PublishProfile = model('PublishProfile', {
  walletBalance:      { type: Number, default: 0, min: 0 },
  planExpiry:         Date,
  planInterval:       { type: String, enum: ['monthly','yearly','unlimited', null], default: null },
  wordTokensUsed:     { type: Number, default: 0 },
  imageTokensUsed:    { type: Number, default: 0 },
  tokenResetDate:     Date,
  socialProfilesUsed: { type: Number, default: 0 },
  socialPostsUsed:    { type: Number, default: 0 },
  postsUsedThisMonth: { type: Number, default: 0 },
  postResetDate:      Date,
  affiliateCode:      String,
  affiliateEarnings:  { type: Number, default: 0 },
  referredBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});

/* ── SocialAI brand intelligence ───────────────────────────────────── */
const SocialAIProfile = model('SocialAIProfile', {
  categoryId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  provider:       String,
  providerId:     String,
  kycVerifiedAt:  Date,
  totalLogins:    { type: Number, default: 0 },
});

/* ── AI Suite / AIGen credits ──────────────────────────────────────── */
const AiProfile = model('AiProfile', {
  credits:      { type: Number, default: 0, min: 0 },
  referralCode: String,
});

/* ── Pen AI (AI2Pen) ───────────────────────────────────────────────── */
const PenProfile = model('PenProfile', {
  packageId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
  packageData:      { type: mongoose.Schema.Types.Mixed, default: {} },
  packageExpire:    Date,
  tokenLimit:       { type: Number, default: 5000 },
  tokenUsed:        { type: Number, default: 0 },
  imageLimit:       { type: Number, default: 10 },
  imageUsed:        { type: Number, default: 0 },
  audioLimit:       { type: Number, default: 10 },
  audioUsed:        { type: Number, default: 0 },
  isAgency:         { type: Boolean, default: false },
  preferredAiModel: String,
  totalLogins:      { type: Number, default: 0 },
  lastLoginAt:      Date,
});

/* ── Design Studio (PixaGuru) ──────────────────────────────────────── */
const DesignProfile = model('DesignProfile', {
  projectsUsed:  { type: Number, default: 0 },
  exportsUsed:   { type: Number, default: 0 },
  bgRemovalsUsed:{ type: Number, default: 0 },
  storageUsedMB: { type: Number, default: 0 },
});

/* ── Mailer (XSender) ──────────────────────────────────────────────── */
const MailerProfile = model('MailerProfile', {
  emailsSentThisMonth: { type: Number, default: 0 },
  smsSentThisMonth:    { type: Number, default: 0 },
  contactsCount:       { type: Number, default: 0 },
});

/* ── StackPosts ────────────────────────────────────────────────────── */
const StackPostsProfile = model('StackPostsProfile', {
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'SPTeam' },
});

/** Lazily create-on-read: every module can assume a profile exists. */
async function getProfile(Model, userId, session = null) {
  const q = Model.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  if (session) q.session(session);
  return q;
}

module.exports = {
  SmmProfile, SocialProofProfile, RankProfile, BioLinksProfile, BioProfile,
  DocsProfile, WhatsAppProfile, PublishProfile, SocialAIProfile, AiProfile,
  PenProfile, DesignProfile, MailerProfile, StackPostsProfile,
  getProfile,
};
