const path   = require('path');
const fs     = require('fs');
const Prompt = require('../../models/AIPrompt.model');
const { TEMPLATE_LIST } = require('../../data/promptTemplates');
const {
  generateText, generateTextDirect,
  generateImageOpenAI, generateImageStableDiffusion,
  generateSpeech, transcribeAudio, generateImageAnimation,
} = require('../../services/aiProviders.service');
const { calculateCredits, hasEnoughCredits, debitCredits, CREDIT_TYPE } = require('../../services/creditEngine.service');
const { UPLOAD_DIR } = require('../../middleware/bp.upload');

const err = (res, msg, s = 400) => res.status(s).json({ success: false, message: msg });
const ok  = (res, data)          => res.json({ success: true, ...data });

// ── Build system prompt based on generation type ──
function buildSystemPrompt(type, options = {}) {
  switch (type) {
    case 'code':
      return `You are an expert in ${options.language || 'programming'} language. Write clean, well-commented code.`;
    case 'translation':
      return `TRANSLATE given sentence into ${options.destLang || 'English'}. Only output the translation, nothing else.${options.pronunciation ? ' Also provide romanized pronunciation.' : ''}`;
    default:
      return 'You are a helpful AI writing assistant. Generate high-quality content as requested.';
  }
}

// ── Replace template placeholders ────────────────
function applyTemplate(templateKey, fields) {
  const tpl = TEMPLATE_LIST.find(t => t.key === templateKey);
  if (!tpl) return null;
  let prompt = tpl.prompt;
  for (const [key, value] of Object.entries(fields)) {
    prompt = prompt.replace(new RegExp(key.replace(/[_]/g, '\\_'), 'g'), value);
  }
  return prompt;
}

// ══════════════════════════════════════════════
// POST /api/prompts/text  - Text / Code / Translation (streaming SSE)
// ══════════════════════════════════════════════
exports.generateTextStream = async (req, res) => {
  try {
    const { type = 'text', templateKey, fields = {}, customPrompt, languageCode = 'en', language, destLang, pronunciation, model } = req.body;
    const aiModel = model || process.env.GEMINI_MODEL || 'gemini-flash-latest';

    if (!process.env.GEMINI_API_KEY)
      return err(res, 'Gemini API key not configured. Set GEMINI_API_KEY in .env');

    // Build the user prompt
    let userPrompt = customPrompt || '';
    if (templateKey) {
      const built = applyTemplate(templateKey, fields);
      if (!built) return err(res, 'Template not found');
      userPrompt = built;
    }
    if (!userPrompt.trim()) return err(res, 'Prompt is required');

    const systemPrompt = buildSystemPrompt(type, { language, destLang, pronunciation });

    // Rough pre-check - assume ~150 credits max, verify after
    const MIN_CREDITS = 5;
    if (!(await hasEnoughCredits(req.user._id, MIN_CREDITS)))
      return err(res, 'Insufficient credits. Please purchase more credits.');

    // Stream response
    const fullText = await generateText({ systemPrompt, userPrompt, model: aiModel, res });

    // After stream ends, save the prompt and debit credits
    const wordCount  = fullText.trim().split(/\s+/).filter(Boolean).length;
    const charCount  = fullText.length;
    const credits    = calculateCredits(type, { responseText: fullText });

    await debitCredits(req.user._id, credits, { type, description: `${type} generation` });

    const title = userPrompt.slice(0, 60);
    await Prompt.create({
      user: req.user._id, type, prompt: userPrompt, promptResponse: fullText,
      languageCode, templateKey: templateKey || '', categoryKey: '', data: { model: aiModel },
      responseWordCount: wordCount, responseCharCount: charCount,
      creditsUsed: credits, creditType: CREDIT_TYPE[type] || 2, title,
    });
  } catch (e) {
    if (!res.headersSent) err(res, e.response?.data?.error?.message || e.message, 500);
  }
};

// ══════════════════════════════════════════════
// POST /api/prompts/image - Image Generation
// ══════════════════════════════════════════════
exports.generateImage = async (req, res) => {
  try {
    const { prompt, size = '512x512', noOfImages = 1, stylePreset, useStableDiffusion = false, sdModel } = req.body;
    if (!prompt) return err(res, 'Prompt is required');

    const credits = calculateCredits('image', { imageSize: size, noOfImages: Number(noOfImages) });
    if (!(await hasEnoughCredits(req.user._id, credits)))
      return err(res, 'Insufficient credits. Please purchase more credits.');

    let files;
    if (useStableDiffusion && process.env.STABILITY_API_KEY) {
      files = await generateImageStableDiffusion({ prompt, model: sdModel || process.env.STABLE_DIFFUSION_MODEL, stylePreset });
    } else {
      if (!process.env.GEMINI_API_KEY) return err(res, 'Gemini API key not configured');
      files = await generateImageOpenAI({ prompt, size, n: Number(noOfImages), stylePreset });
    }

    await debitCredits(req.user._id, credits, { type: 'image', description: 'Image generation' });

    const dbPrompt = await Prompt.create({
      user: req.user._id, type: 'image', prompt, mediaFiles: files,
      data: { size, noOfImages, stylePreset, useStableDiffusion },
      creditsUsed: credits, creditType: CREDIT_TYPE['image'],
      title: prompt.slice(0, 60),
    });

    ok(res, { prompt: dbPrompt, files: files.map(f => `/api/prompts/media/${f}`) });
  } catch (e) { err(res, e.response?.data?.error?.message || e.message, 500); }
};

// ══════════════════════════════════════════════
// POST /api/prompts/speech - Text-to-Speech
// ══════════════════════════════════════════════
exports.generateSpeech = async (req, res) => {
  try {
    const { text, voice = 'alloy', model, speed = 1.0 } = req.body;
    if (!text) return err(res, 'Text is required');

    const credits = calculateCredits('text-to-speech', { responseText: text });
    if (!(await hasEnoughCredits(req.user._id, credits)))
      return err(res, 'Insufficient credits');

    const fname = await generateSpeech({ text, model, voice, speed });
    await debitCredits(req.user._id, credits, { type: 'text-to-speech' });

    const dbPrompt = await Prompt.create({
      user: req.user._id, type: 'text-to-speech', prompt: text, mediaFiles: [fname],
      data: { voice, model, speed },
      creditsUsed: credits, creditType: CREDIT_TYPE['text-to-speech'],
      title: text.slice(0, 60),
    });

    ok(res, { prompt: dbPrompt, file: `/api/prompts/media/${fname}` });
  } catch (e) { err(res, e.response?.data?.error?.message || e.message, 500); }
};

// ══════════════════════════════════════════════
// POST /api/prompts/transcribe - Speech-to-Text (Whisper)
// ══════════════════════════════════════════════
exports.transcribeAudio = async (req, res) => {
  try {
    if (!req.file) return err(res, 'Audio file is required');

    const filePath = req.file.path;
    // Estimate duration in seconds by file size (rough: ~16KB/s for compressed audio)
    const sizeKB   = req.file.size / 1024;
    const estimatedDurationSeconds = Math.ceil(sizeKB / 16);

    const credits = calculateCredits('speech-to-text', { audioDurationSeconds: estimatedDurationSeconds });
    if (!(await hasEnoughCredits(req.user._id, credits)))
      return err(res, 'Insufficient credits');

    const { language } = req.body;
    const transcript = await transcribeAudio({ filePath, language });
    await debitCredits(req.user._id, credits, { type: 'speech-to-text' });

    // Clean up temp file
    fs.unlinkSync(filePath);

    const dbPrompt = await Prompt.create({
      user: req.user._id, type: 'speech-to-text', prompt: req.file.originalname,
      promptResponse: transcript, creditsUsed: credits,
      creditType: CREDIT_TYPE['speech-to-text'],
      title: req.file.originalname,
    });

    ok(res, { prompt: dbPrompt, transcript });
  } catch (e) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    err(res, e.response?.data?.error?.message || e.message, 500);
  }
};

// ══════════════════════════════════════════════
// POST /api/prompts/animate - Image Animation
// ══════════════════════════════════════════════
exports.animateImage = async (req, res) => {
  try {
    if (!req.file) return err(res, 'Image file is required');
    if (!process.env.STABILITY_API_KEY) return err(res, 'Stability AI API key not configured');

    const credits = calculateCredits('image-animation');
    if (!(await hasEnoughCredits(req.user._id, credits)))
      return err(res, 'Insufficient credits');

    const fname = await generateImageAnimation({ imagePath: req.file.path });
    fs.unlinkSync(req.file.path);

    await debitCredits(req.user._id, credits, { type: 'image-animation' });

    const dbPrompt = await Prompt.create({
      user: req.user._id, type: 'image-animation', mediaFiles: [fname],
      creditsUsed: credits, creditType: CREDIT_TYPE['image-animation'],
      title: 'Image Animation',
    });

    ok(res, { prompt: dbPrompt, file: `/api/prompts/media/${fname}` });
  } catch (e) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    err(res, e.message, 500);
  }
};

// ══════════════════════════════════════════════
// GET /api/prompts/history - list history
// ══════════════════════════════════════════════
exports.getHistory = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const filter = { user: req.user._id };
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [prompts, total] = await Promise.all([
      Prompt.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Prompt.countDocuments(filter),
    ]);

    // Replace mediaFiles with URLs
    const formatted = prompts.map(p => ({
      ...p,
      mediaUrls: (p.mediaFiles || []).map(f => `/api/prompts/media/${f}`),
    }));

    ok(res, { prompts: formatted, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (e) { err(res, e.message, 500); }
};

// GET /api/prompts/:id - single prompt
exports.getOne = async (req, res) => {
  try {
    const prompt = await Prompt.findOne({ _id: req.params.id, user: req.user._id });
    if (!prompt) return err(res, 'Not found', 404);
    const mediaUrls = (prompt.mediaFiles || []).map(f => `/api/prompts/media/${f}`);
    ok(res, { prompt: { ...prompt.toObject(), mediaUrls } });
  } catch (e) { err(res, e.message, 500); }
};

// DELETE /api/prompts/:id
exports.deleteOne = async (req, res) => {
  try {
    const prompt = await Prompt.findOne({ _id: req.params.id, user: req.user._id });
    if (!prompt) return err(res, 'Not found', 404);
    // Optionally delete associated media files
    for (const f of prompt.mediaFiles || []) {
      const fp = path.join(UPLOAD_DIR, f);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await prompt.deleteOne();
    ok(res, { message: 'Deleted' });
  } catch (e) { err(res, e.message, 500); }
};

// GET /api/prompts/media/:filename - serve media file
exports.serveMedia = (req, res) => {
  const fname = path.basename(req.params.filename);
  const fpath = path.join(UPLOAD_DIR, fname);
  if (!fs.existsSync(fpath)) return err(res, 'File not found', 404);
  res.sendFile(fpath);
};

// GET /api/prompts/stats - user stats for dashboard
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const [total, byType, recentPrompts] = await Promise.all([
      Prompt.countDocuments({ user: userId }),
      Prompt.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$type', count: { $sum: 1 }, creditsUsed: { $sum: '$creditsUsed' } } },
        { $sort: { count: -1 } },
      ]),
      Prompt.find({ user: userId }).sort({ createdAt: -1 }).limit(5).select('type title createdAt creditsUsed').lean(),
    ]);
    ok(res, { total, byType, recentPrompts, credits: req.user.credits });
  } catch (e) { err(res, e.message, 500); }
};
