const mongoose = require('mongoose');

/* ── Project ──────────────────────────────────────────── */
const projectSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 128 },
  domain: { type: String, required: true, trim: true, lowercase: true },
  url: { type: String, required: true, trim: true }, // full URL including https://

  keywords: [{ keyword: String, position: Number, lastChecked: Date }],
  competitors: [{ domain: String, url: String }],

  // Snapshot of latest SEO score
  latestScore: { type: Number, default: null },
  latestAuditAt: { type: Date, default: null },

  // Notification settings
  notifications: {
    emailOnAudit: { type: Boolean, default: false },
    emailOnRankChange: { type: Boolean, default: false },
  },

  isActive: { type: Boolean, default: true },
  color: { type: String, default: '#6366f1' },
  favicon: { type: String, default: null },
}, { timestamps: true });

projectSchema.index({ user: 1, createdAt: -1 });

/* ── Report ───────────────────────────────────────────── */
const reportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  type: {
    type: String,
    enum: [
      'seo_audit', 'page_speed', 'mobile_friendly', 'keyword_rank',
      'backlink', 'domain_authority', 'social_preview', 'meta_tags',
      'broken_links', 'sitemap', 'robots_txt', 'ssl_check',
      'whois', 'dns_lookup', 'ip_lookup', 'redirect_check',
      'competitor_analysis', 'keyword_density', 'readability',
    ],
    required: true,
  },
  url: { type: String, required: true },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },

  // Raw results stored as flexible object
  results: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Computed score 0-100
  score: { type: Number, default: null },

  // Summary highlights
  summary: {
    passed: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    info: { type: Number, default: 0 },
  },

  // Issues list
  issues: [{
    category: String,
    severity: { type: String, enum: ['critical', 'warning', 'info', 'passed'] },
    title: String,
    description: String,
    value: mongoose.Schema.Types.Mixed,
    recommendation: String,
  }],

  errorMessage: String,
  duration: { type: Number, default: 0 }, // ms
  pdfUrl: { type: String, default: null },
}, { timestamps: true });

reportSchema.index({ user: 1, createdAt: -1 });
reportSchema.index({ project: 1, createdAt: -1 });
reportSchema.index({ type: 1 });

/* ── ToolRun (individual free tool usage) ─────────────── */
const toolRunSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  tool: { type: String, required: true },
  input: mongoose.Schema.Types.Mixed,
  results: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
  ip: String,
  duration: Number,
}, { timestamps: true });

toolRunSchema.index({ user: 1, createdAt: -1 });
toolRunSchema.index({ tool: 1 });

/* ── Payment ──────────────────────────────────────────── */
const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  processor: { type: String, enum: ['stripe', 'paypal', 'free'], default: 'stripe' },
  processorPaymentId: String,
  billingInterval: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  periodStart: Date,
  periodEnd: Date,
}, { timestamps: true });

module.exports = {
  Project: mongoose.model('Project', projectSchema),
  Report: mongoose.model('Report', reportSchema),
  ToolRun: mongoose.model('ToolRun', toolRunSchema),
  Payment: mongoose.models.RankPayment || mongoose.model('RankPayment', paymentSchema),
};
