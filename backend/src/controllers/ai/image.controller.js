const axios    = require('axios');
const User     = require('../../models/User.model');
const Image    = require('../../models/Image.model');
const Settings = require('../../models/Settings.model');
const { saveImage } = require('../../utils/storage');
const gemini   = require('../../services/gemini.service');

const SD_MODELS    = ['sd', 'realxl', 'odalle', 'pix', 'dreams', 'playg'];
const DALLE_MODELS = ['de', 'de3']; // legacy model ids kept for frontend compatibility, now routed to Gemini (free)

/* ── Credit check (mirrors ailmt / ulimit logic from king-submitai.php) ── */
async function checkCredits(user) {
  const ailimits = await Settings.get('ailimits', false);
  const ulimits  = await Settings.get('ulimits',  false);

  // Admin always passes; limits disabled → always pass
  if ((!ailimits && !ulimits) || user.role === 'admin') return true;

  let limit = null;
  if (ailimits && user.membershipPlan) {
    limit = parseInt(await Settings.get(`plan_${user.membershipPlan}_lmt`, 0));
  } else if (ulimits) {
    limit = parseInt(await Settings.get('ulimit', 0));
  }

  // limit === 0 means unlimited
  if (limit === null || limit === 0) return true;
  return user.usage.imagesUsed < limit;
}

async function incrementCredits(userId, count) {
  await User.findByIdAndUpdate(userId, { $inc: { 'usage.imagesUsed': count } });
}

/* ── POST /api/generate ── */
exports.generate = async (req, res) => {
  try {
    const {
      prompt,
      aiModel    = 'sd',
      size       = '1024x1024',
      style      = 'none',
      negPrompt  = '',
      count      = 1,
    } = req.body;

    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt is required' });

    // Credit gate
    if (!(await checkCredits(req.user)))
      return res.status(403).json({ error: 'No credits remaining. Please upgrade your plan.' });

    const imageCount = Math.min(parseInt(count) || 1, 4);
    let responsePayload;

    /* ── Stable Diffusion / KingStudio path ── */
    if (SD_MODELS.includes(aiModel)) {
      const sdApiKey = await Settings.get('kingstudio_api_key') || process.env.KINGSTUDIO_API_KEY;
      if (!sdApiKey) return res.status(500).json({ error: 'KingStudio API key not configured' });

      const steps   = parseInt(await Settings.get('sd_steps', 50));
      const enNsfw  = await Settings.get('enable_nsfw', false);
      const styledPrompt = style && style !== 'none' ? `${prompt}, ${style}` : prompt;

      const { data } = await axios.post(
        'https://kingstudio.io/api/king-text2img',
        { prompt: styledPrompt, size: imageCount, steps, aisize: size, model: aiModel, nvalue: negPrompt, ennsfw: enNsfw },
        { headers: { Authorization: `Bearer ${sdApiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: 120000 }
      );

      if (data?.error) return res.status(400).json({ error: data.error });
      responsePayload = data; // { out: [...], format: 'bas'|'url' }

    /* ── Gemini image path (free, replaces DALL-E) ── */
    } else if (DALLE_MODELS.includes(aiModel)) {
      if (!gemini.isConfigured()) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });

      const styledPrompt = style && style !== 'none' ? `${prompt}, ${style}` : prompt;
      const result = await gemini.generateImage({ prompt: styledPrompt, n: imageCount });
      if (result.error) return res.status(502).json({ error: result.message });

      responsePayload = { out: result.images.map(img => `data:${img.mimeType};base64,${img.base64}`), format: 'bas' };

    } else {
      return res.status(400).json({ error: `Unknown model: ${aiModel}` });
    }

    await incrementCredits(req.user._id, imageCount);
    res.json({ success: true, data: responsePayload });

  } catch (err) {
    const msg = err.response?.data?.error?.message || err.response?.data?.error || err.message;
    res.status(500).json({ error: msg });
  }
};

/* ── POST /api/generate/save - Save a URL image to gallery ── */
exports.saveImage = async (req, res) => {
  try {
    const { imageUrl, prompt, title, style, size, aiModel, negPrompt, isPrivate, isNsfw, tags } = req.body;
    if (!imageUrl || !prompt) return res.status(400).json({ error: 'imageUrl and prompt are required' });

    const wmEnabled = await Settings.get('watermark_enabled', false);

    // Save thumbnail (resized + optionally watermarked) and full-size copy
    const [thumb, main] = await Promise.all([
      saveImage(imageUrl, { resize: 600, watermark: wmEnabled }),
      saveImage(imageUrl, { resize: null, watermark: false }),
    ]);

    const image = await Image.create({
      user:      req.user._id,
      title:     title || prompt.slice(0, 80),
      prompt,
      negPrompt: negPrompt || '',
      style:     style  || 'none',
      size:      size   || '1024x1024',
      aiModel:   aiModel || 'sd',
      thumbUrl:  thumb.url,
      mainUrl:   main.url,
      storageType: main.storageType,
      isPrivate: !!isPrivate,
      isNsfw:    !!isNsfw,
      tags:      Array.isArray(tags) ? tags : [],
    });

    res.status(201).json(image);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── POST /api/generate/canvas - Save base64 canvas data (meme editor) ── */
exports.saveCanvas = async (req, res) => {
  try {
    const { canvasData, prompt = 'canvas export' } = req.body;
    if (!canvasData) return res.status(400).json({ error: 'canvasData is required' });

    const { url, storageType } = await saveImage(canvasData, { isBase64: true });

    const image = await Image.create({
      user:       req.user._id,
      title:      prompt.slice(0, 80),
      prompt,
      aiModel:    'canvas',
      thumbUrl:   url,
      mainUrl:    url,
      storageType,
    });

    res.status(201).json(image);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
