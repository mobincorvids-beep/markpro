const md5  = require('md5');
const { v4: uuidv4 } = require('uuid');
const {
  Users, Campaigns, CampaignPage, CampaignSection,
  CampaignVisit, CampaignPageVisit, CampaignLinkDetail,
  OrderList, Plans, AdminSettings, Coupons, Templates, TemplatePage, TemplateSection
} = require('../../models/bio.models');
const Common    = require('../../utils/common');
const { getObjectSignedURL } = require('../../utils/commonAPI');

// ── Update Profile ────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = req.vsuser;
    if (!name) return res.json({ status: 'error', message: 'Name is required.' });

    const set = { name };
    const demoEmails = ['demouser@pixaurl.com', 'demoadmin@pixaurl.com'];
    if (password && !demoEmails.includes(user.email)) {
      set.password = md5(password);
    }

    const updated = await Users.findByIdAndUpdate(user.user_id, { $set: set }, { new: true });
    const response = { name: updated.name };

    if (updated.profilePicture?.file) {
      try { response.profilePicture = await getObjectSignedURL(updated.profilePicture.file); }
      catch (e) { /* ignore */ }
    }

    res.json({ status: 'success', message: 'Profile updated successfully.', data: response });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Create Campaign ───────────────────────────────────────────────────────
exports.createCampaign = async (req, res) => {
  try {
    const { title, catId, template_id } = req.body;
    const user = req.vsuser;
    if (!title || !template_id) return res.json({ status: 'error', message: 'title and template_id are required.' });

    let slug = Common.generateSlug(title);
    const existing = await Campaigns.findOne({ slug });
    if (existing) slug = `${slug}-${uuidv4().slice(0, 6)}`;

    // Clone template pages & sections into campaign
    const template = await Templates.findById(template_id);
    if (!template) return res.json({ status: 'error', message: 'Template not found.' });

    const campaign = await Campaigns.create({
      userId: user.user_id,
      title,
      slug,
      catId,
      usedTemplateId: template_id,
      templateData:   template.templateData,
      templateStyle:  template.templateStyle,
      profile:        template.profile || {},
      status: 1,
    });

    // Clone template pages
    const tPages = await TemplatePage.find({ templateId: template_id });
    for (const page of tPages) {
      const newPage = await CampaignPage.create({
        campaignId: campaign._id,
        userId:     user.user_id,
        title:      page.title,
        sort:       page.sort,
        slug:       page.slug,
        seoData:    page.seoData,
        status:     page.status,
      });
      // Clone sections for this page
      const sections = await TemplateSection.find({ templateId: template_id, pageId: page._id });
      for (const sec of sections) {
        await CampaignSection.create({
          templateId:  campaign._id,
          pageId:      newPage._id,
          title:       sec.title,
          type:        sec.type,
          sectionData: sec.sectionData,
          sort:        sec.sort,
          status:      sec.status,
          animation:   sec.animation,
        });
      }
    }

    res.json({ status: 'success', message: 'Campaign created successfully.', data: campaign });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get Campaigns ─────────────────────────────────────────────────────────
exports.getCampaigns = async (req, res) => {
  try {
    const user = req.vsuser;
    const campaigns = await Campaigns.find({ userId: user.user_id }).sort({ createdAt: -1 });
    res.json({ status: 'success', data: campaigns });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Delete Campaign ───────────────────────────────────────────────────────
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.vsuser;
    await Campaigns.findOneAndDelete({ _id: id, userId: user.user_id });
    await CampaignPage.deleteMany({ campaignId: id });
    await CampaignSection.deleteMany({ templateId: id });
    res.json({ status: 'success', message: 'Campaign deleted.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Update Campaign Status ────────────────────────────────────────────────
exports.updateCampaignStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    const user = req.vsuser;
    await Campaigns.findOneAndUpdate({ _id: id, userId: user.user_id }, { status });
    res.json({ status: 'success', message: 'Status updated.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Duplicate Campaign ────────────────────────────────────────────────────
exports.duplicateCampaign = async (req, res) => {
  try {
    const { id } = req.body;
    const user = req.vsuser;
    const orig = await Campaigns.findOne({ _id: id, userId: user.user_id });
    if (!orig) return res.json({ status: 'error', message: 'Campaign not found.' });

    const origObj = orig.toObject();
    delete origObj._id; delete origObj.createdAt; delete origObj.updatedAt;
    origObj.title = `${orig.title} (Copy)`;
    origObj.slug  = `${orig.slug}-${uuidv4().slice(0, 6)}`;
    const dupe = await Campaigns.create(origObj);

    // Duplicate pages + sections
    const pages = await CampaignPage.find({ campaignId: id });
    for (const page of pages) {
      const pageObj = page.toObject();
      const oldPageId = pageObj._id;
      delete pageObj._id; delete pageObj.createdAt; delete pageObj.updatedAt;
      pageObj.campaignId = dupe._id;
      const newPage = await CampaignPage.create(pageObj);

      const sections = await CampaignSection.find({ templateId: id, pageId: oldPageId });
      for (const sec of sections) {
        const secObj = sec.toObject();
        delete secObj._id; delete secObj.createdAt; delete secObj.updatedAt;
        secObj.templateId = dupe._id;
        secObj.pageId     = newPage._id;
        await CampaignSection.create(secObj);
      }
    }
    res.json({ status: 'success', message: 'Campaign duplicated.', data: dupe });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get Dashboard Analytics ───────────────────────────────────────────────
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const user = req.vsuser;
    const uid  = user.user_id;
    const [totalCampaigns, totalVisits, totalClicks] = await Promise.all([
      Campaigns.countDocuments({ userId: uid }),
      CampaignVisit.aggregate([{ $match: { userId: uid ? require('mongoose').Types.ObjectId.createFromHexString(String(uid)) : null } }, { $group: { _id: null, total: { $sum: '$count' } } }]),
      CampaignLinkDetail.countDocuments({ userId: uid }),
    ]);
    res.json({
      status: 'success',
      data: {
        totalCampaigns,
        totalVisits:  totalVisits[0]?.total || 0,
        totalClicks,
      },
    });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get Templates (for user) ──────────────────────────────────────────────
exports.getTemplates = async (req, res) => {
  try {
    const { catId } = req.query;
    const query = { status: 1 };
    if (catId) query.catId = catId;
    const templates = await require('../../models/bio.models').Templates.find(query).sort({ sort: 1 });
    res.json({ status: 'success', data: templates });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get Current Plan ──────────────────────────────────────────────────────
exports.getCurrentPlan = async (req, res) => {
  try {
    const user = await Users.findById(req.vsuser.user_id).select('planName validityDate accessLevel');
    res.json({ status: 'success', data: user });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get Billing History ───────────────────────────────────────────────────
exports.getBillingHistory = async (req, res) => {
  try {
    const orders = await OrderList.find({ customer_id: req.vsuser.user_id })
      .populate('plan_id', 'planname price')
      .sort({ createdAt: -1 });
    res.json({ status: 'success', data: orders });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Plan Purchase (Stripe / Razorpay / PayPal / Bank Transfer) ───────────
exports.planPurchase = async (req, res) => {
  try {
    const { id: plan_id, mode, paymentId, couponCode } = req.body;
    const user = req.vsuser;

    const plandata = await Plans.findById(plan_id);
    if (!plandata) return res.json({ status: 'error', message: 'Plan not found.' });

    let amount = plandata.price;

    // Apply coupon
    if (couponCode) {
      const coupon = await Coupons.findOne({ couponCode, status: 1 });
      if (!coupon || amount < coupon.minAmount) {
        return res.json({ status: 'error', message: 'Invalid coupon.' });
      }
      if (coupon.duration === 'Once per user') {
        const used = await OrderList.findOne({ customer_id: user.user_id, couponCode });
        if (used) return res.json({ status: 'error', message: 'Coupon already used.' });
      }
      if (coupon.discountType === 'By Percentage') {
        amount = amount - (amount * coupon.discount / 100);
      } else {
        amount = amount - coupon.discount;
      }
      if (amount < 0) amount = 0;
    }

    if (mode === 'Stripe') {
      const settings = await AdminSettings.findOne().select('+stripeSecret');
      if (!settings?.stripeSecret) return res.json({ status: 'error', message: 'Stripe not configured.' });
      const Stripe = require('stripe');
      const stripe = new Stripe(settings.stripeSecret);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price_data: { currency: 'usd', product_data: { name: plandata.planname }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
        mode: 'payment',
        success_url: `${process.env.APP_URL}success?plan_id=${plan_id}${couponCode ? '&couponCode=' + couponCode : ''}`,
        cancel_url: `${process.env.APP_URL}pricing`,
        customer_email: user.email,
      });
      return res.json({ status: 'success', data: { checkoutUrl: session.url, sessionId: session.id } });
    }

    if (mode === 'Razorpay') {
      const settings = await AdminSettings.findOne().select('+razorpaySecret');
      const Razorpay = require('razorpay');
      const rzp = new Razorpay({ key_id: settings.razorpayKey, key_secret: settings.razorpaySecret });
      const order = await rzp.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt: uuidv4() });
      return res.json({ status: 'success', data: order });
    }

    if (mode === 'Bank Transfer') {
      if (!paymentId) return res.json({ status: 'error', message: 'Payment ID required for bank transfer.' });
      await OrderList.create({
        customer_id: user.user_id, plan_id, amount, currency: 'USD',
        payment_id: paymentId, payment_mode: mode, couponCode, status: 0,
      });
      return res.json({ status: 'success', message: 'Payment submitted for review.', url: `success?plan_id=${plan_id}` });
    }

    res.json({ status: 'error', message: 'Invalid payment mode.' });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Payment Success (record & activate plan) ──────────────────────────────
exports.paymentSuccess = async (req, res) => {
  try {
    const { plan_id, payment_id, payment_mode, couponCode } = req.body;
    const user = req.vsuser;
    const plan = await Plans.findById(plan_id);
    if (!plan) return res.json({ status: 'error', message: 'Plan not found.' });

    // Validity
    let validityDate = new Date();
    if (plan.validityType === 'Lifetime') {
      validityDate = new Date('2099-12-31');
    } else if (plan.validity) {
      validityDate.setDate(validityDate.getDate() + plan.validity);
    }

    await Users.findByIdAndUpdate(user.user_id, {
      planName: plan.planname, validityDate,
      $addToSet: { accessLevel: plan._id },
    });

    await OrderList.create({
      customer_id: user.user_id, plan_id,
      amount: plan.price, currency: 'USD',
      payment_id, payment_mode: payment_mode || 'Online',
      couponCode, status: 1,
    });

    res.json({ status: 'success', message: 'Plan activated successfully.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};
