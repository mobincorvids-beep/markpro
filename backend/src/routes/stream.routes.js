const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');

// ── Controllers ────────────────────────────────────────────────────────────────
const authCtrl       = require('../controllers/auth.controller');
const accountCtrl    = require('../controllers/stream/account.controller');
const feedCtrl       = require('../controllers/stream/feed.controller');
const streamCtrl     = require('../controllers/stream/stream.controller');
const publicFeedCtrl = require('../controllers/stream/publicFeed.controller');

// ── Auth ───────────────────────────────────────────────────────────────────────
router.post('/auth/register', authCtrl.register);
router.post('/auth/login',    authCtrl.login);
router.get ('/auth/me',       protect, authCtrl.getMe);
router.put ('/auth/profile',  protect, authCtrl.updateProfile);

// ── Social Accounts ────────────────────────────────────────────────────────────
router.get   ('/accounts',           protect, accountCtrl.getAccounts);
router.post  ('/accounts',           protect, accountCtrl.addAccount);
router.put   ('/accounts/:id',       protect, accountCtrl.updateAccount);
router.delete('/accounts/:id',       protect, accountCtrl.deleteAccount);
router.post  ('/accounts/:id/fetch', protect, accountCtrl.fetchAccount);

// ── Private Feed ──────────────────────────────────────────────────────────────
router.get ('/feed',         protect, feedCtrl.getFeed);
router.post('/feed/refresh', protect, feedCtrl.refreshFeed);
router.get ('/feed/stats',   protect, feedCtrl.getFeedStats);

// ── Public Embed Feed (no auth) ───────────────────────────────────────────────
router.get('/feed/public/:embedCode', publicFeedCtrl.getPublicFeed);

// ── Streams ───────────────────────────────────────────────────────────────────
router.get   ('/streams',                   protect, streamCtrl.getStreams);
router.post  ('/streams',                   protect, streamCtrl.createStream);
router.put   ('/streams/:id',               protect, streamCtrl.updateStream);
router.delete('/streams/:id',               protect, streamCtrl.deleteStream);
router.get   ('/streams/public/:embedCode',          streamCtrl.getPublicStream);

// ── SEO Tools ─────────────────────────────────────────────────────────────────
// POST /api/seo/preview must be declared before /:slug to avoid route conflicts

module.exports = router;
