const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const c = require('../controllers/socialvibe/socialvibe.controller');

router.get('/plans',                 c.svGetPlans);
router.use(protect);

// Accounts
router.get('/accounts',              c.svGetAccounts);
router.post('/accounts',             c.svConnectAccount);
router.delete('/accounts/:id',       c.svDisconnectAccount);

// Posts + calendar
router.get('/posts',                 c.svGetPosts);
router.post('/posts',                c.svCreatePost);
router.put('/posts/:id',             c.svUpdatePost);
router.delete('/posts/:id',          c.svDeletePost);

// AI Writer
router.post('/ai/generate',          c.svAiGenerate);
router.post('/ai/rewrite',           c.svAiRewrite);
router.post('/ai/hashtags',          c.svAiHashtags);

// Post Templates
router.get('/templates',             c.svGetTemplates);
router.post('/templates',            c.svCreateTemplate);
router.delete('/templates/:id',      c.svDeleteTemplate);

// Team
router.get('/team',                  c.svGetTeam);
router.post('/team/invite',          c.svInviteTeamMember);
router.delete('/team/:id',           c.svRemoveTeamMember);

// Support tickets
router.get('/tickets',               c.svGetTickets);
router.post('/tickets',              c.svCreateTicket);
router.post('/tickets/:id/reply',    c.svReplyTicket);
router.post('/tickets/:id/close',    c.svCloseTicket);

module.exports = router;
