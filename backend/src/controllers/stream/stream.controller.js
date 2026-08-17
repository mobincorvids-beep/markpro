const Stream = require('../../models/Stream.model');
const crypto = require('crypto');

// GET /api/streams
exports.getStreams = async (req, res) => {
  try {
    const streams = await Stream.find({ user: req.user._id })
      .populate('accounts', 'label network color accountId isActive')
      .sort({ createdAt: -1 });
    res.json({ success: true, streams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/streams
exports.createStream = async (req, res) => {
  try {
    const { name, accounts, layout, theme, postsPerPage, showFilter, showSearch, showSharing, networks, isPublic } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const embedCode = crypto.randomBytes(16).toString('hex');
    const stream = await Stream.create({
      user: req.user._id,
      name,
      accounts: accounts || [],
      layout: layout || 'wall',
      theme: theme || 'modern',
      postsPerPage: postsPerPage || 20,
      showFilter: showFilter !== false,
      showSearch: showSearch !== false,
      showSharing: showSharing !== false,
      networks: networks || [],
      isPublic: isPublic || false,
      embedCode,
    });

    await stream.populate('accounts', 'label network color accountId isActive');
    res.status(201).json({ success: true, stream });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/streams/:id
exports.updateStream = async (req, res) => {
  try {
    const stream = await Stream.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body },
      { new: true }
    ).populate('accounts', 'label network color accountId isActive');

    if (!stream) return res.status(404).json({ success: false, message: 'Stream not found' });
    res.json({ success: true, stream });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/streams/:id
exports.deleteStream = async (req, res) => {
  try {
    const stream = await Stream.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!stream) return res.status(404).json({ success: false, message: 'Stream not found' });
    res.json({ success: true, message: 'Stream deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/streams/public/:embedCode  - public embed endpoint (no auth)
exports.getPublicStream = async (req, res) => {
  try {
    const stream = await Stream.findOne({ embedCode: req.params.embedCode, isPublic: true })
      .populate('accounts', 'label network color accountId');
    if (!stream) return res.status(404).json({ success: false, message: 'Stream not found' });
    res.json({ success: true, stream });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
