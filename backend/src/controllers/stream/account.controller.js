const SocialAccount = require('../../models/SocialAccount.model');
const Post = require('../../models/Post.model');
const { fetchPostsForAccount, clearCacheForAccount } = require('./socialFetcher');

// GET /api/accounts
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await SocialAccount.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/accounts
exports.addAccount = async (req, res) => {
  try {
    const { network, label, accountId, accessToken, refreshToken, extra, color } = req.body;
    if (!network || !label || !accountId)
      return res.status(400).json({ success: false, message: 'network, label and accountId are required' });

    const account = await SocialAccount.create({
      user: req.user._id,
      network,
      label,
      accountId,
      accessToken: accessToken || '',
      refreshToken: refreshToken || '',
      extra: extra || {},
      color: color || '',
    });

    res.status(201).json({ success: true, account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/accounts/:id
exports.updateAccount = async (req, res) => {
  try {
    const account = await SocialAccount.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    const { label, accountId, accessToken, refreshToken, extra, color, isActive } = req.body;
    if (label !== undefined) account.label = label;
    if (accountId !== undefined) account.accountId = accountId;
    if (accessToken !== undefined) account.accessToken = accessToken;
    if (refreshToken !== undefined) account.refreshToken = refreshToken;
    if (extra !== undefined) account.extra = extra;
    if (color !== undefined) account.color = color;
    if (isActive !== undefined) account.isActive = isActive;

    clearCacheForAccount(account);
    await account.save();
    res.json({ success: true, account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/accounts/:id
exports.deleteAccount = async (req, res) => {
  try {
    const account = await SocialAccount.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    await Post.deleteMany({ account: account._id });
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/accounts/:id/fetch  - manually refresh posts for one account
exports.fetchAccount = async (req, res) => {
  try {
    const account = await SocialAccount.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    clearCacheForAccount(account);
    const posts = await fetchPostsForAccount(account);

    // Upsert into Post collection
    let saved = 0;
    for (const p of posts) {
      try {
        await Post.findOneAndUpdate(
          { postId: p.postId, network: p.network },
          { ...p, account: account._id, user: req.user._id },
          { upsert: true, new: true }
        );
        saved++;
      } catch (_) {}
    }

    account.lastFetched = new Date();
    await account.save();

    res.json({ success: true, fetched: posts.length, saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
