const {
  SPTeam, SPTeamMember, SPAccount, SPCampaign, SPLabel,
  SPPost, SPRssFeed, SPAiTemplate, SPAiCampaign, SPMedia,
  SPSupportTicket, SPSupportReply, SPAffiliateWithdrawal,
  SPBlogCategory, SPBlogPost,
} = require('../../models/StackPosts.models');
const User   = require('../../models/User.model');
const gemini = require('../../services/gemini.service');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

async function getTeam(userId, teamId) {
  const member = await SPTeamMember.findOne({ userId, teamId, status: 1 });
  if (!member) return null;
  return SPTeam.findById(teamId);
}

// ── Teams ─────────────────────────────────────────────────────────────────
exports.getMyTeams = async (req, res) => {
  try {
    const memberships = await SPTeamMember.find({ userId: req.user._id, status: 1 }).populate('teamId');
    const teams = memberships.map(m => ({ ...m.teamId.toObject(), role: m.role }));
    // Also include teams owned
    const owned = await SPTeam.find({ owner: req.user._id });
    const allTeamIds = new Set(teams.map(t => t._id.toString()));
    for (const t of owned) if (!allTeamIds.has(t._id.toString())) teams.push({ ...t.toObject(), role: 'admin' });
    res.json({ success: true, teams });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createTeam = async (req, res) => {
  try {
    const team = await SPTeam.create({ ...req.body, owner: req.user._id });
    await SPTeamMember.create({ userId: req.user._id, teamId: team._id, role: 'admin', pending: false });
    res.status(201).json({ success: true, team });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const members = await SPTeamMember.find({ teamId: req.params.teamId }).populate('userId', 'name email avatar');
    res.json({ success: true, members });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.inviteTeamMember = async (req, res) => {
  try {
    const { email, role = 'editor' } = req.body;
    const token = crypto.randomBytes(20).toString('hex');
    const invitee = await User.findOne({ email });
    if (invitee) {
      await SPTeamMember.create({ userId: invitee._id, teamId: req.params.teamId, role, inviteToken: token, inviteEmail: email, pending: true });
    }
    res.json({ success: true, message: `Invitation sent to ${email}`, inviteToken: token });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.removeTeamMember = async (req, res) => {
  try {
    await SPTeamMember.findByIdAndDelete(req.params.memberId);
    res.json({ success: true, message: 'Member removed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Social Accounts ───────────────────────────────────────────────────────
exports.getAccounts = async (req, res) => {
  try {
    const { teamId } = req.params;
    const accounts = await SPAccount.find({ teamId }).sort({ name: 1 });
    res.json({ success: true, accounts });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.connectAccount = async (req, res) => {
  try {
    const { teamId } = req.params;
    const account = await SPAccount.create({ ...req.body, teamId });
    res.status(201).json({ success: true, account });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.disconnectAccount = async (req, res) => {
  try {
    await SPAccount.findByIdAndDelete(req.params.accountId);
    res.json({ success: true, message: 'Account disconnected' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.reconnectAccount = async (req, res) => {
  try {
    const account = await SPAccount.findByIdAndUpdate(req.params.accountId, { ...req.body, status: 1 }, { new: true });
    res.json({ success: true, account });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Posts ─────────────────────────────────────────────────────────────────
exports.getPosts = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { page = 1, limit = 20, status, accountId, campaignId, from, to } = req.query;
    const q = { teamId };
    if (status)     q.status     = +status;
    if (accountId)  q.accounts   = accountId;
    if (campaignId) q.campaign   = campaignId;
    if (from || to) q.timePost   = {};
    if (from)       q.timePost.$gte = new Date(from);
    if (to)         q.timePost.$lte = new Date(to);
    const [posts, total] = await Promise.all([
      SPPost.find(q).sort({ timePost: -1 }).skip((page-1)*limit).limit(+limit)
        .populate('accounts','name avatar network').populate('campaign','name color').populate('labels','name color'),
      SPPost.countDocuments(q),
    ]);
    res.json({ success: true, posts, total, page:+page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createPost = async (req, res) => {
  try {
    const { teamId } = req.params;
    const post = await SPPost.create({ ...req.body, teamId, userId: req.user._id });
    res.status(201).json({ success: true, post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updatePost = async (req, res) => {
  try {
    const post = await SPPost.findOneAndUpdate(
      { _id: req.params.postId, teamId: req.params.teamId, status: { $in: [0, 3] } },
      req.body, { new: true }
    );
    if (!post) return res.status(404).json({ success: false, message: 'Post not found or already published' });
    res.json({ success: true, post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deletePost = async (req, res) => {
  try {
    await SPPost.findOneAndDelete({ _id: req.params.postId, teamId: req.params.teamId });
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.duplicatePost = async (req, res) => {
  try {
    const original = await SPPost.findOne({ _id: req.params.postId, teamId: req.params.teamId });
    if (!original) return res.status(404).json({ success: false, message: 'Post not found' });
    const { _id, createdAt, updatedAt, result, ...data } = original.toObject();
    const copy = await SPPost.create({
      ...data,
      status: 3, // draft
      isDraft: true,
      timePost: new Date(Date.now() + 86400000), // default +1 day
      result: {},
    });
    res.status(201).json({ success: true, post: copy });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── AI Writer ─────────────────────────────────────────────────────────────
exports.generateAiContent = async (req, res) => {
  try {
    const { prompt, network, variations = 1, tone = 'engaging' } = req.body;
    if (!gemini.isConfigured())
      return res.status(503).json({ success: false, message: 'GEMINI_API_KEY not configured' });

    const networkGuide = {
      twitter:   'Max 280 characters. Punchy and conversational.',
      linkedin:  'Professional tone. 1-3 short paragraphs. Include relevant hashtags.',
      instagram: 'Engaging caption. Add 5-10 hashtags at end.',
      facebook:  'Conversational. 1-2 paragraphs. Emojis welcome.',
      tiktok:    'Short, trend-aware, youthful. Include hashtags.',
      pinterest: 'Descriptive, keyword-rich for SEO.',
    };

    const networkHint = networkGuide[network] || 'Write an engaging social media post.';
    const results = [];

    for (let i = 0; i < Math.min(+variations, 5); i++) {
      const text = await gemini.chat({
        messages: [{ role: 'user', content: prompt }],
        system: `You are a social media copywriter. ${networkHint} Tone: ${tone}.`,
        maxTokens: 500,
        temperature: 0.8,
      });
      results.push(text.trim());
    }

    res.json({ success: true, variations: results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.generateHashtags = async (req, res) => {
  try {
    const { topic, count = 10 } = req.body;
    const text = await gemini.chat({
      messages: [{ role: 'user', content: `Generate ${count} relevant hashtags for the topic: "${topic}". Return only hashtags, one per line, starting with #` }],
      maxTokens: 200,
    });
    const hashtags = text.trim().split('\n').filter(h => h.startsWith('#'));
    res.json({ success: true, hashtags });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── RSS Feeds ─────────────────────────────────────────────────────────────
exports.getFeeds = async (req, res) => {
  try {
    const feeds = await SPRssFeed.find({ teamId: req.params.teamId }).populate('accounts','name avatar network');
    res.json({ success: true, feeds });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createFeed = async (req, res) => {
  try {
    const feed = await SPRssFeed.create({ ...req.body, teamId: req.params.teamId });
    res.status(201).json({ success: true, feed });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateFeed = async (req, res) => {
  try {
    const feed = await SPRssFeed.findOneAndUpdate({ _id: req.params.feedId, teamId: req.params.teamId }, req.body, { new: true });
    res.json({ success: true, feed });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteFeed = async (req, res) => {
  try {
    await SPRssFeed.findOneAndDelete({ _id: req.params.feedId, teamId: req.params.teamId });
    res.json({ success: true, message: 'Feed deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Campaigns & Labels ────────────────────────────────────────────────────
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await SPCampaign.find({ teamId: req.params.teamId }).sort({ name: 1 });
    res.json({ success: true, campaigns });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createCampaign = async (req, res) => {
  try {
    const c = await SPCampaign.create({ ...req.body, teamId: req.params.teamId });
    res.status(201).json({ success: true, campaign: c });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteCampaign = async (req, res) => {
  try {
    await SPCampaign.findOneAndDelete({ _id: req.params.campaignId, teamId: req.params.teamId });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getLabels = async (req, res) => {
  try {
    const labels = await SPLabel.find({ teamId: req.params.teamId }).sort({ name: 1 });
    res.json({ success: true, labels });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createLabel = async (req, res) => {
  try {
    const l = await SPLabel.create({ ...req.body, teamId: req.params.teamId });
    res.status(201).json({ success: true, label: l });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Media ─────────────────────────────────────────────────────────────────
exports.getMedia = async (req, res) => {
  try {
    const { page = 1, limit = 24 } = req.query;
    const q = { teamId: req.params.teamId };
    const [media, total] = await Promise.all([
      SPMedia.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
      SPMedia.countDocuments(q),
    ]);
    res.json({ success: true, media, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.files?.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const file = req.files.file;
    const dir  = process.env.VERCEL ? path.join('/tmp', 'sp-media') : path.join(__dirname, '../../../uploads/sp-media');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const fname = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.name)}`;
    await file.mv(path.join(dir, fname));
    const type = file.mimetype.startsWith('video') ? 'video' : file.mimetype === 'image/gif' ? 'gif' : 'image';
    const media = await SPMedia.create({
      teamId: req.params.teamId,
      userId: req.user._id,
      filename: fname,
      url: `/uploads/sp-media/${fname}`,
      mimeType: file.mimetype,
      size: file.size,
      type,
    });
    res.status(201).json({ success: true, media });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Analytics ─────────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { from, to } = req.query;
    const q = { teamId };
    if (from || to) q.date = {};
    if (from) q.date.$gte = new Date(from);
    if (to)   q.date.$lte = new Date(to);
    const [scheduled, published, failed, totalPosts] = await Promise.all([
      SPPost.countDocuments({ teamId, status: 0 }),
      SPPost.countDocuments({ teamId, status: 1 }),
      SPPost.countDocuments({ teamId, status: 2 }),
      SPPost.countDocuments({ teamId }),
    ]);
    const accounts = await SPAccount.find({ teamId, status: 1 });
    res.json({ success: true, stats: { scheduled, published, failed, totalPosts, connectedAccounts: accounts.length } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Support ───────────────────────────────────────────────────────────────
exports.getTickets = async (req, res) => {
  try {
    const { status } = req.query;
    const q = { userId: req.user._id };
    if (status) q.status = status;
    const tickets = await SPSupportTicket.find(q).sort({ createdAt: -1 });
    res.json({ success: true, tickets });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createTicket = async (req, res) => {
  try {
    const ticket = await SPSupportTicket.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, ticket });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getTicket = async (req, res) => {
  try {
    const ticket  = await SPSupportTicket.findOne({ _id: req.params.id, userId: req.user._id });
    const replies = await SPSupportReply.find({ ticketId: req.params.id }).populate('userId','name avatar role');
    res.json({ success: true, ticket, replies });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.replyTicket = async (req, res) => {
  try {
    const reply = await SPSupportReply.create({ ticketId: req.params.id, userId: req.user._id, isAdmin: req.user.role === 'admin', message: req.body.message });
    await SPSupportTicket.findByIdAndUpdate(req.params.id, { status: req.user.role === 'admin' ? 'answered' : 'pending' });
    res.status(201).json({ success: true, reply });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.closeTicket = async (req, res) => {
  try {
    await SPSupportTicket.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { status: 'closed' });
    res.json({ success: true, message: 'Ticket closed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Affiliate ─────────────────────────────────────────────────────────────
exports.getAffiliateStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const withdrawals = await SPAffiliateWithdrawal.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const referrals   = await User.countDocuments({ referredBy: req.user._id });
    res.json({ success: true, earnings: user.affiliateEarnings || 0, referrals, code: user.affiliateCode, withdrawals });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, method, account } = req.body;
    const user = await User.findById(req.user._id);
    if ((user.affiliateEarnings || 0) < amount)
      return res.status(400).json({ success: false, message: 'Insufficient affiliate earnings' });
    const w = await SPAffiliateWithdrawal.create({ userId: req.user._id, amount, method, account });
    await User.findByIdAndUpdate(req.user._id, { $inc: { affiliateEarnings: -amount } });
    res.status(201).json({ success: true, withdrawal: w });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Blog ──────────────────────────────────────────────────────────────────
exports.getBlogPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const q = {};
    if (status) q.status = status; else q.status = 'published';
    const [posts, total] = await Promise.all([
      SPBlogPost.find(q).sort({ publishedAt: -1 }).skip((page-1)*limit).limit(+limit)
        .populate('authorId','name avatar').populate('category','name slug').select('-content'),
      SPBlogPost.countDocuments(q),
    ]);
    res.json({ success: true, posts, total, page:+page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getBlogPost = async (req, res) => {
  try {
    const post = await SPBlogPost.findOne({ slug: req.params.slug, status: 'published' })
      .populate('authorId','name avatar').populate('category','name slug');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getBlogCategories = async (req, res) => {
  try {
    const categories = await SPBlogCategory.find().sort({ name: 1 });
    res.json({ success: true, categories });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Admin ─────────────────────────────────────────────────────────────────
exports.adminStats = async (req, res) => {
  try {
    const [users, teams, posts, tickets] = await Promise.all([
      User.countDocuments(),
      SPTeam.countDocuments(),
      SPPost.countDocuments(),
      SPSupportTicket.countDocuments({ status: 'open' }),
    ]);
    res.json({ success: true, stats: { users, teams, posts, openTickets: tickets } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminGetTickets = async (req, res) => {
  try {
    const tickets = await SPSupportTicket.find().populate('userId','name email').sort({ createdAt: -1 });
    res.json({ success: true, tickets });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminReplyTicket = async (req, res) => {
  try {
    const reply = await SPSupportReply.create({ ticketId: req.params.id, userId: req.user._id, isAdmin: true, message: req.body.message });
    await SPSupportTicket.findByIdAndUpdate(req.params.id, { status: 'answered' });
    res.status(201).json({ success: true, reply });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminGetWithdrawals = async (req, res) => {
  try {
    const list = await SPAffiliateWithdrawal.find().populate('userId','name email').sort({ createdAt: -1 });
    res.json({ success: true, withdrawals: list });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminUpdateWithdrawal = async (req, res) => {
  try {
    const w = await SPAffiliateWithdrawal.findByIdAndUpdate(req.params.id, { status: req.body.status, note: req.body.note }, { new: true });
    if (req.body.status === 'rejected') {
      // Refund if rejected
      await User.findByIdAndUpdate(w.userId, { $inc: { affiliateEarnings: w.amount } });
    }
    res.json({ success: true, withdrawal: w });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminBlogCreate = async (req, res) => {
  try {
    const slug = req.body.slug || req.body.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const post = await SPBlogPost.create({ ...req.body, slug, authorId: req.user._id, publishedAt: req.body.status === 'published' ? new Date() : null });
    res.status(201).json({ success: true, post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminBlogUpdate = async (req, res) => {
  try {
    const post = await SPBlogPost.findByIdAndUpdate(req.params.id, { ...req.body, publishedAt: req.body.status === 'published' ? new Date() : null }, { new: true });
    res.json({ success: true, post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminBlogDelete = async (req, res) => {
  try {
    await SPBlogPost.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminAiTemplates = async (req, res) => {
  try {
    const { SPAiTemplate } = require('../../models/StackPosts.models');
    const templates = await SPAiTemplate.find().sort({ name: 1 });
    res.json({ success: true, templates });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminCreateAiTemplate = async (req, res) => {
  try {
    const { SPAiTemplate } = require('../../models/StackPosts.models');
    const t = await SPAiTemplate.create(req.body);
    res.status(201).json({ success: true, template: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
