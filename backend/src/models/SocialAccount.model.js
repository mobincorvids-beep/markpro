const mongoose = require('mongoose');

const SocialAccountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    network: {
      type: String,
      required: true,
      enum: ['twitter', 'facebook', 'instagram', 'youtube', 'tiktok', 'reddit', 'rss', 'pinterest', 'linkedin'],
    },
    label: { type: String, required: true },       // Display name
    accountId: { type: String, required: true },   // Username, page ID, channel ID, etc.
    accessToken: { type: String, default: '' },
    refreshToken: { type: String, default: '' },
    extra: { type: mongoose.Schema.Types.Mixed, default: {} }, // Extra config per network
    isActive: { type: Boolean, default: true },
    lastFetched: { type: Date },
    color: { type: String, default: '' },          // Custom accent color for this account
  },
  { timestamps: true }
);

module.exports = mongoose.model('SocialAccount', SocialAccountSchema);
