const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  slug:         { type: String, required: true, unique: true },
  description:  { type: String, default: '' },
  interval:     { type: String, enum: ['monthly', 'yearly', 'unlimited'], required: true },
  price:        { type: Number, required: true },
  currency:     { type: String, default: 'USD' },

  // Limits (matching BeePost plan structure)
  socialProfiles: { type: Number, default: 0 },    // 0 = unlimited
  socialPosts:    { type: Number, default: 0 },
  wordTokens:     { type: Number, default: 0 },     // monthly AI word tokens
  imageTokens:    { type: Number, default: 0 },     // monthly AI image tokens

  // Platform access
  platforms: [{
    type: String,
    enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'threads'],
  }],

  // Features
  schedulePosting:    { type: Boolean, default: true },
  webhookAccess:      { type: Boolean, default: false },
  prebuiltTemplates:  { type: Boolean, default: false },
  aiModel:            { type: String, default: '' },   // e.g. gpt-4-0613
  imageAiModel:       { type: String, default: '' },   // e.g. dall-e-2
  affiliateCommission: { type: Number, default: 0 },  // %

  // Stripe
  stripePriceId: { type: String, default: '' },

  isFeatured:   { type: Boolean, default: false },
  active:       { type: Boolean, default: true },
  sortOrder:    { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.models.BPPlan || mongoose.model('BPPlan', PlanSchema);
