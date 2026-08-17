const User = require('../models/User.model');
const { verifyAccessToken } = require('../utils/jwt');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer '))
      token = req.headers.authorization.split(' ')[1];
    if (!token)
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).populate('plan');
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'User not found or inactive' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
};

const requireVerifiedEmail = (req, res, next) => {
  if (!req.user?.isEmailVerified)
    return res.status(403).json({ success: false, message: 'Please verify your email first' });
  next();
};

// Check plan limit helper
const checkPlanLimit = (limitKey) => async (req, res, next) => {
  const user = req.user;
  const plan = user.plan;
  if (!plan) return next(); // no plan = use free limits (enforced in controller)
  const limit = plan.limits?.[limitKey];
  if (limit === -1) return next(); // unlimited
  const used = user.usage?.[limitKey] || 0;
  if (limit !== undefined && used >= limit)
    return res.status(403).json({ success: false, message: `Plan limit reached for ${limitKey}. Please upgrade.` });
  next();
};


const optionalProtect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    if (decoded?.id) {
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (_) {}
  next();
};


const checkWordTokens = (cost) => async (req, res, next) => {
  try {
    const User = require('../models/User.model');
    const user = await User.findById(req.user._id);
    const limit = user?.plan?.wordLimit ?? user?.plan?.wordsPerMonth ?? -1;
    if (limit !== -1 && (user.tokensUsed || 0) + cost > limit)
      return res.status(402).json({ success: false, message: 'Word limit reached. Upgrade your plan.' });
    next();
  } catch { next(); }
};

const checkImageTokens = (cost) => async (req, res, next) => {
  try {
    const User = require('../models/User.model');
    const user = await User.findById(req.user._id);
    const limit = user?.plan?.imageLimit ?? user?.plan?.imagesPerMonth ?? -1;
    if (limit !== -1 && (user.imagesGenerated || 0) + cost > limit)
      return res.status(402).json({ success: false, message: 'Image limit reached. Upgrade your plan.' });
    next();
  } catch { next(); }
};

module.exports = { protect, requireAdmin, requireVerifiedEmail, checkPlanLimit, optionalProtect, checkWordTokens, checkImageTokens };

exports.optionalProtect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const { verifyToken } = require('../utils/jwt');
      const decoded = verifyToken(token);
      req.user = await require('../models/User.model').findById(decoded.id).select('-password');
    }
  } catch (_) {}
  next();
};


