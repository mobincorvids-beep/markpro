const router = require('express').Router();
const { Category, Service } = require('../models/SMM_Service.model');
const { FavoriteService }   = require('../models/SMM_Supporting.model');
const { protect }           = require('../middleware/auth.middleware');

// GET /api/services - grouped by category
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ status: 1 }).sort('sort');
    const services   = await Service.find({ status: 1 }).sort('sort')
      .populate('apiProviderId', 'name');

    const grouped = categories.map(cat => ({
      ...cat.toObject(),
      services: services.filter(s => s.categoryId.toString() === cat._id.toString()),
    }));

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/services/flat - flat list (used by New Order page search)
router.get('/flat', async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { status: 1 };
    if (search) filter.name = { $regex: search, $options: 'i' };
    const services = await Service.find(filter)
      .populate('categoryId', 'name')
      .sort('sort');
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/services/:id
router.get('/:id', async (req, res) => {
  try {
    const s = await Service.findById(req.params.id).populate('categoryId', 'name');
    if (!s) return res.status(404).json({ error: 'Service not found' });
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/services/favorites/mine
router.get('/favorites/mine', protect, async (req, res) => {
  try {
    const favs = await FavoriteService.find({ userId: req.user._id })
      .populate({ path: 'serviceId', populate: { path: 'categoryId', select: 'name' } });
    res.json(favs.map(f => f.serviceId).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/services/favorites/:serviceId - toggle
router.post('/favorites/:serviceId', protect, async (req, res) => {
  try {
    const existing = await FavoriteService.findOne({
      userId: req.user._id, serviceId: req.params.serviceId,
    });
    if (existing) {
      await existing.deleteOne();
      return res.json({ favorited: false });
    }
    await FavoriteService.create({ userId: req.user._id, serviceId: req.params.serviceId });
    res.json({ favorited: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
