const {
  Campaigns, CampaignPage, CampaignSection,
  CampaignVisit, CampaignVisitDetail, CampaignPageVisit,
  CampaignPageVisitDetail, CampaignLinkDetail, Theme, SocialPack,
} = require('../../models/bio.models');

// ── Get Public Campaign by slug ───────────────────────────────────────────
exports.getPublicCampaign = async (req, res) => {
  try {
    const { slug } = req.params;
    const campaign = await Campaigns.findOne({ slug, status: 1 })
      .populate('themeId')
      .populate('packId');
    if (!campaign) return res.status(404).json({ status: 'error', message: 'Page not found.' });

    // Record visit
    try {
      const today = new Date().toISOString().split('T')[0];
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const device = req.headers['user-agent'] || '';

      await CampaignVisit.findOneAndUpdate(
        { campaignId: campaign._id, userId: campaign.userId, date: today },
        { $inc: { count: 1 } },
        { upsert: true }
      );
      await CampaignVisitDetail.create({
        campaignId: campaign._id, userId: campaign.userId, ip, device,
      });
    } catch (e) { /* non-critical */ }

    res.json({ status: 'success', data: campaign });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get Public Campaign Pages ─────────────────────────────────────────────
exports.getPublicCampaignPages = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const pages = await CampaignPage.find({ campaignId, status: 1 }).sort({ sort: 1 });
    res.json({ status: 'success', data: pages });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error.' });
  }
};

// ── Get Public Page Sections ──────────────────────────────────────────────
exports.getPublicPageSections = async (req, res) => {
  try {
    const { campaignId, pageId } = req.params;

    // Record page visit
    try {
      const today = new Date().toISOString().split('T')[0];
      const campaign = await Campaigns.findById(campaignId).select('userId');
      if (campaign) {
        await CampaignPageVisit.findOneAndUpdate(
          { campaignId, pageId, userId: campaign.userId, date: today },
          { $inc: { count: 1 } },
          { upsert: true }
        );
      }
    } catch (e) { /* non-critical */ }

    const sections = await CampaignSection.find({
      templateId: campaignId,
      pageId,
      status: 1,
    }).sort({ sort: 1 });

    res.json({ status: 'success', data: sections });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error.' });
  }
};

// ── Record Link Click ─────────────────────────────────────────────────────
exports.recordLinkClick = async (req, res) => {
  try {
    const { campaignId, sectionId } = req.body;
    const ip     = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const device = req.headers['user-agent'] || '';

    const campaign = await Campaigns.findById(campaignId).select('userId');
    if (campaign) {
      await CampaignLinkDetail.create({
        campaignId, sectionId, userId: campaign.userId, ip, device,
      });
    }
    res.json({ status: 'success' });
  } catch (err) {
    res.json({ status: 'error', message: 'Server error.' });
  }
};
