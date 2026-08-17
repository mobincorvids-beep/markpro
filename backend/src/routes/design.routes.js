const router  = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/design/design.controller');

// ── Public ────────────────────────────────────────────────────────────────
router.get('/share/:token', ctrl.getSharedProject);

router.use(protect);

// ── Projects ──────────────────────────────────────────────────────────────
router.get('/projects',              ctrl.getProjects);
router.post('/projects',             ctrl.createProject);
router.get('/projects/:id',          ctrl.getProject);
router.put('/projects/:id',          ctrl.updateProject);
router.delete('/projects/:id',       ctrl.deleteProject);
router.post('/projects/:id/duplicate',  ctrl.duplicateProject);
router.post('/projects/:id/thumbnail',  ctrl.saveThumbnail);
router.post('/projects/:id/share',      ctrl.generateShareLink);

// ── Templates ─────────────────────────────────────────────────────────────
router.get('/templates',             ctrl.getTemplates);
router.get('/templates/:id',         ctrl.getTemplate);
router.post('/templates/:id/use',    ctrl.useTemplate);

// Admin template management
router.post('/templates',            requireAdmin, ctrl.createTemplate);
router.put('/templates/:id',         requireAdmin, ctrl.updateTemplate);
router.delete('/templates/:id',      requireAdmin, ctrl.deleteTemplate);

// ── Media Library ─────────────────────────────────────────────────────────
router.get('/media',                 ctrl.getMedia);
router.post('/media/upload',         ctrl.uploadMedia);
router.delete('/media/:id',          ctrl.deleteMedia);
router.post('/media/remove-bg',      ctrl.removeBackground);
router.get('/media/unsplash',        ctrl.searchUnsplash);

// ── Admin Stats ───────────────────────────────────────────────────────────
router.get('/admin/stats',           requireAdmin, ctrl.adminStats);

module.exports = router;
