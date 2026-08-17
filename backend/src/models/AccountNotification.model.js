/**
 * Workspace-level notification shown in the top-right bell menu.
 *
 * Deliberately separate from Notification.model.js (that one is the Social
 * Proof widget engine) and from DocNotification (document vault only).
 */
const mongoose = require('mongoose');

const accountNotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, default: '', trim: true, maxlength: 1000 },
    type: {
      type: String,
      enum: ['system', 'billing', 'order', 'campaign', 'security', 'info'],
      default: 'info',
    },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

accountNotificationSchema.index({ user: 1, createdAt: -1 });

/** Helper used by other modules to push a notification to a user. */
accountNotificationSchema.statics.push = function push(userId, payload = {}) {
  if (!userId) return Promise.resolve(null);
  return this.create({ user: userId, ...payload });
};

module.exports = mongoose.model('AccountNotification', accountNotificationSchema);
