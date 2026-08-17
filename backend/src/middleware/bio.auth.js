const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Access token required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    req.vsuser = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ status: 'error', message: 'Invalid or expired token.' });
  }
};

const adminMiddleware = (req, res, next) => {
  authMiddleware(req, res, () => {
    if (req.vsuser?.role !== 1) {
      return res.status(403).json({ status: 'error', message: 'Admin access required.' });
    }
    next();
  });
};

module.exports = { authMiddleware, adminMiddleware };
