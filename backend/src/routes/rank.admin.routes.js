const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rank/admin.controller');
const { protect, requireAdmin } = require('../middleware/auth.middleware');

router.use(protect, requireAdmin);

router.get('/dashboard', ctrl.getDashboard);
router.get('/users', ctrl.listUsers);
router.put('/users/:id', ctrl.updateUser);
router.get('/plans', ctrl.listPlans);
router.post('/plans', ctrl.createPlan);
router.put('/plans/:id', ctrl.updatePlan);
router.delete('/plans/:id', ctrl.deletePlan);
router.get('/payments', ctrl.listPayments);

module.exports = router;
