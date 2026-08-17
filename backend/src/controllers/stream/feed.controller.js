const Post = require('../../models/Post.model');
const SocialAccount = require('../../models/SocialAccount.model');
const { fetchPostsForAccount } = require('./socialFetcher');

// GET /api/feed  - aggregated & filtered feed
exports.getFeed = async (req, res) => {
  try {
    const {
      networks,    // comma-separated: twitter,facebook
      q,           // search query
      page = 1,
      limit = 20,
      sort = 'newest', // newest | oldest | popular
    } = req.query;

    const filter = { user: req.user._id };

    if (networks) {
      filter.network = { $in: networks.split(',') };
    }
    if (q) {
      filter.$or = [
        { text: { $regex: q, $options: 'i' } },
        { authorName: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ];
    }

    const sortMap = {
      newest:  { publishedAt: -1 },
      oldest:  { publishedAt: 1 },
      popular: { likes: -1 },
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort(sortMap[sort] || sortMap.newest)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('account', 'label color network'),
      Post.countDocuments(filter),
    ]);

    res.json({
      success: true,
      posts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/feed/refresh  - re-fetch all active accounts and save posts
exports.refreshFeed = async (req, res) => {
  try {
    const accounts = await SocialAccount.find({ user: req.user._id, isActive: true });
    let totalFetched = 0;
    let totalSaved = 0;

    for (const account of accounts) {
      try {
        const posts = await fetchPostsForAccount(account);
        totalFetched += posts.length;
        for (const p of posts) {
          try {
            await Post.findOneAndUpdate(
              { postId: p.postId, network: p.network },
              { ...p, account: account._id, user: req.user._id },
              { upsert: true, new: true }
            );
            totalSaved++;
          } catch (_) {}
        }
        account.lastFetched = new Date();
        await account.save();
      } catch (err) {
        console.error(`Error refreshing ${account.network}: ${err.message}`);
      }
    }

    res.json({ success: true, fetched: totalFetched, saved: totalSaved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/feed/stats
exports.getFeedStats = async (req, res) => {
  try {
    const stats = await Post.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$network',
          count: { $sum: 1 },
          totalLikes: { $sum: '$likes' },
          totalComments: { $sum: '$comments' },
        },
      },
    ]);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
