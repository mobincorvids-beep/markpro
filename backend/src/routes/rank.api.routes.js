const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rank/main.controller');
const { protect, optionalProtect: optionalAuth } = require('../middleware/auth.middleware');

// Tools - public (optional auth for usage tracking)
router.get('/tools', ctrl.getToolList);
router.post('/tools/:tool/run', optionalAuth, ctrl.runTool);

// Projects - auth required
router.use('/projects', protect);
router.get('/projects', ctrl.listProjects);
router.post('/projects', ctrl.createProject);
router.get('/projects/:id', ctrl.getProject);
router.put('/projects/:id', ctrl.updateProject);
router.delete('/projects/:id', ctrl.deleteProject);

// Reports - auth required
router.use('/reports', protect);
router.get('/reports', ctrl.listReports);
router.post('/reports/run', ctrl.runReport);
router.get('/reports/:id', ctrl.getReport);
router.delete('/reports/:id', ctrl.deleteReport);

// User settings
router.use('/user', protect);
router.put('/user/profile', ctrl.updateProfile);
router.put('/user/change-password', ctrl.changePassword);
router.put('/user/preferences', ctrl.updatePreferences);
router.delete('/user/account', ctrl.deleteAccount);

// Billing
router.use('/billing', protect);
router.get('/billing/plans', ctrl.getPlans);
router.post('/billing/checkout', ctrl.createCheckout);
router.get('/billing/portal', ctrl.getBillingPortal);
router.get('/billing/payments', ctrl.listPayments);


// Dashboard summary
router.get('/dashboard', protect, async (req, res) => {
  try {
    const { Project, Report } = require('../models/PHPRank.models');
    const userId = req.user._id;
    const [projects, reports, recentReports] = await Promise.all([
      Project.countDocuments({ user: userId }),
      Report.countDocuments({ user: userId }),
      Report.find({ user: userId }).sort({ createdAt: -1 }).limit(5).populate('project', 'name domain'),
    ]);
    const keywordsAgg = await Project.aggregate([
      { $match: { user: userId } },
      { $project: { count: { $size: { $ifNull: ['$keywords', []] } } } },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]);
    res.json({
      success: true,
      data: {
        projects, reports,
        keywordsTracked: keywordsAgg[0]?.total || 0,
        recentReports,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Plans / checkout aliases (Billing section already protects these)
router.get('/plans',  protect, ctrl.getPlans);
router.post('/checkout', protect, ctrl.createCheckout);

// Run an audit for a specific project (alias of reports/run scoped to project)
router.post('/projects/:id/audit', protect, async (req, res) => {
  try {
    const { Project } = require('../models/PHPRank.models');
    const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    req.body = { url: project.url, type: 'seo_audit', ...req.body, projectId: project._id.toString() };
    return ctrl.runReport(req, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
