const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User.model');
const { protect } = require('../middleware/auth.middleware');

const sign = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
const safe = u  => ({ id: u._id, name: u.name, email: u.email, role: u.role });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });
    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, password });
    res.status(201).json({ success: true, token: sign(user._id), user: safe(user) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.active)
      return res.status(403).json({ success: false, message: 'Account suspended' });
    res.json({ success: true, token: sign(user._id), user: safe(user) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: safe(req.user) });
});

module.exports = router;
