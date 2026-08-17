const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload');
const c = require('../controllers/docs/document.controller');

router.get('/stats', protect, c.getStats);
router.get('/',      protect, c.list);
router.get('/:id',   protect, c.getOne);

router.post('/upload', protect, upload.single('file'), c.upload);
router.post('/:id/versions', protect, upload.single('file'), c.uploadVersion);
router.post('/:id/versions/:vnum/restore', protect, c.restoreVersion);

router.get('/:id/download', protect, c.download);
router.get('/:id/preview',  protect, c.preview);

router.put('/:id',       protect, c.update);
router.put('/:id/star',  protect, c.toggleStar);

router.delete('/:id',           protect, c.trash);
router.post('/:id/restore',     protect, c.restore);
router.delete('/:id/permanent', protect, c.permanentDelete);

router.get('/:id/share',               protect, c.listShares);
router.post('/:id/share',              protect, c.share);
router.delete('/:id/share/:shareId',   protect, c.unshare);
router.post('/:id/public-link',        protect, c.togglePublicLink);

router.post('/:id/comments', protect, c.addComment);
router.get('/:id/audit',     protect, c.getAuditTrail);

module.exports = router;
