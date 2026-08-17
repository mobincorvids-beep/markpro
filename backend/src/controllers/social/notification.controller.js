const Notification = require('../../models/Notification.model');
const Campaign = require('../../models/Campaign.model');
const { NotificationLog } = require('../../models/secondary.models');

exports.list = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOne({ _id: campaignId, user: req.user._id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    const notifications = await Notification.find({ campaign: campaignId, user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch notifications' }); }
};

exports.create = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOne({ _id: campaignId, user: req.user._id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    // Check plan limit
    const plan = req.user.plan;
    const limit = plan?.limits?.notifications ?? 5;
    if (limit !== -1) {
      const count = await Notification.countDocuments({ user: req.user._id });
      if (count >= limit)
        return res.status(403).json({ success: false, message: `Notification limit reached (${limit}). Upgrade to add more.` });
    }

    // Check notification type is allowed on plan
    const proTypes = ['reviews', 'score_feedback', 'text_feedback', 'emoji_feedback', 'countdown_collector',
      'collector_two_modal', 'request_collector', 'audio', 'whatsapp_chat', 'engagement_links'];
    if (proTypes.includes(req.body.type) && !plan?.features?.allNotificationTypes)
      return res.status(403).json({ success: false, message: 'This notification type requires a Pro plan.' });

    const notification = await Notification.create({
      campaign: campaignId,
      user: req.user._id,
      ...req.body,
    });
    await req.user.updateOne({ $inc: { 'usage.notifications': 1 } });
    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create notification' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const n = await Notification.findOne({ _id: req.params.notifId, user: req.user._id });
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: n });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch notification' }); }
};

exports.update = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.notifId, user: req.user._id },
      { $set: req.body }, { new: true, runValidators: true }
    );
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: n });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    const n = await Notification.findOneAndDelete({ _id: req.params.notifId, user: req.user._id });
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    await NotificationLog.deleteMany({ notification: n._id });
    await req.user.updateOne({ $inc: { 'usage.notifications': -1 } });
    res.json({ success: true, message: 'Notification deleted' });
  } catch { res.status(500).json({ success: false, message: 'Failed to delete notification' }); }
};

exports.toggleStatus = async (req, res) => {
  try {
    const n = await Notification.findOne({ _id: req.params.notifId, user: req.user._id });
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    n.isEnabled = !n.isEnabled;
    await n.save();
    res.json({ success: true, data: { isEnabled: n.isEnabled } });
  } catch { res.status(500).json({ success: false, message: 'Failed to toggle' }); }
};

exports.getStatistics = async (req, res) => {
  try {
    const n = await Notification.findOne({ _id: req.params.notifId, user: req.user._id });
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    const { startDate, endDate } = req.query;
    const match = { notification: n._id };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }
    const [byDay, byCountry, byDevice, byType] = await Promise.all([
      NotificationLog.aggregate([
        { $match: match },
        { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, type: '$type' }, count: { $sum: 1 } } },
        { $sort: { '_id.date': 1 } },
      ]),
      NotificationLog.aggregate([{ $match: match }, { $group: { _id: '$country', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
      NotificationLog.aggregate([{ $match: match }, { $group: { _id: '$device', count: { $sum: 1 } } }]),
      NotificationLog.aggregate([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    ]);
    res.json({ success: true, data: { stats: n.stats, byDay, byCountry, byDevice, byType } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
