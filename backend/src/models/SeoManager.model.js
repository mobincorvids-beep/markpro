const mongoose = require('mongoose');

// ── Open Graph Properties ─────────────────────────────────────
const ogSchema = new mongoose.Schema({
  title:       { type: String, default: '' },
  description: { type: String, default: '' },
  image:       { type: String, default: '' },
  url:         { type: String, default: '' },
  type:        { type: String, enum: ['website','article','profile','book','music','video','place','product',''], default: 'website' },
  site_name:   { type: String, default: '' },
  locale:      { type: String, default: '' },
  // Article-specific
  article_author:        { type: String, default: '' },
  article_section:       { type: String, default: '' },
  article_published_time:{ type: Date, default: null },
  article_modified_time: { type: Date, default: null },
  article_tags:          [String],
  // Product-specific
  product_price:         { type: String, default: '' },
  product_currency:      { type: String, default: '' },
  product_availability:  { type: String, default: '' },
}, { _id: false });

// ── Twitter Card ──────────────────────────────────────────────
const twitterSchema = new mongoose.Schema({
  card:        { type: String, enum: ['summary','summary_large_image','app','player',''], default: 'summary_large_image' },
  title:       { type: String, default: '' },
  description: { type: String, default: '' },
  image:       { type: String, default: '' },
  site:        { type: String, default: '' },
  creator:     { type: String, default: '' },
}, { _id: false });

// ── hreflang (alternate languages) ────────────────────────────
const hreflangSchema = new mongoose.Schema({
  lang:  { type: String, required: true },
  url:   { type: String, required: true },
}, { _id: false });

// ── JSON-LD ───────────────────────────────────────────────────
const jsonLdSchema = new mongoose.Schema({
  type:       { type: String, default: 'WebPage' }, // WebPage, Article, Product, Organization, BreadcrumbList, etc.
  data:       { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

// ── SEO Page ──────────────────────────────────────────────────
const seoPageSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  slug:           { type: String, required: true, trim: true },
  title:          { type: String, default: '' },
  description:    { type: String, default: '' },
  keywords:       { type: String, default: '' },
  canonical:      { type: String, default: '' },
  robots:         { type: String, default: 'index, follow' },
  // Viewport and charset - rarely changed but supported
  charset:        { type: String, default: 'UTF-8' },
  viewport:       { type: String, default: 'width=device-width, initial-scale=1' },
  // Webmaster verification
  google_verify:  { type: String, default: '' },
  bing_verify:    { type: String, default: '' },
  yandex_verify:  { type: String, default: '' },
  // Custom tags
  custom_head:    { type: String, default: '' },
  // Open Graph
  og:             { type: ogSchema, default: () => ({}) },
  // Twitter Card
  twitter:        { type: twitterSchema, default: () => ({}) },
  // hreflang alternate languages
  hreflang:       [hreflangSchema],
  // Prev/Next pagination
  prev_url:       { type: String, default: '' },
  next_url:       { type: String, default: '' },
  // AMP link
  amp_url:        { type: String, default: '' },
  // JSON-LD schemas (multiple allowed)
  jsonLd:         [jsonLdSchema],
  // Analytics
  viewCount:      { type: Number, default: 0 },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

seoPageSchema.index({ slug: 1, user: 1 });
seoPageSchema.index({ user: 1, createdAt: -1 });

const SeoPage = mongoose.model('SeoPage', seoPageSchema);
module.exports = { SeoPage };
