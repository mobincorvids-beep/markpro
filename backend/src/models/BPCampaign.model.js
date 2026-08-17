const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  accounts:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'BPSocialAccount' }],

  // Autopilot settings
  topic:        { type: String, default: '' },
  tone:         { type: String, default: 'professional' },
  templateKey:  { type: String, default: '' },
  includeEmoji: { type: Boolean, default: true },
  includeHashtags: { type: Boolean, default: true },

  // Recurring schedule
  frequency:    { type: String, enum: ['daily', 'weekly', 'custom'], default: 'daily' },
  scheduleTimes: [{ type: String }], // e.g. ["09:00", "15:00"]
  timezone:     { type: String, default: 'UTC' },
  startDate:    { type: Date },
  endDate:      { type: Date, default: null },

  status:       { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  postsCreated: { type: Number, default: 0 },
  nextRunAt:    { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.models.BPCampaign || mongoose.model('BPCampaign', CampaignSchema);
