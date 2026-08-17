const bcrypt = require('bcryptjs');
const { User, Package, AiTemplate, TemplateGroup, Order, SearchContent, UsageLog, Setting, TeamMember } = require('../../models/AI2Pen.models');
const { deductUsage } = require('../../utils/pen.usage');

// ══════════════════════════════════════════════════════════════════
//  ADMIN CONTROLLER
// ══════════════════════════════════════════════════════════════════

// ── Dashboard ─────────────────────────────────────────────────────────────
exports.adminStats = async (req, res) => {
  try {
    const [users, orders, content, revenue] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Order.countDocuments({ status: 'paid' }),
      SearchContent.countDocuments(),
      Order.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    const recentUsers  = await User.find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 }).limit(5).select('name email penTokenUsed penTokenLimit createdAt status').populate('penPackageId', 'package_name');
    const recentOrders = await Order.find({ status: 'paid' }).sort({ createdAt: -1 }).limit(5).populate('user_id', 'name email').populate('package_id', 'package_name price');
    const userGrowth   = await User.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ status: '1', data: { users, orders, content, revenue: revenue[0]?.total || 0, recentUsers, recentOrders, userGrowth } });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ── Users ─────────────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const q = { role: { $ne: 'admin' } };
    if (status !== undefined) q.status = +status;
    if (search) q.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      User.find(q).skip(skip).limit(+limit).sort({ createdAt: -1 }).populate('penPackageId', 'package_name').select('-password -passwordResetToken -emailVerificationToken'),
      User.countDocuments(q),
    ]);
    res.json({ status: '1', data, total, page: +page });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'member', package_id, token_limit = 5000, image_limit = 10, audio_limit = 10, status = 1 } = req.body;
    if (await User.findOne({ email: email?.toLowerCase() })) return res.json({ status: '0', message: 'Email already registered.' });
    const hashed = await bcrypt.hash(password, 12);
    let pkgData = {};
    if (package_id) { const pkg = await Package.findById(package_id); if (pkg) pkgData = pkg.toObject(); }
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed, role, status, penPackageId: package_id || null, penPackageData: pkgData, penTokenLimit: token_limit, penImageLimit: image_limit, penAudioLimit: audio_limit });
    res.json({ status: '1', message: 'User created.', data: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.updateUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    if (password) rest.password = await bcrypt.hash(password, 12);
    const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true }).select('-password -passwordResetToken -emailVerificationToken');
    if (!user) return res.json({ status: '0', message: 'User not found.' });
    res.json({ status: '1', message: 'User updated.', data: user });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ status: '1', message: 'User deleted.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.updateUserStatus = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ status: '1', message: 'Status updated.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.assignPackage = async (req, res) => {
  try {
    const { package_id, expiry_days } = req.body;
    const pkg = await Package.findById(package_id);
    if (!pkg) return res.json({ status: '0', message: 'Package not found.' });
    let expiry = null;
    if (pkg.package_type !== 'lifetime' && expiry_days) { expiry = new Date(); expiry.setDate(expiry.getDate() + +expiry_days); }
    else if (pkg.package_type === 'lifetime') expiry = new Date('2099-12-31');
    await User.findByIdAndUpdate(req.params.id, { penPackageId: package_id, penPackageData: pkg.toObject(), penPackageExpire: expiry, penTokenLimit: pkg.token_limit, penImageLimit: pkg.image_limit, penAudioLimit: pkg.audio_limit, penTokenUsed: 0, penImageUsed: 0, penAudioUsed: 0 });
    res.json({ status: '1', message: 'Package assigned.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.addUserCredits = async (req, res) => {
  try {
    const { token_limit, image_limit, audio_limit } = req.body;
    const update = {};
    if (token_limit !== undefined) update.$inc = { ...(update.$inc || {}), penTokenLimit: +token_limit };
    if (image_limit !== undefined) update.$inc = { ...(update.$inc || {}), penImageLimit: +image_limit };
    if (audio_limit !== undefined) update.$inc = { ...(update.$inc || {}), penAudioLimit: +audio_limit };
    await User.findByIdAndUpdate(req.params.id, update);
    res.json({ status: '1', message: 'Credits updated.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ── Packages ──────────────────────────────────────────────────────────────
exports.getPackages = async (req, res) => {
  try {
    const data = await Package.find({ deleted: '0' }).sort({ sort_order: 1 });
    res.json({ status: '1', data });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.createPackage = async (req, res) => {
  try {
    const pkg = await Package.create({ ...req.body, user_id: req.user._id });
    res.json({ status: '1', message: 'Package created.', data: pkg });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.updatePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!pkg) return res.json({ status: '0', message: 'Package not found.' });
    res.json({ status: '1', message: 'Package updated.', data: pkg });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.deletePackage = async (req, res) => {
  try {
    await Package.findByIdAndUpdate(req.params.id, { deleted: '1', status: '0' });
    res.json({ status: '1', message: 'Package deleted.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ── Template Groups ───────────────────────────────────────────────────────
exports.getAdminGroups = async (req, res) => {
  try {
    const data = await TemplateGroup.find().sort({ sort_order: 1 });
    res.json({ status: '1', data });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.createGroup = async (req, res) => {
  try {
    const g = await TemplateGroup.create({ ...req.body, user_id: req.user._id });
    res.json({ status: '1', message: 'Group created.', data: g });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.updateGroup = async (req, res) => {
  try {
    const g = await TemplateGroup.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!g) return res.json({ status: '0', message: 'Group not found.' });
    res.json({ status: '1', message: 'Group updated.', data: g });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.deleteGroup = async (req, res) => {
  try {
    await TemplateGroup.findByIdAndUpdate(req.params.id, { status: '0' });
    res.json({ status: '1', message: 'Group disabled.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ── AI Templates (Admin) ──────────────────────────────────────────────────
exports.getAdminTemplates = async (req, res) => {
  try {
    const { type, group_id } = req.query;
    const q = {};
    if (type)     q.type     = type;
    if (group_id) q.group_id = group_id;
    const data = await AiTemplate.find(q).sort({ sort_order: 1 }).populate('group_id', 'group_name group_slug group_icon');
    res.json({ status: '1', data });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.createTemplate = async (req, res) => {
  try {
    const t = await AiTemplate.create({ ...req.body, user_id: req.user._id });
    res.json({ status: '1', message: 'Template created.', data: t });
  } catch (err) { res.json({ status: '0', message: err.message || 'Server error.' }); }
};

exports.updateTemplate = async (req, res) => {
  try {
    const t = await AiTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!t) return res.json({ status: '0', message: 'Template not found.' });
    res.json({ status: '1', message: 'Template updated.', data: t });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.deleteTemplate = async (req, res) => {
  try {
    await AiTemplate.findByIdAndUpdate(req.params.id, { status: '0' });
    res.json({ status: '1', message: 'Template disabled.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ── Settings ──────────────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.find({ user_id: req.user._id });
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json({ status: '1', data: obj });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.updateSettings = async (req, res) => {
  try {
    const { _group, ...pairs } = req.body;
    for (const [key, value] of Object.entries(pairs)) {
      await Setting.findOneAndUpdate({ user_id: req.user._id, key }, { user_id: req.user._id, key, value, group: _group || 'general' }, { upsert: true });
    }
    res.json({ status: '1', message: 'Settings saved.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ── Orders ────────────────────────────────────────────────────────────────
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Order.find().skip(skip).limit(+limit).sort({ createdAt: -1 }).populate('user_id', 'name email').populate('package_id', 'package_name price'),
      Order.countDocuments(),
    ]);
    res.json({ status: '1', data, total });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ══════════════════════════════════════════════════════════════════
//  BILLING CONTROLLER
// ══════════════════════════════════════════════════════════════════
exports.getPublicPackages = async (req, res) => {
  try {
    const data = await Package.find({ deleted: '0', status: '1' }).sort({ sort_order: 1 });
    res.json({ status: '1', data });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.createCheckout = async (req, res) => {
  try {
    const { package_id } = req.body;
    const pkg  = await Package.findById(package_id);
    if (!pkg)  return res.json({ status: '0', message: 'Package not found.' });

    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const stripePriceId = pkg.stripe_price_id;
    if (stripePriceId) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: ['monthly','yearly'].includes(pkg.package_type) ? 'subscription' : 'payment',
        line_items: [{ price: stripePriceId, quantity: 1 }],
        customer_email: req.user.email,
        success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}&package_id=${package_id}`,
        cancel_url:  `${process.env.FRONTEND_URL}/billing`,
        metadata:    { user_id: String(req.user._id), package_id: String(package_id) },
      });
      return res.json({ status: '1', data: { checkout_url: session.url } });
    }

    // Dynamic pricing
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: pkg.package_name },
          unit_amount: Math.round(pkg.price * 100),
        },
        quantity: 1,
      }],
      customer_email: req.user.email,
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}&package_id=${package_id}`,
      cancel_url:  `${process.env.FRONTEND_URL}/billing`,
      metadata:    { user_id: String(req.user._id), package_id: String(package_id) },
    });
    res.json({ status: '1', data: { checkout_url: session.url } });
  } catch (err) {
    console.error(err);
    res.json({ status: '0', message: 'Checkout failed.' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { session_id, package_id } = req.query;
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!['paid', 'complete'].includes(session.payment_status) && session.status !== 'complete')
      return res.json({ status: '0', message: 'Payment not completed.' });

    const existing = await Order.findOne({ payment_id: session.id });
    if (existing) return res.json({ status: '1', message: 'Already activated.', data: existing });

    const pkg = await Package.findById(package_id);
    if (!pkg) return res.json({ status: '0', message: 'Package not found.' });

    let expiry = null;
    if (pkg.package_type === 'monthly')  { expiry = new Date(); expiry.setMonth(expiry.getMonth() + 1); }
    else if (pkg.package_type === 'yearly') { expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + 1); }
    else { expiry = new Date('2099-12-31'); }

    const order = await Order.create({
      user_id: req.user._id, package_id,
      amount: (session.amount_total || 0) / 100,
      payment_method: 'stripe', payment_id: session.id,
      status: 'paid',
    });

    await User.findByIdAndUpdate(req.user._id, {
      penPackageId: package_id, penPackageData: pkg.toObject(), penPackageExpire: expiry,
      penTokenLimit: pkg.token_limit, penImageLimit: pkg.image_limit, penAudioLimit: pkg.audio_limit,
      penTokenUsed: 0, penImageUsed: 0, penAudioUsed: 0,
    });

    res.json({ status: '1', message: 'Package activated!', data: { order, package: pkg } });
  } catch (err) {
    console.error(err);
    res.json({ status: '0', message: 'Verification failed.' });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const data = await Order.find({ user_id: req.user._id }).sort({ createdAt: -1 }).populate('package_id', 'package_name price package_type');
    res.json({ status: '1', data });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ══════════════════════════════════════════════════════════════════
//  TEAM / MEMBER CONTROLLER
// ══════════════════════════════════════════════════════════════════
exports.getTeamMembers = async (req, res) => {
  try {
    const members = await TeamMember.find({ admin_user_id: req.user._id })
      .populate('member_user_id', 'name email status penTokenUsed penTokenLimit penImageUsed penImageLimit');
    res.json({ status: '1', data: members });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.inviteTeamMember = async (req, res) => {
  try {
    const { name, email, password, token_limit = 1000, image_limit = 5, audio_limit = 5 } = req.body;
    // Check team member limit from plan
    const planLimit = req.user.penPackageId?.team_members || req.user.penPackageData?.team_members || 0;
    const current   = await TeamMember.countDocuments({ admin_user_id: req.user._id });
    if (planLimit !== -1 && current >= planLimit)
      return res.json({ status: '0', message: `Your plan allows ${planLimit} team members.` });

    if (await User.findOne({ email: email?.toLowerCase() }))
      return res.json({ status: '0', message: 'This email is already registered.' });

    const hashed = await bcrypt.hash(password, 12);
    const member = await User.create({
      name, email: email.toLowerCase(), password: hashed,
      role: 'member', parentId: req.user._id,
      penTokenLimit: token_limit, penImageLimit: image_limit, penAudioLimit: audio_limit, status: 1,
    });

    await TeamMember.create({ admin_user_id: req.user._id, member_user_id: member._id });

    res.json({ status: '1', message: 'Team member invited.', data: { _id: member._id, name: member.name, email: member.email } });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.updateTeamMember = async (req, res) => {
  try {
    const { token_limit, image_limit, audio_limit, status } = req.body;
    const member = await TeamMember.findOne({ admin_user_id: req.user._id, member_user_id: req.params.id });
    if (!member) return res.json({ status: '0', message: 'Team member not found.' });
    const update = {};
    if (token_limit !== undefined) update.penTokenLimit = +token_limit;
    if (image_limit !== undefined) update.penImageLimit = +image_limit;
    if (audio_limit !== undefined) update.penAudioLimit = +audio_limit;
    if (status      !== undefined) update.status        = status;
    await User.findByIdAndUpdate(req.params.id, update);
    res.json({ status: '1', message: 'Member updated.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.removeTeamMember = async (req, res) => {
  try {
    await TeamMember.findOneAndDelete({ admin_user_id: req.user._id, member_user_id: req.params.id });
    await User.findByIdAndUpdate(req.params.id, { status: 0 });
    res.json({ status: '1', message: 'Team member removed.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};
