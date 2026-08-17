const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const c = require('../controllers/docs/notification.controller');

router.get('/',           protect, c.list);
router.put('/:id/read',   protect, c.markRead);
router.patch('/:id/read', protect, c.markRead);
router.put('/read-all',   protect, c.markAllRead);
router.delete('/:id',     protect, c.remove);

module.exports = router;
