const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const User    = require('../models/User.model');
const AITemplate = require('../models/AITemplate.model');
const { Image }  = require('../models/BPOther.model');
const { protect, checkWordTokens, checkImageTokens } = require('../middleware/auth.middleware');
const { upload }    = require('../middleware/bp.upload');
const { generateText, generateImage, buildPrompt, countWords } = require('../services/beepost.ai.service');

const ok  = (res, d)        => res.json({ success: true, ...d });
const err = (res, m, s=400) => res.status(s).json({ success: false, message: m });

// GET /api/ai/templates - list all templates
router.get('/templates', protect, async (req, res) => {
  try {
    const { category, platform } = req.query;
    const filter = { active: true };
    if (category) filter.category = category;
    if (platform) filter.$or = [{ platform }, { platform: 'all' }];
    const templates = await AITemplate.find(filter).sort({ category: 1, name: 1 });
    ok(res, { templates });
  } catch (e) { err(res, e.message, 500); }
});

// POST /api/ai/generate-text - generate social post caption
router.post('/generate-text', protect, checkWordTokens(50), async (req, res) => {
  try {
    const { templateId, variables = {}, customPrompt, platform, tone, includeEmoji, includeHashtags, hashtagCount, model } = req.body;

    const plan = req.user.plan;
    if (!plan) return err(res, 'No active subscription plan');

    let promptText = '';
    if (templateId) {
      const tpl = await AITemplate.findById(templateId);
      if (!tpl) return err(res, 'Template not found', 404);
      promptText = buildPrompt(tpl, variables, { platform, tone, includeEmoji, includeHashtags, hashtagCount });
      await AITemplate.findByIdAndUpdate(templateId, { $inc: { usageCount: 1 } });
    } else if (customPrompt) {
      promptText = buildPrompt({ promptTemplate: customPrompt }, variables, { platform, tone, includeEmoji, includeHashtags, hashtagCount });
    } else {
      return err(res, 'Either templateId or customPrompt is required');
    }

    const aiModel = model || plan.aiModel || process.env.GEMINI_MODEL || 'gemini-flash-latest';
    const result  = await generateText({ prompt: promptText, model: aiModel });

    // Deduct word tokens
    const words = countWords(result.text);
    req.user.wordTokensUsed += words;
    await req.user.save();

    ok(res, { text: result.text, wordsUsed: words, tokensRemaining: Math.max(0, (plan.wordTokens||0) - req.user.wordTokensUsed) });
  } catch (e) { err(res, e.response?.data?.error?.message || e.message, 500); }
});

// POST /api/ai/generate-image - generate AI image
router.post('/generate-image', protect, checkImageTokens(1), async (req, res) => {
  try {
    const { prompt, size = '1024x1024', quality = 'standard', n = 1 } = req.body;
    if (!prompt?.trim()) return err(res, 'Prompt is required');

    const plan = req.user.plan;
    if (!plan) return err(res, 'No active subscription plan');

    const model  = plan.imageAiModel || process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
    const result = await generateImage({ prompt, model, size, quality, n: Number(n) });

    // Save to gallery
    const images = await Promise.all(result.files.map(url =>
      Image.create({ user: req.user._id, url, source: 'ai_generated', aiPrompt: prompt })
    ));

    // Deduct image tokens
    req.user.imageTokensUsed += result.imagesGenerated;
    await req.user.save();

    ok(res, { images, files: result.files, imagesGenerated: result.imagesGenerated });
  } catch (e) { err(res, e.response?.data?.error?.message || e.message, 500); }
});

// GET /api/ai/gallery - user's image gallery
router.get('/gallery', protect, async (req, res) => {
  try {
    const { page = 1, limit = 24, source } = req.query;
    const filter = { user: req.user._id };
    if (source) filter.source = source;
    const skip = (Number(page)-1)*Number(limit);
    const [images, total] = await Promise.all([
      Image.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Image.countDocuments(filter),
    ]);
    ok(res, { images, total, pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e.message, 500); }
});

// POST /api/ai/upload-image - upload image to gallery
router.post('/upload-image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return err(res, 'No image uploaded');
    const { size } = req.file;
    const url = `/api/uploads/${req.file.filename}`;
    const image = await Image.create({
      user: req.user._id, url, filename: req.file.filename,
      source: 'upload', size, mimeType: req.file.mimetype,
    });
    ok(res, { image });
  } catch (e) { err(res, e.message, 500); }
});

// DELETE /api/ai/gallery/:id
router.delete('/gallery/:id', protect, async (req, res) => {
  try {
    const image = await Image.findOne({ _id: req.params.id, user: req.user._id });
    if (!image) return err(res, 'Image not found', 404);
    // Delete file from disk
    if (image.filename) {
      const filePath = path.join(__dirname, '..', 'uploads', image.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await image.deleteOne();
    ok(res, { message: 'Image deleted' });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/ai/usage - token usage stats
router.get('/usage', protect, async (req, res) => {
  try {
    const plan = req.user.plan;
    ok(res, {
      wordTokensUsed:  req.user.wordTokensUsed,
      wordTokensLimit: plan?.wordTokens || 0,
      imageTokensUsed: req.user.imageTokensUsed,
      imageTokensLimit: plan?.imageTokens || 0,
      wordTokensRemaining:  Math.max(0, (plan?.wordTokens||0) - req.user.wordTokensUsed),
      imageTokensRemaining: Math.max(0, (plan?.imageTokens||0) - req.user.imageTokensUsed),
    });
  } catch (e) { err(res, e.message, 500); }
});

module.exports = router;
