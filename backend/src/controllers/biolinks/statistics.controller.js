const mongoose = require('mongoose');
const { TrackLink, Link, BiolinkBlock } = require('../../models/BioLinks.models');

const toObjId = (id) => new mongoose.Types.ObjectId(String(id));

// ── Dashboard analytics summary ───────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const uid = toObjId(req.user._id);
    const [totalLinks, totalBiolinks, totalClicks] = await Promise.all([
      Link.countDocuments({ user_id: uid, type: 'link' }),
      Link.countDocuments({ user_id: uid, type: 'biolink' }),
      TrackLink.countDocuments({ user_id: uid }),
    ]);
    res.json({ status: 'success', data: { totalLinks, totalBiolinks, totalClicks } });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Link statistics ────────────────────────────────────────────────────────
exports.getLinkStats = async (req, res) => {
  try {
    const { id }          = req.params;
    const { start_date, end_date, group_by = 'day' } = req.query;

    const link = await Link.findOne({ _id: id, user_id: req.user._id });
    if (!link) return res.json({ status: 'error', message: 'Link not found.' });

    const matchQuery = { link_id: toObjId(id) };
    if (start_date || end_date) {
      matchQuery.createdAt = {};
      if (start_date) matchQuery.createdAt.$gte = new Date(start_date);
      if (end_date)   matchQuery.createdAt.$lte = new Date(end_date + 'T23:59:59');
    }

    const dateFormat = group_by === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const [clicksByDate, byCountry, byOs, byBrowser, byDevice, byReferrer, total] = await Promise.all([
      TrackLink.aggregate([
        { $match: matchQuery },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, clicks: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      TrackLink.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$country_code', clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } }, { $limit: 10 },
      ]),
      TrackLink.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$os_name', clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } }, { $limit: 10 },
      ]),
      TrackLink.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$browser_name', clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } }, { $limit: 10 },
      ]),
      TrackLink.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$device_type', clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } },
      ]),
      TrackLink.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$referrer_host', clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } }, { $limit: 10 },
      ]),
      TrackLink.countDocuments(matchQuery),
    ]);

    res.json({
      status: 'success',
      data: { link, total, clicksByDate, byCountry, byOs, byBrowser, byDevice, byReferrer },
    });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Biolink block statistics ──────────────────────────────────────────────
exports.getBlockStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    const block = await BiolinkBlock.findOne({ _id: id, user_id: req.user._id });
    if (!block) return res.json({ status: 'error', message: 'Block not found.' });

    const matchQuery = { biolink_block_id: toObjId(id) };
    if (start_date || end_date) {
      matchQuery.createdAt = {};
      if (start_date) matchQuery.createdAt.$gte = new Date(start_date);
      if (end_date)   matchQuery.createdAt.$lte = new Date(end_date + 'T23:59:59');
    }

    const [total, byDay] = await Promise.all([
      TrackLink.countDocuments(matchQuery),
      TrackLink.aggregate([
        { $match: matchQuery },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, clicks: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({ status: 'success', data: { block, total, byDay } });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Admin statistics ──────────────────────────────────────────────────────
exports.getAdminStats = async (req, res) => {
  try {
    const { User, Payment } = require('../../models/BioLinks.models');
    const [users, links, payments, revenue] = await Promise.all([
      User.countDocuments({ is_admin: false }),
      Link.countDocuments(),
      Payment.countDocuments({ status: 'paid' }),
      Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    const recentUsers = await User.find({ is_admin: false })
      .sort({ createdAt: -1 }).limit(5)
      .select('name email createdAt plan_type status');

    const clicksByDay = await TrackLink.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, clicks: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      status: 'success',
      data: {
        users, links, payments,
        revenue: revenue[0]?.total || 0,
        recentUsers, clicksByDay,
      },
    });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};
