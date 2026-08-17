const express = require('express');
const router  = express.Router();

const authCtrl    = require('../controllers/bio/bioAuth.controller');
const userCtrl    = require('../controllers/bio/bioUser.controller');
const editorCtrl  = require('../controllers/bio/editor.controller');
const adminCtrl   = require('../controllers/bio/bioAdmin.controller');
const previewCtrl = require('../controllers/bio/preview.controller');
const { protect: authMiddleware, requireAdmin: adminMiddleware } = require('../middleware/auth.middleware');

// ════════════════════════════════════════════════════════════════
//  AUTH  (public)
// ════════════════════════════════════════════════════════════════
router.post('/auth/login',              authCtrl.login);
router.post('/auth/register',           authCtrl.register);
router.post('/auth/forgot-password',    authCtrl.forgotPassword);
router.post('/auth/reset-password',     authCtrl.resetPassword);
router.get ('/auth/verify/:id',         authCtrl.verifyAccount);
router.get ('/auth/check-reset/:token', authCtrl.checkResetToken);
router.get ('/auth/plans',              authCtrl.getPlans);
router.get ('/auth/coupons',            authCtrl.getCoupons);
router.get ('/auth/parent-id',          authCtrl.getParentID);

// ════════════════════════════════════════════════════════════════
//  USER  (authenticated)
// ════════════════════════════════════════════════════════════════
router.get ('/user/profile',            authMiddleware, (req, res) => res.json({ status: 'success', data: req.vsuser }));
router.put ('/user/profile',            authMiddleware, userCtrl.updateProfile);
router.get ('/user/campaigns',          authMiddleware, userCtrl.getCampaigns);
router.post('/user/campaigns',          authMiddleware, userCtrl.createCampaign);
router.delete('/user/campaigns/:id',    authMiddleware, userCtrl.deleteCampaign);
router.put ('/user/campaigns/status',   authMiddleware, userCtrl.updateCampaignStatus);
router.post('/user/campaigns/duplicate',authMiddleware, userCtrl.duplicateCampaign);
router.get ('/user/templates',          authMiddleware, userCtrl.getTemplates);
router.get ('/user/analytics',          authMiddleware, userCtrl.getDashboardAnalytics);
router.get ('/user/plan',               authMiddleware, userCtrl.getCurrentPlan);
router.get ('/user/billing',            authMiddleware, userCtrl.getBillingHistory);
router.post('/user/billing/purchase',   authMiddleware, userCtrl.planPurchase);
router.post('/user/billing/success',    authMiddleware, userCtrl.paymentSuccess);

// ════════════════════════════════════════════════════════════════
//  EDITOR  (authenticated - admin or user)
// ════════════════════════════════════════════════════════════════
router.get ('/editor/template/:id',           authMiddleware, editorCtrl.getTemplate);
router.put ('/editor/template/name',          authMiddleware, editorCtrl.updateTemplateName);
router.put ('/editor/template/profile',       authMiddleware, editorCtrl.updateTemplateProfile);
router.put ('/editor/template/theme',         authMiddleware, editorCtrl.applyTheme);
router.put ('/editor/template/social-icons',  authMiddleware, editorCtrl.saveSocialIcons);
router.put ('/editor/template/social-pack',   authMiddleware, editorCtrl.updateSocialIconsPack);

router.get ('/editor/pages',                  authMiddleware, editorCtrl.getTemplatePages);
router.get ('/editor/pages/:id',              authMiddleware, editorCtrl.getTemplatePage);
router.post('/editor/pages',                  authMiddleware, editorCtrl.createTemplatePage);
router.delete('/editor/pages',                authMiddleware, editorCtrl.deleteTemplatePage);
router.put ('/editor/pages/status',           authMiddleware, editorCtrl.updateTemplatePageStatus);
router.put ('/editor/pages/name',             authMiddleware, editorCtrl.updatePageName);
router.put ('/editor/pages/duplicate',        authMiddleware, editorCtrl.duplicatePage);
router.put ('/editor/pages/order',            authMiddleware, editorCtrl.savePagesOrder);
router.put ('/editor/pages/seo',              authMiddleware, editorCtrl.saveSEOData);

router.get ('/editor/sections',               authMiddleware, editorCtrl.getSections);
router.post('/editor/sections',               authMiddleware, editorCtrl.addSection);
router.put ('/editor/sections/save',          authMiddleware, editorCtrl.saveSection);
router.put ('/editor/sections/animation',     authMiddleware, editorCtrl.updateAnimation);
router.put ('/editor/sections/status',        authMiddleware, editorCtrl.updateSectionStatus);
router.put ('/editor/sections/order',         authMiddleware, editorCtrl.saveSectionOrder);
router.post('/editor/sections/duplicate',     authMiddleware, editorCtrl.duplicateSection);
router.delete('/editor/sections',             authMiddleware, editorCtrl.deleteSection);

router.get ('/editor/themes',                 authMiddleware, editorCtrl.getThemes);
router.get ('/editor/social-packs',           authMiddleware, editorCtrl.getSocialPacks);
router.post('/editor/signed-url',             authMiddleware, editorCtrl.getSignedURL);

// ════════════════════════════════════════════════════════════════
//  ADMIN  (admin only)
// ════════════════════════════════════════════════════════════════
router.get ('/admin/analytics',               adminMiddleware, adminCtrl.getDashboardAnalytics);
router.get ('/admin/users',                   adminMiddleware, adminCtrl.getUsers);
router.put ('/admin/users/status',            adminMiddleware, adminCtrl.updateUserStatus);
router.put ('/admin/users/update',            adminMiddleware, adminCtrl.updateUser);
router.delete('/admin/users/:id',             adminMiddleware, adminCtrl.deleteUser);
router.post('/admin/users/assign-plan',       adminMiddleware, adminCtrl.assignPlan);
router.get ('/admin/campaigns',               adminMiddleware, adminCtrl.getAllCampaigns);

router.get ('/admin/plans',                   adminMiddleware, (req, res) => {
  const { Plans } = require('../models/bio.models');
  Plans.find().sort({ sort: 1 }).then(data => res.json({ status: 'success', data }));
});
router.post('/admin/plans',                   adminMiddleware, adminCtrl.addPlan);
router.put ('/admin/plans/status',            adminMiddleware, adminCtrl.updatePlanStatus);
router.delete('/admin/plans/:id',             adminMiddleware, adminCtrl.deletePlan);

router.get ('/admin/templates',               adminMiddleware, adminCtrl.getTemplates);
router.post('/admin/templates',               adminMiddleware, adminCtrl.createTemplate);
router.put ('/admin/templates',               adminMiddleware, adminCtrl.saveTemplate);
router.put ('/admin/templates/status',        adminMiddleware, adminCtrl.updateTemplateStatus);
router.delete('/admin/templates/:id',         adminMiddleware, adminCtrl.deleteTemplate);
router.get ('/admin/template-pages',          adminMiddleware, adminCtrl.getTemplatePages);
router.post('/admin/template-pages',          adminMiddleware, adminCtrl.createTemplatePage);
router.put ('/admin/template-pages',          adminMiddleware, adminCtrl.saveTemplatePage);
router.get ('/admin/template-pages/:id',      adminMiddleware, adminCtrl.getTemplatePage);

router.get ('/admin/categories',              adminMiddleware, adminCtrl.getCategories);
router.post('/admin/categories',              adminMiddleware, adminCtrl.updateTemplateCategory);
router.put ('/admin/categories',              adminMiddleware, adminCtrl.updateTemplateCategory);
router.put ('/admin/categories/status',       adminMiddleware, adminCtrl.updateTemplateCategoryStatus);
router.delete('/admin/categories/:id',        adminMiddleware, adminCtrl.deleteTemplateCategory);

router.get ('/admin/themes',                  adminMiddleware, adminCtrl.getTheme);
router.post('/admin/themes',                  adminMiddleware, adminCtrl.addTheme);
router.put ('/admin/themes',                  adminMiddleware, adminCtrl.editTheme);
router.put ('/admin/themes/status',           adminMiddleware, adminCtrl.updateThemeStatus);
router.delete('/admin/themes/:id',            adminMiddleware, adminCtrl.deleteTheme);

router.get ('/admin/social-types',            adminMiddleware, adminCtrl.getSocialTypes);
router.post('/admin/social-types',            adminMiddleware, adminCtrl.addSocialType);
router.put ('/admin/social-types',            adminMiddleware, adminCtrl.updateSocialType);
router.put ('/admin/social-types/status',     adminMiddleware, adminCtrl.updateSocialTypeStatus);
router.delete('/admin/social-types/:id',      adminMiddleware, adminCtrl.deleteSocialType);

router.get ('/admin/social-packs',            adminMiddleware, adminCtrl.getSocialPacks);
router.get ('/admin/social-packs/:id',        adminMiddleware, adminCtrl.getSocialPack);
router.post('/admin/social-packs',            adminMiddleware, adminCtrl.addSocialPack);
router.put ('/admin/social-packs',            adminMiddleware, adminCtrl.updateSocialPack);
router.put ('/admin/social-packs/status',     adminMiddleware, adminCtrl.updateSocialPackStatus);
router.delete('/admin/social-packs/:id',      adminMiddleware, adminCtrl.deleteSocialPack);

router.get ('/admin/settings',                adminMiddleware, adminCtrl.getSettings);
router.put ('/admin/settings',                adminMiddleware, adminCtrl.updateSettings);
router.put ('/admin/settings/email',          adminMiddleware, adminCtrl.updateEmailSettings);

router.get ('/admin/coupons',                 adminMiddleware, (req, res) => {
  const { Coupons } = require('../models/bio.models');
  Coupons.find().sort({ createdAt: -1 }).then(data => res.json({ status: 'success', data }));
});
router.post('/admin/coupons',                 adminMiddleware, adminCtrl.addCoupon);
router.put ('/admin/coupons/status',          adminMiddleware, adminCtrl.updateCouponStatus);
router.delete('/admin/coupons/:id',           adminMiddleware, adminCtrl.deleteCoupon);

router.get ('/admin/payments/pending',        adminMiddleware, adminCtrl.getPendingPayments);
router.put ('/admin/payments/status',         adminMiddleware, adminCtrl.updatePaymentStatus);

// ════════════════════════════════════════════════════════════════
//  PUBLIC PREVIEW  (no auth)
// ════════════════════════════════════════════════════════════════
router.get ('/preview/:slug',                 previewCtrl.getPublicCampaign);
router.get ('/preview/:campaignId/pages',     previewCtrl.getPublicCampaignPages);
router.get ('/preview/:campaignId/pages/:pageId/sections', previewCtrl.getPublicPageSections);
router.post('/preview/click',                 previewCtrl.recordLinkClick);

module.exports = router;
