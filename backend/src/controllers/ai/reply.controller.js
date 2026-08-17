const Reply = require('../../models/Reply.model');
const { generateReply } = require('../../services/ai.service');
const logger = require('../../utils/logger');

// ── Generate a new AI reply ───────────────────────────────────────────────────
exports.generate = async (req, res) => {
  try {
    const user = req.user;

    // Check generation limit
    if (!user.canGenerate()) {
      return res.status(429).json({
        success: false,
        message: `Generation limit reached (${user.usage.generationsLimit}/month). Please upgrade your plan.`,
        data: { usage: user.usage },
      });
    }

    const {
      originalText,
      platform = 'general',
      tone,
      language,
      customPrompt,
      sourceUrl,
      postAuthor,
    } = req.body;

    // Resolve AI model: request param > user preference > env default
    const aiModel = req.body.aiModel || user.preferences?.aiModel || process.env.DEFAULT_AI_MODEL || 'gemini';
    const resolvedTone = tone || user.preferences?.defaultTone || 'professional';
    const resolvedLanguage = language || user.preferences?.defaultLanguage || 'en';
    const resolvedPrompt = customPrompt || user.preferences?.customSystemPrompt || '';

    const result = await generateReply({
      originalText,
      platform,
      tone: resolvedTone,
      language: resolvedLanguage,
      customPrompt: resolvedPrompt,
      aiModel,
    });

    // Save to history
    const reply = await Reply.create({
      user: user._id,
      originalText,
      generatedReply: result.text,
      platform,
      tone: resolvedTone,
      language: resolvedLanguage,
      aiModel: result.model,
      customPrompt: resolvedPrompt,
      tokensUsed: result.tokensUsed,
      metadata: { sourceUrl, postAuthor },
    });

    // Increment usage
    user.usage.generationsUsed += 1;
    await user.save();

    res.status(201).json({
      success: true,
      data: {
        reply,
        usage: {
          used: user.usage.generationsUsed,
          limit: user.usage.generationsLimit,
          remaining: user.remainingGenerations(),
        },
      },
    });
  } catch (err) {
    logger.error('Generate reply error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to generate reply' });
  }
};

// ── Get reply history ─────────────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, platform, tone, isFavorited } = req.query;
    const filter = { user: req.user._id };
    if (platform) filter.platform = platform;
    if (tone) filter.tone = tone;
    if (isFavorited !== undefined) filter.isFavorited = isFavorited === 'true';

    const total = await Reply.countDocuments(filter);
    const replies = await Reply.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: {
        replies,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
};

// ── Get single reply ──────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const reply = await Reply.findOne({ _id: req.params.id, user: req.user._id });
    if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });
    res.json({ success: true, data: reply });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch reply' });
  }
};

// ── Toggle favorite ───────────────────────────────────────────────────────────
exports.toggleFavorite = async (req, res) => {
  try {
    const reply = await Reply.findOne({ _id: req.params.id, user: req.user._id });
    if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });

    reply.isFavorited = !reply.isFavorited;
    await reply.save();

    res.json({ success: true, data: { isFavorited: reply.isFavorited } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update favorite' });
  }
};

// ── Submit feedback ───────────────────────────────────────────────────────────
exports.submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const reply = await Reply.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { feedback: { rating, comment } },
      { new: true }
    );
    if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });
    res.json({ success: true, data: reply });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
};

// ── Delete reply ──────────────────────────────────────────────────────────────
exports.deleteReply = async (req, res) => {
  try {
    const reply = await Reply.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });
    res.json({ success: true, message: 'Reply deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete reply' });
  }
};

// ── Get user stats ────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const [total, favorited, byPlatform, byTone, recent] = await Promise.all([
      Reply.countDocuments({ user: userId }),
      Reply.countDocuments({ user: userId, isFavorited: true }),
      Reply.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$platform', count: { $sum: 1 } } },
      ]),
      Reply.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$tone', count: { $sum: 1 } } },
      ]),
      Reply.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    res.json({
      success: true,
      data: {
        total,
        favorited,
        byPlatform: Object.fromEntries(byPlatform.map((p) => [p._id, p.count])),
        byTone: Object.fromEntries(byTone.map((t) => [t._id, t.count])),
        recentReplies: recent,
        usage: {
          used: req.user.usage.generationsUsed,
          limit: req.user.usage.generationsLimit,
          remaining: req.user.remainingGenerations(),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};
