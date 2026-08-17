const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/whatsml/whatsml.controller');

// ── Public webhook (Meta Cloud API) ──────────────────────────
router.get('/webhook/cloud',  ctrl.cloudWebhookVerify);
router.post('/webhook/cloud', ctrl.cloudWebhookReceive);

router.use(protect);

// ── Workspaces ────────────────────────────────────────────────
router.get('/workspaces',           ctrl.getWorkspaces);
router.post('/workspaces',          ctrl.createWorkspace);

// ── Cloud API connections ─────────────────────────────────────
router.get('/cloud-apps',           ctrl.getCloudApps);
router.post('/cloud-apps',          ctrl.createCloudApp);
router.put('/cloud-apps/:id',       ctrl.updateCloudApp);
router.delete('/cloud-apps/:id',    ctrl.deleteCloudApp);

// ── WhatsApp Web sessions (Baileys) ──────────────────────────
router.get('/web-apps',             ctrl.getWebApps);
router.post('/web-apps',            ctrl.createWebApp);
router.get('/web-apps/:id/qr',      ctrl.getQrCode);
router.delete('/web-apps/:id',      ctrl.deleteWebApp);

// ── Customers ─────────────────────────────────────────────────
router.get('/customers',            ctrl.getCustomers);
router.post('/customers',           ctrl.createCustomer);
router.put('/customers/:id',        ctrl.updateCustomer);
router.delete('/customers/:id',     ctrl.deleteCustomer);
router.post('/customers/import',    ctrl.importCustomers);

// ── Groups ────────────────────────────────────────────────────
router.get('/groups',               ctrl.getGroups);
router.post('/groups',              ctrl.createGroup);
router.delete('/groups/:id',        ctrl.deleteGroup);

// ── Conversations ─────────────────────────────────────────────
router.get('/conversations',                          ctrl.getConversations);
router.get('/conversations/:conversationId/messages', ctrl.getMessages);
router.post('/conversations/:conversationId/send',    ctrl.sendMessage);
router.post('/conversations/:conversationId/suggest', ctrl.suggestAiReply);

// ── Campaigns ─────────────────────────────────────────────────
router.get('/campaigns',            ctrl.getCampaigns);
router.post('/campaigns',           ctrl.createCampaign);
router.post('/campaigns/:id/pause', ctrl.pauseCampaign);
router.post('/campaigns/:id/resume',ctrl.resumeCampaign);
router.delete('/campaigns/:id',     ctrl.deleteCampaign);

// ── Auto-response bots ────────────────────────────────────────
router.get('/bots',                 ctrl.getAutoResponses);
router.post('/bots',                ctrl.createAutoResponse);
router.put('/bots/:id',             ctrl.updateAutoResponse);
router.delete('/bots/:id',          ctrl.deleteAutoResponse);

// ── AI Training (RAG knowledge base) ─────────────────────────
router.get('/training',             ctrl.getTrainingSets);
router.post('/training',            ctrl.createTrainingSet);
router.delete('/training/:id',      ctrl.deleteTrainingSet);

// ── Number Scanner ────────────────────────────────────────────
router.get('/scanner',              ctrl.getScanJobs);
router.post('/scanner',             ctrl.createScanJob);
router.get('/scanner/:id',          ctrl.getScanJob);

// ── Web Scraping ──────────────────────────────────────────────
router.get('/scrape',               ctrl.getScrapeJobs);
router.post('/scrape',              ctrl.createScrapeJob);
router.get('/scrape/:id/results',   ctrl.getScrapeResults);
router.post('/scrape/import',       ctrl.importScrapedToCustomers);

// ── Admin ─────────────────────────────────────────────────────
router.get('/admin/stats',          requireAdmin, ctrl.adminStats);

module.exports = router;
