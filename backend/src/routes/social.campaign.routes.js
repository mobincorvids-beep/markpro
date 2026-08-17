const express = require('express');
const router = express.Router();
const campaignCtrl = require('../controllers/social/campaign.controller');
const notifCtrl = require('../controllers/social/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Campaigns
router.get('/', campaignCtrl.list);
router.post('/', campaignCtrl.create);
router.get('/:id', campaignCtrl.getOne);
router.put('/:id', campaignCtrl.update);
router.delete('/:id', campaignCtrl.remove);
router.patch('/:id/toggle', campaignCtrl.toggleStatus);
router.get('/:id/stats', campaignCtrl.getStatistics);
router.get('/:id/pixel-code', campaignCtrl.getPixelCode);

// Nested notifications
router.get('/:campaignId/notifications', notifCtrl.list);
router.post('/:campaignId/notifications', notifCtrl.create);
router.get('/:campaignId/notifications/:notifId', notifCtrl.getOne);
router.put('/:campaignId/notifications/:notifId', notifCtrl.update);
router.delete('/:campaignId/notifications/:notifId', notifCtrl.remove);
router.patch('/:campaignId/notifications/:notifId/toggle', notifCtrl.toggleStatus);
router.get('/:campaignId/notifications/:notifId/stats', notifCtrl.getStatistics);

module.exports = router;
