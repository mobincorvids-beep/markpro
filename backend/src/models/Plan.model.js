const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: String,
  price: {
    monthly: { type: Number, required: true },
    yearly: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
  },
  stripePriceId: { monthly: String, yearly: String },

  // Limits (-1 = unlimited)
  limits: {
    campaigns: { type: Number, default: 1 },
    notifications: { type: Number, default: 5 },
    domains: { type: Number, default: 1 },
    trackNotifications: { type: Number, default: 1000 },
    trackConversions: { type: Number, default: 500 },
    teamMembers: { type: Number, default: 0 },
    dataRetentionDays: { type: Number, default: 30 },
  },

  // Feature flags
  features: {
    removeBranding: { type: Boolean, default: false },
    customDomain: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: false },
    webhooks: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    teamAccess: { type: Boolean, default: false },
    allNotificationTypes: { type: Boolean, default: false },
  },

  featureList: [String],
  color: { type: String, default: '#6366f1' },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false }, // free/default plan
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
