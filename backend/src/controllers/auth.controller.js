const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User.model');
const Plan = require('../models/Plan.model');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const logger = require('../utils/logger');

const sanitize = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  isEmailVerified: user.isEmailVerified,
  // SMM Panel
  balance: user.balance,
  apiKey: user.apiKey,
  currency: user.currency,
  status: user.status,
  // Social Proof
  plan: user.plan,
  subscriptionStatus: user.subscriptionStatus,
  usage: user.usage,
  preferences: user.preferences,
  createdAt: user.createdAt,
  user_id: user._id,
  short_nm: user.name?.slice(0,2).toUpperCase() || '?',
  profile_img: user.profilePicture?.url || user.avatar || '',
  parentId: user.parentId, access_level: user.accessLevel,
  bioRole: user.bioRole || 2,
});

exports.register = async (req, res) => {
  try {
    const { name, username, email, password, plan: requestedPlan } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: 'Email and password are required' });

    if (await User.findOne({ $or: [{ email }, ...(username ? [{ username }] : [])] }))
      return res.status(409).json({ success: false, error: 'Email or username already exists' });

    // The signup screen lets the user pick a plan. Fall back to the default
    // plan when none was sent or the id does not resolve.
    const defaultPlan = await Plan.findOne({ isDefault: true });
    const chosenPlan  = requestedPlan
      ? await Plan.findOne({ $or: [{ _id: mongoose.isValidObjectId(requestedPlan) ? requestedPlan : null }, { slug: requestedPlan }] })
      : null;
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name: name || username || email.split('@')[0],
      username: username || email.split('@')[0],
      email, password,
      plan: chosenPlan?._id || defaultPlan?._id || null,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
      ipAddress: req.ip,
    });

    try { await sendVerificationEmail(user, verificationToken); } catch (e) {
      logger.warn(`Verification email failed: ${e.message}`);
    }

    // Seed the topbar bell with a real first notification for this user.
    try {
      const AccountNotification = require('../models/AccountNotification.model');
      await AccountNotification.create({
        user: user._id,
        title: 'Welcome to MarkPro',
        body: 'Your workspace is ready. Add a profile picture and connect your first module.',
        type: 'system',
      });
    } catch (e) {
      logger.warn(`Welcome notification failed: ${e.message}`);
    }


    const { accessToken, refreshToken } = generateTokenPair(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your email.',
      data: { accessToken, refreshToken, user: sanitize(user) },
      token: accessToken, url: 'dashboard',
      user: sanitize(user), status: 'success',
    });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password').populate('plan');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    if (!user.isActive || user.status === 0)
      return res.status(403).json({ success: false, error: 'Your account has been suspended' });

    const { accessToken, refreshToken } = generateTokenPair(user._id);
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      success: true,
      data: { accessToken, refreshToken, user: sanitize(user) },
      // SmartPanel compat
      token: accessToken,
      user: sanitize(user),
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, error: 'Refresh token required' });
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken)
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    const tokens = generateTokenPair(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();
    res.json({ success: true, data: tokens });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    }
    res.json({ success: true, message: 'Logged out' });
  } catch {
    res.json({ success: true, message: 'Logged out' });
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').populate('plan');
  res.json({ success: true, data: sanitize(user), ...sanitize(user) });
};

exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({
      emailVerificationToken: req.query.token,
      emailVerificationExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = Date.now() + 3600000;
    user.resetToken = token;
    user.resetExpires = Date.now() + 3600000;
    await user.save();
    try { await sendPasswordResetEmail(user, token); } catch (e) { logger.warn(`Reset email failed: ${e.message}`); }
    res.json({ success: true, message: 'Password reset link sent.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      $or: [
        { passwordResetToken: token, passwordResetExpires: { $gt: Date.now() } },
        { resetToken: token, resetExpires: { $gt: Date.now() } },
      ],
    });
    if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getPlans   = async (_, res) => { try { const P = require('../models/Plan.model'); res.json({ status:'success', data: await P.find({ isActive: true }) }); } catch(e){ res.json({status:'success',data:[]}); } };
exports.getCoupons = async (_, res) => { try { const { Coupons } = require('../models/bio.models'); res.json({ status:'success', data: await Coupons.find({ status:1 }) }); } catch{ res.json({status:'success',data:[]}); } };
exports.getParentID= async (_, res) => { const u = await User.findOne({ role:'admin' }); res.json({ status:'success', parentId: u?._id }); };
exports.verifyAccount = async (req, res) => { try { await User.findByIdAndUpdate(req.params.id,{isEmailVerified:true,status:1}); res.json({status:'success',message:'Verified'}); } catch(e){ res.status(500).json({status:'error',message:e.message}); } };
exports.checkResetToken = async (req, res) => { const u = await User.findOne({$or:[{passwordResetToken:req.params.token},{resetToken:req.params.token}]}); res.json({status:u?'success':'error',valid:!!u}); };

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['name','username','avatar','preferences','timezone','language','contactNumber'];
    const u = req.user;
    for (const key of allowed) {
      if (req.body[key] !== undefined) u[key] = req.body[key];
    }
    await u.save();
    res.json({ success: true, status: 'success', user: sanitize(u), data: sanitize(u) });
  } catch (err) {
    res.status(500).json({ success: false, status: 'error', message: err.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, password } = req.body;
    const newPwd = newPassword || password;
    const u = await User.findById(req.user._id).select('+password');
    if (currentPassword && !(await u.comparePassword(currentPassword)))
      return res.status(401).json({ success: false, status: 'error', message: 'Current password is incorrect' });
    if (!newPwd || newPwd.length < 6)
      return res.status(400).json({ success: false, status: 'error', message: 'Password must be at least 6 characters' });
    u.password = newPwd;
    await u.save();
    res.json({ success: true, status: 'success', message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, status: 'error', message: err.message });
  }
};
