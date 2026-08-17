const { BiolinkBlock, Link, TrackLink, EmailCollector } = require('../../models/BioLinks.models');

const VALID_BLOCK_TYPES = [
  'link','big_link','header','avatar','text','html','image','image_grid',
  'divider','socials','email_collector','video','audio','file','pdf_document',
  'countdown','map','tweet','spotify','soundcloud','youtube','tiktok',
  'instagram_media','review','vcard','paypal_payment','discord','whatsapp',
  'telegram','phone','email','address','cta','faq','alert','newsletter','product',
];

// ── Get all blocks for a biolink ──────────────────────────────────────────
exports.getBlocks = async (req, res) => {
  try {
    const { link_id } = req.params;
    const link = await Link.findOne({ _id: link_id, user_id: req.user._id, type: 'biolink' });
    if (!link) return res.json({ status: 'error', message: 'Biolink not found.' });

    const blocks = await BiolinkBlock.find({ link_id }).sort({ order: 1 }).lean();
    res.json({ status: 'success', data: blocks });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Create block ──────────────────────────────────────────────────────────
exports.createBlock = async (req, res) => {
  try {
    const { link_id, type, settings = {} } = req.body;
    if (!link_id || !type) return res.json({ status: 'error', message: 'link_id and type are required.' });
    if (!VALID_BLOCK_TYPES.includes(type)) return res.json({ status: 'error', message: 'Invalid block type.' });

    const link = await Link.findOne({ _id: link_id, user_id: req.user._id, type: 'biolink' });
    if (!link) return res.json({ status: 'error', message: 'Biolink not found.' });

    // Check plan allows this block type
    const enabledBlocks = req.user.plan_settings?.enabled_biolink_blocks;
    if (enabledBlocks && !enabledBlocks.includes(type)) {
      return res.json({ status: 'error', message: 'Your plan does not include this block type.' });
    }

    const maxOrder = await BiolinkBlock.findOne({ link_id }).sort({ order: -1 }).select('order');
    const order    = (maxOrder?.order ?? -1) + 1;

    const block = await BiolinkBlock.create({
      link_id, user_id: req.user._id,
      type, settings, order,
    });

    res.json({ status: 'success', message: 'Block created.', data: block });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get single block ──────────────────────────────────────────────────────
exports.getBlock = async (req, res) => {
  try {
    const block = await BiolinkBlock.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!block) return res.json({ status: 'error', message: 'Block not found.' });
    res.json({ status: 'success', data: block });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Update block ──────────────────────────────────────────────────────────
exports.updateBlock = async (req, res) => {
  try {
    const block = await BiolinkBlock.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!block) return res.json({ status: 'error', message: 'Block not found.' });

    if (req.body.settings !== undefined) block.settings  = { ...block.settings, ...req.body.settings };
    if (req.body.is_enabled !== undefined) block.is_enabled = req.body.is_enabled;

    await block.save();
    res.json({ status: 'success', message: 'Block updated.', data: block });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Delete block ──────────────────────────────────────────────────────────
exports.deleteBlock = async (req, res) => {
  try {
    const block = await BiolinkBlock.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!block) return res.json({ status: 'error', message: 'Block not found.' });
    await TrackLink.deleteMany({ biolink_block_id: block._id });
    await block.deleteOne();
    res.json({ status: 'success', message: 'Block deleted.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Toggle block enabled ──────────────────────────────────────────────────
exports.toggleBlock = async (req, res) => {
  try {
    const block = await BiolinkBlock.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!block) return res.json({ status: 'error', message: 'Block not found.' });
    block.is_enabled = !block.is_enabled;
    await block.save();
    res.json({ status: 'success', data: { is_enabled: block.is_enabled } });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Duplicate block ───────────────────────────────────────────────────────
exports.duplicateBlock = async (req, res) => {
  try {
    const orig = await BiolinkBlock.findOne({ _id: req.params.id, user_id: req.user._id }).lean();
    if (!orig) return res.json({ status: 'error', message: 'Block not found.' });
    delete orig._id; delete orig.createdAt; delete orig.updatedAt;
    orig.clicks  = 0;
    orig.order  += 1;
    const dupe   = await BiolinkBlock.create(orig);
    res.json({ status: 'success', message: 'Block duplicated.', data: dupe });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Reorder blocks ────────────────────────────────────────────────────────
exports.reorderBlocks = async (req, res) => {
  try {
    const { link_id, blocks } = req.body; // blocks = [{ id, order }]
    const link = await Link.findOne({ _id: link_id, user_id: req.user._id });
    if (!link) return res.json({ status: 'error', message: 'Biolink not found.' });

    for (const b of blocks) {
      await BiolinkBlock.findByIdAndUpdate(b.id, { order: b.order });
    }
    res.json({ status: 'success', message: 'Order saved.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Block statistics ──────────────────────────────────────────────────────
exports.getBlockStats = async (req, res) => {
  try {
    const block = await BiolinkBlock.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!block) return res.json({ status: 'error', message: 'Block not found.' });

    const { start_date, end_date } = req.query;
    const dateFilter = {};
    if (start_date) dateFilter.$gte = new Date(start_date);
    if (end_date)   dateFilter.$lte = new Date(end_date);

    const matchQuery = { biolink_block_id: block._id };
    if (Object.keys(dateFilter).length) matchQuery.createdAt = dateFilter;

    const [totalClicks, byDay] = await Promise.all([
      TrackLink.countDocuments(matchQuery),
      TrackLink.aggregate([
        { $match: matchQuery },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, clicks: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({ status: 'success', data: { totalClicks, byDay, block } });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Email collector submit (public) ──────────────────────────────────────
exports.submitEmail = async (req, res) => {
  try {
    const { block_id, email } = req.body;
    const block = await BiolinkBlock.findById(block_id);
    if (!block || block.type !== 'email_collector') return res.json({ status: 'error', message: 'Invalid.' });

    const exists = await EmailCollector.findOne({ biolink_block_id: block_id, email });
    if (exists) return res.json({ status: 'error', message: 'Already subscribed.' });

    await EmailCollector.create({
      biolink_block_id: block_id,
      link_id:  block.link_id,
      user_id:  block.user_id,
      email,
    });

    block.clicks += 1;
    await block.save();

    res.json({ status: 'success', message: 'Subscribed successfully.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};
