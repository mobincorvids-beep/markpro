const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/smm/smmlab.controller');

router.use(protect);

// ── Deposits ──────────────────────────────────────────────────────────────
router.get('/deposits',                       ctrl.getDeposits);
router.post('/deposits',                      ctrl.createDeposit);
router.post('/deposits/paypal/capture',       ctrl.capturePaypalDeposit);

// ── Favorites ─────────────────────────────────────────────────────────────
router.get('/favorites',                      ctrl.getFavorites);
router.post('/favorites/:serviceId',          ctrl.toggleFavorite);
router.delete('/favorites/:serviceId',        ctrl.toggleFavorite);

// ── Admin ─────────────────────────────────────────────────────────────────
router.get('/admin/deposits',                 requireAdmin, ctrl.adminGetDeposits);
router.post('/admin/deposits/:id/approve',    requireAdmin, ctrl.adminApproveDeposit);
router.post('/admin/deposits/:id/reject',     requireAdmin, ctrl.adminRejectDeposit);
router.get('/admin/cron-logs',                requireAdmin, ctrl.getCronLogs);
router.delete('/admin/cron-logs',             requireAdmin, ctrl.clearCronLogs);
router.get('/admin/provider-sync-logs',       requireAdmin, ctrl.getProviderSyncLogs);

module.exports = router;
