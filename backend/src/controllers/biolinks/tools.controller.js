const QRCode   = require('qrcode');
const { QrCode, Pixel, Project, Domain, Link } = require('../../models/BioLinks.models');

// ══════════════════════════════════════════════════════════════════════
//  QR CODES
// ══════════════════════════════════════════════════════════════════════

exports.getQrCodes = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      QrCode.find({ user_id: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(+limit),
      QrCode.countDocuments({ user_id: req.user._id }),
    ]);
    res.json({ status: 'success', data, total });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createQrCode = async (req, res) => {
  try {
    const count = await QrCode.countDocuments({ user_id: req.user._id });
    const limit = req.user.plan_settings?.qr_codes_limit ?? 1;
    if (limit !== -1 && count >= limit)
      return res.json({ status: 'error', message: `Plan limit of ${limit} QR codes reached.` });

    const { name, type = 'url', data, settings = {} } = req.body;
    if (!name || !data) return res.json({ status: 'error', message: 'name and data are required.' });

    // Generate QR PNG as data URL
    const qrDataUrl = await QRCode.toDataURL(data, {
      width:  settings.size || 400,
      color: { dark: settings.foreground_color || '#000000', light: settings.background_color || '#ffffff' },
      errorCorrectionLevel: settings.error_correction_level || 'M',
    });

    const qr = await QrCode.create({
      user_id:    req.user._id,
      name, type, data,
      settings: { ...settings, qr_data_url: qrDataUrl },
    });
    res.json({ status: 'success', message: 'QR code created.', data: qr });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

exports.updateQrCode = async (req, res) => {
  try {
    const qr = await QrCode.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!qr) return res.json({ status: 'error', message: 'QR code not found.' });

    const { name, data, settings } = req.body;
    if (name)     qr.name = name;
    if (settings) qr.settings = { ...qr.settings, ...settings };
    if (data) {
      qr.data = data;
      qr.settings.qr_data_url = await QRCode.toDataURL(data);
    }
    await qr.save();
    res.json({ status: 'success', message: 'QR code updated.', data: qr });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteQrCode = async (req, res) => {
  try {
    const qr = await QrCode.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
    if (!qr) return res.json({ status: 'error', message: 'QR code not found.' });
    res.json({ status: 'success', message: 'QR code deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ══════════════════════════════════════════════════════════════════════
//  PIXELS
// ══════════════════════════════════════════════════════════════════════

exports.getPixels = async (req, res) => {
  try {
    const data = await Pixel.find({ user_id: req.user._id }).sort({ createdAt: -1 });
    res.json({ status: 'success', data });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createPixel = async (req, res) => {
  try {
    const count = await Pixel.countDocuments({ user_id: req.user._id });
    const limit = req.user.plan_settings?.pixels_limit ?? 0;
    if (limit !== -1 && count >= limit)
      return res.json({ status: 'error', message: `Plan limit of ${limit} pixels reached.` });

    const { type, name, pixel } = req.body;
    if (!type || !name || !pixel) return res.json({ status: 'error', message: 'type, name and pixel are required.' });

    const px = await Pixel.create({ user_id: req.user._id, type, name, pixel });
    res.json({ status: 'success', message: 'Pixel created.', data: px });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updatePixel = async (req, res) => {
  try {
    const px = await Pixel.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      req.body, { new: true }
    );
    if (!px) return res.json({ status: 'error', message: 'Pixel not found.' });
    res.json({ status: 'success', message: 'Pixel updated.', data: px });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deletePixel = async (req, res) => {
  try {
    await Pixel.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
    res.json({ status: 'success', message: 'Pixel deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ══════════════════════════════════════════════════════════════════════
//  PROJECTS
// ══════════════════════════════════════════════════════════════════════

exports.getProjects = async (req, res) => {
  try {
    const data = await Project.find({ user_id: req.user._id }).sort({ createdAt: -1 });
    res.json({ status: 'success', data });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createProject = async (req, res) => {
  try {
    const count = await Project.countDocuments({ user_id: req.user._id });
    const limit = req.user.plan_settings?.projects_limit ?? 1;
    if (limit !== -1 && count >= limit)
      return res.json({ status: 'error', message: `Plan limit of ${limit} projects reached.` });

    const { name, color, description } = req.body;
    if (!name) return res.json({ status: 'error', message: 'Project name is required.' });
    const project = await Project.create({ user_id: req.user._id, name, color, description });
    res.json({ status: 'success', message: 'Project created.', data: project });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      req.body, { new: true }
    );
    if (!project) return res.json({ status: 'error', message: 'Project not found.' });
    res.json({ status: 'success', message: 'Project updated.', data: project });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteProject = async (req, res) => {
  try {
    await Project.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
    await Link.updateMany({ user_id: req.user._id, project_id: req.params.id }, { project_id: null });
    res.json({ status: 'success', message: 'Project deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ══════════════════════════════════════════════════════════════════════
//  DOMAINS
// ══════════════════════════════════════════════════════════════════════

exports.getDomains = async (req, res) => {
  try {
    const data = await Domain.find({ user_id: req.user._id }).sort({ createdAt: -1 });
    res.json({ status: 'success', data });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createDomain = async (req, res) => {
  try {
    const count = await Domain.countDocuments({ user_id: req.user._id });
    const limit = req.user.plan_settings?.domains_limit ?? 0;
    if (limit !== -1 && count >= limit)
      return res.json({ status: 'error', message: `Plan limit of ${limit} custom domains reached.` });

    const { host, scheme = 'https://' } = req.body;
    if (!host) return res.json({ status: 'error', message: 'Domain host is required.' });

    const exists = await Domain.findOne({ host });
    if (exists) return res.json({ status: 'error', message: 'This domain is already registered.' });

    const domain = await Domain.create({ user_id: req.user._id, host, scheme });
    res.json({ status: 'success', message: 'Domain added.', data: domain });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateDomain = async (req, res) => {
  try {
    const domain = await Domain.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      req.body, { new: true }
    );
    if (!domain) return res.json({ status: 'error', message: 'Domain not found.' });
    res.json({ status: 'success', message: 'Domain updated.', data: domain });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteDomain = async (req, res) => {
  try {
    await Domain.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
    await Link.updateMany({ user_id: req.user._id, domain_id: req.params.id }, { domain_id: null });
    res.json({ status: 'success', message: 'Domain deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ══════════════════════════════════════════════════════════════════════
//  COUPON / REDEEM CODE (user-facing)
// ══════════════════════════════════════════════════════════════════════

exports.redeemCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.json({ status: 'error', message: 'Code is required.' });

    const { Code, Plan } = require('../../models/BioLinks.models');

    const codeDoc = await Code.findOne({ code: code.trim().toUpperCase(), status: 1 });
    if (!codeDoc) return res.json({ status: 'error', message: 'Invalid or expired code.' });

    // Check if already redeemed (for single-use codes)
    if (codeDoc.total_use_limit !== -1 && codeDoc.redeemed_times >= codeDoc.total_use_limit)
      return res.json({ status: 'error', message: 'This code has reached its usage limit.' });

    // Check expiry
    if (codeDoc.expire_date && new Date(codeDoc.expire_date) < new Date())
      return res.json({ status: 'error', message: 'This code has expired.' });

    const user = req.user;

    if (codeDoc.type === 'coupon') {
      // Apply discount to next subscription checkout - store coupon on user
      await require('../../models/BioLinks.models').User.findByIdAndUpdate(user._id, {
        coupon_code: code.trim().toUpperCase(),
        coupon_discount: codeDoc.discount || 0,
      });
      await Code.findByIdAndUpdate(codeDoc._id, { $inc: { redeemed_times: 1 } });
      return res.json({ status: 'success', message: `Coupon applied! ${codeDoc.discount || 0}% discount on your next plan.`, type: 'coupon', discount: codeDoc.discount });
    }

    if (codeDoc.type === 'redeem') {
      // Upgrade user to the plan attached to this code
      if (!codeDoc.plan_id) return res.json({ status: 'error', message: 'No plan attached to this code.' });
      const plan = await Plan.findById(codeDoc.plan_id);
      if (!plan) return res.json({ status: 'error', message: 'Plan not found.' });

      const now     = new Date();
      const expiry  = codeDoc.plan_expiry_days > 0
        ? new Date(now.getTime() + codeDoc.plan_expiry_days * 86400000)
        : null;

      await require('../../models/BioLinks.models').User.findByIdAndUpdate(user._id, {
        plan_id:       plan._id,
        plan_expiry:   expiry,
        plan_settings: plan.settings,
      });

      await Code.findByIdAndUpdate(codeDoc._id, { $inc: { redeemed_times: 1 } });
      return res.json({ status: 'success', message: `Plan "${plan.name}" activated!`, type: 'redeem', plan: plan.name, expiresAt: expiry });
    }

    res.json({ status: 'error', message: 'Unknown code type.' });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};
