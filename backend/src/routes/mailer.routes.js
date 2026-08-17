const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/mailer/mailer.controller');

router.use(protect);

// ── Groups ────────────────────────────────────────────────────────────────
router.get('/groups',             ctrl.getGroups);
router.post('/groups',            ctrl.createGroup);
router.put('/groups/:id',         ctrl.updateGroup);
router.delete('/groups/:id',      ctrl.deleteGroup);

// ── Contacts ──────────────────────────────────────────────────────────────
router.get('/contacts',           ctrl.getContacts);
router.post('/contacts',          ctrl.createContact);
router.put('/contacts/:id',       ctrl.updateContact);
router.delete('/contacts/:id',    ctrl.deleteContact);
router.post('/contacts/import',   ctrl.importContacts);

// ── Templates ─────────────────────────────────────────────────────────────
router.get('/templates',          ctrl.getTemplates);
router.post('/templates',         ctrl.createTemplate);
router.put('/templates/:id',      ctrl.updateTemplate);
router.delete('/templates/:id',   ctrl.deleteTemplate);

// ── Campaigns ─────────────────────────────────────────────────────────────
router.get('/campaigns',          ctrl.getCampaigns);
router.post('/campaigns',         ctrl.createCampaign);
router.get('/campaigns/:id',      ctrl.getCampaign);
router.put('/campaigns/:id',      ctrl.updateCampaign);
router.delete('/campaigns/:id',   ctrl.deleteCampaign);
router.post('/campaigns/:id/send',  ctrl.sendCampaign);
router.post('/campaigns/:id/pause', ctrl.pauseCampaign);

// ── Analytics ─────────────────────────────────────────────────────────────
router.get('/analytics',          ctrl.getAnalytics);

// ── Settings (per-user provider keys) ─────────────────────────────────────
router.get('/settings',           ctrl.getSettings);
router.put('/settings',           ctrl.updateSettings);

module.exports = router;
