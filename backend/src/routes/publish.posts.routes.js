const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const Post    = require('../models/BPPost.model');
const SocialAccount = require('../models/BPSocialAccount.model');
const { Notification, Webhook } = require('../models/BPOther.model');
const { protect } = require('../middleware/auth.middleware');
const { upload, UPLOAD_DIR } = require('../middleware/bp.upload');
const { publishToAccount, triggerWebhooks } = require('../services/socialPublisher.service');
const PublishCampaign = require('../models/PublishCampaign.model');

const ok  = (res, d)        => res.json({ success: true, ...d });
const err = (res, m, s=400) => res.status(s).json({ success: false, message: m });

// GET /api/posts - list posts (with filters)
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, startDate, endDate } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.scheduledAt = {};
      if (startDate) filter.scheduledAt.$gte = new Date(startDate);
      if (endDate)   filter.scheduledAt.$lte = new Date(endDate);
    }
    const skip = (Number(page)-1)*Number(limit);
    const [posts, total] = await Promise.all([
      Post.find(filter).populate('accounts', 'platform accountName avatar').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Post.countDocuments(filter),
    ]);
    ok(res, { posts, total, page: Number(page), pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/posts/calendar - posts grouped by date for calendar view
router.get('/calendar', protect, async (req, res) => {
  try {
    const { month, year } = req.query;
    const start = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()), 1);
    const end   = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    const posts = await Post.find({
      user: req.user._id,
      $or: [
        { scheduledAt: { $gte: start, $lte: end } },
        { publishedAt:  { $gte: start, $lte: end } },
        { createdAt:    { $gte: start, $lte: end }, status: 'draft' },
      ],
    }).populate('accounts', 'platform accountName avatar').sort({ scheduledAt: 1 });
    ok(res, { posts });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/posts/stats - dashboard analytics
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const [total, scheduled, published, failed, byPlatform, recentPosts] = await Promise.all([
      Post.countDocuments({ user: userId }),
      Post.countDocuments({ user: userId, status: 'scheduled' }),
      Post.countDocuments({ user: userId, status: 'published' }),
      Post.countDocuments({ user: userId, status: 'failed' }),
      Post.aggregate([
        { $match: { user: userId } },
        { $unwind: '$platforms' },
        { $group: { _id: '$platforms', count: { $sum: 1 } } },
      ]),
      Post.find({ user: userId, status: 'published' }).sort({ publishedAt: -1 }).limit(5)
        .populate('accounts', 'platform accountName avatar').select('content platforms publishedAt analytics'),
    ]);
    const totalLikes      = await Post.aggregate([{ $match:{ user:userId } }, { $group:{ _id:null, total:{ $sum:'$analytics.likes' } } }]);
    const totalReach      = await Post.aggregate([{ $match:{ user:userId } }, { $group:{ _id:null, total:{ $sum:'$analytics.reach' } } }]);
    ok(res, { total, scheduled, published, failed, byPlatform, recentPosts, totalLikes: totalLikes[0]?.total||0, totalReach: totalReach[0]?.total||0 });
  } catch (e) { err(res, e.message, 500); }
});

// ── Campaigns ──────────────────────────────────────
// GET /api/publish/posts/campaigns - list
router.get('/campaigns', protect, async (req, res) => {
  try {
    const campaigns = await PublishCampaign.find({ user: req.user._id }).sort({ createdAt: -1 });
    ok(res, { campaigns });
  } catch (e) { err(res, e.message, 500); }
});

// POST /api/publish/posts/campaigns - create
router.post('/campaigns', protect, async (req, res) => {
  try {
    const { name, description, accounts, posts, schedule, active } = req.body;
    if (!name) return err(res, 'Campaign name is required');
    const campaign = await PublishCampaign.create({
      user: req.user._id, name, description, accounts: accounts || [], posts: posts || [],
      schedule: schedule || '', active: active !== undefined ? active : true,
    });
    res.status(201).json({ success: true, campaign });
  } catch (e) { err(res, e.message, 500); }
});

// PUT /api/publish/posts/campaigns/:id
router.put('/campaigns/:id', protect, async (req, res) => {
  try {
    const campaign = await PublishCampaign.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    if (!campaign) return err(res, 'Campaign not found', 404);
    ok(res, { campaign });
  } catch (e) { err(res, e.message, 500); }
});

// DELETE /api/publish/posts/campaigns/:id
router.delete('/campaigns/:id', protect, async (req, res) => {
  try {
    const campaign = await PublishCampaign.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!campaign) return err(res, 'Campaign not found', 404);
    ok(res, { message: 'Campaign deleted' });
  } catch (e) { err(res, e.message, 500); }
});

// PATCH /api/publish/posts/campaigns/:id/toggle
router.patch('/campaigns/:id/toggle', protect, async (req, res) => {
  try {
    const campaign = await PublishCampaign.findOne({ _id: req.params.id, user: req.user._id });
    if (!campaign) return err(res, 'Campaign not found', 404);
    campaign.active = !campaign.active;
    await campaign.save();
    ok(res, { campaign });
  } catch (e) { err(res, e.message, 500); }
});


// GET /api/posts/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, user: req.user._id }).populate('accounts', 'platform accountName avatar accountHandle');
    if (!post) return err(res, 'Post not found', 404);
    ok(res, { post });
  } catch (e) { err(res, e.message, 500); }
});

// POST /api/posts - create post (draft or schedule)
router.post('/', protect, upload.array('media', 10), async (req, res) => {
  try {
    const { content, accountIds, scheduledAt, status = 'draft', link, aiGenerated = false, aiPrompt = '' } = req.body;
    if (!content?.trim()) return err(res, 'Content is required');

    const accountIdArr = Array.isArray(accountIds) ? accountIds : JSON.parse(accountIds || '[]');
    if (!accountIdArr.length) return err(res, 'At least one social account required');

    // Check plan post limits
    const plan = req.user.plan;
    if (plan && plan.socialPosts > 0) {
      const postCount = await Post.countDocuments({ user: req.user._id, status: { $in: ['published','scheduled'] } });
      if (postCount >= plan.socialPosts)
        return err(res, `Post limit reached (${plan.socialPosts} posts on your plan)`);
    }

    const accounts = await SocialAccount.find({ _id: { $in: accountIdArr }, user: req.user._id });
    const platforms = [...new Set(accounts.map(a => a.platform))];

    // Handle uploaded media
    const mediaUrls = (req.files || []).map(f => `/api/uploads/${f.filename}`);

    const finalStatus = scheduledAt ? 'scheduled' : status;

    const post = await Post.create({
      user: req.user._id, content, accounts: accounts.map(a=>a._id), platforms,
      mediaUrls, link: link || '',
      status: finalStatus,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      aiGenerated: Boolean(aiGenerated), aiPrompt,
    });

    // If "publish now"
    if (finalStatus === 'publishing' || (status === 'published' && !scheduledAt)) {
      await publishPostNow(post, accounts, req.user);
    }

    ok(res, { post });
  } catch (e) {
    // cleanup uploaded files on error
    if (req.files) req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    err(res, e.message, 500);
  }
});

// PUT /api/posts/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, user: req.user._id });
    if (!post) return err(res, 'Post not found', 404);
    if (post.status === 'published') return err(res, 'Cannot edit a published post');

    const { content, scheduledAt, status, accountIds, link } = req.body;
    if (content !== undefined)     post.content = content;
    if (scheduledAt !== undefined) post.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (status !== undefined)      post.status = status;
    if (link !== undefined)        post.link = link;
    if (accountIds) {
      const accounts = await SocialAccount.find({ _id: { $in: Array.isArray(accountIds)?accountIds:JSON.parse(accountIds) }, user: req.user._id });
      post.accounts  = accounts.map(a=>a._id);
      post.platforms = [...new Set(accounts.map(a => a.platform))];
    }
    await post.save();
    ok(res, { post });
  } catch (e) { err(res, e.message, 500); }
});

// DELETE /api/posts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, user: req.user._id });
    if (!post) return err(res, 'Post not found', 404);
    await post.deleteOne();
    ok(res, { message: 'Post deleted' });
  } catch (e) { err(res, e.message, 500); }
});

// POST /api/posts/:id/publish - publish immediately
router.post('/:id/publish', protect, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, user: req.user._id }).populate('accounts');
    if (!post) return err(res, 'Post not found', 404);
    if (post.status === 'published') return err(res, 'Already published');

    await publishPostNow(post, post.accounts, req.user);
    ok(res, { post });
  } catch (e) { err(res, e.message, 500); }
});

// ── Publish helper ────────────────────────────────
async function publishPostNow(post, accounts, user) {
  post.status = 'processing';
  await post.save();

  const results = [];
  let anySuccess = false;

  for (const account of accounts) {
    const result = await publishToAccount(account, {
      content: post.content,
      mediaUrls: post.mediaUrls?.filter(u => !u.startsWith('/api')) || [],
      link: post.link,
    });
    results.push({
      platform: account.platform,
      accountId: account._id,
      postId: result.postId || '',
      url: result.url || '',
      status: result.success ? 'published' : 'failed',
      error: result.error || '',
    });
    if (result.success) {
      anySuccess = true;
      account.lastPosted = new Date();
      await account.save();
    }
  }

  post.platformResults = results;
  post.status = anySuccess ? 'published' : 'failed';
  post.publishedAt = anySuccess ? new Date() : null;
  post.failedReason = !anySuccess ? results.map(r=>r.error).join('; ') : '';
  await post.save();

  // Create notification
  try {
    await Notification.create({
      user: user._id,
      type: anySuccess ? 'post_published' : 'post_failed',
      title: anySuccess ? 'Post published successfully!' : 'Post failed to publish',
      message: anySuccess
        ? `Published to ${results.filter(r=>r.status==='published').length} platform(s)`
        : results.map(r=>r.error).filter(Boolean).join('; '),
    });
  } catch {}

  // Trigger webhooks
  try {
    const webhooks = await Webhook.find({ user: user._id, active: true });
    await triggerWebhooks(webhooks, anySuccess ? 'post.published' : 'post.failed', { postId: post._id, platforms: post.platforms });
  } catch {}
}

// Export for cron job
module.exports = router;
module.exports.publishPostNow = publishPostNow;
