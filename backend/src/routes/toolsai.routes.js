const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/toolsai/toolsai.controller');

// ── Public ─────────────────────────────────────────────────────
router.get('/plans',                    ctrl.getPlans);
router.get('/categories',               ctrl.getCategories);
router.get('/templates',                ctrl.getTemplates);
router.get('/templates/:slug',          ctrl.getTemplate);
router.get('/blog',                     ctrl.getBlogPosts);
router.get('/blog/:slug',               ctrl.getBlogPost);

router.use(protect);

// ── AI Generation ─────────────────────────────────────────────
router.post('/generate/write',          ctrl.aiWrite);
router.post('/generate/code',           ctrl.aiCode);
router.post('/generate/image',          ctrl.aiImage);
router.post('/generate/speech',         ctrl.aiSpeech);
router.post('/generate/transcribe',     ctrl.aiTranscribe);

// ── Documents ─────────────────────────────────────────────────
router.get('/documents',                ctrl.getDocs);
router.put('/documents/:id',            ctrl.updateDoc);
router.delete('/documents/:id',         ctrl.deleteDoc);

// ── Chat ──────────────────────────────────────────────────────
router.get('/conversations',            ctrl.getConversations);
router.post('/conversations',           ctrl.createConversation);
router.post('/conversations/:id/chat',  ctrl.chatMessage);
router.delete('/conversations/:id',     ctrl.deleteConversation);

// ── Support ───────────────────────────────────────────────────
router.get('/tickets',                  ctrl.getTickets);
router.post('/tickets',                 ctrl.createTicket);
router.post('/tickets/:id/reply',       ctrl.replyTicket);

// ── Admin ─────────────────────────────────────────────────────
router.get('/admin/stats',              requireAdmin, ctrl.adminStats);
router.post('/admin/blog',              requireAdmin, ctrl.adminCreateBlog);
router.put('/admin/blog/:id',           requireAdmin, ctrl.adminUpdateBlog);
router.delete('/admin/blog/:id',        requireAdmin, ctrl.adminDeleteBlog);
router.post('/admin/templates',         requireAdmin, ctrl.adminCreateTemplate);
router.put('/admin/templates/:id',      requireAdmin, ctrl.adminUpdateTemplate);

module.exports = router;
