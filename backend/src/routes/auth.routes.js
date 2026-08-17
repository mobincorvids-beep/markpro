const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/auth.controller');
const social = require('../controllers/auth.social.controller');

// Social sign-in (Google / Apple)
router.get('/social/config',        social.socialConfig);
router.post('/social/:provider',    social.socialLogin);

// Standard auth
router.post('/register',        ctrl.register);
router.post('/login',           ctrl.login);
router.post('/logout',          protect, ctrl.logout);
router.post('/refresh',         ctrl.refreshToken);
router.get('/me',               protect, ctrl.getMe);
router.get('/verify-email/:token', ctrl.verifyEmail);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password',  ctrl.resetPassword);
router.post('/reset-password/:token', (req,res,next)=>{ req.body.token=req.params.token; next(); }, ctrl.resetPassword);
router.put('/profile',          protect, ctrl.updateProfile);
router.put('/password',         protect, ctrl.updatePassword);
router.get('/plans',            ctrl.getPlans);

// PixaURL-compat routes (used by bio routes)
router.post('/auth/login',    ctrl.login);
router.post('/auth/register', ctrl.register);
router.get('/auth/plans',     ctrl.getPlans);
router.get('/auth/coupons',   ctrl.getCoupons);
router.get('/auth/parent-id', ctrl.getParentID);
router.get('/auth/verify/:id',ctrl.verifyAccount);
router.get('/auth/check-reset/:token', ctrl.checkResetToken);
router.post('/auth/forgot-password', ctrl.forgotPassword);
router.post('/auth/reset-password',  ctrl.resetPassword);

module.exports = router;
