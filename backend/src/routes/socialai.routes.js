const express = require('express');
const router  = express.Router();
const { protect: auth, requireAdmin } = require('../middleware/auth.middleware');

const authCtrl    = require('../controllers/publish/saAuth.controller');
const brandCtrl   = require('../controllers/publish/brand.controller');
const postCtrl    = require('../controllers/publish/saPost.controller');
const aiCtrl      = require('../controllers/publish/saAI.controller');
const adminCtrl   = require('../controllers/publish/saAdmin.controller');
const billingCtrl = require('../controllers/publish/saBilling.controller');

// ── AUTH ──────────────────────────────────────────────────────────────────
router.post('/auth/register',       authCtrl.register);
router.post('/auth/login',          authCtrl.login);
router.post('/auth/forgot-password',authCtrl.forgotPassword);
router.post('/auth/reset-password', authCtrl.resetPassword);
router.get ('/auth/me',             auth, authCtrl.getMe);
router.put ('/auth/profile',        auth, authCtrl.updateProfile);
router.put ('/auth/change-password',auth, authCtrl.changePassword);
router.get ('/auth/credit-history', auth, authCtrl.getCreditHistory);
router.get ('/auth/notifications',  auth, authCtrl.getNotifications);
router.post('/auth/notifications/read', auth, authCtrl.markNotificationsRead);

// ── BRANDS ────────────────────────────────────────────────────────────────
router.get ('/brands',                         auth, brandCtrl.getBrands);
router.post('/brands',                         auth, brandCtrl.createBrand);
router.get ('/brands/:id',                     auth, brandCtrl.getBrand);
router.put ('/brands/:id',                     auth, brandCtrl.updateBrand);
router.delete('/brands/:id',                   auth, brandCtrl.deleteBrand);
router.post('/brands/:id/generate/identities', auth, brandCtrl.generateBrandIdentities);
router.post('/brands/:id/generate/audiences',  auth, brandCtrl.generateAudiences);
router.post('/brands/:id/generate/voice',      auth, brandCtrl.generateVoice);
router.post('/brands/:id/generate/strategy',   auth, brandCtrl.generateStrategy);
router.post('/brands/:id/generate/slogan',     auth, brandCtrl.generateSlogan);

// ── POSTS ─────────────────────────────────────────────────────────────────
router.get ('/posts',                          auth, postCtrl.getPosts);
router.post('/posts',                          auth, postCtrl.createPost);
router.get ('/posts/calendar',                 auth, postCtrl.getCalendar);
router.get ('/posts/:id',                      auth, postCtrl.getPost);
router.put ('/posts/:id',                      auth, postCtrl.updatePost);
router.delete('/posts/:id',                    auth, postCtrl.deletePost);
router.post('/posts/generate-content',         auth, postCtrl.generatePostContent);
router.post('/posts/generate-image',           auth, postCtrl.generatePostImage);
router.post('/posts/platform-content',         auth, postCtrl.updatePlatformContent);
router.post('/posts/publish-now',              auth, postCtrl.publishNow);

// ── AI TEMPLATES ──────────────────────────────────────────────────────────
router.get ('/ai/templates',                   auth, aiCtrl.getTemplates);
router.get ('/ai/templates/:id',               auth, aiCtrl.getTemplate);
router.post('/ai/templates/:id/run',           auth, aiCtrl.runTemplate);
router.get ('/ai/generations',                 auth, aiCtrl.getGenerations);
router.delete('/ai/generations/:id',           auth, aiCtrl.deleteGeneration);

// ── SOCIAL PLATFORMS ──────────────────────────────────────────────────────
router.get ('/social/platforms',               auth, aiCtrl.getPlatforms);
router.delete('/social/platforms/:id',         auth, aiCtrl.disconnectPlatform);
router.get ('/social/connect/:platform',       auth, aiCtrl.getOAuthUrl);
// OAuth callbacks (these redirect, so user must be auth'd via query token or cookie)
router.get ('/social/facebook/callback',       auth, aiCtrl.facebookCallback);
router.get ('/social/twitter/callback',        auth, aiCtrl.twitterCallback);
router.get ('/social/linkedin/callback',       auth, aiCtrl.linkedinCallback);

// ── BILLING ───────────────────────────────────────────────────────────────
router.get ('/billing/plans',                  billingCtrl.getPlans);
router.post('/billing/checkout',               auth, billingCtrl.createCheckout);
router.get ('/billing/verify',                 auth, billingCtrl.verifyPayment);
router.get ('/billing/orders',                 auth, billingCtrl.getOrders);
router.post('/billing/webhook',                billingCtrl.stripeWebhook);

// ── ADMIN ─────────────────────────────────────────────────────────────────
router.get ('/admin/stats',                    requireAdmin, adminCtrl.getDashboardStats);

router.get ('/admin/users',                    requireAdmin, adminCtrl.getUsers);
router.get ('/admin/users/:id',                requireAdmin, adminCtrl.getUser);
router.put ('/admin/users/:id',                requireAdmin, adminCtrl.updateUser);
router.delete('/admin/users/:id',              requireAdmin, adminCtrl.deleteUser);
router.patch('/admin/users/:id/status',        requireAdmin, adminCtrl.updateUserStatus);
router.post('/admin/users/:id/assign-plan',    requireAdmin, adminCtrl.assignPlan);
router.post('/admin/users/:id/add-credits',    requireAdmin, adminCtrl.addUserCredits);

router.get ('/admin/plans',                    requireAdmin, adminCtrl.getPlans);
router.post('/admin/plans',                    requireAdmin, adminCtrl.createPlan);
router.put ('/admin/plans/:id',                requireAdmin, adminCtrl.updatePlan);
router.delete('/admin/plans/:id',              requireAdmin, adminCtrl.deletePlan);

router.get ('/admin/templates',                requireAdmin, adminCtrl.getTemplates);
router.post('/admin/templates',                requireAdmin, adminCtrl.createTemplate);
router.put ('/admin/templates/:id',            requireAdmin, adminCtrl.updateTemplate);
router.delete('/admin/templates/:id',          requireAdmin, adminCtrl.deleteTemplate);

router.get ('/admin/categories',               requireAdmin, adminCtrl.getCategories);
router.post('/admin/categories',               requireAdmin, adminCtrl.createCategory);
router.put ('/admin/categories/:id',           requireAdmin, adminCtrl.updateCategory);
router.delete('/admin/categories/:id',         requireAdmin, adminCtrl.deleteCategory);

router.get ('/admin/settings',                 requireAdmin, adminCtrl.getSettings);
router.put ('/admin/settings',                 requireAdmin, adminCtrl.updateSettings);

router.get ('/admin/orders',                   requireAdmin, adminCtrl.getOrders);

module.exports = router;
