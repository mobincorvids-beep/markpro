const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const c = require('../controllers/payments/localPayments.controller');

router.get('/methods', c.getMethods);

router.use(protect);
router.post('/local',      c.createPayment);
router.get('/local/mine',  c.listMine);

router.get('/local/admin',          requireAdmin, c.listAll);
router.post('/local/:id/approve',   requireAdmin, c.approve);
router.post('/local/:id/reject',    requireAdmin, c.reject);

module.exports = router;
