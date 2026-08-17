const router = require('express').Router();
const Image = require('../models/Image.model');
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/ai/image.controller');
const Settings = require('../models/Settings.model');

// GET /api/ai/images/settings - public, UI-only flags for the generator screen
router.get('/settings', async (req, res, next) => {
  try {
    const keys = ['enprompt', 'aprvt', 'enable_nsfw', 'aupload'];
    const entries = await Promise.all(keys.map(async k => [k, !!(await Settings.get(k, false))]));
    res.json(Object.fromEntries(entries));
  } catch (err) { next(err); }
});

// POST /api/ai/images/generate - run a generation job against the configured provider
router.post('/generate', protect, ctrl.generate);

// POST /api/ai/images/save - persist a generated result into the gallery
router.post('/save', protect, ctrl.saveImage);

// POST /api/ai/images/canvas - persist an image produced by the canvas editor
router.post('/canvas', protect, ctrl.saveCanvas);

// GET /api/ai/images/favorites - images the current user has favorited
router.get('/favorites', protect, async (req, res, next) => {
  try {
    const images = await Image.find({ favorites: req.user._id })
      .populate('user', 'username')
      .sort({ createdAt: -1 });
    res.json({ images, total: images.length, page: 1, pages: 1 });
  } catch (err) { next(err); }
});

// POST /api/ai/images/:id/favorite - toggle favorite for the current user
router.post('/:id/favorite', protect, async (req, res, next) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) return res.status(404).json({ error: 'Not found' });

    const uid   = req.user._id.toString();
    const has   = (image.favorites || []).some(f => f.toString() === uid);
    // Atomic so concurrent toggles can't duplicate or drop the entry.
    await Image.updateOne(
      { _id: image._id },
      has ? { $pull: { favorites: req.user._id } } : { $addToSet: { favorites: req.user._id } },
    );
    res.json({ favorited: !has });
  } catch (err) { next(err); }
});

// GET /api/images - public gallery (excludes private & optionally nsfw)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, model, style, userId } = req.query;
    const filter = { isPrivate: false };
    if (model)  filter.aiModel = model;
    if (style)  filter.style   = style;
    if (userId) filter.user    = userId;

    const images = await Image.find(filter)
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Image.countDocuments(filter);
    res.json({ images, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/images/my - current user's images (including private)
router.get('/my', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const images = await Image.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Image.countDocuments({ user: req.user._id });
    res.json({ images, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/images/private - current user's private images
router.get('/private', protect, async (req, res) => {
  try {
    const images = await Image.find({ user: req.user._id, isPrivate: true })
      .sort({ createdAt: -1 });
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/images/:id
router.get('/:id', async (req, res) => {
  try {
    const image = await Image.findById(req.params.id).populate('user', 'username');
    if (!image) return res.status(404).json({ error: 'Not found' });
    if (image.isPrivate) return res.status(403).json({ error: 'Private image' });
    res.json(image);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/images/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) return res.status(404).json({ error: 'Not found' });
    if (image.user.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not authorized' });
    await image.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/images/:id/visibility
router.patch('/:id/visibility', protect, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) return res.status(404).json({ error: 'Not found' });
    if (image.user.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });
    image.isPrivate = req.body.isPrivate;
    await image.save();
    res.json(image);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
