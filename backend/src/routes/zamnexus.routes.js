const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/zamnexus/zamnexus.controller');

router.use(protect);

// ── SEO Tool Runner (Gemini AI) ───────────────────────────────
router.get('/seo/tools',                    ctrl.getSeoTools);
router.post('/seo/run',                     ctrl.runSeoTool);
router.get('/seo/history',                  ctrl.getSeoHistory);

// ── CRM Contacts ──────────────────────────────────────────────
router.get('/contacts',                     ctrl.getContacts);
router.post('/contacts',                    ctrl.createContact);
router.get('/contacts/export',              ctrl.exportContacts);
router.post('/contacts/bulk-delete',        ctrl.bulkDeleteContacts);
router.post('/contacts/import',             ctrl.importContacts);
router.get('/contacts/:id',                 ctrl.getContact);
router.put('/contacts/:id',                 ctrl.updateContact);
router.delete('/contacts/:id',              ctrl.deleteContact);
router.post('/contacts/:id/enrich',         ctrl.enrichContact);

// ── Contact Notes ─────────────────────────────────────────────
router.get('/contacts/:contactId/notes',    ctrl.getNotes);
router.post('/contacts/:contactId/notes',   ctrl.createNote);
router.delete('/contacts/:contactId/notes/:noteId', ctrl.deleteNote);

// ── Merge & Deduplication ─────────────────────────────────────
router.get('/contacts/duplicates',          ctrl.findDuplicates);
router.post('/contacts/merge',              ctrl.mergeContacts);

// ── Lead Generation ───────────────────────────────────────────
router.get('/leads/searches',              ctrl.getLeadSearches);
router.post('/leads/searches',             ctrl.createLeadSearch);
router.get('/leads',                       ctrl.getLeads);
router.post('/leads/import-contacts',      ctrl.importLeadsToContacts);
router.post('/leads/export',               ctrl.exportLeads);

// ── Asset Library ─────────────────────────────────────────────
router.get('/assets',                      ctrl.getAssets);
router.post('/assets/upload',              ctrl.uploadAsset);
router.delete('/assets/:id',               ctrl.deleteAsset);

// ── Admin ─────────────────────────────────────────────────────
router.get('/admin/stats',                 requireAdmin, ctrl.adminStats);

module.exports = router;
