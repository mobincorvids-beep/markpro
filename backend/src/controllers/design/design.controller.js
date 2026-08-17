const { DesignProject, DesignTemplate, DesignMedia } = require('../../models/Design.models');
const { v4: uuidv4 } = require('uuid');
const path   = require('path');
const fs     = require('fs');
const axios  = require('axios');

// ── Projects ──────────────────────────────────────────────────────────────
exports.getProjects = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;
    const q = { user: req.user._id };
    if (search)   q.title    = { $regex: search, $options: 'i' };
    if (category) q.category = category;
    const [projects, total] = await Promise.all([
      DesignProject.find(q).sort({ lastEditedAt: -1 })
        .skip((page-1)*limit).limit(+limit).select('-canvas.elements'),
      DesignProject.countDocuments(q),
    ]);
    res.json({ success: true, projects, total, page: +page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getProject = async (req, res) => {
  try {
    const project = await DesignProject.findOne({ _id: req.params.id, user: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createProject = async (req, res) => {
  try {
    const project = await DesignProject.create({ ...req.body, user: req.user._id, lastEditedAt: new Date() });
    res.status(201).json({ success: true, project });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateProject = async (req, res) => {
  try {
    const { title, description, category, canvas, tags, isPublic } = req.body;
    const project = await DesignProject.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title, description, category, canvas, tags, isPublic, lastEditedAt: new Date() },
      { new: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.saveThumbnail = async (req, res) => {
  try {
    const { thumbnail } = req.body;
    if (!thumbnail) return res.status(400).json({ success: false, message: 'No thumbnail provided' });
    const base64Data = thumbnail.replace(/^data:image\/\w+;base64,/, '');
    const buf  = Buffer.from(base64Data, 'base64');
    const dir  = process.env.VERCEL ? path.join('/tmp', 'designs') : path.join(__dirname, '../../../uploads/designs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const fname = `thumb_${req.params.id}_${Date.now()}.jpg`;
    fs.writeFileSync(path.join(dir, fname), buf);
    const project = await DesignProject.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { thumbnail: `/uploads/designs/${fname}` },
      { new: true }
    );
    res.json({ success: true, thumbnail: project?.thumbnail });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.duplicateProject = async (req, res) => {
  try {
    const orig = await DesignProject.findOne({ _id: req.params.id, user: req.user._id });
    if (!orig) return res.status(404).json({ success: false, message: 'Project not found' });
    const copy = await DesignProject.create({
      user: req.user._id,
      title: `${orig.title} (Copy)`,
      category: orig.category,
      canvas: orig.canvas,
      tags: orig.tags,
      lastEditedAt: new Date(),
    });
    res.status(201).json({ success: true, project: copy });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await DesignProject.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.generateShareLink = async (req, res) => {
  try {
    const token = uuidv4();
    const project = await DesignProject.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { shareToken: token, isPublic: true },
      { new: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const url = `${process.env.FRONTEND_URL}/design/share/${token}`;
    res.json({ success: true, shareUrl: url });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getSharedProject = async (req, res) => {
  try {
    const project = await DesignProject.findOne({ shareToken: req.params.token, isPublic: true }).select('-user');
    if (!project) return res.status(404).json({ success: false, message: 'Not found or not public' });
    res.json({ success: true, project });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Templates ────────────────────────────────────────────────────────────
exports.getTemplates = async (req, res) => {
  try {
    const { category, search, isPremium, page = 1, limit = 24 } = req.query;
    const q = { isActive: true };
    if (category && category !== 'all') q.category = category;
    if (isPremium !== undefined) q.isPremium = isPremium === 'true';
    if (search) q.$or = [{ title: { $regex: search, $options: 'i' } }, { tags: { $regex: search, $options: 'i' } }];
    const [templates, total] = await Promise.all([
      DesignTemplate.find(q).sort({ usageCount: -1 }).skip((page-1)*limit).limit(+limit).select('-canvas.elements'),
      DesignTemplate.countDocuments(q),
    ]);
    res.json({ success: true, templates, total, page: +page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getTemplate = async (req, res) => {
  try {
    const t = await DesignTemplate.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, template: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.useTemplate = async (req, res) => {
  try {
    const template = await DesignTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    if (template.isPremium) {
      const plan = req.user.plan;
      if (!plan || plan.price === 0)
        return res.status(403).json({ success: false, message: 'Premium template. Upgrade your plan.' });
    }
    const project = await DesignProject.create({
      user: req.user._id,
      title: `${template.title} - Copy`,
      category: template.category,
      canvas: template.canvas,
      template: template._id,
      lastEditedAt: new Date(),
    });
    await DesignTemplate.findByIdAndUpdate(req.params.id, { $inc: { usageCount: 1 } });
    res.status(201).json({ success: true, project });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Admin template CRUD
exports.createTemplate = async (req, res) => {
  try {
    const t = await DesignTemplate.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, template: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateTemplate = async (req, res) => {
  try {
    const t = await DesignTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, template: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteTemplate = async (req, res) => {
  try {
    await DesignTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Media ─────────────────────────────────────────────────────────────────
exports.getMedia = async (req, res) => {
  try {
    const { page = 1, limit = 24 } = req.query;
    const [media, total] = await Promise.all([
      DesignMedia.find({ user: req.user._id }).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
      DesignMedia.countDocuments({ user: req.user._id }),
    ]);
    res.json({ success: true, media, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.files?.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const file = req.files.file;
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml'];
    if (!allowed.includes(file.mimetype))
      return res.status(400).json({ success: false, message: 'Only image files allowed' });
    const dir = path.join(__dirname, '../../../uploads/design-media');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const fname = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.name)}`;
    await file.mv(path.join(dir, fname));
    const media = await DesignMedia.create({
      user: req.user._id,
      filename: fname,
      url: `/uploads/design-media/${fname}`,
      mimeType: file.mimetype,
      size: file.size,
    });
    res.status(201).json({ success: true, media });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteMedia = async (req, res) => {
  try {
    const media = await DesignMedia.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!media) return res.status(404).json({ success: false, message: 'Not found' });
    const fp = path.join(__dirname, '../../../', media.url);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.removeBackground = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ success: false, message: 'imageUrl required' });
    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) return res.status(503).json({ success: false, message: 'Remove.bg not configured. Add REMOVE_BG_API_KEY to .env' });
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${process.env.FRONTEND_URL}${imageUrl}`;
    const response = await axios.post('https://api.remove.bg/v1.0/removebg',
      { image_url: fullUrl, size: 'auto' },
      { headers: { 'X-Api-Key': apiKey }, responseType: 'arraybuffer' }
    );
    const dir = path.join(__dirname, '../../../uploads/design-media');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const fname = `rmbg_${Date.now()}.png`;
    fs.writeFileSync(path.join(dir, fname), response.data);
    const media = await DesignMedia.create({
      user: req.user._id, filename: fname,
      url: `/uploads/design-media/${fname}`,
      mimeType: 'image/png', size: response.data.length,
    });
    res.json({ success: true, media, url: media.url });
  } catch (err) {
    if (err.response?.status === 402) return res.status(402).json({ success: false, message: 'Remove.bg credits exhausted' });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.searchUnsplash = async (req, res) => {
  try {
    const { query, page = 1, per_page = 20 } = req.query;
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return res.status(503).json({ success: false, message: 'Unsplash not configured. Add UNSPLASH_ACCESS_KEY to .env' });
    const url = query
      ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${per_page}&client_id=${key}`
      : `https://api.unsplash.com/photos?page=${page}&per_page=${per_page}&client_id=${key}`;
    const { data } = await axios.get(url);
    const photos = query ? data.results : data;
    res.json({
      success: true,
      photos: photos.map(p => ({
        id: p.id, thumb: p.urls.small, regular: p.urls.regular,
        full: p.urls.full, alt: p.alt_description, author: p.user.name,
      })),
      total: data.total || photos.length,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Admin ────────────────────────────────────────────────────────────────
exports.adminStats = async (req, res) => {
  try {
    const [totalProjects, totalTemplates, totalMedia] = await Promise.all([
      DesignProject.countDocuments(),
      DesignTemplate.countDocuments(),
      DesignMedia.countDocuments(),
    ]);
    res.json({ success: true, stats: { totalProjects, totalTemplates, totalMedia } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
