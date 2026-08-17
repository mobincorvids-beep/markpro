const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/stackposts/stackposts.controller');

// ── Public blog ───────────────────────────────────────────────────────────
router.get('/blog',                    ctrl.getBlogPosts);
router.get('/blog/categories',         ctrl.getBlogCategories);
router.get('/blog/:slug',              ctrl.getBlogPost);

router.use(protect);

// ── Teams ─────────────────────────────────────────────────────────────────
router.get('/teams',                              ctrl.getMyTeams);
router.post('/teams',                             ctrl.createTeam);
router.get('/teams/:teamId/members',              ctrl.getTeamMembers);
router.post('/teams/:teamId/members/invite',      ctrl.inviteTeamMember);
router.delete('/teams/:teamId/members/:memberId', ctrl.removeTeamMember);

// ── Accounts ──────────────────────────────────────────────────────────────
router.get('/teams/:teamId/accounts',             ctrl.getAccounts);
router.post('/teams/:teamId/accounts',            ctrl.connectAccount);
router.put('/teams/:teamId/accounts/:accountId/reconnect', ctrl.reconnectAccount);
router.delete('/teams/:teamId/accounts/:accountId',        ctrl.disconnectAccount);

// ── Posts ─────────────────────────────────────────────────────────────────
router.get('/teams/:teamId/posts',                ctrl.getPosts);
router.post('/teams/:teamId/posts',               ctrl.createPost);
router.put('/teams/:teamId/posts/:postId',        ctrl.updatePost);
router.delete('/teams/:teamId/posts/:postId',     ctrl.deletePost);
router.post('/teams/:teamId/posts/:postId/duplicate', ctrl.duplicatePost);

// ── AI Writer ─────────────────────────────────────────────────────────────
router.post('/ai/generate',                       ctrl.generateAiContent);
router.post('/ai/hashtags',                       ctrl.generateHashtags);

// ── RSS Feeds ─────────────────────────────────────────────────────────────
router.get('/teams/:teamId/feeds',                ctrl.getFeeds);
router.post('/teams/:teamId/feeds',               ctrl.createFeed);
router.put('/teams/:teamId/feeds/:feedId',        ctrl.updateFeed);
router.delete('/teams/:teamId/feeds/:feedId',     ctrl.deleteFeed);

// ── Campaigns & Labels ────────────────────────────────────────────────────
router.get('/teams/:teamId/campaigns',            ctrl.getCampaigns);
router.post('/teams/:teamId/campaigns',           ctrl.createCampaign);
router.delete('/teams/:teamId/campaigns/:campaignId', ctrl.deleteCampaign);
router.get('/teams/:teamId/labels',               ctrl.getLabels);
router.post('/teams/:teamId/labels',              ctrl.createLabel);

// ── Media ─────────────────────────────────────────────────────────────────
router.get('/teams/:teamId/media',                ctrl.getMedia);
router.post('/teams/:teamId/media/upload',        ctrl.uploadMedia);

// ── Analytics ─────────────────────────────────────────────────────────────
router.get('/teams/:teamId/analytics',            ctrl.getAnalytics);

// ── Support ───────────────────────────────────────────────────────────────
router.get('/support',                            ctrl.getTickets);
router.post('/support',                           ctrl.createTicket);
router.get('/support/:id',                        ctrl.getTicket);
router.post('/support/:id/reply',                 ctrl.replyTicket);
router.post('/support/:id/close',                 ctrl.closeTicket);

// ── Affiliate ─────────────────────────────────────────────────────────────
router.get('/affiliate',                          ctrl.getAffiliateStats);
router.post('/affiliate/withdraw',                ctrl.requestWithdrawal);

// ── Admin ─────────────────────────────────────────────────────────────────
router.get('/admin/stats',                        requireAdmin, ctrl.adminStats);
router.get('/admin/tickets',                      requireAdmin, ctrl.adminGetTickets);
router.post('/admin/tickets/:id/reply',           requireAdmin, ctrl.adminReplyTicket);
router.get('/admin/withdrawals',                  requireAdmin, ctrl.adminGetWithdrawals);
router.put('/admin/withdrawals/:id',              requireAdmin, ctrl.adminUpdateWithdrawal);
router.post('/admin/blog',                        requireAdmin, ctrl.adminBlogCreate);
router.put('/admin/blog/:id',                     requireAdmin, ctrl.adminBlogUpdate);
router.delete('/admin/blog/:id',                  requireAdmin, ctrl.adminBlogDelete);
router.get('/admin/ai-templates',                 requireAdmin, ctrl.adminAiTemplates);
router.post('/admin/ai-templates',                requireAdmin, ctrl.adminCreateAiTemplate);

module.exports = router;
