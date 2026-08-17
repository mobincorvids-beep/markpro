const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const gemini = require('../../services/gemini.service');
const { Chat, ChatMessage, Contact, CannedReply, AiPrompt } = require('../../models/WhatsApp.models');
const { protect } = require('../../middleware/auth.middleware');
const wa = require('../../utils/whatsapp');

router.use(protect);
const upload = multer({ dest: 'uploads/whatsapp-attachments/' });

// ── Chat list ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page=1, limit=30, search, agent } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { receiverId: { $regex: search, $options: 'i' } },
    ];
    if (agent) filter.agent = { $regex: agent };

    const chats = await Chat.find(filter)
      .sort({ lastMsgTime: -1 })
      .skip((page-1)*limit).limit(+limit);

    const total = await Chat.countDocuments(filter);
    res.json({ chats, total, page:+page, pages: Math.ceil(total/limit) });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Get single chat ─────────────────────────────────────────────
router.get('/:chatId', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Mark chat messages as read ───────────────────────────────────
router.patch('/:chatId/read', async (req, res) => {
  try {
    await ChatMessage.updateMany({ chatId: req.params.chatId, isRead: false }, { isRead: true });
    const chat = await Chat.findByIdAndUpdate(req.params.chatId, { unreadCount: 0 }, { new: true });
    res.json({ success: true, chat });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Messages for a chat ───────────────────────────────────────
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { lastMessageId } = req.query;
    const query = ChatMessage.where('chatId', req.params.chatId);
    if (lastMessageId) query.where('_id').lt(lastMessageId);

    const messages = await query.sort({ _id: -1 }).limit(25).lean();

    // Prefix media URLs
    messages.forEach(m => {
      if (m.url) m.url = `${process.env.APP_URL?.replace(':3000',':5000') || 'http://localhost:5000'}/uploads/whatsapp-attachments/${m.url.replace(/^\//,'')}`;
    });

    await ChatMessage.updateMany({ chatId: req.params.chatId, isRead: false }, { isRead: true });
    await Chat.findByIdAndUpdate(req.params.chatId, { unreadCount: 0 });

    res.json(messages.reverse());
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Send text message ─────────────────────────────────────────
router.post('/:chatId/send', async (req, res) => {
  try {
    const { message, replyToId } = req.body;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const response = await wa.sendText(chat.receiverId, message, replyToId || null);
    const wamid    = response?.messages?.[0]?.id || '';

    const msg = await ChatMessage.create({
      chatId: chat._id, senderId: req.user._id.toString(),
      direction: 'out', message, status: 'sent',
      messageId: wamid, refMessageId: replyToId || '',
      staffId: req.user._id.toString(), timeSent: new Date(),
    });

    await Chat.findByIdAndUpdate(chat._id, { lastMessage: message, lastMsgTime: new Date() });

    // Emit via socket
    const io = req.app.get('io');
    io?.to(`chat_${chat._id}`).emit('new_message', msg);

    res.json(msg);
  } catch(err) { res.status(500).json({ error: err.response?.data?.error?.message || err.message }); }
});

// ── Send media message ────────────────────────────────────────
router.post('/:chatId/send-media', upload.single('file'), async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!req.file) return res.status(400).json({ error: 'File required' });

    const mediaUrl = `${process.env.APP_URL?.replace(':3000',':5000') || 'http://localhost:5000'}/uploads/whatsapp-attachments/${req.file.filename}`;
    const mediaType = req.body.type || 'image'; // image|video|document|audio

    const response = await wa.sendMedia(chat.receiverId, mediaType, mediaUrl, req.body.caption || '', req.file.originalname);
    const wamid    = response?.messages?.[0]?.id || '';

    const msg = await ChatMessage.create({
      chatId: chat._id, senderId: req.user._id.toString(),
      direction: 'out', message: req.body.caption || `[${mediaType}]`,
      url: req.file.filename, messageType: mediaType,
      status: 'sent', messageId: wamid, staffId: req.user._id.toString(), timeSent: new Date(),
    });

    await Chat.findByIdAndUpdate(chat._id, { lastMessage: `[${mediaType}]`, lastMsgTime: new Date() });
    req.app.get('io')?.to(`chat_${chat._id}`).emit('new_message', msg);
    res.json(msg);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Send template from chat ───────────────────────────────────
router.post('/:chatId/send-template', async (req, res) => {
  try {
    const { templateName, language, components } = req.body;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const response = await wa.sendTemplate(chat.receiverId, templateName, language, components || []);
    const wamid    = response?.messages?.[0]?.id || '';

    const msg = await ChatMessage.create({
      chatId: chat._id, senderId: req.user._id.toString(),
      direction: 'out', message: `[Template: ${templateName}]`,
      status: 'sent', messageId: wamid, staffId: req.user._id.toString(), timeSent: new Date(),
    });

    await Chat.findByIdAndUpdate(chat._id, { lastMessage: `[Template: ${templateName}]`, lastMsgTime: new Date() });
    req.app.get('io')?.to(`chat_${chat._id}`).emit('new_message', msg);
    res.json(msg);
  } catch(err) { res.status(500).json({ error: err.response?.data?.error?.message || err.message }); }
});

// ── AI reply ──────────────────────────────────────────────────
router.post('/:chatId/ai-reply', async (req, res) => {
  try {
    const { promptId } = req.body;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const prompt = promptId ? await AiPrompt.findById(promptId) : null;
    const systemPrompt = prompt?.action || 'You are a helpful WhatsApp customer support agent. Be concise.';

    // Build conversation history from recent messages
    const recent = await ChatMessage.find({ chatId: chat._id }).sort({ _id:-1 }).limit(10).lean();
    const history = recent.reverse().map(m => ({
      role: m.direction === 'out' ? 'assistant' : 'user',
      content: m.message,
    }));

    const aiText = await gemini.chat({
      messages: history,
      system: systemPrompt,
      maxTokens: 300,
    });
    res.json({ suggestion: aiText });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Assign agent ──────────────────────────────────────────────
router.patch('/:chatId/assign-agent', async (req, res) => {
  try {
    const { agentIds } = req.body; // array of user ids
    const agents = Array.isArray(agentIds) ? agentIds.join(',') : agentIds;
    const chat = await Chat.findByIdAndUpdate(req.params.chatId, { agent: agents }, { new: true });
    res.json(chat);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Toggle AI chat mode ───────────────────────────────────────
router.patch('/:chatId/toggle-ai', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Not found' });
    chat.isAiChat = !chat.isAiChat;
    await chat.save();
    res.json({ isAiChat: chat.isAiChat });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Stop bot for this chat ────────────────────────────────────
router.patch('/:chatId/stop-bot', async (req, res) => {
  try {
    const chat = await Chat.findByIdAndUpdate(req.params.chatId,
      { isBotStopped: true, botStoppedTime: new Date() }, { new: true });
    res.json(chat);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Delete message ────────────────────────────────────────────
router.delete('/messages/:messageId', async (req, res) => {
  try {
    await ChatMessage.findByIdAndDelete(req.params.messageId);
    res.json({ message: 'Deleted' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Delete chat ───────────────────────────────────────────────
router.delete('/:chatId', async (req, res) => {
  try {
    await Chat.findByIdAndDelete(req.params.chatId);
    await ChatMessage.deleteMany({ chatId: req.params.chatId });
    res.json({ message: 'Chat deleted' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Canned replies (used inside chat) ────────────────────────
router.get('/canned-replies', async (req, res) => {
  try {
    const replies = await CannedReply.find({
      $or: [{ isPublic: true }, { addedFrom: req.user._id }],
    }).sort('title');
    res.json(replies);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
