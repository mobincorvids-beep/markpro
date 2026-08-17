// plan.routes.js
const express = require('express');
const r1 = express.Router();
const Plan = require('../models/Plan.model');
r1.get('/', async (req, res) => {
  const plans = await Plan.find({ isActive: true }).sort('sortOrder');
  res.json({ success: true, data: plans });
});
module.exports = r1;
