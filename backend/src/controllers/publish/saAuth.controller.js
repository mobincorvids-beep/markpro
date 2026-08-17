const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { User, Plan, Setting } = require('../../models/SocialAI.models');
const { sendMail }  = require('../../utils/saMailer');
const { addCredits } = require('../../utils/credits');

const sign = (user) => jwt.sign(
  { id: user._id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.json({ status: 'error', message: 'Name, email and password are required.' });

    if (await User.findOne({ email: email.toLowerCase() }))
      return res.json({ status: 'error', message: 'Email already registered.' });

    const hashed = await bcrypt.hash(password, 12);
    const verify_token = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name: name.trim(), email: email.toLowerCase(), password: hashed,
      email_verify_token: verify_token, status: 1,
    });

    // Grant free plan credits
    const freePlan = await Plan.findOne({ price: 0 });
    if (freePlan) {
      user.plan_id   = freePlan._id;
      user.plan_data = freePlan.data;
      user.credits   = freePlan.data?.credits || 50;
      await user.save();
    } else {
      await addCredits(user._id, 50, 'Welcome bonus credits');
    }

    // Send welcome email (non-blocking)
    sendMail({
      to: email,
      subject: `Welcome to ${process.env.APP_NAME || 'SocialAI'}!`,
      html: `<p>Hi ${name}, welcome aboard! Your account is ready.</p>`,
    }).catch(() => {});

    const token = sign(user);
    res.json({ status: 'success', message: 'Registration successful!', token, data: sanitize(user) });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.json({ status: 'error', message: 'Invalid email or password.' });
    if (user.status === 2) return res.json({ status: 'error', message: 'Account suspended.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ status: 'error', message: 'Invalid email or password.' });

    await User.findByIdAndUpdate(user._id, { total_logins: (user.total_logins || 0) + 1, last_login_at: new Date(), ip: req.ip });

    const token = sign(user);
    res.json({ status: 'success', message: 'Login successful.', token, data: sanitize(user) });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('plan_id', 'name price data type')
      .select('-password -password_reset_token -email_verify_token')
      .lean();
    res.json({ status: 'success', data: user });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const update = {};
    if (name)    update.name    = name.trim();
    if (phone)   update.phone   = phone;
    if (address) update.address = address;
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
      .select('-password -password_reset_token -email_verify_token');
    res.json({ status: 'success', message: 'Profile updated.', data: user });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findById(req.user._id);
    if (!await bcrypt.compare(current_password, user.password))
      return res.json({ status: 'error', message: 'Current password is incorrect.' });
    user.password = await bcrypt.hash(new_password, 12);
    await user.save();
    res.json({ status: 'success', message: 'Password changed.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    // Always return success (security)
    if (!user) return res.json({ status: 'success', message: 'If that email exists, a reset link was sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    await User.findByIdAndUpdate(user._id, { password_reset_token: token });

    const link = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    await sendMail({
      to: email,
      subject: 'Reset your password',
      html: `<p>Click the link to reset your password (valid 24h):</p><p><a href="${link}">${link}</a></p>`,
    });
    res.json({ status: 'success', message: 'Password reset email sent.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ password_reset_token: token });
    if (!user) return res.json({ status: 'error', message: 'Invalid or expired reset token.' });
    user.password = await bcrypt.hash(password, 12);
    user.password_reset_token = null;
    await user.save();
    res.json({ status: 'success', message: 'Password reset successfully.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.getCreditHistory = async (req, res) => {
  try {
    const { CreditHistory } = require('../../models/SocialAI.models');
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const [history, total] = await Promise.all([
      CreditHistory.find({ user_id: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(+limit),
      CreditHistory.countDocuments({ user_id: req.user._id }),
    ]);
    res.json({ status: 'success', data: history, total });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.getNotifications = async (req, res) => {
  try {
    const { Notification } = require('../../models/SocialAI.models');
    const notes = await Notification.find({ user_id: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ status: 'success', data: notes });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    const { Notification } = require('../../models/SocialAI.models');
    await Notification.updateMany({ user_id: req.user._id, read_at: null }, { read_at: new Date() });
    res.json({ status: 'success', message: 'All notifications marked as read.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

function sanitize(user) {
  const { password, password_reset_token, email_verify_token, ...safe } = (user.toObject ? user.toObject() : user);
  return safe;
}
