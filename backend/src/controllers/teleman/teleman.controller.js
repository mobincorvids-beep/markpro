const {
  TelemPlan, TelemTenant, TelemDept, TelemProvider,
  TelemContact, TelemScript, TelemCampaign, TelemCampaignContact,
  TelemCall, TelemSms, TelemTicket,
} = require('../../models/Teleman.models');
const twilio = require('twilio');

const getTwilioClient = (provider) => twilio(provider.accountSid, provider.authToken);
const getTenant = (userId) => TelemTenant.findOne({ owner: userId });

// Plans
exports.getPlans = async (req, res) => {
  try { res.json({ success: true, plans: await TelemPlan.find({ isActive: true }).sort({ price: 1 }) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Tenant
exports.getMyTenant = async (req, res) => {
  try {
    let tenant = await getTenant(req.user._id);
    if (!tenant) {
      const trial = await TelemPlan.findOne({ isTrial: true });
      tenant = await TelemTenant.create({ owner: req.user._id, planId: trial?._id, trialEndsAt: new Date(Date.now() + 14*86400000), subscriptionStatus: 'trial' });
    }
    res.json({ success: true, tenant });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Departments
exports.getDepts = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    res.json({ success: true, departments: await TelemDept.find({ tenantId: tenant?._id }) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createDept = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const dept = await TelemDept.create({ ...req.body, tenantId: tenant._id });
    res.status(201).json({ success: true, department: dept });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateDept = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const dept = await TelemDept.findOneAndUpdate({ _id: req.params.id, tenantId: tenant._id }, req.body, { new: true });
    res.json({ success: true, department: dept });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteDept = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    await TelemDept.findOneAndDelete({ _id: req.params.id, tenantId: tenant._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Providers (Twilio credentials)
exports.getProviders = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const providers = await TelemProvider.find({ tenantId: tenant?._id }).select('-authToken -apiSecret');
    res.json({ success: true, providers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createProvider = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const provider = await TelemProvider.create({ ...req.body, tenantId: tenant._id });
    res.status(201).json({ success: true, provider: { ...provider.toObject(), authToken: undefined, apiSecret: undefined } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.testProvider = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const provider = await TelemProvider.findOne({ _id: req.params.id, tenantId: tenant._id });
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });
    const client = getTwilioClient(provider);
    const account = await client.api.accounts(provider.accountSid).fetch();
    res.json({ success: true, message: `Connected: ${account.friendlyName}`, status: account.status });
  } catch (err) { res.status(400).json({ success: false, message: `Connection failed: ${err.message}` }); }
};
exports.deleteProvider = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    await TelemProvider.findOneAndDelete({ _id: req.params.id, tenantId: tenant._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Contacts
exports.getContacts = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const { page = 1, limit = 50, search, status, tag } = req.query;
    const q = { tenantId: tenant._id };
    if (status) q.status = status;
    if (tag)    q.tags   = tag;
    if (search) q.$or = [{ firstName: { $regex: search,$options:'i' } },{ lastName: { $regex: search,$options:'i' } },{ phone: { $regex: search } },{ email: { $regex: search,$options:'i' } }];
    const [contacts, total] = await Promise.all([
      TelemContact.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
      TelemContact.countDocuments(q),
    ]);
    res.json({ success: true, contacts, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createContact = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const c = await TelemContact.create({ ...req.body, tenantId: tenant._id, createdBy: req.user._id });
    res.status(201).json({ success: true, contact: c });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateContact = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const c = await TelemContact.findOneAndUpdate({ _id: req.params.id, tenantId: tenant._id }, req.body, { new: true });
    res.json({ success: true, contact: c });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteContact = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    await TelemContact.findOneAndDelete({ _id: req.params.id, tenantId: tenant._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.importContacts = async (req, res) => {
  try {
    if (!req.files?.file) return res.status(400).json({ success: false, message: 'CSV required' });
    const csvParse = require('csv-parse/sync');
    const tenant   = await getTenant(req.user._id);
    const rows     = csvParse.parse(req.files.file.data.toString(), { columns: true, skip_empty_lines: true });
    let imported   = 0, skipped = 0;
    for (const row of rows) {
      const phone = (row.phone || row.Phone || '').replace(/\D/g,'');
      if (!phone) { skipped++; continue; }
      const exists = await TelemContact.findOne({ tenantId: tenant._id, phone });
      if (exists) { skipped++; continue; }
      await TelemContact.create({ tenantId: tenant._id, firstName: row.firstName || row.first_name || row.name || 'Unknown', lastName: row.lastName || row.last_name || '', phone, email: row.email || '', createdBy: req.user._id });
      imported++;
    }
    res.json({ success: true, message: `Imported ${imported}, skipped ${skipped}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Scripts
exports.getScripts = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    res.json({ success: true, scripts: await TelemScript.find({ tenantId: tenant._id }) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createScript = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const s = await TelemScript.create({ ...req.body, tenantId: tenant._id, createdBy: req.user._id });
    res.status(201).json({ success: true, script: s });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateScript = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const s = await TelemScript.findOneAndUpdate({ _id: req.params.id, tenantId: tenant._id }, req.body, { new: true });
    res.json({ success: true, script: s });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteScript = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    await TelemScript.findOneAndDelete({ _id: req.params.id, tenantId: tenant._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Campaigns
exports.getCampaigns = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const campaigns = await TelemCampaign.find({ tenantId: tenant._id }).sort({ createdAt: -1 })
      .populate('scriptId','name').populate('providerId','name fromNumber');
    res.json({ success: true, campaigns });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createCampaign = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const c = await TelemCampaign.create({ ...req.body, tenantId: tenant._id, createdBy: req.user._id });
    res.status(201).json({ success: true, campaign: c });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateCampaignStatus = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const c = await TelemCampaign.findOneAndUpdate({ _id: req.params.id, tenantId: tenant._id }, { status: req.body.status }, { new: true });
    res.json({ success: true, campaign: c });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.addContactsToCampaign = async (req, res) => {
  try {
    const tenant  = await getTenant(req.user._id);
    const { contactIds } = req.body;
    const inserts = contactIds.map(contactId => ({ campaignId: req.params.id, contactId, tenantId: tenant._id }));
    await TelemCampaignContact.insertMany(inserts, { ordered: false }).catch(() => {});
    await TelemCampaign.findByIdAndUpdate(req.params.id, { $inc: { totalContacts: inserts.length } });
    res.json({ success: true, message: `Added ${inserts.length} contacts to campaign` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Call History
exports.getCallHistory = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const { page = 1, limit = 30 } = req.query;
    const [calls, total] = await Promise.all([
      TelemCall.find({ tenantId: tenant._id }).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit)
        .populate('contactId','firstName lastName phone').populate('agentId','name'),
      TelemCall.countDocuments({ tenantId: tenant._id }),
    ]);
    res.json({ success: true, calls, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// SMS
exports.sendSms = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const { to, body, contactId, campaignId } = req.body;
    const provider = await TelemProvider.findOne({ tenantId: tenant._id, isDefault: true, status: 'active' });
    if (!provider) return res.status(400).json({ success: false, message: 'No active provider. Add a Twilio provider first.' });
    const client = getTwilioClient(provider);
    const msg = await client.messages.create({ body, from: provider.fromNumber, to });
    const smsRecord = await TelemSms.create({ tenantId: tenant._id, agentId: req.user._id, contactId, campaignId, providerId: provider._id, messageSid: msg.sid, from: provider.fromNumber, to, body, direction: 'outbound', status: msg.status });
    res.status(201).json({ success: true, sms: smsRecord });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Twilio voice token for browser dialer
exports.getTwilioToken = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const provider = await TelemProvider.findOne({ tenantId: tenant._id, isDefault: true, status: 'active' });
    if (!provider?.apiKey) return res.status(400).json({ success: false, message: 'Twilio API Key not configured' });
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant  = AccessToken.VoiceGrant;
    const token = new AccessToken(provider.accountSid, provider.apiKey, provider.apiSecret, { identity: req.user._id.toString(), ttl: 3600 });
    token.addGrant(new VoiceGrant({ outgoingApplicationSid: provider.appSid, incomingAllow: true }));
    res.json({ success: true, token: token.toJwt() });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Twilio webhook (call status)
exports.twilioCallStatus = async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;
    await TelemCall.findOneAndUpdate({ callSid: CallSid }, { status: CallStatus, duration: +CallDuration || 0, endedAt: new Date() });
    res.sendStatus(200);
  } catch { res.sendStatus(200); }
};

// Tickets
exports.getTickets = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    res.json({ success: true, tickets: await TelemTicket.find({ tenantId: tenant._id, userId: req.user._id }).sort({ createdAt: -1 }) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createTicket = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const t = await TelemTicket.create({ ...req.body, tenantId: tenant._id, userId: req.user._id });
    res.status(201).json({ success: true, ticket: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.replyTicket = async (req, res) => {
  try {
    const tenant = await getTenant(req.user._id);
    const t = await TelemTicket.findOneAndUpdate(
      { _id: req.params.id, tenantId: tenant._id },
      { $push: { messages: { senderId: req.user._id, role: req.user.role === 'admin' ? 'support' : 'user', message: req.body.message } }, lastReplyAt: new Date() },
      { new: true }
    );
    res.json({ success: true, ticket: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Admin
exports.adminStats = async (req, res) => {
  try {
    const [tenants, contacts, calls, sms] = await Promise.all([
      TelemTenant.countDocuments(),
      TelemContact.countDocuments(),
      TelemCall.countDocuments(),
      TelemSms.countDocuments(),
    ]);
    res.json({ success: true, stats: { tenants, contacts, totalCalls: calls, totalSms: sms } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
