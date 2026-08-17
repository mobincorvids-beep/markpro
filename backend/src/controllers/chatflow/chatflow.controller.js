const {
  CFTenant, CFPlan, CFPage, CFSubscriber, CFMessage,
  CFAutomationRule, CFSequence, CFSequenceEnrollment, CFBroadcast,
  CFCategory, CFProduct, CFOrder,
} = require('../../models/ChatFlow.models');
const axios  = require('axios');
const crypto = require('crypto');

// ── Tenant Setup ──────────────────────────────────────────────
exports.getMyTenant = async (req, res) => {
  try {
    let tenant = await CFTenant.findOne({ owner: req.user._id }).populate('plan');
    if (!tenant) {
      const trialPlan = await CFPlan.findOne({ isTrial: true });
      tenant = await CFTenant.create({
        businessName: req.user.name || 'My Business',
        owner: req.user._id,
        plan: trialPlan?._id,
        trialEndsAt: new Date(Date.now() + 14 * 86400000),
      });
    }
    res.json({ success: true, tenant });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateTenant = async (req, res) => {
  try {
    const tenant = await CFTenant.findOneAndUpdate({ owner: req.user._id }, req.body, { new: true });
    res.json({ success: true, tenant });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Pages ─────────────────────────────────────────────────────
exports.getPages = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    if (!tenant) return res.json({ success: true, pages: [] });
    const pages = await CFPage.find({ tenant: tenant._id });
    res.json({ success: true, pages });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createPage = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    if (!tenant) return res.status(400).json({ success: false, message: 'Set up your tenant first' });
    const page = await CFPage.create({ ...req.body, tenant: tenant._id, facebookPageId: req.body.facebookPageId || `mock_${Date.now()}` });
    res.status(201).json({ success: true, page });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updatePage = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const page = await CFPage.findOneAndUpdate({ _id: req.params.id, tenant: tenant._id }, req.body, { new: true });
    res.json({ success: true, page });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deletePage = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    await CFPage.findOneAndDelete({ _id: req.params.id, tenant: tenant._id });
    res.json({ success: true, message: 'Page removed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Subscribers ───────────────────────────────────────────────
exports.getSubscribers = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const { page = 1, limit = 50, search, tag, pageId } = req.query;
    const q = { tenant: tenant._id };
    if (pageId) q.page = pageId;
    if (search) q.name = { $regex: search, $options: 'i' };
    if (tag)    q.tags = tag;
    const [subscribers, total] = await Promise.all([
      CFSubscriber.find(q).sort({ lastInteractionAt: -1 }).skip((page-1)*limit).limit(+limit).populate('page','name'),
      CFSubscriber.countDocuments(q),
    ]);
    res.json({ success: true, subscribers, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateSubscriber = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const sub = await CFSubscriber.findOneAndUpdate({ _id: req.params.id, tenant: tenant._id }, req.body, { new: true });
    res.json({ success: true, subscriber: sub });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Messages / Conversation inbox ─────────────────────────────
exports.getConversation = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const { page = 1, limit = 50 } = req.query;
    const messages = await CFMessage.find({ tenant: tenant._id, subscriber: req.params.subscriberId })
      .sort({ createdAt: 1 }).skip((page-1)*limit).limit(+limit);
    res.json({ success: true, messages });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.sendMessage = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const subscriber = await CFSubscriber.findOne({ _id: req.params.subscriberId, tenant: tenant._id });
    if (!subscriber) return res.status(404).json({ success: false, message: 'Subscriber not found' });
    const fbPage = await CFPage.findById(subscriber.page);
    const text   = req.body.text;
    // Send via Facebook API if live mode
    if (fbPage?.connectionMode === 'live' && fbPage.accessToken) {
      try {
        await axios.post(`https://graph.facebook.com/v18.0/me/messages`, {
          recipient: { id: subscriber.psid },
          message: { text },
        }, { params: { access_token: fbPage.accessToken } });
      } catch (e) { console.error('[ChatFlow] FB send failed:', e.message); }
    }
    const msg = await CFMessage.create({ tenant: tenant._id, page: subscriber.page, subscriber: subscriber._id, direction: 'outbound', text, source: 'agent' });
    await CFSubscriber.findByIdAndUpdate(subscriber._id, { lastInteractionAt: new Date() });
    res.status(201).json({ success: true, message: msg });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Automation Rules ──────────────────────────────────────────
exports.getRules = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const rules = await CFAutomationRule.find({ tenant: tenant._id }).sort({ createdAt: -1 });
    res.json({ success: true, rules });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createRule = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const rule = await CFAutomationRule.create({ ...req.body, tenant: tenant._id });
    res.status(201).json({ success: true, rule });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateRule = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const rule = await CFAutomationRule.findOneAndUpdate({ _id: req.params.id, tenant: tenant._id }, req.body, { new: true });
    res.json({ success: true, rule });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteRule = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    await CFAutomationRule.findOneAndDelete({ _id: req.params.id, tenant: tenant._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Sequences ─────────────────────────────────────────────────
exports.getSequences = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const sequences = await CFSequence.find({ tenant: tenant._id });
    res.json({ success: true, sequences });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createSequence = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const seq = await CFSequence.create({ ...req.body, tenant: tenant._id });
    res.status(201).json({ success: true, sequence: seq });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateSequence = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const seq = await CFSequence.findOneAndUpdate({ _id: req.params.id, tenant: tenant._id }, req.body, { new: true });
    res.json({ success: true, sequence: seq });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteSequence = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    await CFSequence.findOneAndDelete({ _id: req.params.id, tenant: tenant._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.enrollSubscriber = async (req, res) => {
  try {
    const { subscriberId } = req.body;
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const seq    = await CFSequence.findOne({ _id: req.params.id, tenant: tenant._id });
    if (!seq || !seq.steps.length) return res.status(400).json({ success: false, message: 'Sequence has no steps' });
    const firstStep = seq.steps.sort((a,b) => a.order - b.order)[0];
    const enrollment = await CFSequenceEnrollment.create({
      tenant: tenant._id, sequence: seq._id, subscriber: subscriberId,
      currentStepIndex: 0, nextSendAt: new Date(Date.now() + firstStep.delayMinutes * 60000),
    });
    res.status(201).json({ success: true, enrollment });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Broadcasts ────────────────────────────────────────────────
exports.getBroadcasts = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const broadcasts = await CFBroadcast.find({ tenant: tenant._id }).sort({ createdAt: -1 });
    res.json({ success: true, broadcasts });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createBroadcast = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const bc = await CFBroadcast.create({ ...req.body, tenant: tenant._id });
    res.status(201).json({ success: true, broadcast: bc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.sendBroadcast = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const bc = await CFBroadcast.findOne({ _id: req.params.id, tenant: tenant._id, status: 'draft' });
    if (!bc) return res.status(404).json({ success: false, message: 'Broadcast not found or already sent' });
    const query = { tenant: tenant._id, page: bc.page, optedOut: false };
    if (bc.targetTag) query.tags = bc.targetTag;
    const subs = await CFSubscriber.find(query);
    bc.status = 'sending'; bc.recipientCount = subs.length; await bc.save();
    const fbPage = await CFPage.findById(bc.page);
    res.json({ success: true, message: `Sending to ${subs.length} subscribers` });
    setImmediate(async () => {
      let delivered = 0, failed = 0;
      for (const sub of subs) {
        try {
          if (fbPage?.connectionMode === 'live' && fbPage.accessToken) {
            await axios.post('https://graph.facebook.com/v18.0/me/messages',
              { recipient: { id: sub.psid }, message: { text: bc.message.replace('{{name}}', sub.name || 'Friend') } },
              { params: { access_token: fbPage.accessToken } }
            );
          }
          await CFMessage.create({ tenant: tenant._id, page: bc.page, subscriber: sub._id, direction: 'outbound', text: bc.message, source: 'broadcast' });
          delivered++;
        } catch { failed++; }
      }
      bc.status = 'sent'; bc.sentAt = new Date(); bc.deliveredCount = delivered; bc.failedCount = failed;
      await bc.save();
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── E-commerce: Categories ────────────────────────────────────
exports.getCategories = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const cats = await CFCategory.find({ tenant: tenant._id });
    res.json({ success: true, categories: cats });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createCategory = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const slug = req.body.name.toLowerCase().replace(/\s+/g, '-');
    const cat  = await CFCategory.create({ ...req.body, slug, tenant: tenant._id });
    res.status(201).json({ success: true, category: cat });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── E-commerce: Products ─────────────────────────────────────
exports.getProducts = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const products = await CFProduct.find({ tenant: tenant._id }).populate('category','name');
    res.json({ success: true, products });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createProduct = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const slug = req.body.name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    const product = await CFProduct.create({ ...req.body, slug, tenant: tenant._id });
    res.status(201).json({ success: true, product });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateProduct = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const product = await CFProduct.findOneAndUpdate({ _id: req.params.id, tenant: tenant._id }, req.body, { new: true });
    res.json({ success: true, product });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteProduct = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    await CFProduct.findOneAndDelete({ _id: req.params.id, tenant: tenant._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── E-commerce: Orders ────────────────────────────────────────
exports.getOrders = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const { status, page = 1, limit = 20 } = req.query;
    const q = { tenant: tenant._id };
    if (status) q.status = status;
    const [orders, total] = await Promise.all([
      CFOrder.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit).populate('items.product','name'),
      CFOrder.countDocuments(q),
    ]);
    res.json({ success: true, orders, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateOrderStatus = async (req, res) => {
  try {
    const tenant = await CFTenant.findOne({ owner: req.user._id });
    const order  = await CFOrder.findOneAndUpdate({ _id: req.params.id, tenant: tenant._id }, { status: req.body.status, paymentStatus: req.body.paymentStatus }, { new: true });
    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Public storefront (no auth) ───────────────────────────────
exports.publicGetProducts = async (req, res) => {
  try {
    const tenant = await CFTenant.findById(req.params.tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Store not found' });
    const products = await CFProduct.find({ tenant: tenant._id, isActive: true }).populate('category','name');
    res.json({ success: true, products, storeName: tenant.businessName });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.publicCheckout = async (req, res) => {
  try {
    const tenant = await CFTenant.findById(req.params.tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Store not found' });
    const { customer, items, paymentMethod = 'cod' } = req.body;
    let subtotal = 0;
    const resolvedItems = [];
    for (const item of items) {
      const product = await CFProduct.findById(item.productId);
      if (!product || !product.isActive) return res.status(400).json({ success: false, message: `Product not found: ${item.productId}` });
      resolvedItems.push({ product: product._id, name: product.name, price: product.price, quantity: item.quantity });
      subtotal += product.price * item.quantity;
    }
    const orderNumber = `CF-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const order = await CFOrder.create({ tenant: tenant._id, orderNumber, customer, items: resolvedItems, subtotal, total: subtotal, paymentMethod });
    res.status(201).json({ success: true, order, message: 'Order placed successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Messenger Webhook (Facebook) ──────────────────────────────
exports.messengerVerify = async (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe') {
    const page = await CFPage.findOne({ webhookVerifyToken: token }).catch(() => null);
    if (page) return res.status(200).send(challenge);
    if (token === process.env.CF_WEBHOOK_VERIFY_TOKEN) return res.status(200).send(challenge);
  }
  res.sendStatus(403);
};

exports.messengerReceive = async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.object !== 'page') return;
    for (const entry of body.entry || []) {
      const fbPageId = entry.id;
      const fbPage   = await CFPage.findOne({ facebookPageId: fbPageId, isActive: true });
      if (!fbPage) continue;
      for (const event of entry.messaging || []) {
        const psid = event.sender?.id;
        const text = event.message?.text;
        if (!psid || !text) continue;
        // Upsert subscriber
        let sub = await CFSubscriber.findOne({ page: fbPage._id, psid });
        if (!sub) sub = await CFSubscriber.create({ tenant: fbPage.tenant, page: fbPage._id, psid });
        // Store message
        await CFMessage.create({ tenant: fbPage.tenant, page: fbPage._id, subscriber: sub._id, direction: 'inbound', text, source: 'user' });
        await CFSubscriber.findByIdAndUpdate(sub._id, { lastInteractionAt: new Date() });
        // Check automation rules
        const rules = await CFAutomationRule.find({ page: fbPage._id, isActive: true, triggerType: { $in: ['keyword','default_reply'] } });
        let replied = false;
        for (const rule of rules) {
          const matched = rule.triggerType === 'default_reply' || rule.keywords.some(kw => {
            if (rule.matchType === 'exact')    return text.toLowerCase() === kw.toLowerCase();
            if (rule.matchType === 'any')      return true;
            return text.toLowerCase().includes(kw.toLowerCase());
          });
          if (!matched) continue;
          for (const reply of rule.replyMessages) {
            const replyText = reply.replace('{{name}}', sub.name || 'Friend');
            if (fbPage.connectionMode === 'live' && fbPage.accessToken) {
              await axios.post('https://graph.facebook.com/v18.0/me/messages',
                { recipient: { id: psid }, message: { text: replyText } },
                { params: { access_token: fbPage.accessToken } }
              ).catch(() => {});
            }
            await CFMessage.create({ tenant: fbPage.tenant, page: fbPage._id, subscriber: sub._id, direction: 'outbound', text: replyText, source: 'automation' });
          }
          if (rule.enrollInSequence) {
            const seq = await CFSequence.findById(rule.enrollInSequence);
            if (seq?.steps?.length) {
              const first = seq.steps.sort((a,b) => a.order-b.order)[0];
              await CFSequenceEnrollment.findOneAndUpdate(
                { sequence: seq._id, subscriber: sub._id, status: 'active' },
                { $setOnInsert: { tenant: fbPage.tenant, sequence: seq._id, subscriber: sub._id, currentStepIndex: 0, nextSendAt: new Date(Date.now() + first.delayMinutes*60000) } },
                { upsert: true }
              );
            }
          }
          await CFAutomationRule.findByIdAndUpdate(rule._id, { $inc: { triggerCount: 1 } });
          replied = true;
          break;
        }
        // Default reply if nothing matched
        if (!replied) {
          const defaultRule = await CFAutomationRule.findOne({ page: fbPage._id, triggerType: 'default_reply', isActive: true });
          if (defaultRule?.replyMessages?.[0]) {
            const replyText = defaultRule.replyMessages[0].replace('{{name}}', sub.name || 'Friend');
            if (fbPage.connectionMode === 'live' && fbPage.accessToken) {
              await axios.post('https://graph.facebook.com/v18.0/me/messages',
                { recipient: { id: psid }, message: { text: replyText } },
                { params: { access_token: fbPage.accessToken } }
              ).catch(() => {});
            }
            await CFMessage.create({ tenant: fbPage.tenant, page: fbPage._id, subscriber: sub._id, direction: 'outbound', text: replyText, source: 'automation' });
          }
        }
      }
    }
  } catch (err) { console.error('[ChatFlow Webhook]', err.message); }
};

// ── Admin ─────────────────────────────────────────────────────
exports.adminStats = async (req, res) => {
  try {
    const [tenants, subscribers, orders, broadcasts] = await Promise.all([
      CFTenant.countDocuments(),
      CFSubscriber.countDocuments(),
      CFOrder.countDocuments(),
      CFBroadcast.countDocuments({ status: 'sent' }),
    ]);
    res.json({ success: true, stats: { tenants, subscribers, orders, broadcastsSent: broadcasts } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminGetTenants = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [tenants, total] = await Promise.all([
      CFTenant.find().sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit).populate('owner','name email').populate('plan','name price'),
      CFTenant.countDocuments(),
    ]);
    res.json({ success: true, tenants, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminSuspendTenant = async (req, res) => {
  try {
    const t = await CFTenant.findByIdAndUpdate(req.params.id, { isSuspended: req.body.suspended }, { new: true });
    res.json({ success: true, tenant: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
