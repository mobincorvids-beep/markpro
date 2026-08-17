const router = require('express').Router();
const { Chat, ChatMessage, Contact, MessageBot, TemplateBot, WhatsappTemplate, WebhookLog, CampaignDetail } = require('../../models/WhatsApp.models');
const wa = require('../../utils/whatsapp');

// ── GET: Meta webhook verification ───────────────────────────
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] Verified');
    return res.status(200).send(challenge);
  }
  res.status(403).send('Forbidden');
});

// ── POST: Incoming messages & status updates ──────────────────
router.post('/', async (req, res) => {
  // Always acknowledge immediately
  res.sendStatus(200);

  const body = req.body;
  await WebhookLog.create({ event: 'webhook', payload: body });

  try {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    if (!changes) return;

    // ── Status updates (delivered, read, failed) ──
    if (changes.statuses) {
      for (const status of changes.statuses) {
        await handleStatusUpdate(status);
      }
    }

    // ── Incoming messages ──
    if (changes.messages) {
      for (const message of changes.messages) {
        await handleIncomingMessage(message, changes.metadata, changes.contacts?.[0]);
      }
    }
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
  }
});

/* ── Handle status updates ─────────────────────────────────── */
async function handleStatusUpdate(status) {
  const { id: wamid, status: newStatus, errors } = status;

  // Update campaign detail
  await CampaignDetail.findOneAndUpdate(
    { whatsappId: wamid },
    { messageStatus: newStatus, updatedAt: new Date() }
  );

  // Update chat message
  const msg = await ChatMessage.findOne({ messageId: wamid });
  if (msg) {
    msg.status = newStatus;
    if (errors?.[0]) msg.statusMessage = errors[0].message;
    await msg.save();

    // Emit via socket
    const app = require('../../server').app;
    const io  = app?.get('io');
    if (io) {
      getIo(req).to(`chat_${msg.chatId}`).emit('message_status', { messageId: wamid, status: newStatus });
    }
  }
}

/* ── Handle incoming message ──────────────────────────────────
   Mirrors WhatsAppWebhookController::processWebhookPayload()
*/
async function handleIncomingMessage(message, metadata, waContact) {
  const from       = message.from;                    // sender phone number
  const wamid      = message.id;
  const msgType    = message.type;                    // text|image|video|audio|document|sticker|button
  const waNoId     = metadata?.phone_number_id || '';
  const waNo       = metadata?.display_phone_number || '';
  const senderName = waContact?.profile?.name || from;

  // Extract message text / media
  let msgText  = '';
  let mediaUrl = '';

  if (msgType === 'text')     msgText  = message.text?.body || '';
  if (msgType === 'button')   msgText  = message.button?.text || '';
  if (['image','video','audio','document','sticker'].includes(msgType)) {
    msgText  = message[msgType]?.caption || `[${msgType}]`;
    mediaUrl = message[msgType]?.id || '';         // Media ID from Meta (would need separate download)
  }

  // ── Find or create chat ───────────────────────────────────
  let chat = await Chat.findOne({ receiverId: from });
  const isFirstTime = !chat;

  if (!chat) {
    // Try to match contact
    const contact = await Contact.findOne({ phone: { $regex: from.slice(-10) } });
    chat = await Chat.create({
      name:       senderName,
      receiverId: from,
      waNo, waNoId,
      type:       contact ? contact.type : 'unknown',
      typeId:     contact?._id || null,
      lastMessage: msgText,
      lastMsgTime: new Date(),
    });
  } else {
    await Chat.findByIdAndUpdate(chat._id, {
      lastMessage: msgText, lastMsgTime: new Date(),
      $inc: { unreadCount: 1 },
    });
  }

  // ── Save message ──────────────────────────────────────────
  const savedMsg = await ChatMessage.create({
    chatId:      chat._id,
    senderId:    from,
    direction:   'in',
    message:     msgText,
    url:         mediaUrl,
    messageType: msgType,
    isRead:      false,
    messageId:   wamid,
    timeSent:    new Date(),
  });

  // Mark as read on Meta
  try { await wa.markAsRead(wamid); } catch (_) {}

  // ── Emit to connected clients ─────────────────────────────
  const app = require('../../server').app;
  const io  = app?.get('io');
  if (io) {
    getIo(req).to(`chat_${chat._id}`).emit('new_message', savedMsg);
    io.emit('chat_updated', { chatId: chat._id, lastMessage: msgText, unreadCount: chat.unreadCount + 1 });
  }

  // ── Bot engine ────────────────────────────────────────────
  if (!chat.isBotStopped && !chat.isAiChat) {
    await runBotEngine(chat, msgText, msgType, from);
  }

  // ── AI auto-reply ─────────────────────────────────────────
  if (chat.isAiChat && msgText) {
    await runAiAutoReply(chat, msgText, from);
  }
}

/* ── Bot engine (mirrors WhatsApp trait bot matching) ──────── */
async function runBotEngine(chat, msgText, msgType, to) {
  // Check message bots first
  const messageBots = await MessageBot.find({ isBotActive: true });
  for (const bot of messageBots) {
    if (!matchesTrigger(bot.trigger, msgText, msgType)) continue;

    try {
      await wa.sendText(to, bot.replyText);
      await MessageBot.findByIdAndUpdate(bot._id, { $inc: { sendingCount: 1 } });
    } catch (_) {}
    return; // Only first matching bot fires
  }

  // Check template bots
  const templateBots = await TemplateBot.find({ isBotActive: true });
  for (const bot of templateBots) {
    if (!matchesTrigger(bot.trigger, msgText, msgType)) continue;

    const template = await WhatsappTemplate.findOne({ templateId: bot.templateId });
    if (!template) continue;

    try {
      const components = wa.buildTemplateComponents(template, bot.headerParams || [], bot.bodyParams || [], bot.footerParams || []);
      await wa.sendTemplate(to, template.templateName, template.language, components);
      await TemplateBot.findByIdAndUpdate(bot._id, { $inc: { sendingCount: 1 } });
    } catch (_) {}
    return;
  }
}

/* ── AI auto-reply ─────────────────────────────────────────── */
async function runAiAutoReply(chat, userMessage, to) {
  try {
    const gemini = require('../../services/gemini.service');

    let history = [];
    if (chat.aiMessageJson) {
      try { history = JSON.parse(chat.aiMessageJson); } catch(_) {}
    }
    history.push({ role: 'user', content: userMessage });
    if (history.length > 20) history = history.slice(-20);

    const aiReply = await gemini.chat({
      messages: history,
      system: 'You are a helpful WhatsApp customer support agent. Be concise and helpful.',
      maxTokens: 300,
    });
    history.push({ role: 'assistant', content: aiReply });

    await wa.sendText(to, aiReply);
    await Chat.findByIdAndUpdate(chat._id, { aiMessageJson: JSON.stringify(history) });

    // Save AI reply as outgoing message
    await ChatMessage.create({
      chatId: chat._id, senderId: 'ai',
      direction: 'out', message: aiReply,
      status: 'sent', timeSent: new Date(),
    });
  } catch (err) {
    console.error('[AI Auto-reply]', err.message);
  }
}

/* ── Trigger matching helper ──────────────────────────────────
   trigger can be: array of strings | 'all' | null
*/
function matchesTrigger(trigger, msgText, msgType) {
  if (!trigger || trigger === 'all' || (Array.isArray(trigger) && trigger.length === 0)) return true;
  if (!msgText) return false;
  const lower = msgText.toLowerCase().trim();
  if (Array.isArray(trigger)) {
    return trigger.some(t => {
      const kw = (typeof t === 'object' ? t.value : t)?.toLowerCase().trim();
      return kw && lower.includes(kw);
    });
  }
  if (typeof trigger === 'string') {
    return lower.includes(trigger.toLowerCase().trim());
  }
  return false;
}

module.exports = router;
