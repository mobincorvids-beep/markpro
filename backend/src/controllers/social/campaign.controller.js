const Campaign = require('../../models/Campaign.model');
const Notification = require('../../models/Notification.model');
const { NotificationLog } = require('../../models/secondary.models');
const logger = require('../../utils/logger');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = { user: req.user._id };
    if (search) filter.name = { $regex: search, $options: 'i' };
    const total = await Campaign.countDocuments(filter);
    const campaigns = await Campaign.find(filter)
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, data: { campaigns, pagination: { total, page: +page, pages: Math.ceil(total / limit) } } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch campaigns' }); }
};

exports.create = async (req, res) => {
  try {
    // Check plan limit
    const plan = req.user.plan;
    const limit = plan?.limits?.campaigns ?? 1;
    if (limit !== -1) {
      const count = await Campaign.countDocuments({ user: req.user._id });
      if (count >= limit)
        return res.status(403).json({ success: false, message: `Campaign limit reached (${limit}). Please upgrade.` });
    }
    const campaign = await Campaign.create({ user: req.user._id, ...req.body });
    await req.user.updateOne({ $inc: { 'usage.campaigns': 1 } });
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    logger.error('Create campaign:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create campaign' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, user: req.user._id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data: campaign });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch campaign' }); }
};

exports.update = async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, req.body, { new: true, runValidators: true }
    );
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    // Cascade delete notifications and logs
    await Notification.deleteMany({ campaign: campaign._id });
    await NotificationLog.deleteMany({ campaign: campaign._id });
    await req.user.updateOne({ $inc: { 'usage.campaigns': -1 } });
    res.json({ success: true, message: 'Campaign deleted' });
  } catch { res.status(500).json({ success: false, message: 'Failed to delete campaign' }); }
};

exports.toggleStatus = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, user: req.user._id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    campaign.isEnabled = !campaign.isEnabled;
    await campaign.save();
    res.json({ success: true, data: { isEnabled: campaign.isEnabled } });
  } catch { res.status(500).json({ success: false, message: 'Failed to toggle campaign' }); }
};

exports.getStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const campaign = await Campaign.findOne({ _id: id, user: req.user._id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = { campaign: campaign._id };
    if (Object.keys(dateFilter).length) matchStage.date = dateFilter;

    const groupFormat = groupBy === 'hour' ? '%Y-%m-%dT%H:00' : groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const [byDay, byType, notifications] = await Promise.all([
      NotificationLog.aggregate([
        { $match: matchStage },
        { $group: { _id: { date: { $dateToString: { format: groupFormat, date: '$date' } }, type: '$type' }, count: { $sum: 1 } } },
        { $sort: { '_id.date': 1 } },
      ]),
      NotificationLog.aggregate([
        { $match: matchStage },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Notification.find({ campaign: campaign._id }).select('name type stats'),
    ]);

    res.json({ success: true, data: { campaign: { stats: campaign.stats }, byDay, byType, notifications } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Returns the embed script snippet
exports.getPixelCode = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, user: req.user._id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    const scriptUrl = `${process.env.APP_URL || 'http://localhost:5000'}/pixel.js?key=${campaign.pixelKey}`;
    const snippet = `<!-- Social Proof Widget -->\n<script async src="${scriptUrl}"></script>`;
    res.json({ success: true, data: { pixelKey: campaign.pixelKey, snippet, scriptUrl } });
  } catch { res.status(500).json({ success: false, message: 'Failed to get pixel code' }); }
};
