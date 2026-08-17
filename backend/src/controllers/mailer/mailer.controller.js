const { MailerGroup, MailerContact, MailerTemplate, MailerCampaign } = require('../../models/Mailer.models');
const nodemailer = require('nodemailer');
const sgMail     = require('@sendgrid/mail');
const mailgun    = require('mailgun-js');
const twilio     = require('twilio');
const csv        = require('csv-parse/sync');
const fs         = require('fs');
const Handlebars = require('handlebars');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderTemplate(body, contact) {
  try {
    return Handlebars.compile(body)({
      firstName:   contact.firstName || '',
      lastName:    contact.lastName  || '',
      email:       contact.email     || '',
      phone:       contact.phone     || '',
      fullName:    `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      ...(contact.customFields ? Object.fromEntries(contact.customFields) : {}),
    });
  } catch { return body; }
}

async function getEmailSender(user, campaign) {
  const cfg = user.settings?.mailer || {};
  const provider = campaign.emailProvider || 'smtp';
  if (provider === 'sendgrid') {
    const key = cfg.sendgridKey || process.env.SENDGRID_API_KEY;
    sgMail.setApiKey(key);
    return { provider: 'sendgrid' };
  }
  if (provider === 'mailgun') {
    const mg = mailgun({ apiKey: cfg.mailgunKey || process.env.MAILGUN_API_KEY, domain: cfg.mailgunDomain || process.env.MAILGUN_DOMAIN });
    return { provider: 'mailgun', mg };
  }
  // SMTP
  const transport = nodemailer.createTransporter({
    host: cfg.smtpHost || process.env.SMTP_HOST,
    port: cfg.smtpPort || process.env.SMTP_PORT || 587,
    auth: { user: cfg.smtpUser || process.env.SMTP_USER, pass: cfg.smtpPass || process.env.SMTP_PASS },
  });
  return { provider: 'smtp', transport };
}

async function sendEmail(sender, to, subject, html, text, from) {
  if (sender.provider === 'sendgrid') {
    await sgMail.send({ to, from, subject, html, text });
  } else if (sender.provider === 'mailgun') {
    await sender.mg.messages().send({ from, to, subject, html, text });
  } else {
    await sender.transport.sendMail({ from, to, subject, html, text });
  }
}

async function sendSMS(user, to, body, provider) {
  const cfg = user.settings?.mailer || {};
  if (provider === 'vonage') {
    const Vonage = require('@vonage/server-sdk');
    const vonage = new Vonage({ apiKey: cfg.vonageKey || process.env.VONAGE_API_KEY, apiSecret: cfg.vonageSecret || process.env.VONAGE_API_SECRET });
    await new Promise((res, rej) => vonage.message.sendSms(cfg.vonageFrom || 'MarkPro', to, body, {}, (err, resp) => err ? rej(err) : res(resp)));
  } else {
    const client = twilio(cfg.twilioSid || process.env.TWILIO_ACCOUNT_SID, cfg.twilioToken || process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ body, from: cfg.twilioFrom || process.env.TWILIO_PHONE_NUMBER, to });
  }
}

async function resolveContacts(campaign, userId) {
  let contacts = [];
  if (campaign.allContacts) {
    contacts = await MailerContact.find({ user: userId, status: 'active' });
  } else {
    const byGroup = campaign.groups?.length
      ? await MailerContact.find({ user: userId, groups: { $in: campaign.groups }, status: 'active' }) : [];
    const direct = campaign.contacts?.length
      ? await MailerContact.find({ user: userId, _id: { $in: campaign.contacts }, status: 'active' }) : [];
    const seen = new Set();
    for (const c of [...byGroup, ...direct]) {
      if (!seen.has(c._id.toString())) { seen.add(c._id.toString()); contacts.push(c); }
    }
  }
  return campaign.type === 'email'
    ? contacts.filter(c => c.email && !c.emailBounced)
    : contacts.filter(c => c.phone && !c.smsFailed);
}

// ─── Groups ───────────────────────────────────────────────────────────────────
exports.getGroups = async (req, res) => {
  try {
    const groups = await MailerGroup.find({ user: req.user._id }).sort({ name: 1 });
    res.json({ success: true, groups });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createGroup = async (req, res) => {
  try {
    const group = await MailerGroup.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, group });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateGroup = async (req, res) => {
  try {
    const group = await MailerGroup.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    res.json({ success: true, group });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteGroup = async (req, res) => {
  try {
    await MailerGroup.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    await MailerContact.updateMany({ groups: req.params.id }, { $pull: { groups: req.params.id } });
    res.json({ success: true, message: 'Group deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Contacts ─────────────────────────────────────────────────────────────────
exports.getContacts = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, groupId, status } = req.query;
    const q = { user: req.user._id };
    if (search)  q.$or = [{ firstName: { $regex: search, $options:'i' }},{ lastName: { $regex: search, $options:'i' }},{ email: { $regex: search, $options:'i' }},{ phone: { $regex: search, $options:'i' }}];
    if (groupId) q.groups = groupId;
    if (status)  q.status = status;
    const [contacts, total] = await Promise.all([
      MailerContact.find(q).populate('groups','name color').sort({ createdAt:-1 }).skip((page-1)*limit).limit(+limit),
      MailerContact.countDocuments(q),
    ]);
    res.json({ success: true, contacts, total, page:+page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createContact = async (req, res) => {
  try {
    const contact = await MailerContact.create({ ...req.body, user: req.user._id });
    if (req.body.groups?.length) {
      await MailerGroup.updateMany({ _id: { $in: req.body.groups } }, { $inc: { contactCount: 1 } });
    }
    res.status(201).json({ success: true, contact });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateContact = async (req, res) => {
  try {
    const contact = await MailerContact.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    res.json({ success: true, contact });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteContact = async (req, res) => {
  try {
    const contact = await MailerContact.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (contact?.groups?.length)
      await MailerGroup.updateMany({ _id: { $in: contact.groups } }, { $inc: { contactCount: -1 } });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.importContacts = async (req, res) => {
  try {
    if (!req.files?.file) return res.status(400).json({ success: false, message: 'CSV file required' });
    const raw = req.files.file.data.toString();
    const rows = csv.parse(raw, { columns: true, skip_empty_lines: true });
    const groupId = req.body.groupId;
    let imported = 0, skipped = 0;
    for (const row of rows) {
      const email = (row.email || row.Email || '').toLowerCase().trim();
      const phone = (row.phone || row.Phone || '').trim();
      if (!email && !phone) { skipped++; continue; }
      const existing = await MailerContact.findOne({ user: req.user._id, $or: [email ? {email} : null, phone ? {phone} : null].filter(Boolean) });
      if (existing) { skipped++; continue; }
      await MailerContact.create({
        user: req.user._id,
        firstName: row.firstName || row.first_name || row.First || '',
        lastName:  row.lastName  || row.last_name  || row.Last  || '',
        email, phone,
        groups: groupId ? [groupId] : [],
        source: 'csv',
      });
      imported++;
    }
    if (groupId && imported > 0)
      await MailerGroup.findByIdAndUpdate(groupId, { $inc: { contactCount: imported } });
    res.json({ success: true, message: `Imported ${imported}, skipped ${skipped}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Templates ────────────────────────────────────────────────────────────────
exports.getTemplates = async (req, res) => {
  try {
    const { type } = req.query;
    const q = { user: req.user._id };
    if (type) q.type = type;
    const templates = await MailerTemplate.find(q).sort({ createdAt: -1 });
    res.json({ success: true, templates });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createTemplate = async (req, res) => {
  try {
    const t = await MailerTemplate.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, template: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateTemplate = async (req, res) => {
  try {
    const t = await MailerTemplate.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    res.json({ success: true, template: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteTemplate = async (req, res) => {
  try {
    await MailerTemplate.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Campaigns ────────────────────────────────────────────────────────────────
exports.getCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const q = { user: req.user._id };
    if (status) q.status = status;
    if (type)   q.type   = type;
    const [campaigns, total] = await Promise.all([
      MailerCampaign.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit).populate('template','name').populate('groups','name').select('-recipients'),
      MailerCampaign.countDocuments(q),
    ]);
    res.json({ success: true, campaigns, total, page:+page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getCampaign = async (req, res) => {
  try {
    const c = await MailerCampaign.findOne({ _id: req.params.id, user: req.user._id })
      .populate('template').populate('groups','name contactCount');
    if (!c) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, campaign: c });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createCampaign = async (req, res) => {
  try {
    const c = await MailerCampaign.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, campaign: c });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateCampaign = async (req, res) => {
  try {
    const c = await MailerCampaign.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: { $in: ['draft','scheduled'] } },
      req.body, { new: true }
    );
    if (!c) return res.status(404).json({ success: false, message: 'Not found or cannot edit in current state' });
    res.json({ success: true, campaign: c });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteCampaign = async (req, res) => {
  try {
    await MailerCampaign.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.sendCampaign = async (req, res) => {
  try {
    const campaign = await MailerCampaign.findOne({ _id: req.params.id, user: req.user._id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    if (!['draft','scheduled','paused'].includes(campaign.status))
      return res.status(400).json({ success: false, message: 'Cannot send in current state' });

    const contacts = await resolveContacts(campaign, req.user._id);
    if (!contacts.length) return res.status(400).json({ success: false, message: 'No valid contacts for this campaign' });

    campaign.status = 'sending';
    campaign.startedAt = new Date();
    campaign.stats.total = contacts.length;
    campaign.recipients = contacts.map(c => ({
      contact: c._id, email: c.email, phone: c.phone, status: 'pending',
    }));
    await campaign.save();

    res.json({ success: true, message: `Campaign sending started for ${contacts.length} contacts` });

    // Send in background
    setImmediate(async () => {
      let sent = 0, failed = 0;
      try {
        const sender = campaign.type === 'email' ? await getEmailSender(req.user, campaign) : null;
        const from = `${campaign.fromName || 'MarkPro'} <${campaign.fromEmail || process.env.SMTP_FROM}>`;

        for (let i = 0; i < campaign.recipients.length; i++) {
          const r = campaign.recipients[i];
          const contact = contacts.find(c => c._id.equals(r.contact));
          if (!contact) continue;
          try {
            if (campaign.type === 'email') {
              const html = renderTemplate(campaign.htmlBody || campaign.textBody || '', contact);
              const text = renderTemplate(campaign.textBody || '', contact);
              const subj = renderTemplate(campaign.subject || '', contact);
              await sendEmail(sender, r.email, subj, html, text, from);
            } else {
              const body = renderTemplate(campaign.smsBody || '', contact);
              await sendSMS(req.user, r.phone, body, campaign.smsProvider);
            }
            campaign.recipients[i].status = 'sent';
            campaign.recipients[i].sentAt = new Date();
            sent++;
          } catch (e) {
            campaign.recipients[i].status = 'failed';
            campaign.recipients[i].failedReason = e.message;
            failed++;
          }
        }
        campaign.status = 'sent';
        campaign.completedAt = new Date();
        campaign.stats.sent = sent;
        campaign.stats.failed = failed;
        await campaign.save();
      } catch (e) {
        campaign.status = 'failed';
        await campaign.save();
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.pauseCampaign = async (req, res) => {
  try {
    await MailerCampaign.findOneAndUpdate({ _id: req.params.id, user: req.user._id, status: 'sending' }, { status: 'paused' });
    res.json({ success: true, message: 'Campaign paused' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Analytics ────────────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const campaigns = await MailerCampaign.find({ user: req.user._id });
    const stats = campaigns.reduce((acc, c) => {
      acc.totalCampaigns++;
      acc.totalSent      += c.stats.sent      || 0;
      acc.totalOpened    += c.stats.opened    || 0;
      acc.totalClicked   += c.stats.clicked   || 0;
      acc.totalBounced   += c.stats.bounced   || 0;
      acc.totalFailed    += c.stats.failed    || 0;
      return acc;
    }, { totalCampaigns: 0, totalSent: 0, totalOpened: 0, totalClicked: 0, totalBounced: 0, totalFailed: 0 });
    const contactCount = await MailerContact.countDocuments({ user: req.user._id });
    res.json({ success: true, stats: { ...stats, contactCount } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Settings (per-user API keys) ─────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  const cfg = req.user.settings?.mailer || {};
  // Never expose full keys - return presence indicator only
  res.json({ success: true, settings: {
    emailProvider:  cfg.emailProvider  || 'smtp',
    smsProvider:    cfg.smsProvider    || 'twilio',
    hasSmtp:        !!(cfg.smtpHost && cfg.smtpUser),
    hasSendgrid:    !!cfg.sendgridKey,
    hasMailgun:     !!(cfg.mailgunKey && cfg.mailgunDomain),
    hasTwilio:      !!(cfg.twilioSid  && cfg.twilioToken),
    hasVonage:      !!(cfg.vonageKey  && cfg.vonageSecret),
    fromEmail:      cfg.fromEmail || '',
    fromName:       cfg.fromName  || '',
    twilioFrom:     cfg.twilioFrom|| '',
    vonageFrom:     cfg.vonageFrom|| '',
  }});
};
exports.updateSettings = async (req, res) => {
  try {
    const User = require('../../models/User.model');
    await User.findByIdAndUpdate(req.user._id, { 'settings.mailer': { ...req.user.settings?.mailer, ...req.body } });
    res.json({ success: true, message: 'Mailer settings saved' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
