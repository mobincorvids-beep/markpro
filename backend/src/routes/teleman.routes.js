const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/teleman/teleman.controller');

// Public webhook
router.post('/webhook/call-status', ctrl.twilioCallStatus);

router.use(protect);

// Plans & Tenant
router.get('/plans',                    ctrl.getPlans);
router.get('/tenant',                   ctrl.getMyTenant);

// Departments
router.get('/departments',              ctrl.getDepts);
router.post('/departments',             ctrl.createDept);
router.put('/departments/:id',          ctrl.updateDept);
router.delete('/departments/:id',       ctrl.deleteDept);

// Providers (Twilio creds)
router.get('/providers',                ctrl.getProviders);
router.post('/providers',               ctrl.createProvider);
router.post('/providers/:id/test',      ctrl.testProvider);
router.delete('/providers/:id',         ctrl.deleteProvider);

// Browser dialer token
router.get('/voice/token',              ctrl.getTwilioToken);

// Contacts
router.get('/contacts',                 ctrl.getContacts);
router.post('/contacts',                ctrl.createContact);
router.put('/contacts/:id',             ctrl.updateContact);
router.delete('/contacts/:id',          ctrl.deleteContact);
router.post('/contacts/import',         ctrl.importContacts);

// Scripts
router.get('/scripts',                  ctrl.getScripts);
router.post('/scripts',                 ctrl.createScript);
router.put('/scripts/:id',              ctrl.updateScript);
router.delete('/scripts/:id',           ctrl.deleteScript);

// Campaigns
router.get('/campaigns',                ctrl.getCampaigns);
router.post('/campaigns',               ctrl.createCampaign);
router.put('/campaigns/:id/status',     ctrl.updateCampaignStatus);
router.post('/campaigns/:id/contacts',  ctrl.addContactsToCampaign);

// Calls & SMS
router.get('/calls',                    ctrl.getCallHistory);
router.post('/sms/send',                ctrl.sendSms);

// Support tickets
router.get('/tickets',                  ctrl.getTickets);
router.post('/tickets',                 ctrl.createTicket);
router.post('/tickets/:id/reply',       ctrl.replyTicket);

// Admin
router.get('/admin/stats',              requireAdmin, ctrl.adminStats);

module.exports = router;
