const mongoose = require('mongoose');

const PublishCampaignSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  accounts:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'BPSocialAccount' }],
  posts:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'BPPost' }],
  schedule:    { type: String, default: '' }, // cron expression or human readable string
  active:      { type: Boolean, default: true },
}, { timestamps: true });

PublishCampaignSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.models.PublishCampaign || mongoose.model('PublishCampaign', PublishCampaignSchema);
