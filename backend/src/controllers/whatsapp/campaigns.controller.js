const router   = require('express').Router();
const multer   = require('multer');
const path     = require('path');
const { Campaign, CampaignDetail, Contact, WhatsappTemplate } = require('../../models/WhatsApp.models');
const { protect } = require('../../middleware/auth.middleware');
const wa       = require('../../utils/whatsapp');

router.use(protect);
const upload = multer({ dest: 'uploads/campaigns/' });

// ── List campaigns ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page=1, limit=20 } = req.query;
    const [campaigns, total] = await Promise.all([
      Campaign.find().populate('createdBy','firstname lastname').sort({ createdAt:-1 }).skip((page-1)*limit).limit(+limit),
      Campaign.countDocuments(),
    ]);
    res.json({ campaigns, total, page:+page, pages: Math.ceil(total/limit) });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Get campaign with stats ───────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    const [total, sent, failed] = await Promise.all([
      CampaignDetail.countDocuments({ campaignId: req.params.id }),
      CampaignDetail.countDocuments({ campaignId: req.params.id, status: 1 }),
      CampaignDetail.countDocuments({ campaignId: req.params.id, status: 2 }),
    ]);
    res.json({ ...campaign.toObject(), stats: { total, sent, failed, pending: total - sent - failed } });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Get campaign details (message log) ────────────────────────
router.get('/:id/details', async (req, res) => {
  try {
    const { page=1, limit=30 } = req.query;
    const [details, total] = await Promise.all([
      CampaignDetail.find({ campaignId: req.params.id })
        .populate('relId','firstname lastname phone')
        .sort({ createdAt:-1 }).skip((page-1)*limit).limit(+limit),
      CampaignDetail.countDocuments({ campaignId: req.params.id }),
    ]);
    res.json({ details, total, page:+page, pages: Math.ceil(total/limit) });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Create campaign ───────────────────────────────────────────
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const {
      name, relType, templateId, sendNow, scheduledSendTime,
      headerParams, bodyParams, footerParams, relData, selectAll,
    } = req.body;

    const campaign = await Campaign.create({
      name, relType, templateId,
      sendNow: sendNow === 'true' || sendNow === true,
      scheduledSendTime: scheduledSendTime || null,
      headerParams: JSON.parse(headerParams || '[]'),
      bodyParams:   JSON.parse(bodyParams   || '[]'),
      footerParams: JSON.parse(footerParams || '[]'),
      relData:      relData ? JSON.parse(relData) : null,
      selectAll:    selectAll === 'true',
      filename:     req.file?.path || null,
      createdBy:    req.user._id,
    });

    // Build campaign details
    let contactIds = [];
    if (selectAll) {
      const contacts = await Contact.find({ type: relType, is_enabled: true }).select('_id');
      contactIds = contacts.map(c => c._id);
    } else if (relData) {
      const parsedRelData = JSON.parse(relData);
      contactIds = parsedRelData.filter(Boolean);
    }

    if (contactIds.length) {
      const details = contactIds.map(id => ({
        campaignId: campaign._id,
        relId: id,
        relType: campaign.relType,
        status: 0,
      }));
      await CampaignDetail.insertMany(details);
    }

    res.status(201).json(campaign);
  } catch(err) { res.status(400).json({ error: err.message }); }
});

// ── Update campaign ────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const c = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Trigger sending ──────────────────────────────────────────
router.post('/:id/send', async (req, res) => {
  try {
    const c = await Campaign.findByIdAndUpdate(req.params.id, { sendNow: true, isSent: false, pauseCampaign: false }, { new: true });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Campaign queued for sending', campaign: c });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Pause alias ───────────────────────────────────────────────
router.post('/:id/pause', async (req, res) => {
  try {
    const c = await Campaign.findByIdAndUpdate(req.params.id, { pauseCampaign: true }, { new: true });
    res.json(c);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Pause / resume ────────────────────────────────────────────
router.patch('/:id/pause', async (req, res) => {
  try {
    const c = await Campaign.findByIdAndUpdate(req.params.id, { pauseCampaign: true }, { new: true });
    res.json(c);
  } catch(err) { res.status(500).json({ error: err.message }); }
});
router.patch('/:id/resume', async (req, res) => {
  try {
    const c = await Campaign.findByIdAndUpdate(req.params.id, { pauseCampaign: false }, { new: true });
    res.json(c);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Delete campaign ───────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    await CampaignDetail.deleteMany({ campaignId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Retry failed messages ─────────────────────────────────────
router.post('/:id/retry', async (req, res) => {
  try {
    await CampaignDetail.updateMany(
      { campaignId: req.params.id, status: 2 },
      { status: 0, responseMessage: '', messageStatus: '' }
    );
    await Campaign.findByIdAndUpdate(req.params.id, { isSent: false, pauseCampaign: false });
    res.json({ message: 'Campaign queued for retry' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
