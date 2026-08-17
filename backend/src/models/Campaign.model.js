const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 128 },
  domain: { type: String, required: true, trim: true },

  // Pixel / tracking script key
  pixelKey: { type: String, unique: true, sparse: true },

  // Display settings
  branding: {
    removeBranding: { type: Boolean, default: false },
    customLogo: { type: String, default: null },
    customName: { type: String, default: null },
    customUrl: { type: String, default: null },
  },

  // Page targeting: show/hide on specific URLs
  displayTrigger: {
    type: { type: String, enum: ['all', 'specific'], default: 'all' },
    urls: [String],
  },

  // Status
  isEnabled: { type: Boolean, default: true },

  // Stats (denormalized for fast reads)
  stats: {
    totalImpressions: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
  },
}, { timestamps: true });

// Auto-generate pixel key
campaignSchema.pre('save', function (next) {
  if (!this.pixelKey) {
    const { v4: uuidv4 } = require('uuid');
    this.pixelKey = uuidv4().replace(/-/g, '');
  }
  next();
});

campaignSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Campaign', campaignSchema);
