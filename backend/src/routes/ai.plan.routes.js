const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/social/plan.controller');

router.get('/', ctrl.getPlans);


module.exports = router;
