const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const c = require('../controllers/docs/request.controller');

router.get('/',    protect, c.list);
router.post('/',   protect, c.create);
router.delete('/:id', protect, c.cancel);
router.post('/:id/fulfill', protect, c.fulfillManual);

module.exports = router;
