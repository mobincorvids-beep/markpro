const Post   = require('../../models/Post.model');
const Stream = require('../../models/Stream.model');

/**
 * GET /api/feed/public/:embedCode
 * Returns posts for an embedded public stream - no auth needed.
 */
exports.getPublicFeed = async (req, res) => {
  try {
    const stream = await Stream.findOne({
      embedCode: req.params.embedCode,
      isPublic: true,
    }).populate('accounts', '_id');

    if (!stream) {
      return res.status(404).json({ success: false, message: 'Stream not found or not public' });
    }

    const accountIds = (stream.accounts || []).map((a) => a._id);
    const limit = Math.min(parseInt(req.query.limit) || 40, 100);
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const skip  = (page - 1) * limit;

    const filter = { account: { $in: accountIds } };
    if (stream.networks?.length) filter.network = { $in: stream.networks };

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('account', 'label color network'),
      Post.countDocuments(filter),
    ]);

    res.json({
      success: true,
      posts,
      stream: {
        name: stream.name,
        layout: stream.layout,
        theme: stream.theme,
        showFilter: stream.showFilter,
        showSearch: stream.showSearch,
        showSharing: stream.showSharing,
      },
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
