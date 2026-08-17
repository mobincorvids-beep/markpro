const {
  Users, Campaigns, Templates, TemplatePage, TemplateSection, TemplateCategory,
  Theme, SocialPack, SocialType, Plans, OrderList, AdminSettings, Coupons,
} = require('../../models/bio.models');
const Common = require('../../utils/common');

// ── Users ─────────────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { role: { $ne: 1 } };
    if (search) query.$text = { $search: search };
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      Users.find(query).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Users.countDocuments(query),
    ]);
    res.json({ status: 'success', data: users, total, page: Number(page), limit: Number(limit) });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    await Users.findByIdAndUpdate(id, { status });
    res.json({ status: 'success', message: 'User status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await Users.findByIdAndDelete(id);
    await Campaigns.deleteMany({ userId: id });
    res.json({ status: 'success', message: 'User deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateUser = async (req, res) => {
  try {
    const { id, name, email, status } = req.body;
    await Users.findByIdAndUpdate(id, { name, email, status });
    res.json({ status: 'success', message: 'User updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.assignPlan = async (req, res) => {
  try {
    const { user_id, plan_id } = req.body;
    const plan = await Plans.findById(plan_id);
    if (!plan) return res.json({ status: 'error', message: 'Plan not found.' });
    let validityDate = new Date();
    if (plan.validityType === 'Lifetime') validityDate = new Date('2099-12-31');
    else if (plan.validity) validityDate.setDate(validityDate.getDate() + plan.validity);
    await Users.findByIdAndUpdate(user_id, {
      planName: plan.planname, validityDate,
      $addToSet: { accessLevel: plan._id },
    });
    res.json({ status: 'success', message: 'Plan assigned.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Plans ─────────────────────────────────────────────────────────────────
exports.addPlan = async (req, res) => {
  try {
    const plan = await Plans.create(req.body);
    res.json({ status: 'success', message: 'Plan created.', data: plan });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updatePlanStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    await Plans.findByIdAndUpdate(id, { status });
    res.json({ status: 'success', message: 'Plan status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    await Plans.findByIdAndDelete(id);
    res.json({ status: 'success', message: 'Plan deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Templates ─────────────────────────────────────────────────────────────
exports.getTemplates = async (req, res) => {
  try {
    const templates = await Templates.find().sort({ sort: 1 });
    res.json({ status: 'success', data: templates });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createTemplate = async (req, res) => {
  try {
    const template = await Templates.create(req.body);
    res.json({ status: 'success', message: 'Template created.', data: template });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.saveTemplate = async (req, res) => {
  try {
    const { id, ...update } = req.body;
    await Templates.findByIdAndUpdate(id, update);
    res.json({ status: 'success', message: 'Template saved.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateTemplateStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    await Templates.findByIdAndUpdate(id, { status });
    res.json({ status: 'success', message: 'Template status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    await Templates.findByIdAndDelete(id);
    await TemplatePage.deleteMany({ templateId: id });
    await TemplateSection.deleteMany({ templateId: id });
    res.json({ status: 'success', message: 'Template deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.getTemplatePages = async (req, res) => {
  try {
    const pages = await TemplatePage.find({ templateId: req.query.template_id }).sort({ sort: 1 });
    res.json({ status: 'success', data: pages });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createTemplatePage = async (req, res) => {
  try {
    const { template_id, title } = req.body;
    const count = await TemplatePage.countDocuments({ templateId: template_id });
    const page = await TemplatePage.create({
      templateId: template_id, title,
      sort: count + 1, slug: Common.generateSlug(title), status: 1,
    });
    res.json({ status: 'success', message: 'Page created.', data: page });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.saveTemplatePage = async (req, res) => {
  try {
    const { id, ...update } = req.body;
    await TemplatePage.findByIdAndUpdate(id, update);
    res.json({ status: 'success', message: 'Page saved.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.getTemplatePage = async (req, res) => {
  try {
    const page = await TemplatePage.findById(req.params.id);
    res.json({ status: 'success', data: page });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Template Categories ────────────────────────────────────────────────────
exports.getCategories = async (req, res) => {
  try {
    const cats = await TemplateCategory.find().sort({ sort: 1 });
    res.json({ status: 'success', data: cats });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateTemplateCategory = async (req, res) => {
  try {
    const { id, ...update } = req.body;
    if (id) {
      await TemplateCategory.findByIdAndUpdate(id, update);
      return res.json({ status: 'success', message: 'Category updated.' });
    }
    const cat = await TemplateCategory.create(req.body);
    res.json({ status: 'success', message: 'Category created.', data: cat });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteTemplateCategory = async (req, res) => {
  try {
    await TemplateCategory.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Category deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateTemplateCategoryStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    await TemplateCategory.findByIdAndUpdate(id, { status });
    res.json({ status: 'success', message: 'Status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Themes ────────────────────────────────────────────────────────────────
exports.getTheme = async (req, res) => {
  try {
    const themes = await Theme.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data: themes });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.addTheme = async (req, res) => {
  try {
    const theme = await Theme.create(req.body);
    res.json({ status: 'success', message: 'Theme created.', data: theme });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.editTheme = async (req, res) => {
  try {
    const { id, ...update } = req.body;
    await Theme.findByIdAndUpdate(id, update);
    res.json({ status: 'success', message: 'Theme updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateThemeStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    await Theme.findByIdAndUpdate(id, { status });
    res.json({ status: 'success', message: 'Theme status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteTheme = async (req, res) => {
  try {
    await Theme.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Theme deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Social Pack / Type ─────────────────────────────────────────────────────
exports.getSocialTypes = async (req, res) => {
  try {
    const types = await SocialType.find().sort({ sort: 1 });
    res.json({ status: 'success', data: types });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.addSocialType = async (req, res) => {
  try {
    const t = await SocialType.create(req.body);
    res.json({ status: 'success', data: t });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateSocialType = async (req, res) => {
  try {
    const { id, ...update } = req.body;
    await SocialType.findByIdAndUpdate(id, update);
    res.json({ status: 'success', message: 'Social type updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateSocialTypeStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    await SocialType.findByIdAndUpdate(id, { status });
    res.json({ status: 'success', message: 'Status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteSocialType = async (req, res) => {
  try {
    await SocialType.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Social type deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.getSocialPacks = async (req, res) => {
  try {
    const packs = await SocialPack.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data: packs });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.getSocialPack = async (req, res) => {
  try {
    const pack = await SocialPack.findById(req.params.id);
    const types = await SocialType.find({ packId: req.params.id });
    res.json({ status: 'success', data: { pack, types } });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.addSocialPack = async (req, res) => {
  try {
    const pack = await SocialPack.create(req.body);
    res.json({ status: 'success', data: pack });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateSocialPack = async (req, res) => {
  try {
    const { id, ...update } = req.body;
    await SocialPack.findByIdAndUpdate(id, update);
    res.json({ status: 'success', message: 'Social pack updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateSocialPackStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    await SocialPack.findByIdAndUpdate(id, { status });
    res.json({ status: 'success', message: 'Status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteSocialPack = async (req, res) => {
  try {
    await SocialPack.findByIdAndDelete(req.params.id);
    await SocialType.deleteMany({ packId: req.params.id });
    res.json({ status: 'success', message: 'Social pack deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Admin Settings ─────────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const settings = await AdminSettings.findOne();
    res.json({ status: 'success', data: settings });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await AdminSettings.findOne();
    if (settings) {
      await AdminSettings.findByIdAndUpdate(settings._id, req.body);
    } else {
      await AdminSettings.create(req.body);
    }
    res.json({ status: 'success', message: 'Settings updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateEmailSettings = async (req, res) => {
  try {
    const { emailService, smtpHost, smtpPort, smtpUsername, smtpPassword, smtpFrom, sendgridKey, mandrillKey } = req.body;
    let settings = await AdminSettings.findOne();
    const update = { emailService, smtpHost, smtpPort, smtpUsername, smtpFrom };
    if (smtpPassword) update.smtpPassword = smtpPassword;
    if (sendgridKey) update.sendgridKey = sendgridKey;
    if (mandrillKey) update.mandrillKey = mandrillKey;
    if (settings) await AdminSettings.findByIdAndUpdate(settings._id, update);
    else await AdminSettings.create(update);
    res.json({ status: 'success', message: 'Email settings updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Coupons ────────────────────────────────────────────────────────────────
exports.addCoupon = async (req, res) => {
  try {
    const coupon = await Coupons.create(req.body);
    res.json({ status: 'success', message: 'Coupon created.', data: coupon });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateCouponStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    await Coupons.findByIdAndUpdate(id, { status });
    res.json({ status: 'success', message: 'Coupon status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteCoupon = async (req, res) => {
  try {
    await Coupons.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Coupon deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Payments ───────────────────────────────────────────────────────────────
exports.getPendingPayments = async (req, res) => {
  try {
    const orders = await OrderList.find({ status: 0 })
      .populate('customer_id', 'name email')
      .populate('plan_id', 'planname price')
      .sort({ createdAt: -1 });
    res.json({ status: 'success', data: orders });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    const order = await OrderList.findByIdAndUpdate(id, { status }, { new: true });
    if (status === 1) {
      // Activate plan for user
      const plan = await Plans.findById(order.plan_id);
      if (plan) {
        let validityDate = new Date();
        if (plan.validityType === 'Lifetime') validityDate = new Date('2099-12-31');
        else if (plan.validity) validityDate.setDate(validityDate.getDate() + plan.validity);
        await Users.findByIdAndUpdate(order.customer_id, {
          planName: plan.planname, validityDate,
          $addToSet: { accessLevel: plan._id },
        });
      }
    }
    res.json({ status: 'success', message: 'Payment status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Dashboard Analytics ────────────────────────────────────────────────────
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const [totalUsers, totalCampaigns, totalRevenue] = await Promise.all([
      Users.countDocuments({ role: 2 }),
      Campaigns.countDocuments(),
      OrderList.aggregate([{ $match: { status: 1 } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    res.json({
      status: 'success',
      data: {
        totalUsers,
        totalCampaigns,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── All Campaigns (admin view) ─────────────────────────────────────────────
exports.getAllCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const [campaigns, total] = await Promise.all([
      Campaigns.find().skip(skip).limit(Number(limit)).sort({ createdAt: -1 }).populate('userId', 'name email'),
      Campaigns.countDocuments(),
    ]);
    res.json({ status: 'success', data: campaigns, total });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};
