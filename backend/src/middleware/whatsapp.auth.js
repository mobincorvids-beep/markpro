const jwt      = require('jsonwebtoken');
const { User, ApiToken } = require('../models');

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || !req.user.is_enabled) return res.status(401).json({ error: 'Account disabled' });
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin access required' });
  next();
};

// Permission check helper
const can = (permission) => (req, res, next) => {
  if (req.user?.is_admin) return next();
  if (!req.user?.permissions?.includes(permission))
    return res.status(403).json({ error: `Permission '${permission}' required` });
  next();
};

// API token auth (for /api/v1 external endpoints)
const validateApiToken = (permission) => async (req, res, next) => {
  const token = req.headers['x-api-token'] || req.query.api_token;
  if (!token) return res.status(401).json({ error: 'API token required' });
  const apiToken = await ApiToken.findOne({ token });
  if (!apiToken) return res.status(401).json({ error: 'Invalid API token' });
  if (permission && !apiToken.permissions.includes(permission))
    return res.status(403).json({ error: 'Insufficient token permissions' });
  apiToken.lastUsed = new Date();
  await apiToken.save();
  req.apiToken = apiToken;
  next();
};

module.exports = { protect, adminOnly, can, validateApiToken };
