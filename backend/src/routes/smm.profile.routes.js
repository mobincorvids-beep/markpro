const router = require('express').Router();
const User = require('../models/User.model');
const { Transaction } = require('../models/SMM_Supporting.model');
const { protect } = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');

// GET /api/profile
router.get('/', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
});

// PATCH /api/profile
router.patch('/', protect, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (username) user.username = username;
    if (email)    user.email    = email;
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      if (!(await user.matchPassword(currentPassword)))
        return res.status(400).json({ error: 'Current password is incorrect' });
      user.password = newPassword;
    }
    await user.save();
    res.json({ message: 'Profile updated', user: { username: user.username, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/profile/regenerate-api-key
router.post('/regenerate-api-key', protect, async (req, res) => {
  try {
    const apiKey = uuidv4().replace(/-/g, '');
    await User.findByIdAndUpdate(req.user._id, { apiKey });
    res.json({ apiKey });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
