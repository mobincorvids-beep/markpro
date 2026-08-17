const jwt = require('jsonwebtoken');
const { User } = require('../models/AI2Pen.models');

// ── JWT Auth ──────────────────────────────────────────────────────────────
const auth = async (req, res, next) => {
  const h = req.headers['authorization'];
  const token = h && h.split(' ')[1];
  if (!token) return res.status(401).json({ status: '0', message: 'Authentication required.' });
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(d.id).select('-password -passwordResetToken -emailVerificationToken').populate('penPackageId', 'package_name modules token_limit image_limit audio_limit team_members').lean();
    if (!user) return res.status(401).json({ status: '0', message: 'User not found.' });
    if (user.status === 2) return res.status(403).json({ status: '0', message: 'Account suspended.' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(403).json({ status: '0', message: 'Invalid or expired token.' });
  }
};

// ── Admin only ────────────────────────────────────────────────────────────
const adminAuth = (req, res, next) => auth(req, res, () => {
  if (req.user?.role !== 'admin') return res.status(403).json({ status: '0', message: 'Admin access required.' });
  next();
});

// ── Check usage limits ────────────────────────────────────────────────────
const checkUsage = (type = 'token') => (req, res, next) => {
  const user = req.user;
  if (user.role === 'admin') return next(); // admin has unlimited

  if (type === 'token') {
    const used  = user.penTokenUsed   || 0;
    const limit = user.penTokenLimit  || 0;
    if (limit !== -1 && used >= limit)
      return res.json({ status: '0', message: 'Token limit exceeded. Please upgrade your plan.' });
  } else if (type === 'image') {
    const used  = user.penImageUsed  || 0;
    const limit = user.penImageLimit || 0;
    if (limit !== -1 && used >= limit)
      return res.json({ status: '0', message: 'Image generation limit exceeded. Please upgrade your plan.' });
  } else if (type === 'audio') {
    const used  = user.penAudioUsed  || 0;
    const limit = user.penAudioLimit || 0;
    if (limit !== -1 && used >= limit)
      return res.json({ status: '0', message: 'Audio generation limit exceeded. Please upgrade your plan.' });
  }
  next();
};

// ── Module access check ───────────────────────────────────────────────────
const checkModule = (module) => (req, res, next) => {
  const user = req.user;
  if (user.role === 'admin') return next();
  const modules = user.penPackageId?.modules || user.penPackageData?.modules || [];
  if (!modules.includes(module))
    return res.json({ status: '0', message: 'Your plan does not include access to this module. Please upgrade.' });
  next();
};

module.exports = { auth, adminAuth, checkUsage, checkModule };
