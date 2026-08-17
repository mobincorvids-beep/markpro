const mongoose = require('mongoose');
const { Schema, model, models } = mongoose;

// ── Team ──────────────────────────────────────────────────────────────────
const spTeamSchema = new Schema({
  name:   { type: String, required: true, trim: true },
  owner:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  avatar: String,
  data:   { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
const SPTeam = models.SPTeam || model('SPTeam', spTeamSchema);

// ── Team Member ───────────────────────────────────────────────────────────
const spTeamMemberSchema = new Schema({
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teamId:       { type: Schema.Types.ObjectId, ref: 'SPTeam', required: true },
  role:         { type: String, enum: ['admin','editor','viewer'], default: 'editor' },
  inviteToken:  String,
  inviteEmail:  String,
  pending:      { type: Boolean, default: false },
  status:       { type: Number, default: 1 },
}, { timestamps: true });
spTeamMemberSchema.index({ userId: 1, teamId: 1 }, { unique: true });
const SPTeamMember = models.SPTeamMember || model('SPTeamMember', spTeamMemberSchema);

// ── Connected Social Account ───────────────────────────────────────────────
const spAccountSchema = new Schema({
  teamId:         { type: Schema.Types.ObjectId, ref: 'SPTeam', required: true },
  network:        { type: String, required: true, enum: ['facebook','instagram','twitter','linkedin','tiktok','pinterest','youtube','telegram','threads'] },
  module:         String,     // e.g. facebook_page, instagram_business
  category:       String,     // page | profile | group | channel | board
  pid:            String,     // provider account id
  name:           String,
  username:       String,
  avatar:         String,
  url:            String,
  token:          String,
  refreshToken:   String,
  tokenExpiresAt: Date,
  canPost:        { type: Boolean, default: true },
  data:           { type: Schema.Types.Mixed, default: {} },
  lastRun:        Date,
  status:         { type: Number, default: 1 }, // 1=active, 0=disconnected, 2=error
  reconnectUrl:   String,
}, { timestamps: true });
spAccountSchema.index({ teamId: 1, network: 1 });
const SPAccount = models.SPAccount || model('SPAccount', spAccountSchema);

// ── Campaign (post group/label) ────────────────────────────────────────────
const spCampaignSchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: 'SPTeam', required: true },
  name:   { type: String, required: true },
  desc:   String,
  color:  { type: String, default: '#6366f1' },
  status: { type: Number, default: 1 },
}, { timestamps: true });
const SPCampaign = models.SPCampaign || model('SPCampaign', spCampaignSchema);

// ── Label ─────────────────────────────────────────────────────────────────
const spLabelSchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: 'SPTeam', required: true },
  name:   { type: String, required: true },
  color:  { type: String, default: '#10b981' },
  status: { type: Number, default: 1 },
}, { timestamps: true });
const SPLabel = models.SPLabel || model('SPLabel', spLabelSchema);

// ── Post ─────────────────────────────────────────────────────────────────
const spPostSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teamId:    { type: Schema.Types.ObjectId, ref: 'SPTeam', required: true },
  campaign:  { type: Schema.Types.ObjectId, ref: 'SPCampaign', default: null },
  labels:    [{ type: Schema.Types.ObjectId, ref: 'SPLabel' }],
  accounts:  [{ type: Schema.Types.ObjectId, ref: 'SPAccount', required: true }],
  type:      { type: String, enum: ['basic','story','reel','short','thread'], default: 'basic' },
  method:    { type: String, enum: ['basic','ai','rss','evergreen'], default: 'basic' },
  content:   { type: String, default: '' },
  perAccountContent: { type: Schema.Types.Mixed, default: {} },
  media:     [{ url: String, type: { type: String, enum: ['image','video','gif'] }, thumbnail: String }],
  link:      String,
  firstComment: String,
  timePost:  { type: Date, required: true },
  delayMinutes:  { type: Number, default: 0 },
  repostFrequency: { type: Number, default: 0 }, // days; 0=no repost
  repostUntil: Date,
  isDraft:   { type: Boolean, default: false },
  result:    { type: Schema.Types.Mixed, default: {} },
  status:    { type: Number, default: 0 }, // 0=scheduled,1=published,2=failed,3=draft,4=publishing
}, { timestamps: true });
spPostSchema.index({ teamId: 1, timePost: 1 });
spPostSchema.index({ teamId: 1, status: 1 });
spPostSchema.index({ timePost: 1, status: 1 }); // cron index
const SPPost = models.SPPost || model('SPPost', spPostSchema);

// ── RSS Feed ──────────────────────────────────────────────────────────────
const spRssFeedSchema = new Schema({
  teamId:      { type: Schema.Types.ObjectId, ref: 'SPTeam', required: true },
  name:        { type: String, required: true },
  url:         { type: String, required: true },
  accounts:    [{ type: Schema.Types.ObjectId, ref: 'SPAccount' }],
  active:      { type: Boolean, default: true },
  lastFetchAt: Date,
  lastPostAt:  Date,
  postTemplate: String,     // Handlebars: {{title}} {{link}} etc.
  maxPerFetch:  { type: Number, default: 3 },
  postedGuids: [String],    // track already-posted items
}, { timestamps: true });
const SPRssFeed = models.SPRssFeed || model('SPRssFeed', spRssFeedSchema);

// ── AI Template ───────────────────────────────────────────────────────────
const spAiTemplateSchema = new Schema({
  name:     { type: String, required: true },
  category: { type: String, default: 'general' },
  prompt:   { type: String, required: true },
  networks: [String],
  isGlobal: { type: Boolean, default: true },
  status:   { type: Number, default: 1 },
}, { timestamps: true });
const SPAiTemplate = models.SPAiTemplate || model('SPAiTemplate', spAiTemplateSchema);

// ── AI Campaign (auto-post) ────────────────────────────────────────────────
const spAiCampaignSchema = new Schema({
  teamId:     { type: Schema.Types.ObjectId, ref: 'SPTeam', required: true },
  name:       { type: String, required: true },
  accounts:   [{ type: Schema.Types.ObjectId, ref: 'SPAccount' }],
  template:   { type: Schema.Types.ObjectId, ref: 'SPAiTemplate' },
  prompt:     String,
  frequency:  { type: String, enum: ['hourly','daily','weekly'], default: 'daily' },
  active:     { type: Boolean, default: true },
  lastRunAt:  Date,
  nextRunAt:  Date,
}, { timestamps: true });
const SPAiCampaign = models.SPAiCampaign || model('SPAiCampaign', spAiCampaignSchema);

// ── Analytics per account/post ────────────────────────────────────────────
const spAnalyticSchema = new Schema({
  teamId:    { type: Schema.Types.ObjectId, ref: 'SPTeam', required: true },
  accountId: { type: Schema.Types.ObjectId, ref: 'SPAccount' },
  postId:    { type: Schema.Types.ObjectId, ref: 'SPPost' },
  network:   String,
  date:      { type: Date, default: Date.now },
  reach:     { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  clicks:    { type: Number, default: 0 },
  likes:     { type: Number, default: 0 },
  comments:  { type: Number, default: 0 },
  shares:    { type: Number, default: 0 },
  data:      { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
spAnalyticSchema.index({ teamId: 1, date: -1 });
const SPAnalytic = models.SPAnalytic || model('SPAnalytic', spAnalyticSchema);

// ── Media Asset ───────────────────────────────────────────────────────────
const spMediaSchema = new Schema({
  teamId:   { type: Schema.Types.ObjectId, ref: 'SPTeam', required: true },
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  filename: String,
  url:      String,
  mimeType: String,
  size:     { type: Number, default: 0 },
  type:     { type: String, enum: ['image','video','gif'], default: 'image' },
}, { timestamps: true });
const SPMedia = models.SPMedia || model('SPMedia', spMediaSchema);

// ── Support ───────────────────────────────────────────────────────────────
const spSupportTicketSchema = new Schema({
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subject:  { type: String, required: true },
  message:  { type: String, required: true },
  priority: { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  status:   { type: String, enum: ['open','pending','answered','closed'], default: 'open' },
  attachments: [String],
}, { timestamps: true });
const SPSupportTicket = models.SPSupportTicket || model('SPSupportTicket', spSupportTicketSchema);

const spSupportReplySchema = new Schema({
  ticketId: { type: Schema.Types.ObjectId, ref: 'SPSupportTicket', required: true },
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isAdmin:  { type: Boolean, default: false },
  message:  { type: String, required: true },
  attachments: [String],
}, { timestamps: true });
const SPSupportReply = models.SPSupportReply || model('SPSupportReply', spSupportReplySchema);

// ── Affiliate ─────────────────────────────────────────────────────────────
const spAffiliateWithdrawalSchema = new Schema({
  userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount:  { type: Number, required: true },
  method:  { type: String, required: true },
  account: String,
  status:  { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  note:    String,
}, { timestamps: true });
const SPAffiliateWithdrawal = models.SPAffiliateWithdrawal || model('SPAffiliateWithdrawal', spAffiliateWithdrawalSchema);

// ── Blog ──────────────────────────────────────────────────────────────────
const spBlogCategorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
}, { timestamps: true });
const SPBlogCategory = models.SPBlogCategory || model('SPBlogCategory', spBlogCategorySchema);

const spBlogPostSchema = new Schema({
  authorId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  category:   { type: Schema.Types.ObjectId, ref: 'SPBlogCategory' },
  title:      { type: String, required: true },
  slug:       { type: String, required: true, unique: true },
  excerpt:    String,
  content:    { type: String, required: true },
  thumbnail:  String,
  tags:       [String],
  status:     { type: String, enum: ['draft','published'], default: 'draft' },
  publishedAt: Date,
}, { timestamps: true });
spBlogPostSchema.index({ status: 1, publishedAt: -1 });
const SPBlogPost = models.SPBlogPost || model('SPBlogPost', spBlogPostSchema);

module.exports = {
  SPTeam, SPTeamMember, SPAccount, SPCampaign, SPLabel,
  SPPost, SPRssFeed, SPAiTemplate, SPAiCampaign, SPAnalytic, SPMedia,
  SPSupportTicket, SPSupportReply, SPAffiliateWithdrawal,
  SPBlogCategory, SPBlogPost,
};
