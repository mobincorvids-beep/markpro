const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const { User, Settings, Plan } = require('../../models/BioLinks.models');
const { sendMail } = require('../../utils/mailer');

const signToken = (user) => jwt.sign(
  { id: user._id, email: user.email, is_admin: user.is_admin },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// ── Register ──────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.json({ status: 'error', message: 'Name, email and password are required.' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.json({ status: 'error', message: 'This email is already registered.' });

    const settings = await Settings.findOne();
    const hashed   = await bcrypt.hash(password, 12);
    const api_key  = crypto.randomBytes(16).toString('hex');
    const referral_key = crypto.randomBytes(12).toString('hex');
    const email_confirmation_code = crypto.randomBytes(16).toString('hex');

    const needsVerification = settings?.users?.email_confirmation ?? false;

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      api_key, referral_key,
      email_confirmation_code,
      status: needsVerification ? 0 : 1,
      source: 'email',
      ip: req.ip,
    });

    if (needsVerification) {
      const verifyUrl = `${process.env.APP_URL}/activate/${email_confirmation_code}`;
      await sendMail({
        to: user.email,
        subject: `Verify your ${settings.main.title} account`,
        html: `<p>Hi ${user.name},</p><p><a href="${verifyUrl}">Click here to verify your email</a></p>`,
      });
      return res.json({ status: 'success', message: 'Registration successful! Please check your email to verify your account.' });
    }

    const token = signToken(user);
    res.json({ status: 'success', message: 'Registration successful!', token, data: { _id: user._id, name: user.name, email: user.email, is_admin: user.is_admin } });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.json({ status: 'error', message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ status: 'error', message: 'Invalid email or password.' });
    if (user.status === 0) return res.json({ status: 'error', message: 'Please verify your email first.' });
    if (user.status === 2) return res.json({ status: 'error', message: 'Your account has been suspended.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ status: 'error', message: 'Invalid email or password.' });

    // Update login metadata
    await User.findByIdAndUpdate(user._id, {
      total_logins: (user.total_logins || 0) + 1,
      last_activity: new Date(),
      ip: req.ip,
    });

    const token = signToken(user);
    res.json({
      status: 'success',
      message: 'Login successful.',
      token,
      data: {
        _id: user._id, name: user.name, email: user.email,
        avatar: user.avatar, is_admin: user.is_admin,
        plan_id: user.plan_id, plan_type: user.plan_type,
        timezone: user.timezone, language: user.language,
      },
    });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Activate account ──────────────────────────────────────────────────────
exports.activate = async (req, res) => {
  try {
    const { code } = req.params;
    const user = await User.findOneAndUpdate(
      { email_confirmation_code: code },
      { status: 1, email_confirmation_code: null },
      { new: true }
    );
    if (!user) return res.json({ status: 'error', message: 'Invalid activation link.' });
    const token = signToken(user);
    res.json({ status: 'success', message: 'Account activated!', token });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.json({ status: 'success', message: 'If that email exists, a reset link was sent.' }); // security

    const code = crypto.randomBytes(16).toString('hex');
    await User.findByIdAndUpdate(user._id, { lost_password_code: code });

    const settings = await Settings.findOne();
    const resetUrl = `${process.env.APP_URL}/reset-password/${Buffer.from(user.email).toString('base64')}/${code}`;
    await sendMail({
      to: user.email,
      subject: `Reset your ${settings?.main?.title || 'BioLinks'} password`,
      html: `<p><a href="${resetUrl}">Click here to reset your password</a>. Valid for 24 hours.</p>`,
    });

    res.json({ status: 'success', message: 'Password reset email sent.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Reset Password ────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { emailB64, code, password } = req.body;
    const email = Buffer.from(emailB64, 'base64').toString();
    const user  = await User.findOne({ email: email.toLowerCase(), lost_password_code: code });
    if (!user) return res.json({ status: 'error', message: 'Invalid or expired reset link.' });

    const hashed = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(user._id, { password: hashed, lost_password_code: null });
    res.json({ status: 'success', message: 'Password reset successfully.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get current user ──────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -lost_password_code -email_confirmation_code -twofa_secret').lean();
    res.json({ status: 'success', data: user });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Update account ────────────────────────────────────────────────────────
exports.updateAccount = async (req, res) => {
  try {
    const { name, timezone, language, is_newsletter_subscribed, billing, preferences } = req.body;
    const update = {};
    if (name)     update.name     = name.trim();
    if (timezone) update.timezone = timezone;
    if (language) update.language = language;
    if (typeof is_newsletter_subscribed !== 'undefined') update.is_newsletter_subscribed = is_newsletter_subscribed;
    if (billing)  update.billing  = billing;
    if (preferences) update.preferences = { ...req.user.preferences, ...preferences };

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
      .select('-password -lost_password_code -email_confirmation_code -twofa_secret');
    res.json({ status: 'success', message: 'Account updated.', data: user });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Change password ───────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(current_password, user.password);
    if (!match) return res.json({ status: 'error', message: 'Current password is incorrect.' });
    const hashed = await bcrypt.hash(new_password, 12);
    await User.findByIdAndUpdate(user._id, { password: hashed });
    res.json({ status: 'success', message: 'Password changed successfully.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Delete account ────────────────────────────────────────────────────────
exports.deleteAccount = async (req, res) => {
  try {
    const { Link, BiolinkBlock, QrCode, Pixel, Project, Domain, TrackLink } = require('../../models/BioLinks.models');
    const id = req.user._id;
    // Delete all user data
    await Promise.all([
      Link.deleteMany({ user_id: id }),
      BiolinkBlock.deleteMany({ user_id: id }),
      QrCode.deleteMany({ user_id: id }),
      Pixel.deleteMany({ user_id: id }),
      Project.deleteMany({ user_id: id }),
      Domain.deleteMany({ user_id: id }),
      TrackLink.deleteMany({ user_id: id }),
      User.findByIdAndDelete(id),
    ]);
    res.json({ status: 'success', message: 'Account deleted.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};
