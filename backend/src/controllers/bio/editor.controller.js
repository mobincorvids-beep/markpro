const { v4: uuidv4 } = require('uuid');
const {
  Templates, TemplatePage, TemplateSection,
  Theme, SocialPack, Campaigns, CampaignPage, CampaignSection,
} = require('../../models/bio.models');
const Common    = require('../../utils/common');
const { getPutObjectSignedURL } = require('../../utils/commonAPI');

// ── Helpers ───────────────────────────────────────────────────────────────
const getTables = (user) => ({
  sectionTbl: user.role === 1 ? TemplateSection : CampaignSection,
  pageTbl:    user.role === 1 ? TemplatePage    : CampaignPage,
  campTbl:    user.role === 1 ? Templates       : Campaigns,
});

// ── Get Template / Campaign ───────────────────────────────────────────────
exports.getTemplate = async (req, res) => {
  try {
    const user = req.vsuser;
    const { id } = req.params;
    const { campTbl } = getTables(user);
    const data = await campTbl.findById(id);
    if (!data) return res.json({ status: 'error', message: 'Not found.' });
    res.json({ status: 'success', data });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Get Pages ─────────────────────────────────────────────────────────────
exports.getTemplatePages = async (req, res) => {
  try {
    const user = req.vsuser;
    const { template_id } = req.query;
    const { pageTbl } = getTables(user);
    const idField = user.role === 1 ? { templateId: template_id } : { campaignId: template_id };
    const pages = await pageTbl.find(idField).sort({ sort: 1 });
    res.json({ status: 'success', data: pages });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Get Single Page ───────────────────────────────────────────────────────
exports.getTemplatePage = async (req, res) => {
  try {
    const user = req.vsuser;
    const { pageTbl } = getTables(user);
    const page = await pageTbl.findById(req.params.id);
    if (!page) return res.json({ status: 'error', message: 'Page not found.' });
    res.json({ status: 'success', data: page });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Create Page ───────────────────────────────────────────────────────────
exports.createTemplatePage = async (req, res) => {
  try {
    const user = req.vsuser;
    const { template_id, title } = req.body;
    if (!template_id || !title) return res.json({ status: 'error', message: 'template_id and title required.' });
    const { pageTbl } = getTables(user);
    const idField = user.role === 1 ? { templateId: template_id } : { campaignId: template_id };
    const count = await pageTbl.countDocuments(idField);
    const pageData = {
      ...idField,
      userId: user.user_id,
      title,
      sort:   count + 1,
      slug:   Common.generateSlug(title),
      status: 1,
    };
    const page = await pageTbl.create(pageData);
    res.json({ status: 'success', message: 'Page created.', data: page });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Delete Page ───────────────────────────────────────────────────────────
exports.deleteTemplatePage = async (req, res) => {
  try {
    const user = req.vsuser;
    const { id, template_id } = req.body;
    const { pageTbl, sectionTbl } = getTables(user);
    await pageTbl.findByIdAndDelete(id);
    await sectionTbl.deleteMany({ pageId: id, templateId: template_id });
    res.json({ status: 'success', message: 'Page deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Update Page Status ────────────────────────────────────────────────────
exports.updateTemplatePageStatus = async (req, res) => {
  try {
    const user = req.vsuser;
    const { id, status } = req.body;
    const { pageTbl } = getTables(user);
    await pageTbl.findByIdAndUpdate(id, { status });
    res.json({ status: 'success', message: 'Page status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Update Page Name ──────────────────────────────────────────────────────
exports.updatePageName = async (req, res) => {
  try {
    const user = req.vsuser;
    const { id, title } = req.body;
    const { pageTbl } = getTables(user);
    await pageTbl.findByIdAndUpdate(id, { title, slug: Common.generateSlug(title) });
    res.json({ status: 'success', message: 'Page renamed.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Duplicate Page ────────────────────────────────────────────────────────
exports.duplicatePage = async (req, res) => {
  try {
    const user = req.vsuser;
    const { page_id, template_id } = req.body;
    const { pageTbl, sectionTbl } = getTables(user);
    const page = await pageTbl.findById(page_id);
    if (!page) return res.json({ status: 'error', message: 'Page not found.' });
    const pageObj = page.toObject();
    const oldId = pageObj._id;
    delete pageObj._id; delete pageObj.createdAt; delete pageObj.updatedAt;
    pageObj.title += ' (Copy)';
    pageObj.slug   = Common.generateSlug(pageObj.title);
    const newPage = await pageTbl.create(pageObj);
    const sections = await sectionTbl.find({ templateId: template_id, pageId: oldId });
    for (const s of sections) {
      const so = s.toObject(); delete so._id; delete so.createdAt; delete so.updatedAt;
      so.pageId = newPage._id;
      await sectionTbl.create(so);
    }
    res.json({ status: 'success', message: 'Page duplicated.', data: newPage });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Save Pages Order ──────────────────────────────────────────────────────
exports.savePagesOrder = async (req, res) => {
  try {
    const user = req.vsuser;
    const { pages } = req.body; // [{ id, sort }]
    const { pageTbl } = getTables(user);
    for (const p of pages) await pageTbl.findByIdAndUpdate(p.id, { sort: p.sort });
    res.json({ status: 'success', message: 'Order saved.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Add Section ───────────────────────────────────────────────────────────
exports.addSection = async (req, res) => {
  try {
    const user = req.vsuser;
    const { page_id, template_id, title, type, sectionData } = req.body;
    if (!page_id || !template_id || !title || !type) {
      return res.json({ status: 'error', message: 'page_id, template_id, title, type required.' });
    }
    const { sectionTbl } = getTables(user);
    const count = await sectionTbl.countDocuments({ templateId: template_id, pageId: page_id });
    const section = await sectionTbl.create({
      templateId: template_id, pageId: page_id,
      title, type, sort: count + 1, status: 1,
      ...(sectionData ? { sectionData } : {}),
    });
    res.json({ status: 'success', message: 'Section created.', data: section });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Get Sections ──────────────────────────────────────────────────────────
exports.getSections = async (req, res) => {
  try {
    const user = req.vsuser;
    const { template_id, page_id } = req.query;
    const { sectionTbl } = getTables(user);
    const sections = await sectionTbl.find({ templateId: template_id, pageId: page_id }).sort({ sort: 1 });
    res.json({ status: 'success', data: sections });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Save Section ──────────────────────────────────────────────────────────
exports.saveSection = async (req, res) => {
  try {
    const user = req.vsuser;
    const { section_id, sectionData } = req.body;
    if (!section_id || !sectionData) return res.json({ status: 'error', message: 'section_id and sectionData required.' });
    const { sectionTbl } = getTables(user);
    await sectionTbl.findByIdAndUpdate(section_id, { sectionData });
    res.json({ status: 'success', message: 'Section saved.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Delete Section ────────────────────────────────────────────────────────
exports.deleteSection = async (req, res) => {
  try {
    const user = req.vsuser;
    const { section_id } = req.body;
    const { sectionTbl } = getTables(user);
    await sectionTbl.findByIdAndDelete(section_id);
    res.json({ status: 'success', message: 'Section deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Update Section Status ─────────────────────────────────────────────────
exports.updateSectionStatus = async (req, res) => {
  try {
    const user = req.vsuser;
    const { section_id, status } = req.body;
    const { sectionTbl } = getTables(user);
    await sectionTbl.findByIdAndUpdate(section_id, { status });
    res.json({ status: 'success', message: 'Status updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Duplicate Section ─────────────────────────────────────────────────────
exports.duplicateSection = async (req, res) => {
  try {
    const user = req.vsuser;
    const { section_id } = req.body;
    const { sectionTbl } = getTables(user);
    const sec = await sectionTbl.findById(section_id);
    if (!sec) return res.json({ status: 'error', message: 'Section not found.' });
    const obj = sec.toObject(); delete obj._id; delete obj.createdAt; delete obj.updatedAt;
    const newSec = await sectionTbl.create(obj);
    res.json({ status: 'success', message: 'Section duplicated.', data: newSec });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Update Animation ──────────────────────────────────────────────────────
exports.updateAnimation = async (req, res) => {
  try {
    const user = req.vsuser;
    const { section_id, animation } = req.body;
    const { sectionTbl } = getTables(user);
    await sectionTbl.findByIdAndUpdate(section_id, { animation });
    res.json({ status: 'success', message: 'Animation saved.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Save Section Order ────────────────────────────────────────────────────
exports.saveSectionOrder = async (req, res) => {
  try {
    const user = req.vsuser;
    const { sections } = req.body; // [{ id, sort }]
    const { sectionTbl } = getTables(user);
    for (const s of sections) await sectionTbl.findByIdAndUpdate(s.id, { sort: s.sort });
    res.json({ status: 'success', message: 'Order saved.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Update Template Profile ───────────────────────────────────────────────
exports.updateTemplateProfile = async (req, res) => {
  try {
    const user = req.vsuser;
    const { template_id, profile } = req.body;
    const { campTbl } = getTables(user);
    await campTbl.findByIdAndUpdate(template_id, { profile });
    res.json({ status: 'success', message: 'Profile updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Update Template Name ──────────────────────────────────────────────────
exports.updateTemplateName = async (req, res) => {
  try {
    const user = req.vsuser;
    const { template_id, title } = req.body;
    const { campTbl } = getTables(user);
    await campTbl.findByIdAndUpdate(template_id, { title });
    res.json({ status: 'success', message: 'Name updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Apply Theme ───────────────────────────────────────────────────────────
exports.applyTheme = async (req, res) => {
  try {
    const user = req.vsuser;
    const { template_id, theme_id, isCustomTheme, templateStyle } = req.body;
    const { campTbl } = getTables(user);
    const update = { themeId: theme_id, isCustomTheme: isCustomTheme || 0 };
    if (templateStyle) update.templateStyle = templateStyle;
    await campTbl.findByIdAndUpdate(template_id, update);
    res.json({ status: 'success', message: 'Theme applied.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Get Themes ────────────────────────────────────────────────────────────
exports.getThemes = async (req, res) => {
  try {
    const themes = await Theme.find({ status: 1 }).sort({ createdAt: -1 });
    res.json({ status: 'success', data: themes });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Get Social Packs ──────────────────────────────────────────────────────
exports.getSocialPacks = async (req, res) => {
  try {
    const packs = await SocialPack.find({ status: 1 });
    res.json({ status: 'success', data: packs });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Save Social Icons ─────────────────────────────────────────────────────
exports.saveSocialIcons = async (req, res) => {
  try {
    const user = req.vsuser;
    const { template_id, SocialIconData } = req.body;
    const { campTbl } = getTables(user);
    await campTbl.findByIdAndUpdate(template_id, { SocialIconData });
    res.json({ status: 'success', message: 'Social icons saved.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Update Social Icons Pack ──────────────────────────────────────────────
exports.updateSocialIconsPack = async (req, res) => {
  try {
    const user = req.vsuser;
    const { template_id, pack_id } = req.body;
    const { campTbl } = getTables(user);
    await campTbl.findByIdAndUpdate(template_id, { packId: pack_id });
    res.json({ status: 'success', message: 'Icon pack updated.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Save SEO Data ─────────────────────────────────────────────────────────
exports.saveSEOData = async (req, res) => {
  try {
    const user = req.vsuser;
    const { page_id, seoData } = req.body;
    const { pageTbl } = getTables(user);
    await pageTbl.findByIdAndUpdate(page_id, { seoData });
    res.json({ status: 'success', message: 'SEO data saved.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Get Signed URL for file upload ───────────────────────────────────────
exports.getSignedURL = async (req, res) => {
  try {
    const { path: remotePath } = req.body;
    if (!remotePath) return res.json({ status: 'error', message: 'path required.' });
    const url = await getPutObjectSignedURL(remotePath);
    res.json({ status: 'success', data: url });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};
