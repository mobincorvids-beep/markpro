const express = require('express');
const router  = express.Router();
const { auth, adminAuth, checkUsage, checkModule } = require('../middleware/pen.auth.middleware');

const authCtrl    = require('../controllers/pen/penAuth.controller');
const contentCtrl = require('../controllers/pen/penContent.controller');
const adminCtrl   = require('../controllers/pen/penAdmin.controller');

// ── AUTH ──────────────────────────────────────────────────────────────────
router.post('/auth/register',       authCtrl.register);
router.post('/auth/login',          authCtrl.login);
router.post('/auth/forgot-password',authCtrl.forgotPassword);
router.post('/auth/reset-password', authCtrl.resetPassword);
router.get ('/auth/me',             auth, authCtrl.getMe);
router.put ('/auth/profile',        auth, authCtrl.updateProfile);
router.put ('/auth/change-password',auth, authCtrl.changePassword);

// ── DASHBOARD ─────────────────────────────────────────────────────────────
router.get('/dashboard/stats', auth, authCtrl.getDashboardStats);

// ── TEMPLATES ─────────────────────────────────────────────────────────────
router.get('/templates/groups',    auth, contentCtrl.getTemplateGroups);
router.get('/templates',           auth, contentCtrl.getTemplates);
router.get('/templates/:id',       auth, contentCtrl.getTemplate);

// ── TEXT GENERATION ───────────────────────────────────────────────────────
router.post('/generate/text',      auth, checkModule('text'), checkUsage('token'), contentCtrl.generateTextContent);
router.post('/generate/custom',    auth, checkModule('text'), checkUsage('token'), contentCtrl.generateCustomText);

// ── IMAGE GENERATION ──────────────────────────────────────────────────────
router.post('/generate/image',     auth, checkModule('image'), checkUsage('image'), contentCtrl.generateImage);

// ── AUDIO GENERATION ──────────────────────────────────────────────────────
router.post('/generate/audio',     auth, checkModule('audio'), checkUsage('audio'), contentCtrl.generateAudio);

// ── CODE GENERATION ───────────────────────────────────────────────────────
router.post('/generate/code',      auth, checkModule('code'), checkUsage('token'), contentCtrl.generateCustomText);

// ── CHAT ──────────────────────────────────────────────────────────────────
router.post('/chat',               auth, checkModule('chat'), checkUsage('token'), contentCtrl.chat);
router.get ('/chat/sessions',      auth, contentCtrl.getChatSessions);
router.get ('/chat/sessions/:id',  auth, contentCtrl.getChatSession);
router.delete('/chat/sessions/:id',auth, contentCtrl.deleteChatSession);

// ── HISTORY ───────────────────────────────────────────────────────────────
router.get   ('/history',          auth, contentCtrl.getHistory);
router.get   ('/history/:id',      auth, contentCtrl.getHistoryItem);
router.delete('/history/:id',      auth, contentCtrl.deleteHistory);
router.put   ('/history/:id/name', auth, contentCtrl.updateHistoryName);

// ── SAVED DOCS ────────────────────────────────────────────────────────────
router.get   ('/saved',            auth, contentCtrl.getSavedDocs);
router.post  ('/saved',            auth, contentCtrl.saveDoc);
router.delete('/saved/:id',        auth, contentCtrl.deleteSavedDoc);

// ── BILLING ───────────────────────────────────────────────────────────────
router.get ('/billing/packages',   adminCtrl.getPublicPackages);
router.post('/billing/checkout',   auth, adminCtrl.createCheckout);
router.get ('/billing/verify',     auth, adminCtrl.verifyPayment);
router.get ('/billing/orders',     auth, adminCtrl.getMyOrders);

// ── TEAM MEMBERS ──────────────────────────────────────────────────────────
router.get   ('/team',             auth, adminCtrl.getTeamMembers);
router.post  ('/team/invite',      auth, adminCtrl.inviteTeamMember);
router.put   ('/team/:id',         auth, adminCtrl.updateTeamMember);
router.delete('/team/:id',         auth, adminCtrl.removeTeamMember);

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ════════════════════════════════════════════════════════════════════════════
router.get('/admin/stats',                 adminAuth, adminCtrl.adminStats);

router.get   ('/admin/users',              adminAuth, adminCtrl.getUsers);
router.post  ('/admin/users',              adminAuth, adminCtrl.createUser);
router.put   ('/admin/users/:id',          adminAuth, adminCtrl.updateUser);
router.delete('/admin/users/:id',          adminAuth, adminCtrl.deleteUser);
router.patch ('/admin/users/:id/status',   adminAuth, adminCtrl.updateUserStatus);
router.post  ('/admin/users/:id/package',  adminAuth, adminCtrl.assignPackage);
router.post  ('/admin/users/:id/credits',  adminAuth, adminCtrl.addUserCredits);

router.get   ('/admin/packages',           adminAuth, adminCtrl.getPackages);
router.post  ('/admin/packages',           adminAuth, adminCtrl.createPackage);
router.put   ('/admin/packages/:id',       adminAuth, adminCtrl.updatePackage);
router.delete('/admin/packages/:id',       adminAuth, adminCtrl.deletePackage);

router.get   ('/admin/groups',             adminAuth, adminCtrl.getAdminGroups);
router.post  ('/admin/groups',             adminAuth, adminCtrl.createGroup);
router.put   ('/admin/groups/:id',         adminAuth, adminCtrl.updateGroup);
router.delete('/admin/groups/:id',         adminAuth, adminCtrl.deleteGroup);

router.get   ('/admin/templates',          adminAuth, adminCtrl.getAdminTemplates);
router.post  ('/admin/templates',          adminAuth, adminCtrl.createTemplate);
router.put   ('/admin/templates/:id',      adminAuth, adminCtrl.updateTemplate);
router.delete('/admin/templates/:id',      adminAuth, adminCtrl.deleteTemplate);

router.get('/admin/settings',              adminAuth, adminCtrl.getSettings);
router.put('/admin/settings',              adminAuth, adminCtrl.updateSettings);

router.get('/admin/orders',                adminAuth, adminCtrl.getOrders);

module.exports = router;
