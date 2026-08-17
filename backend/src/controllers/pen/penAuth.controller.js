const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Package, UsageLog, SearchContent } = require('../../models/AI2Pen.models');
const { sendMail } = require('../../utils/mailer');

const sign = (user) => jwt.sign(
  { id: user._id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// ── Register ──────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.json({ status: '0', message: 'Name, email and password are required.' });

    if (await User.findOne({ email: email.toLowerCase() }))
      return res.json({ status: '0', message: 'This email is already registered.' });

    const hashed = await bcrypt.hash(password, 12);
    // Find free/default package
    const freePkg = await Package.findOne({ is_default: true, status: '1' });

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashed,
      status: 1,
      penPackageId:    freePkg?._id || null,
      penPackageData:  freePkg || {},
      penTokenLimit:   freePkg?.token_limit  || 5000,
      penImageLimit:   freePkg?.image_limit  || 10,
      penAudioLimit:   freePkg?.audio_limit  || 10,
    });

    const token = sign(user);
    const { password: _, ...safe } = user.toObject();
    res.json({ status: '1', message: 'Registration successful!', token, data: safe });
  } catch (err) {
    console.error(err);
    res.json({ status: '0', message: 'Server error.' });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.json({ status: '0', message: 'Invalid email or password.' });
    if (user.status === 2) return res.json({ status: '0', message: 'Account suspended.' });
    if (user.status === 0) return res.json({ status: '0', message: 'Account is inactive.' });

    if (!await bcrypt.compare(password, user.password))
      return res.json({ status: '0', message: 'Invalid email or password.' });

    await User.findByIdAndUpdate(user._id, {
      penTotalLogins: (user.penTotalLogins || 0) + 1,
      penLastLoginAt: new Date(),
    });

    const token = sign(user);
    const { password: _, ...safe } = user.toObject();
    res.json({ status: '1', message: 'Login successful.', token, data: safe });
  } catch (err) {
    console.error(err);
    res.json({ status: '0', message: 'Server error.' });
  }
};

// ── Get Me ────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -passwordResetToken -emailVerificationToken')
      .populate('penPackageId', 'package_name price modules token_limit image_limit audio_limit team_members')
      .lean();
    res.json({ status: '1', data: user });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ── Update Profile ────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, timezone, language, preferred_ai_model, preferred_language } = req.body;
    const update = {};
    if (name)                update.name                = name.trim();
    if (timezone)            update.timezone            = timezone;
    if (language)            update.language            = language;
    if (preferred_ai_model)  update.preferredAiModel  = preferred_ai_model;
    if (preferred_language)  update.preferred_language  = preferred_language;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
      .select('-password -passwordResetToken -emailVerificationToken');
    res.json({ status: '1', message: 'Profile updated.', data: user });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ── Change Password ───────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findById(req.user._id);
    if (!await bcrypt.compare(current_password, user.password))
      return res.json({ status: '0', message: 'Current password is incorrect.' });
    user.password = await bcrypt.hash(new_password, 12);
    await user.save();
    res.json({ status: '1', message: 'Password changed successfully.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ── Forgot Password ───────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.json({ status: '1', message: 'If that email exists, a reset link was sent.' });

    const tok = crypto.randomBytes(32).toString('hex');
    await User.findByIdAndUpdate(user._id, { passwordResetToken: tok });

    const link = `${process.env.FRONTEND_URL}/reset-password/${tok}`;
    await sendMail({ to: email, subject: 'Reset your AI2Pen password', html: `<p><a href="${link}">Reset Password</a></p>` });
    res.json({ status: '1', message: 'Reset link sent to your email.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ── Reset Password ────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ passwordResetToken: token });
    if (!user) return res.json({ status: '0', message: 'Invalid or expired token.' });
    user.password = await bcrypt.hash(password, 12);
    user.passwordResetToken = null;
    await user.save();
    res.json({ status: '1', message: 'Password reset successfully.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ── Dashboard stats ───────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const uid = req.user._id;
    const parentId = req.user.parentId || uid;
    const matchUser = req.user.role === 'admin' ? {} : { user_id: uid };

    const [totalContent, totalImages, totalAudio, recentContent, usageLogs] = await Promise.all([
      SearchContent.countDocuments({ ...matchUser, content_type: 'text' }),
      SearchContent.countDocuments({ ...matchUser, content_type: 'image' }),
      SearchContent.countDocuments({ ...matchUser, content_type: 'audio' }),
      SearchContent.find({ ...matchUser }).sort({ searched_at: -1 }).limit(5)
        .populate('ai_template_id', 'template_name template_icon template_color'),
      UsageLog.find({ user_id: uid }).sort({ created_at: -1 }).limit(10),
    ]);

    const user = await User.findById(uid).select('penTokenLimit penTokenUsed penImageLimit penImageUsed penAudioLimit penAudioUsed');
    const usageStats = {
      token:  { limit: user.penTokenLimit, used: user.penTokenUsed, remaining: Math.max(0, user.penTokenLimit - user.penTokenUsed) },
      image:  { limit: user.penImageLimit, used: user.penImageUsed, remaining: Math.max(0, user.penImageLimit - user.penImageUsed) },
      audio:  { limit: user.penAudioLimit, used: user.penAudioUsed, remaining: Math.max(0, user.penAudioLimit - user.penAudioUsed) },
    };

    res.json({ status: '1', data: { totalContent, totalImages, totalAudio, recentContent, usageLogs, usageStats } });
  } catch (err) { console.error(err); res.json({ status: '0', message: 'Server error.' }); }
};
