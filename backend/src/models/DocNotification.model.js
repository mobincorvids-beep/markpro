const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:    { type: String, enum: ['share','comment','reminder','request','version','system'], required: true },
  title:   { type: String, required: true },
  message: { type: String, default: '' },
  link:    { type: String, default: '' },
  read:    { type: Boolean, default: false },
}, { timestamps: true });

NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.models.DocNotification || mongoose.model('DocNotification', NotificationSchema);
