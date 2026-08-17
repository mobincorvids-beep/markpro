const Notification = require('../../models/DocNotification.model');

const ok  = (res, data)       => res.json({ success: true, ...data });
const err = (res, msg, s=400) => res.status(s).json({ success: false, message: msg });

// GET /api/notifications
exports.list = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    ok(res, { notifications, unreadCount });
  } catch (e) { err(res, e.message, 500); }
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
    ok(res, {});
  } catch (e) { err(res, e.message, 500); }
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    ok(res, {});
  } catch (e) { err(res, e.message, 500); }
};

// DELETE /api/notifications/:id
exports.remove = async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
    ok(res, {});
  } catch (e) { err(res, e.message, 500); }
};
