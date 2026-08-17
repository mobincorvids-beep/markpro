const express = require('express');
const router  = express.Router();
const upload = require('../middleware/upload');
const docsCtrl = require('../controllers/docs/document.controller');
const reqCtrl  = require('../controllers/docs/request.controller');

// Public document share links
router.get('/documents/:link',          docsCtrl.getPublic);
router.get('/documents/:link/download', docsCtrl.downloadPublic);

// Document request fulfilment
router.get('/requests/:token',          reqCtrl.getPublic);
router.post('/requests/:token/upload',  upload.single('file'), reqCtrl.fulfil);

module.exports = router;
