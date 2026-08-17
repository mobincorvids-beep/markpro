const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/seomanager/seomanager.controller');

router.use(protect);

// ── CRUD ──────────────────────────────────────────────────────
router.get('/',                     ctrl.getPages);
router.post('/',                    ctrl.createPage);
router.get('/by-slug/:slug',        ctrl.getPageBySlug);
router.get('/:id',                  ctrl.getPage);
router.put('/:id',                  ctrl.updatePage);
router.delete('/:id',               ctrl.deletePage);

// ── Tag generation ────────────────────────────────────────────
router.post('/preview',             ctrl.preview);
router.get('/generate/:slug',       ctrl.generateTags);

// ── SEO Audit ─────────────────────────────────────────────────
router.post('/audit',               ctrl.auditPage);

// ── Bulk Import ───────────────────────────────────────────────
router.post('/import/json',         ctrl.bulkImport);
router.post('/import/csv',          ctrl.csvImport);

// ── Admin ─────────────────────────────────────────────────────
router.get('/admin/stats',          requireAdmin, ctrl.adminStats);

module.exports = router;
