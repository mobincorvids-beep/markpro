const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/smm/order.controller');

router.post('/',          protect, ctrl.placeOrder);
router.post('/mass',      protect, ctrl.massOrder);
router.get('/mine',       protect, ctrl.myOrders);
router.get('/:id',        protect, ctrl.getOrder);
router.post('/:id/refill',protect, ctrl.refillOrder);

module.exports = router;
