const {
  WMLWorkspace, WMLCloudApp, WMLWebApp,
  WMLCustomer, WMLGroup, WMLConversation, WMLMessage,
  WMLCampaign, WMLCampaignLog, WMLAutoResponse,
  WMLAiTraining, WMLNumberScanner,
  WMLWebScraping, WMLWebScrapedData, WMLBulkSendLog,
} = require('../../models/WhatsML.models');
const axios   = require('axios');
const crypto  = require('crypto');
const gemini  = require('../../services/gemini.service');

// ── Cloud API Connections ─────────────────────────────────────
exports.getCloudApps = async (req, res) => {
  try {
    const apps = await WMLCloudApp.find({ user: req.user._id, active: true }).select('-accessToken');
    res.json({ success: true, apps });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createCloudApp = async (req, res) => {
  try {
    const app = await WMLCloudApp.create({ ...req.body, user: req.user._id, status: 'connected' });
    res.status(201).json({ success: true, app: { ...app.toObject(), accessToken: undefined } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateCloudApp = async (req, res) => {
  try {
    const app = await WMLCloudApp.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true }).select('-accessToken');
    res.json({ success: true, app });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteCloudApp = async (req, res) => {
  try {
    await WMLCloudApp.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { active: false });
    res.json({ success: true, message: 'Disconnected' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── WhatsApp Web Sessions ─────────────────────────────────────
exports.getWebApps = async (req, res) => {
  try {
    const apps = await WMLWebApp.find({ user: req.user._id, active: true });
    res.json({ success: true, apps });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createWebApp = async (req, res) => {
  try {
    const sessionId = `wml_${req.user._id}_${Date.now()}`;
    const app = await WMLWebApp.create({ ...req.body, user: req.user._id, sessionId, status: 'initializing' });
    // In production: call Baileys microservice to init session and get QR code
    res.status(201).json({ success: true, app, message: 'WhatsApp Web session created. Start the Baileys microservice to get QR code.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getQrCode = async (req, res) => {
  try {
    const app = await WMLWebApp.findOne({ _id: req.params.id, user: req.user._id });
    if (!app) return res.status(404).json({ success: false, message: 'Not found' });
    // Call Baileys microservice
    const msUrl = process.env.BAILEYS_SERVICE_URL || 'http://localhost:3001';
    try {
      const { data } = await axios.get(`${msUrl}/session/${app.sessionId}/qr`);
      await WMLWebApp.findByIdAndUpdate(app._id, { qrCode: data.qr, status: 'qr_pending' });
      res.json({ success: true, qr: data.qr, status: 'qr_pending' });
    } catch {
      res.json({ success: true, qr: app.qrCode, status: app.status, note: 'Baileys microservice not running' });
    }
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteWebApp = async (req, res) => {
  try {
    const app = await WMLWebApp.findOne({ _id: req.params.id, user: req.user._id });
    if (app) {
      const msUrl = process.env.BAILEYS_SERVICE_URL || 'http://localhost:3001';
      try { await axios.delete(`${msUrl}/session/${app.sessionId}`); } catch {}
      await WMLWebApp.findByIdAndUpdate(app._id, { active: false, status: 'logged_out' });
    }
    res.json({ success: true, message: 'Session removed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Customers (CRM) ───────────────────────────────────────────
exports.getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, groupId, tag } = req.query;
    const q = { user: req.user._id };
    if (search) q.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search } }, { email: { $regex: search, $options: 'i' } }];
    if (groupId) q.groups = groupId;
    if (tag) q.tags = tag;
    const [customers, total] = await Promise.all([
      WMLCustomer.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit).populate('groups','name color'),
      WMLCustomer.countDocuments(q),
    ]);
    res.json({ success: true, customers, total, page:+page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createCustomer = async (req, res) => {
  try {
    const customer = await WMLCustomer.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, customer });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await WMLCustomer.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    res.json({ success: true, customer });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteCustomer = async (req, res) => {
  try {
    await WMLCustomer.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.importCustomers = async (req, res) => {
  try {
    if (!req.files?.file) return res.status(400).json({ success: false, message: 'CSV required' });
    const csvParse = require('csv-parse/sync');
    const rows = csvParse.parse(req.files.file.data.toString(), { columns: true, skip_empty_lines: true });
    let imported = 0, skipped = 0;
    for (const row of rows) {
      const phone = (row.phone || row.Phone || '').replace(/\D/g, '');
      if (!phone) { skipped++; continue; }
      const exists = await WMLCustomer.findOne({ user: req.user._id, phone });
      if (exists) { skipped++; continue; }
      await WMLCustomer.create({
        user: req.user._id,
        name: row.name || row.Name || '',
        phone, email: row.email || row.Email || '',
        source: 'import',
        groups: req.body.groupId ? [req.body.groupId] : [],
      });
      imported++;
    }
    res.json({ success: true, message: `Imported ${imported}, skipped ${skipped}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Groups ────────────────────────────────────────────────────
exports.getGroups = async (req, res) => {
  try {
    const groups = await WMLGroup.find({ user: req.user._id }).sort({ name: 1 });
    res.json({ success: true, groups });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createGroup = async (req, res) => {
  try {
    const g = await WMLGroup.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, group: g });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteGroup = async (req, res) => {
  try {
    await WMLGroup.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Conversations + Messages ──────────────────────────────────
exports.getConversations = async (req, res) => {
  try {
    const { page = 1, limit = 30, status, channel } = req.query;
    const q = { user: req.user._id };
    if (status)  q.status  = status;
    if (channel) q.channel = channel;
    const [conversations, total] = await Promise.all([
      WMLConversation.find(q).sort({ lastMessageAt: -1 }).skip((page-1)*limit).limit(+limit)
        .populate('customer','name phone avatar'),
      WMLConversation.countDocuments(q),
    ]);
    res.json({ success: true, conversations, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const messages = await WMLMessage.find({ conversation: req.params.conversationId })
      .sort({ createdAt: 1 }).skip((page-1)*limit).limit(+limit);
    await WMLConversation.findByIdAndUpdate(req.params.conversationId, { unreadCount: 0 });
    res.json({ success: true, messages });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { body, type = 'text', mediaUrl } = req.body;
    const conv = await WMLConversation.findOne({ _id: conversationId, user: req.user._id });
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    // Send via appropriate channel
    if (conv.channel === 'cloud_api') {
      const app = await WMLCloudApp.findById(conv.channelApp);
      if (app) {
        try {
          await axios.post(`https://graph.facebook.com/v18.0/${app.phoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            to: (await WMLCustomer.findById(conv.customer))?.phone,
            type,
            [type === 'text' ? 'text' : type]: type === 'text' ? { body } : { link: mediaUrl },
          }, { headers: { Authorization: `Bearer ${app.accessToken}`, 'Content-Type': 'application/json' } });
        } catch (e) { console.error('[WML Cloud] Send failed:', e.message); }
      }
    } else {
      // Baileys microservice
      const app = await WMLWebApp.findById(conv.channelApp);
      if (app) {
        const msUrl = process.env.BAILEYS_SERVICE_URL || 'http://localhost:3001';
        try {
          await axios.post(`${msUrl}/session/${app.sessionId}/send`, {
            to: (await WMLCustomer.findById(conv.customer))?.phone,
            message: body,
          });
        } catch (e) { console.error('[WML Web] Send failed:', e.message); }
      }
    }
    const message = await WMLMessage.create({ conversation: conversationId, user: req.user._id, direction: 'outbound', sender: 'agent', type, body, mediaUrl });
    await WMLConversation.findByIdAndUpdate(conversationId, { lastMessage: body, lastMessageAt: new Date() });
    res.status(201).json({ success: true, message });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.suggestAiReply = async (req, res) => {
  try {
    const messages = await WMLMessage.find({ conversation: req.params.conversationId }).sort({ createdAt: -1 }).limit(10);
    const history  = messages.reverse().map(m => ({ role: m.direction === 'inbound' ? 'user' : 'assistant', content: m.body }));
    const suggestion = await gemini.chat({
      messages: history,
      system: 'You are a helpful customer service representative on WhatsApp. Reply concisely.',
      maxTokens: 200,
    });
    res.json({ success: true, suggestion: suggestion.trim() });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Campaigns ─────────────────────────────────────────────────
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await WMLCampaign.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('groups','name');
    res.json({ success: true, campaigns });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createCampaign = async (req, res) => {
  try {
    const campaign = await WMLCampaign.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, campaign });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.pauseCampaign = async (req, res) => {
  try {
    await WMLCampaign.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { status: 'paused' });
    res.json({ success: true, message: 'Paused' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await WMLCampaign.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.resumeCampaign = async (req, res) => {
  try {
    await WMLCampaign.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { status: 'sending' });
    res.json({ success: true, message: 'Resumed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Auto-Response Bots ────────────────────────────────────────
exports.getAutoResponses = async (req, res) => {
  try {
    const bots = await WMLAutoResponse.find({ user: req.user._id });
    res.json({ success: true, bots });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createAutoResponse = async (req, res) => {
  try {
    const bot = await WMLAutoResponse.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, bot });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateAutoResponse = async (req, res) => {
  try {
    const bot = await WMLAutoResponse.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    res.json({ success: true, bot });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteAutoResponse = async (req, res) => {
  try {
    await WMLAutoResponse.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── AI Training (RAG knowledge base) ─────────────────────────
exports.getTrainingSets = async (req, res) => {
  try {
    const sets = await WMLAiTraining.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, sets });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createTrainingSet = async (req, res) => {
  try {
    const set = await WMLAiTraining.create({ ...req.body, user: req.user._id, status: 'ready' });
    res.status(201).json({ success: true, set });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteTrainingSet = async (req, res) => {
  try {
    await WMLAiTraining.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Number Scanner ────────────────────────────────────────────
exports.getScanJobs = async (req, res) => {
  try {
    const jobs = await WMLNumberScanner.find({ user: req.user._id }).sort({ createdAt: -1 }).select('-results');
    res.json({ success: true, jobs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createScanJob = async (req, res) => {
  try {
    const { name, numbers } = req.body;
    const job = await WMLNumberScanner.create({ user: req.user._id, name, numbersTotal: numbers.length, status: 'queued' });
    // Background: use Baileys Web session to check numbers
    setImmediate(async () => {
      try {
        job.status = 'running';
        await job.save();
        const results = numbers.map(phone => ({ phone, hasWhatsapp: true, checkedAt: new Date() })); // stub - replace with real Baileys check
        job.results = results;
        job.numbersValid = results.filter(r => r.hasWhatsapp).length;
        job.numbersInvalid = results.filter(r => !r.hasWhatsapp).length;
        job.status = 'completed';
        await job.save();
      } catch (e) { job.status = 'failed'; await job.save(); }
    });
    res.status(201).json({ success: true, job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getScanJob = async (req, res) => {
  try {
    const job = await WMLNumberScanner.findOne({ _id: req.params.id, user: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Web Scraping ──────────────────────────────────────────────
exports.getScrapeJobs = async (req, res) => {
  try {
    const jobs = await WMLWebScraping.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createScrapeJob = async (req, res) => {
  try {
    const job = await WMLWebScraping.create({ ...req.body, user: req.user._id, status: 'queued' });
    res.status(201).json({ success: true, job, message: 'Scraping job queued - connect a scraping provider to process.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getScrapeResults = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const results = await WMLWebScrapedData.find({ job: req.params.id, user: req.user._id })
      .skip((page-1)*limit).limit(+limit);
    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.importScrapedToCustomers = async (req, res) => {
  try {
    const { ids } = req.body;
    const records = await WMLWebScrapedData.find({ _id: { $in: ids }, user: req.user._id, imported: false });
    let imported = 0, skipped = 0;
    for (const r of records) {
      const phone = r.phone.replace(/\D/g,'');
      if (!phone) { skipped++; continue; }
      const exists = await WMLCustomer.findOne({ user: req.user._id, phone });
      if (exists) { skipped++; continue; }
      await WMLCustomer.create({ user: req.user._id, name: r.name, phone, email: r.email, source: 'scraping' });
      r.imported = true;
      await r.save();
      imported++;
    }
    res.json({ success: true, message: `Imported ${imported}, skipped ${skipped}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Webhook handler (Cloud API incoming) ─────────────────────
exports.cloudWebhookVerify = (req, res) => {
  const mode  = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WML_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};

exports.cloudWebhookReceive = async (req, res) => {
  try {
    res.sendStatus(200);
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const val = change.value;
        if (!val?.messages?.length) continue;
        for (const msg of val.messages) {
          const phoneNumberId = val.metadata?.phone_number_id;
          const app = await WMLCloudApp.findOne({ phoneNumberId, active: true });
          if (!app) continue;
          const fromPhone = msg.from;
          let customer = await WMLCustomer.findOne({ user: app.user, phone: fromPhone });
          if (!customer) customer = await WMLCustomer.create({ user: app.user, phone: fromPhone, name: val.contacts?.[0]?.profile?.name || 'Unknown', source: 'api' });
          let conv = await WMLConversation.findOne({ user: app.user, customer: customer._id, channelApp: app._id });
          if (!conv) conv = await WMLConversation.create({ user: app.user, customer: customer._id, channel: 'cloud_api', channelApp: app._id });
          const text = msg.text?.body || msg.caption || '[media]';
          await WMLMessage.create({ conversation: conv._id, user: app.user, direction: 'inbound', sender: 'customer', type: msg.type, body: text, wamid: msg.id });
          await WMLConversation.findByIdAndUpdate(conv._id, { lastMessage: text, lastMessageAt: new Date(), $inc: { unreadCount: 1 } });
          // Check auto-responses
          const bots = await WMLAutoResponse.find({ user: app.user, status: 'active', channel: { $in: ['cloud_api','both'] } });
          for (const bot of bots) {
            if (bot.mode === 'keyword') {
              for (const item of bot.items) {
                const matched = item.keywords.some(kw => {
                  if (item.matchType === 'exact') return text.toLowerCase() === kw.toLowerCase();
                  if (item.matchType === 'starts_with') return text.toLowerCase().startsWith(kw.toLowerCase());
                  return text.toLowerCase().includes(kw.toLowerCase());
                });
                if (matched && item.active) {
                  try {
                    await axios.post(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
                      messaging_product: 'whatsapp', to: fromPhone, type: 'text', text: { body: item.replyText },
                    }, { headers: { Authorization: `Bearer ${app.accessToken}` } });
                    await WMLMessage.create({ conversation: conv._id, user: app.user, direction: 'outbound', sender: 'ai', type: 'text', body: item.replyText });
                    await WMLAutoResponse.findByIdAndUpdate(bot._id, { $inc: { triggeredCount: 1 } });
                  } catch {}
                  break;
                }
              }
            }
          }
        }
      }
    }
  } catch (err) { console.error('[WML Webhook]', err.message); }
};

// ── Workspaces ────────────────────────────────────────────────
exports.getWorkspaces = async (req, res) => {
  try {
    const ws = await WMLWorkspace.find({ $or: [{ owner: req.user._id }, { 'members.user': req.user._id }], active: true });
    res.json({ success: true, workspaces: ws });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createWorkspace = async (req, res) => {
  try {
    const ws = await WMLWorkspace.create({ ...req.body, owner: req.user._id });
    res.status(201).json({ success: true, workspace: ws });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Admin ─────────────────────────────────────────────────────
exports.adminStats = async (req, res) => {
  try {
    const [totalApps, totalWebApps, totalCustomers, totalCampaigns] = await Promise.all([
      WMLCloudApp.countDocuments({ active: true }),
      WMLWebApp.countDocuments({ active: true }),
      WMLCustomer.countDocuments(),
      WMLCampaign.countDocuments(),
    ]);
    res.json({ success: true, stats: { totalApps, totalWebApps, totalCustomers, totalCampaigns } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
