const express = require('express');
const router  = express.Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const c = require('../controllers/docs/admin.controller');

router.use(protect, requireAdmin);

router.get('/stats',    c.getStats);
router.get('/users',    c.listUsers);
router.post('/users',   c.createUser);
router.put('/users/:id', c.updateUser);
router.put('/users/:id/reset-password', c.resetPassword);
router.delete('/users/:id', c.deleteUser);
router.get('/audit-logs', c.getAuditLogs);

module.exports = router;
