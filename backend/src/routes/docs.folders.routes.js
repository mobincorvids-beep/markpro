const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const c = require('../controllers/docs/folder.controller');

router.get('/',     protect, c.list);
router.get('/:id/breadcrumb', protect, c.breadcrumb);
router.post('/',    protect, c.create);
router.put('/:id',  protect, c.update);

router.delete('/:id',           protect, c.trash);
router.post('/:id/restore',     protect, c.restore);
router.delete('/:id/permanent', protect, c.permanentDelete);

router.post('/:id/share',       protect, c.share);
router.post('/:id/public-link', protect, c.togglePublicLink);

module.exports = router;
