const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { upload }  = require('../middleware/bp.upload');
const c = require('../controllers/aigen/prompt.controller');

// Templates
router.get('/templates', protect, (req, res) => {
  const { PROMPT_TEMPLATES, TEMPLATE_LIST } = require('../data/promptTemplates');
  res.json({ success: true, categories: PROMPT_TEMPLATES, templates: TEMPLATE_LIST });
});

// Generation endpoints
router.post('/text',       protect, c.generateTextStream); // SSE streaming
router.post('/generate',   protect, c.generateTextStream); // alias of /text
router.post('/image',      protect, c.generateImage);
router.post('/speech',     protect, c.generateSpeech);
router.post('/transcribe', protect, upload.single('audio'), c.transcribeAudio);
router.post('/animate',    protect, upload.single('image'), c.animateImage);

// History
router.get('/stats',   protect, c.getUserStats);
router.get('/history', protect, c.getHistory);
router.get('/media/:filename', c.serveMedia);  // public media serving
router.get('/:id',     protect, c.getOne);
router.delete('/:id',  protect, c.deleteOne);

module.exports = router;
