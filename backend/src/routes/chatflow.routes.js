const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/chatflow/chatflow.controller');

// ── Public webhook ────────────────────────────────────────────
router.get('/webhook/messenger',   ctrl.messengerVerify);
router.post('/webhook/messenger',  ctrl.messengerReceive);

// ── Public storefront ─────────────────────────────────────────
router.get('/store/:tenantId/products', ctrl.publicGetProducts);
router.post('/store/:tenantId/checkout',ctrl.publicCheckout);

router.use(protect);

// ── Tenant ────────────────────────────────────────────────────
router.get('/tenant',              ctrl.getMyTenant);
router.put('/tenant',              ctrl.updateTenant);

// ── Pages ─────────────────────────────────────────────────────
router.get('/pages',               ctrl.getPages);
router.post('/pages',              ctrl.createPage);
router.put('/pages/:id',           ctrl.updatePage);
router.delete('/pages/:id',        ctrl.deletePage);

// ── Subscribers ───────────────────────────────────────────────
router.get('/subscribers',         ctrl.getSubscribers);
router.put('/subscribers/:id',     ctrl.updateSubscriber);

// ── Conversations ─────────────────────────────────────────────
router.get('/conversation/:subscriberId',        ctrl.getConversation);
router.post('/conversation/:subscriberId/send',  ctrl.sendMessage);

// ── Automation Rules ──────────────────────────────────────────
router.get('/rules',               ctrl.getRules);
router.post('/rules',              ctrl.createRule);
router.put('/rules/:id',           ctrl.updateRule);
router.delete('/rules/:id',        ctrl.deleteRule);

// ── Sequences ─────────────────────────────────────────────────
router.get('/sequences',           ctrl.getSequences);
router.post('/sequences',          ctrl.createSequence);
router.put('/sequences/:id',       ctrl.updateSequence);
router.delete('/sequences/:id',    ctrl.deleteSequence);
router.post('/sequences/:id/enroll', ctrl.enrollSubscriber);

// ── Broadcasts ────────────────────────────────────────────────
router.get('/broadcasts',          ctrl.getBroadcasts);
router.post('/broadcasts',         ctrl.createBroadcast);
router.post('/broadcasts/:id/send',ctrl.sendBroadcast);

// ── E-commerce ────────────────────────────────────────────────
router.get('/categories',          ctrl.getCategories);
router.post('/categories',         ctrl.createCategory);
router.get('/products',            ctrl.getProducts);
router.post('/products',           ctrl.createProduct);
router.put('/products/:id',        ctrl.updateProduct);
router.delete('/products/:id',     ctrl.deleteProduct);
router.get('/orders',              ctrl.getOrders);
router.put('/orders/:id/status',   ctrl.updateOrderStatus);

// ── Admin ─────────────────────────────────────────────────────
router.get('/admin/stats',         requireAdmin, ctrl.adminStats);
router.get('/admin/tenants',       requireAdmin, ctrl.adminGetTenants);
router.put('/admin/tenants/:id/suspend', requireAdmin, ctrl.adminSuspendTenant);

module.exports = router;
