const jwt  = require('jsonwebtoken');
const md5  = require('md5');
const randomstring = require('randomstring');
const { Users, Plans, AdminSettings, Coupons } = require('../../models/bio.models');
const Common    = require('../../utils/common');
const { sendMail } = require('../../utils/commonAPI');

// ── Login ─────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Users.findOne({ email: email?.toLowerCase(), password: md5(password) });

    if (!user) {
      return res.json({ status: 'error', message: "Couldn't find a PixaURL account with this email and password." });
    }
    if (!user.status) {
      return res.json({ status: 'error', message: 'Your PixaURL account has been deactivated.' });
    }

    const jwtdata = {
      email:      user.email,
      user_id:    user._id,
      name:       user.name,
      short_nm:   Common.getShortName(user.name),
      role:       user.role,
      createdAt:  user.createdAt,
      profile_img: user.profilePicture?.url || '',
      parentId:   user.parentId,
      access_level: user.accessLevel,
    };

    const token = jwt.sign(jwtdata, process.env.SESSION_SECRET, { expiresIn: '7d' });
    const redirectUrl = user.role === 1 ? 'admin/dashboard' : 'dashboard';

    res.json({ status: 'success', message: 'You are successfully logged in.', token, url: redirectUrl, data: jwtdata });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Register ──────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const postdata = req.body;
    const uEmail = postdata.email?.toLowerCase().trim();

    const parentUser = await Users.findOne({ role: 1 });
    if (!parentUser) return res.json({ status: 'error', message: 'Setup not complete. Admin user missing.' });

    const existing = await Users.findOne({ email: uEmail });
    if (existing) return res.json({ status: 'error', message: 'This email is already registered.' });

    const newUser = await Users.create({
      source:   'Self',
      parentId: parentUser._id,
      name:     postdata.name,
      email:    uEmail,
      password: md5(postdata.password),
      ip:       req.ip,
      role:     2,
      status:   0,
    });

    // Send verification email
    try {
      const settings = await AdminSettings.findOne();
      const verifyLink = `${process.env.APP_URL}verify/${newUser._id}`;
      await sendMail({
        to: uEmail,
        subject: 'Verify your PixaURL account',
        html: `<p>Hi ${postdata.name},</p><p>Click the link below to verify your account:</p><p><a href="${verifyLink}">${verifyLink}</a></p>`,
      }, settings || {});
    } catch (mailErr) {
      console.error('Email send error:', mailErr.message);
    }

    res.json({ status: 'success', message: 'Registration successful! Please check your email to verify your account.' });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Verify Account ────────────────────────────────────────────────────────
exports.verifyAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Users.findByIdAndUpdate(id, { status: 1 }, { new: true });
    if (!user) return res.json({ status: 'error', message: 'Invalid verification link.' });
    res.json({ status: 'success', message: 'Account verified successfully. You can now log in.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await Users.findOne({ email: email?.toLowerCase() });
    if (!user) return res.json({ status: 'error', message: 'No account found with this email.' });

    const token = randomstring.generate(32);
    await Users.findByIdAndUpdate(user._id, { resetPasswordToken: token });

    const resetLink = `${process.env.APP_URL}reset-password/${token}`;
    try {
      const settings = await AdminSettings.findOne();
      await sendMail({
        to: email,
        subject: 'Reset your PixaURL password',
        html: `<p>Click the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link is valid for 24 hours.</p>`,
      }, settings || {});
    } catch (mailErr) {
      console.error('Email send error:', mailErr.message);
    }

    res.json({ status: 'success', message: 'Password reset email sent.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Check Reset Token ─────────────────────────────────────────────────────
exports.checkResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await Users.findOne({ resetPasswordToken: token });
    if (!user) return res.json({ status: 'error', message: 'Invalid or expired reset token.' });
    res.json({ status: 'success', data: { token } });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Reset Password ────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await Users.findOne({ resetPasswordToken: token });
    if (!user) return res.json({ status: 'error', message: 'Invalid or expired reset token.' });

    await Users.findByIdAndUpdate(user._id, {
      password: md5(password),
      resetPasswordToken: null,
    });
    res.json({ status: 'success', message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get Plans (public) ────────────────────────────────────────────────────
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plans.find({ status: 1 }).sort({ sort: 1 });
    res.json({ status: 'success', data: plans });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get Coupons (public) ──────────────────────────────────────────────────
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupons.find({ status: 1 });
    res.json({ status: 'success', data: coupons });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get Admin's Parent ID (needed for registration) ───────────────────────
exports.getParentID = async (req, res) => {
  try {
    const admin = await Users.findOne({ role: 1 });
    if (!admin) return res.json({ status: 'error', message: 'No admin found.' });
    res.json({ status: 'success', data: admin._id });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};
