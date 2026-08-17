const { v4: uuidv4 } = require('uuid');
const { Link, BiolinkBlock, Domain, Project, Pixel, TrackLink, BiolinkTheme } = require('../../models/BioLinks.models');

// ── Helpers ───────────────────────────────────────────────────────────────
const generateSlug = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const ensureUniqueSlug = async (slug) => {
  let s = slug;
  while (await Link.exists({ url: s })) s = generateSlug();
  return s;
};

// ── List links ────────────────────────────────────────────────────────────
exports.getLinks = async (req, res) => {
  try {
    const { type, project_id, search, page = 1, limit = 20, order_by = 'createdAt', order = 'desc' } = req.query;
    const query = { user_id: req.user._id };
    if (type)       query.type = type;
    if (project_id) query.project_id = project_id;
    if (search)     query.$or = [{ url: { $regex: search, $options: 'i' } }, { 'settings.name': { $regex: search, $options: 'i' } }];

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const sort  = { [order_by]: order === 'asc' ? 1 : -1 };
    const [links, total] = await Promise.all([
      Link.find(query).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      Link.countDocuments(query),
    ]);

    res.json({ status: 'success', data: links, total, page: +page, limit: +limit });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get single link ───────────────────────────────────────────────────────
exports.getLink = async (req, res) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, user_id: req.user._id }).lean();
    if (!link) return res.json({ status: 'error', message: 'Link not found.' });
    res.json({ status: 'success', data: link });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Create shortener link ─────────────────────────────────────────────────
exports.createShortLink = async (req, res) => {
  try {
    const { location_url, url, project_id, domain_id, pixels_ids, settings = {} } = req.body;
    if (!location_url) return res.json({ status: 'error', message: 'Destination URL is required.' });

    // Plan limit check
    const count = await Link.countDocuments({ user_id: req.user._id, type: 'link' });
    const limit = req.user.plan_settings?.links_limit ?? 5;
    if (limit !== -1 && count >= limit)
      return res.json({ status: 'error', message: `You have reached your plan limit of ${limit} links.` });

    const slug = url ? await ensureUniqueSlug(url) : await ensureUniqueSlug(generateSlug());

    const link = await Link.create({
      user_id:      req.user._id,
      type:         'link',
      url:          slug,
      location_url,
      project_id:   project_id || null,
      domain_id:    domain_id  || null,
      pixels_ids:   pixels_ids || [],
      settings,
    });

    res.json({ status: 'success', message: 'Link created.', data: link });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Create biolink ────────────────────────────────────────────────────────
exports.createBiolink = async (req, res) => {
  try {
    const { url, name, domain_id, project_id, settings = {} } = req.body;
    if (!name) return res.json({ status: 'error', message: 'Name is required.' });

    const count = await Link.countDocuments({ user_id: req.user._id, type: 'biolink' });
    const limit = req.user.plan_settings?.biolinks_limit ?? 1;
    if (limit !== -1 && count >= limit)
      return res.json({ status: 'error', message: `You have reached your plan limit of ${limit} biolinks.` });

    const slug = url ? await ensureUniqueSlug(url) : await ensureUniqueSlug(generateSlug(8));

    const link = await Link.create({
      user_id:  req.user._id,
      type:     'biolink',
      url:      slug,
      domain_id:  domain_id  || null,
      project_id: project_id || null,
      settings: {
        name,
        description: '',
        avatar: '',
        background_type: 'color',
        background: '#ffffff',
        block_background: '#f3f4f6',
        font_family: 'Inter',
        font_color: '#111827',
        is_removable_branding_enabled: false,
        seo: { title: name, description: '', image: '' },
        ...settings,
      },
    });

    res.json({ status: 'success', message: 'Biolink created.', data: link });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Update link ───────────────────────────────────────────────────────────
exports.updateLink = async (req, res) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!link) return res.json({ status: 'error', message: 'Link not found.' });

    const allowedFields = ['location_url', 'project_id', 'domain_id', 'pixels_ids', 'settings', 'is_enabled', 'start_date', 'end_date'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) link[field] = req.body[field];
    }

    // Handle URL change
    if (req.body.url && req.body.url !== link.url) {
      const taken = await Link.findOne({ url: req.body.url, _id: { $ne: link._id } });
      if (taken) return res.json({ status: 'error', message: 'This URL is already taken.' });
      link.url = req.body.url;
    }

    await link.save();
    res.json({ status: 'success', message: 'Link updated.', data: link });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Delete link ───────────────────────────────────────────────────────────
exports.deleteLink = async (req, res) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!link) return res.json({ status: 'error', message: 'Link not found.' });

    if (link.type === 'biolink') {
      await BiolinkBlock.deleteMany({ link_id: link._id });
    }
    await TrackLink.deleteMany({ link_id: link._id });
    await link.deleteOne();

    res.json({ status: 'success', message: 'Link deleted.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Toggle enabled/disabled ───────────────────────────────────────────────
exports.toggleLink = async (req, res) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!link) return res.json({ status: 'error', message: 'Link not found.' });
    link.is_enabled = !link.is_enabled;
    await link.save();
    res.json({ status: 'success', data: { is_enabled: link.is_enabled } });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Duplicate link ────────────────────────────────────────────────────────
exports.duplicateLink = async (req, res) => {
  try {
    const orig = await Link.findOne({ _id: req.params.id, user_id: req.user._id }).lean();
    if (!orig) return res.json({ status: 'error', message: 'Link not found.' });
    delete orig._id; delete orig.createdAt; delete orig.updatedAt;
    orig.url = await ensureUniqueSlug(generateSlug());
    orig.clicks = 0;
    const dupe = await Link.create(orig);

    if (dupe.type === 'biolink') {
      const blocks = await BiolinkBlock.find({ link_id: req.params.id }).lean();
      for (const block of blocks) {
        delete block._id; delete block.createdAt; delete block.updatedAt;
        block.link_id = dupe._id;
        block.clicks  = 0;
        await BiolinkBlock.create(block);
      }
    }

    res.json({ status: 'success', message: 'Link duplicated.', data: dupe });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Public redirect handler ───────────────────────────────────────────────
exports.redirectLink = async (req, res) => {
  try {
    const { slug } = req.params;
    const link = await Link.findOne({ url: slug, is_enabled: true });

    if (!link) return res.status(404).json({ status: 'error', message: 'Link not found.' });

    // Record click
    link.clicks += 1;
    link.last_datetime = new Date();
    await link.save();

    await TrackLink.create({
      link_id:  link._id,
      user_id:  link.user_id,
      referrer_host: req.headers.referer || '',
      os_name:  req.headers['user-agent'] || '',
    });

    if (link.type === 'link') {
      return res.json({ status: 'success', data: { type: 'redirect', url: link.location_url } });
    }

    if (link.type === 'biolink') {
      const blocks = await BiolinkBlock.find({ link_id: link._id, is_enabled: true }).sort({ order: 1 }).lean();
      return res.json({ status: 'success', data: { type: 'biolink', link, blocks } });
    }

    res.json({ status: 'success', data: link });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error.' });
  }
};
