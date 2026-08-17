const mongoose = require('mongoose');

// All 30+ notification types from the original PHP app
const NOTIFICATION_TYPES = [
  'informational', 'informational_bar', 'informational_bar_mini', 'informational_mini',
  'conversions', 'conversions_counter', 'live_counter',
  'email_collector', 'collector_bar', 'collector_modal', 'collector_two_modal',
  'reviews', 'score_feedback', 'text_feedback', 'emoji_feedback',
  'coupon', 'coupon_bar',
  'countdown_collector',
  'button_bar', 'button_modal',
  'video',
  'image',
  'cookie_notification',
  'custom_html',
  'contact_us',
  'social_share',
  'engagement_links',
  'request_collector',
  'audio',
  'whatsapp_chat',
];

const notificationSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  name: { type: String, required: true, trim: true, maxlength: 128 },

  // --- Core display settings ---
  settings: {
    // Content
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    url: { type: String, default: '' },
    imageUrl: { type: String, default: null },

    // Position
    position: {
      type: String,
      enum: ['bottom_left', 'bottom_right', 'top_left', 'top_right', 'top_center', 'bottom_center'],
      default: 'bottom_left',
    },

    // Display timing
    displayAfterSeconds: { type: Number, default: 3 },
    displayDurationSeconds: { type: Number, default: 8 },
    displayIntervalSeconds: { type: Number, default: 5 },
    displayOnMobile: { type: Boolean, default: true },

    // Animation
    animationIn: { type: String, default: 'fadeInUp' },
    animationOut: { type: String, default: 'fadeOutDown' },

    // Styling
    backgroundColor: { type: String, default: '#ffffff' },
    textColor: { type: String, default: '#000000' },
    borderRadius: { type: Number, default: 8 },
    fontSize: { type: Number, default: 14 },

    // CTA / button
    ctaText: { type: String, default: '' },
    ctaUrl: { type: String, default: '' },
    ctaColor: { type: String, default: '#6366f1' },

    // Data-driven (conversions, live_counter, reviews, etc.)
    dataSource: { type: String, enum: ['manual', 'api', 'pixel'], default: 'manual' },
    manualData: [mongoose.Schema.Types.Mixed],

    // Countdown
    countdownEndAt: { type: Date, default: null },

    // Coupon
    couponCode: { type: String, default: '' },
    couponExpiresAt: { type: Date, default: null },

    // Social share platforms
    socialNetworks: [String],

    // Custom HTML
    customHtml: { type: String, default: '' },

    // WhatsApp
    whatsappNumber: { type: String, default: '' },
    whatsappMessage: { type: String, default: '' },

    // Audio
    audioUrl: { type: String, default: '' },

    // Collector fields
    collectEmail: { type: Boolean, default: true },
    collectName: { type: Boolean, default: false },
    collectPhone: { type: Boolean, default: false },
    webhookUrl: { type: String, default: '' },

    // Show after N seconds on page
    triggerOnScroll: { type: Boolean, default: false },
    triggerScrollPercent: { type: Number, default: 50 },

    // Geo / device targeting
    targetCountries: [String],
    targetDevices: { type: String, enum: ['all', 'desktop', 'mobile', 'tablet'], default: 'all' },

    // Frequency
    showOnce: { type: Boolean, default: false },
    showOncePerSession: { type: Boolean, default: false },
  },

  // Notification handler (webhook, email forward etc.)
  notificationHandler: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationHandler', default: null },

  isEnabled: { type: Boolean, default: true },

  // Stats
  stats: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
  },
}, { timestamps: true });

notificationSchema.index({ campaign: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
