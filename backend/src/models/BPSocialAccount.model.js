const mongoose = require('mongoose');

const SocialAccountSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  platform:    { type: String, enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'threads'], required: true },
  accountId:   { type: String, required: true },   // platform user/page/channel ID
  accountName: { type: String, default: '' },
  accountHandle: { type: String, default: '' },    // @handle
  avatar:      { type: String, default: '' },
  accountType: { type: String, default: 'personal' }, // personal | page | channel | business

  // OAuth tokens (encrypted in production)
  accessToken:  { type: String, default: '' },
  refreshToken: { type: String, default: '' },
  tokenExpiry:  { type: Date, default: null },
  pageId:       { type: String, default: '' },     // For Facebook pages
  pageToken:    { type: String, default: '' },

  active:      { type: Boolean, default: true },
  lastPosted:  { type: Date, default: null },

  // Stats cache
  followers:   { type: Number, default: 0 },
  following:   { type: Number, default: 0 },
  posts:       { type: Number, default: 0 },
}, { timestamps: true });

SocialAccountSchema.index({ user: 1, platform: 1, accountId: 1 }, { unique: true });

module.exports = mongoose.models.BPSocialAccount || mongoose.model('BPSocialAccount', SocialAccountSchema);
