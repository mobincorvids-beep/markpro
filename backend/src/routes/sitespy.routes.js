const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/sitespy/sitespy.controller');

// ── Public (no auth) ──────────────────────────────────────────
router.get('/track',                   ctrl.trackVisit);
router.get('/tracker/:code/tracker.js',ctrl.getTrackerJs);
router.get('/s/:code',                 ctrl.redirectShortUrl);
router.get('/plans',                   ctrl.getPlans);

router.use(protect);

// ── Websites ──────────────────────────────────────────────────
router.get('/websites',                ctrl.getWebsites);
router.post('/websites',               ctrl.createWebsite);
router.delete('/websites/:id',         ctrl.deleteWebsite);
router.get('/websites/:id/analytics',  ctrl.getWebsiteAnalytics);

// ── URL Shortener ─────────────────────────────────────────────
router.get('/urls',                    ctrl.getUrls);
router.post('/urls',                   ctrl.createShortUrl);
router.delete('/urls/:id',             ctrl.deleteUrl);

// ── SEO / Domain Tools ────────────────────────────────────────
router.post('/whois',                  ctrl.whoisLookup);
router.post('/dns',                    ctrl.dnsLookup);
router.post('/security-scan',          ctrl.securityScan);

// ── Keywords ──────────────────────────────────────────────────
router.get('/keywords',                ctrl.getKeywords);
router.post('/keywords',               ctrl.addKeyword);
router.delete('/keywords/:id',         ctrl.deleteKeyword);

// ── Admin ─────────────────────────────────────────────────────
router.get('/admin/stats',             requireAdmin, ctrl.adminStats);

module.exports = router;
