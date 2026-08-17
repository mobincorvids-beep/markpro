const express  = require('express');
const router   = express.Router();
const { protect, requireAdmin, optionalProtect } = require('../middleware/auth.middleware');

const authCtrl   = require('../controllers/biolinks/auth.controller');
const linksCtrl  = require('../controllers/biolinks/links.controller');
const blocksCtrl = require('../controllers/biolinks/blocks.controller');
const toolsCtrl  = require('../controllers/biolinks/tools.controller');
const statsCtrl  = require('../controllers/biolinks/statistics.controller');
const adminCtrl  = require('../controllers/biolinks/admin.controller');

// ── AUTH ──────────────────────────────────────────────────────────────────
router.post('/protect/register',       authCtrl.register);
router.post('/protect/login',          authCtrl.login);
router.get ('/protect/activate/:code', authCtrl.activate);
router.post('/protect/forgot-password',authCtrl.forgotPassword);
router.post('/protect/reset-password', authCtrl.resetPassword);
router.get ('/protect/me',             protect, authCtrl.getMe);
router.put ('/protect/account',        protect, authCtrl.updateAccount);
router.put ('/protect/change-password',protect, authCtrl.changePassword);
router.delete('/protect/account',      protect, authCtrl.deleteAccount);

// ── LINKS (shortener + biolinks) ──────────────────────────────────────────
router.get ('/links',               protect, linksCtrl.getLinks);
router.get ('/links/:id',           protect, linksCtrl.getLink);
router.post('/links/short',         protect, linksCtrl.createShortLink);
router.post('/links/biolink',       protect, linksCtrl.createBiolink);
router.put ('/links/:id',           protect, linksCtrl.updateLink);
router.delete('/links/:id',         protect, linksCtrl.deleteLink);
router.patch('/links/:id/toggle',   protect, linksCtrl.toggleLink);
router.post('/links/:id/duplicate', protect, linksCtrl.duplicateLink);
router.get ('/links/:id/stats',     protect, statsCtrl.getLinkStats);

// ── BIOLINK BLOCKS ────────────────────────────────────────────────────────
router.get ('/biolinks/:link_id/blocks',         protect, blocksCtrl.getBlocks);
router.post('/blocks',                           protect, blocksCtrl.createBlock);
router.get ('/blocks/:id',                       protect, blocksCtrl.getBlock);
router.put ('/blocks/:id',                       protect, blocksCtrl.updateBlock);
router.delete('/blocks/:id',                     protect, blocksCtrl.deleteBlock);
router.patch('/blocks/:id/toggle',               protect, blocksCtrl.toggleBlock);
router.post('/blocks/:id/duplicate',             protect, blocksCtrl.duplicateBlock);
router.put ('/blocks/reorder',                   protect, blocksCtrl.reorderBlocks);
router.get ('/blocks/:id/stats',                 protect, blocksCtrl.getBlockStats);
router.post('/blocks/email-collector',                 blocksCtrl.submitEmail); // public

// ── QR CODES ──────────────────────────────────────────────────────────────
router.get ('/qr-codes',            protect, toolsCtrl.getQrCodes);
router.post('/qr-codes',            protect, toolsCtrl.createQrCode);
router.put ('/qr-codes/:id',        protect, toolsCtrl.updateQrCode);
router.delete('/qr-codes/:id',      protect, toolsCtrl.deleteQrCode);

// ── PIXELS ────────────────────────────────────────────────────────────────
router.get ('/pixels',              protect, toolsCtrl.getPixels);
router.post('/pixels',              protect, toolsCtrl.createPixel);
router.put ('/pixels/:id',          protect, toolsCtrl.updatePixel);
router.delete('/pixels/:id',        protect, toolsCtrl.deletePixel);

// ── PROJECTS ──────────────────────────────────────────────────────────────
router.get ('/projects',            protect, toolsCtrl.getProjects);
router.post('/projects',            protect, toolsCtrl.createProject);

// ── COUPON / REDEEM CODES (user-facing) ──────────────────────────────────
router.post('/codes/redeem',        protect, toolsCtrl.redeemCode);
router.put ('/projects/:id',        protect, toolsCtrl.updateProject);
router.delete('/projects/:id',      protect, toolsCtrl.deleteProject);

// ── DOMAINS ───────────────────────────────────────────────────────────────
router.get ('/domains',             protect, toolsCtrl.getDomains);
router.post('/domains',             protect, toolsCtrl.createDomain);
router.put ('/domains/:id',         protect, toolsCtrl.updateDomain);
router.delete('/domains/:id',       protect, toolsCtrl.deleteDomain);

// ── STATISTICS ────────────────────────────────────────────────────────────
router.get ('/stats/dashboard',     protect, statsCtrl.getDashboardStats);

// ── PUBLIC ────────────────────────────────────────────────────────────────
router.get ('/public/themes',       (req, res) => {
  const { BiolinkTheme } = require('../models');
  BiolinkTheme.find({ is_enabled: true }).sort({ order: 1 })
    .then(d => res.json({ status: 'success', data: d }));
});
router.get ('/public/plans', (req, res) => {
  const { Plan } = require('../models');
  Plan.find({ is_enabled: true }).sort({ order: 1 })
    .then(d => res.json({ status: 'success', data: d }));
});
router.get ('/public/templates', (req, res) => {
  const { BiolinkTemplate, BiolinkTemplateCategory } = require('../models');
  Promise.all([
    BiolinkTemplate.find({ is_enabled: true }).sort({ order: 1 }),
    BiolinkTemplateCategory.find({ is_enabled: true }).sort({ order: 1 }),
  ]).then(([templates, categories]) =>
    res.json({ status: 'success', data: { templates, categories } })
  );
});
router.get ('/public/settings', (req, res) => {
  const { Settings } = require('../models');
  Settings.findOne()
    .then(s => res.json({ status: 'success', data: { title: s?.main?.title, description: s?.main?.description } }));
});

// ── REDIRECT / BIOLINK PREVIEW ─────────────────────────────────────────────
router.get ('/r/:slug',             optionalProtect, linksCtrl.redirectLink);

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN
// ════════════════════════════════════════════════════════════════════════════
router.get ('/admin/stats',                  requireAdmin, statsCtrl.getAdminStats);

// Users
router.get ('/admin/users',                  requireAdmin, adminCtrl.getUsers);
router.get ('/admin/users/:id',              requireAdmin, adminCtrl.getUser);
router.post('/admin/users',                  requireAdmin, adminCtrl.createUser);
router.put ('/admin/users/:id',              requireAdmin, adminCtrl.updateUser);
router.delete('/admin/users/:id',            requireAdmin, adminCtrl.deleteUser);
router.patch('/admin/users/:id/status',      requireAdmin, adminCtrl.updateUserStatus);
router.post('/admin/users/:id/assign-plan',  requireAdmin, adminCtrl.assignPlan);

// Plans
router.get ('/admin/plans',                  requireAdmin, adminCtrl.getPlans);
router.post('/admin/plans',                  requireAdmin, adminCtrl.createPlan);
router.put ('/admin/plans/:id',              requireAdmin, adminCtrl.updatePlan);
router.delete('/admin/plans/:id',            requireAdmin, adminCtrl.deletePlan);

// Themes
router.get ('/admin/themes',                 requireAdmin, adminCtrl.getThemes);
router.post('/admin/themes',                 requireAdmin, adminCtrl.createTheme);
router.put ('/admin/themes/:id',             requireAdmin, adminCtrl.updateTheme);
router.delete('/admin/themes/:id',           requireAdmin, adminCtrl.deleteTheme);

// Templates
router.get ('/admin/templates',              requireAdmin, adminCtrl.getTemplates);
router.post('/admin/templates',              requireAdmin, adminCtrl.createTemplate);
router.put ('/admin/templates/:id',          requireAdmin, adminCtrl.updateTemplate);
router.delete('/admin/templates/:id',        requireAdmin, adminCtrl.deleteTemplate);
router.get ('/admin/template-categories',    requireAdmin, adminCtrl.getTemplateCategories);
router.post('/admin/template-categories',    requireAdmin, adminCtrl.createTemplateCategory);
router.put ('/admin/template-categories/:id',requireAdmin, adminCtrl.updateTemplateCategory);
router.delete('/admin/template-categories/:id',requireAdmin,adminCtrl.deleteTemplateCategory);

// Settings
router.get ('/admin/settings',               requireAdmin, adminCtrl.getSettings);
router.put ('/admin/settings',               requireAdmin, adminCtrl.updateSettings);

// Payments
router.get ('/admin/payments',               requireAdmin, adminCtrl.getPayments);

// Codes (coupons/redeem)
router.get ('/admin/codes',                  requireAdmin, adminCtrl.getCodes);
router.post('/admin/codes',                  requireAdmin, adminCtrl.createCode);
router.put ('/admin/codes/:id',              requireAdmin, adminCtrl.updateCode);
router.delete('/admin/codes/:id',            requireAdmin, adminCtrl.deleteCode);

// Domains (system-level)
router.get ('/admin/domains',                requireAdmin, adminCtrl.getAdminDomains);
router.post('/admin/domains',                requireAdmin, adminCtrl.createAdminDomain);
router.delete('/admin/domains/:id',          requireAdmin, adminCtrl.deleteAdminDomain);


// ── QR TOOL / STATISTICS OVERVIEW ───────────────────────────────────────────
router.post('/tools/qr', protect, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ status: 'error', message: 'url is required' });
    try {
      const QRCode = require('qrcode');
      const dataUrl = await QRCode.toDataURL(url);
      return res.json({ status: 'success', data: { dataUrl, url } });
    } catch (e) {
      return res.json({ status: 'success', data: { url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url) } });
    }
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
});

router.get('/statistics/overview', protect, async (req, res) => {
  try {
    const { Link } = require('../models');
    const links = await Link.find({ user: req.user._id });
    const totalLinks = links.length;
    const totalClicks = links.reduce((s, l) => s + (l.clicks || 0), 0);
    const totalViews  = links.reduce((s, l) => s + (l.views || 0), 0);
    res.json({ status: 'success', data: { totalLinks, totalClicks, totalViews } });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
});

router.get('/statistics/:id', protect, statsCtrl.getLinkStats);

module.exports = router;
