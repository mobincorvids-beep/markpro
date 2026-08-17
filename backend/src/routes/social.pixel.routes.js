const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/social/pixel.controller');

// Public - no auth required
router.get('/pixel.js',     ctrl.servePixelScript);
router.post('/track',       ctrl.track);
router.post('/lead',        ctrl.captureLead);

module.exports = router;
