// ════════════════════════════════════════════════════
//  SOCIALVIBE CONTROLLER
// ════════════════════════════════════════════════════
const { SVPlan, SVSocialAccount, SVPost, SVPostTemplate, SVTeam, SVBotReply, SVTicket, SVPayment } = require('../../models/SocialVibe.models');
const User   = require('../../models/User.model');
const gemini = require('../../services/gemini.service');

// Plans
exports.svGetPlans = async (req, res) => {
  try { res.json({ success: true, plans: await SVPlan.find({ isActive: true }).sort({ price: 1 }) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Social Accounts
exports.svGetAccounts = async (req, res) => {
  try { res.json({ success: true, accounts: await SVSocialAccount.find({ user: req.user._id, isActive: true }) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svConnectAccount = async (req, res) => {
  try {
    const acct = await SVSocialAccount.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, account: acct });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svDisconnectAccount = async (req, res) => {
  try {
    await SVSocialAccount.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isActive: false });
    res.json({ success: true, message: 'Disconnected' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Posts
exports.svGetPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, from, to } = req.query;
    const q = { user: req.user._id };
    if (status) q.status = status;
    if (from || to) { q.scheduledAt = {}; if (from) q.scheduledAt.$gte = new Date(from); if (to) q.scheduledAt.$lte = new Date(to); }
    const [posts, total] = await Promise.all([
      SVPost.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit).populate('accounts.socialAccount','accountName platform avatar'),
      SVPost.countDocuments(q),
    ]);
    res.json({ success: true, posts, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svCreatePost = async (req, res) => {
  try {
    const post = await SVPost.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svUpdatePost = async (req, res) => {
  try {
    const post = await SVPost.findOneAndUpdate({ _id: req.params.id, user: req.user._id, status: { $in: ['draft','scheduled'] } }, req.body, { new: true });
    if (!post) return res.status(404).json({ success: false, message: 'Not found or already published' });
    res.json({ success: true, post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svDeletePost = async (req, res) => {
  try {
    await SVPost.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// AI Writer
exports.svAiGenerate = async (req, res) => {
  try {
    const { prompt, platform, variations = 3, tone = 'engaging' } = req.body;
    const platformGuide = { twitter: 'Max 280 chars.', linkedin: 'Professional, 1-3 paragraphs.', instagram: 'Engaging caption with hashtags.', facebook: 'Conversational.' };
    const results = [];
    for (let i = 0; i < Math.min(+variations, 5); i++) {
      const c = await gemini.chat({
        messages: [{ role: 'user', content: prompt }],
        system: `Social media copywriter. Platform: ${platform}. ${platformGuide[platform] || ''} Tone: ${tone}.`,
        maxTokens: 400, temperature: 0.8,
      });
      results.push(c.trim());
    }
    res.json({ success: true, variations: results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svAiRewrite = async (req, res) => {
  try {
    const { content, tone = 'engaging' } = req.body;
    const c = await gemini.chat({ messages: [{ role: 'user', content: `Rewrite this social media post with a ${tone} tone:\n${content}` }], maxTokens: 400 });
    res.json({ success: true, rewritten: c.trim() });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svAiHashtags = async (req, res) => {
  try {
    const { topic, count = 10 } = req.body;
    const c = await gemini.chat({ messages: [{ role: 'user', content: `Generate ${count} hashtags for: "${topic}". Return only hashtags, one per line, starting with #` }], maxTokens: 200 });
    const hashtags = c.trim().split('\n').filter(h => h.startsWith('#'));
    res.json({ success: true, hashtags });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Post Templates
exports.svGetTemplates = async (req, res) => {
  try { res.json({ success: true, templates: await SVPostTemplate.find({ user: req.user._id, isActive: true }) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svCreateTemplate = async (req, res) => {
  try {
    const t = await SVPostTemplate.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, template: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svDeleteTemplate = async (req, res) => {
  try {
    await SVPostTemplate.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Team
exports.svGetTeam = async (req, res) => {
  try { res.json({ success: true, members: await SVTeam.find({ owner: req.user._id }).populate('member','name email avatar') }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svInviteTeamMember = async (req, res) => {
  try {
    const token = require('crypto').randomBytes(20).toString('hex');
    const m = await SVTeam.create({ owner: req.user._id, ...req.body, inviteToken: token, inviteExpiresAt: new Date(Date.now()+7*86400000) });
    res.status(201).json({ success: true, member: m, inviteToken: token });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svRemoveTeamMember = async (req, res) => {
  try {
    await SVTeam.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    res.json({ success: true, message: 'Member removed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Tickets
exports.svGetTickets = async (req, res) => {
  try { res.json({ success: true, tickets: await SVTicket.find({ user: req.user._id }).sort({ createdAt: -1 }) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svCreateTicket = async (req, res) => {
  try {
    const t = await SVTicket.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, ticket: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svReplyTicket = async (req, res) => {
  try {
    const t = await SVTicket.findOneAndUpdate({ _id: req.params.id, user: req.user._id },
      { $push: { messages: { sender: req.user.role === 'admin' ? 'admin' : 'user', senderName: req.user.name, message: req.body.message } }, status: req.user.role === 'admin' ? 'answered' : 'pending' },
      { new: true }
    );
    res.json({ success: true, ticket: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.svCloseTicket = async (req, res) => {
  try {
    await SVTicket.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { status: 'closed' });
    res.json({ success: true, message: 'Closed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

module.exports.svController = {
  svGetPlans: exports.svGetPlans,
  svGetAccounts: exports.svGetAccounts,
  svConnectAccount: exports.svConnectAccount,
  svDisconnectAccount: exports.svDisconnectAccount,
  svGetPosts: exports.svGetPosts,
  svCreatePost: exports.svCreatePost,
  svUpdatePost: exports.svUpdatePost,
  svDeletePost: exports.svDeletePost,
  svAiGenerate: exports.svAiGenerate,
  svAiRewrite: exports.svAiRewrite,
  svAiHashtags: exports.svAiHashtags,
  svGetTemplates: exports.svGetTemplates,
  svCreateTemplate: exports.svCreateTemplate,
  svDeleteTemplate: exports.svDeleteTemplate,
  svGetTeam: exports.svGetTeam,
  svInviteTeamMember: exports.svInviteTeamMember,
  svRemoveTeamMember: exports.svRemoveTeamMember,
  svGetTickets: exports.svGetTickets,
  svCreateTicket: exports.svCreateTicket,
  svReplyTicket: exports.svReplyTicket,
  svCloseTicket: exports.svCloseTicket,
};
