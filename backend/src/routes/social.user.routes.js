const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/social/user.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Profile
router.put('/profile', ctrl.updateProfile);
router.put('/preferences', ctrl.updatePreferences);
router.put('/change-password', ctrl.changePassword);
router.post('/regenerate-api-key', ctrl.regenerateApiKey);
router.delete('/account', ctrl.deleteAccount);

// Domains
router.get('/domains', ctrl.listDomains);
router.post('/domains', ctrl.createDomain);
router.delete('/domains/:id', ctrl.deleteDomain);

// Notification handlers
router.get('/handlers', ctrl.listHandlers);
router.post('/handlers', ctrl.createHandler);
router.put('/handlers/:id', ctrl.updateHandler);
router.delete('/handlers/:id', ctrl.deleteHandler);

// Leads
router.get('/leads',             ctrl.listLeads);
router.get('/leads/export',      ctrl.exportLeads);

// Plans & billing
router.get('/plans', ctrl.getPlans);
router.post('/billing/checkout', ctrl.createCheckout);
router.get('/billing/portal', ctrl.getBillingPortal);
router.get('/billing/payments', ctrl.listPayments);

module.exports = router;
