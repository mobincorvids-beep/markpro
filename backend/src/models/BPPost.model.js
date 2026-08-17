const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Content
  content:        { type: String, default: '' },
  mediaUrls:      [{ type: String }],
  mediaType:      { type: String, enum: ['none', 'image', 'video', 'carousel'], default: 'none' },
  link:           { type: String, default: '' },
  hashtags:       [{ type: String }],

  // Targeting
  accounts:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'BPSocialAccount' }],
  platforms:      [{ type: String }],

  // Status & scheduling
  status:         { type: String, enum: ['draft', 'scheduled', 'published', 'failed', 'processing'], default: 'draft' },
  scheduledAt:    { type: Date, default: null },
  publishedAt:    { type: Date, default: null },
  failedReason:   { type: String, default: '' },

  // AI generation
  aiGenerated:    { type: Boolean, default: false },
  aiPrompt:       { type: String, default: '' },
  templateKey:    { type: String, default: '' },

  // Per-platform results
  platformResults: [{
    platform:   { type: String },
    accountId:  { type: mongoose.Schema.Types.ObjectId, ref: 'BPSocialAccount' },
    postId:     { type: String, default: '' },  // native platform post ID
    url:        { type: String, default: '' },
    status:     { type: String, default: 'pending' },
    error:      { type: String, default: '' },
  }],

  // Analytics (populated from platform APIs)
  analytics: {
    likes:    { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares:   { type: Number, default: 0 },
    reach:    { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks:   { type: Number, default: 0 },
    lastFetched: { type: Date, default: null },
  },

  // Autopilot / campaign
  campaign:       { type: mongoose.Schema.Types.ObjectId, ref: 'BPCampaign', default: null },
  isAutopilot:    { type: Boolean, default: false },
}, { timestamps: true });

PostSchema.index({ user: 1, status: 1 });
PostSchema.index({ scheduledAt: 1, status: 1 });

module.exports = mongoose.models.BPPost || mongoose.model('BPPost', PostSchema);
