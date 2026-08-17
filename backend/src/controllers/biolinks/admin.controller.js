const bcrypt = require('bcryptjs');
const { User, Plan, Link, BiolinkBlock, BiolinkTheme, BiolinkTemplate,
  BiolinkTemplateCategory, Settings, Payment, Code, Domain } = require('../../models/BioLinks.models');

// ── Users ──────────────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20, status } = req.query;
    const query = { is_admin: false };
    if (status !== undefined) query.status = +status;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(+limit)
        .select('-password -lost_password_code -twofa_secret').lean(),
      User.countDocuments(query),
    ]);
    res.json({ status: 'success', data: users, total, page: +page });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -lost_password_code -twofa_secret').lean();
    if (!user) return res.json({ status: 'error', message: 'User not found.' });
    res.json({ status: 'success', data: user });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, is_admin = false, status = 1 } = req.body;
    const exists = await User.findOne({ email: email?.toLowerCase() });
    if (exists) return res.json({ status: 'error', message: 'Email already registered.' });
    const hashed = await bcrypt.hash(password, 12);
    const crypto = require('crypto');
    const user = await User.create({
      name, email: email.toLowerCase(), password: hashed,
      api_key: crypto.randomBytes(16).toString('hex'),
      referral_key: crypto.randomBytes(12).toString('hex'),
      is_admin, status,
    });
    res.json({ status: 'success', message: 'User created.', data: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    if (password) rest.password = await bcrypt.hash(password, 12);
    const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true })
      .select('-password -lost_password_code -twofa_secret');
    if (!user) return res.json({ status: 'error', message: 'User not found.' });
    res.json({ status: 'success', message: 'User updated.', data: user });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Link.deleteMany({ user_id: req.params.id });
    await BiolinkBlock.deleteMany({ user_id: req.params.id });
    res.json({ status: 'success', message: 'User deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await User.findByIdAndUpdate(req.params.id, { status });
    res.json({ status: 'success', message: 'Status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.assignPlan = async (req, res) => {
  try {
    const { plan_id, plan_type, expiry_days } = req.body;
    const plan = await Plan.findById(plan_id);
    if (!plan) return res.json({ status: 'error', message: 'Plan not found.' });
    let plan_expiry = null;
    if (plan_type !== 'lifetime' && expiry_days) {
      plan_expiry = new Date();
      plan_expiry.setDate(plan_expiry.getDate() + +expiry_days);
    } else if (plan_type === 'lifetime') {
      plan_expiry = new Date('2099-12-31');
    }
    await User.findByIdAndUpdate(req.params.id, {
      plan_id, plan_type, plan_expiry,
      plan_settings: plan.settings,
    });
    res.json({ status: 'success', message: 'Plan assigned.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Plans ──────────────────────────────────────────────────────────────────
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ order: 1 });
    res.json({ status: 'success', data: plans });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createPlan = async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.json({ status: 'success', message: 'Plan created.', data: plan });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.json({ status: 'error', message: 'Plan not found.' });
    res.json({ status: 'success', message: 'Plan updated.', data: plan });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deletePlan = async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Plan deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Biolink Themes ─────────────────────────────────────────────────────────
exports.getThemes = async (req, res) => {
  try {
    const themes = await BiolinkTheme.find().sort({ order: 1 });
    res.json({ status: 'success', data: themes });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createTheme = async (req, res) => {
  try {
    const theme = await BiolinkTheme.create(req.body);
    res.json({ status: 'success', message: 'Theme created.', data: theme });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateTheme = async (req, res) => {
  try {
    const theme = await BiolinkTheme.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!theme) return res.json({ status: 'error', message: 'Theme not found.' });
    res.json({ status: 'success', message: 'Theme updated.', data: theme });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteTheme = async (req, res) => {
  try {
    await BiolinkTheme.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Theme deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Biolink Templates ──────────────────────────────────────────────────────
exports.getTemplates = async (req, res) => {
  try {
    const templates = await BiolinkTemplate.find().sort({ order: 1 });
    const categories = await BiolinkTemplateCategory.find().sort({ order: 1 });
    res.json({ status: 'success', data: { templates, categories } });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createTemplate = async (req, res) => {
  try {
    const t = await BiolinkTemplate.create(req.body);
    res.json({ status: 'success', message: 'Template created.', data: t });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateTemplate = async (req, res) => {
  try {
    const t = await BiolinkTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!t) return res.json({ status: 'error', message: 'Template not found.' });
    res.json({ status: 'success', message: 'Template updated.', data: t });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteTemplate = async (req, res) => {
  try {
    await BiolinkTemplate.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Template deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Template Categories ────────────────────────────────────────────────────
exports.getTemplateCategories = async (req, res) => {
  try {
    const cats = await BiolinkTemplateCategory.find().sort({ order: 1 });
    res.json({ status: 'success', data: cats });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createTemplateCategory = async (req, res) => {
  try {
    const cat = await BiolinkTemplateCategory.create(req.body);
    res.json({ status: 'success', message: 'Category created.', data: cat });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateTemplateCategory = async (req, res) => {
  try {
    const cat = await BiolinkTemplateCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ status: 'success', data: cat });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteTemplateCategory = async (req, res) => {
  try {
    await BiolinkTemplateCategory.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Category deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Settings ───────────────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    res.json({ status: 'success', data: settings || {} });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (settings) {
      // Deep merge each section
      for (const [key, val] of Object.entries(req.body)) {
        if (typeof val === 'object' && !Array.isArray(val)) {
          settings[key] = { ...settings[key]?.toObject?.() ?? settings[key] ?? {}, ...val };
        } else {
          settings[key] = val;
        }
      }
      await settings.save();
    } else {
      settings = await Settings.create(req.body);
    }
    res.json({ status: 'success', message: 'Settings updated.', data: settings });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Payments ───────────────────────────────────────────────────────────────
exports.getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      Payment.find().sort({ createdAt: -1 }).skip(skip).limit(+limit)
        .populate('user_id', 'name email')
        .populate('plan_id', 'name monthly_price'),
      Payment.countDocuments(),
    ]);
    res.json({ status: 'success', data: payments, total });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Codes ──────────────────────────────────────────────────────────────────
exports.getCodes = async (req, res) => {
  try {
    const codes = await Code.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data: codes });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createCode = async (req, res) => {
  try {
    const code = await Code.create(req.body);
    res.json({ status: 'success', message: 'Code created.', data: code });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateCode = async (req, res) => {
  try {
    const code = await Code.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ status: 'success', data: code });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteCode = async (req, res) => {
  try {
    await Code.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Code deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Domains (admin) ────────────────────────────────────────────────────────
exports.getAdminDomains = async (req, res) => {
  try {
    const domains = await Domain.find().sort({ createdAt: -1 }).populate('user_id', 'name email');
    res.json({ status: 'success', data: domains });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createAdminDomain = async (req, res) => {
  try {
    const domain = await Domain.create({ ...req.body, type: 1 }); // type=1 = system domain
    res.json({ status: 'success', message: 'System domain added.', data: domain });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteAdminDomain = async (req, res) => {
  try {
    await Domain.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Domain deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};
