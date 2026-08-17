const { ToolsAiTemplate, ToolsAiCategory, ToolsAiDoc, ToolsAiConv, ToolsAiSupport, ToolsAiBlog, ToolsAiTx, ToolsAiPlan } = require('../../models/ToolsAI_SiteSpy.models');
const gemini = require('../../services/gemini.service');
const path   = require('path');

// Plans
exports.getPlans = async (req, res) => {
  try { res.json({ success: true, plans: await ToolsAiPlan.find({ isActive: true }).sort({ price: 1 }) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Categories
exports.getCategories = async (req, res) => {
  try { res.json({ success: true, categories: await ToolsAiCategory.find({ status: 'active' }) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Templates
exports.getTemplates = async (req, res) => {
  try {
    const { type, category, featured, search } = req.query;
    const q = { status: 'approved' };
    if (type)     q.type      = type;
    if (category) q.categories = category;
    if (featured) q.isFeatured = true;
    if (search)   q.title     = { $regex: search, $options: 'i' };
    const templates = await ToolsAiTemplate.find(q).sort({ isFeatured: -1, usageCount: -1 }).populate('categories','name slug');
    res.json({ success: true, templates });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getTemplate = async (req, res) => {
  try {
    const t = await ToolsAiTemplate.findOne({ slug: req.params.slug }).populate('categories','name');
    if (!t) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, template: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// AI Write
exports.aiWrite = async (req, res) => {
  try {
    const { templateSlug, inputs = {}, } = req.body;
    const template = await ToolsAiTemplate.findOne({ slug: templateSlug, type: 'AiWrite' });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    let prompt = template.data?.prompt || template.data?.promptTemplate || '';
    for (const [key, val] of Object.entries(inputs)) prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), val);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    let fullContent = await gemini.streamText({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1500,
      onChunk: (delta) => res.write(`data: ${JSON.stringify({ delta })}\n\n`),
    });
    // Save document
    const doc = await ToolsAiDoc.create({ user: req.user._id, template: template._id, title: inputs.title || template.title, type: 'aiWrite', content: fullContent, usedTokens: Math.ceil(fullContent.split(' ').length * 1.3) });
    await ToolsAiTemplate.findByIdAndUpdate(template._id, { $inc: { usageCount: 1 } });
    res.write(`data: ${JSON.stringify({ done: true, docId: doc._id })}\n\n`);
    res.end();
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// AI Code
exports.aiCode = async (req, res) => {
  try {
    const { language, description, } = req.body;
    res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache');
    const prompt = `Write ${language} code for: ${description}\n\nReturn ONLY the code, no explanation.`;
    let fullContent = await gemini.streamText({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2000,
      onChunk: (delta) => res.write(`data: ${JSON.stringify({ delta })}\n\n`),
    });
    const doc = await ToolsAiDoc.create({ user: req.user._id, title: `${language} - ${description.slice(0,50)}`, type: 'aiCode', content: fullContent, data: { language } });
    res.write(`data: ${JSON.stringify({ done: true, docId: doc._id })}\n\n`);
    res.end();
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// AI Image
exports.aiImage = async (req, res) => {
  try {
    const { prompt } = req.body;
    const result = await gemini.generateImage({ prompt, n: 1 });
    if (result.error) return res.status(502).json({ success: false, message: result.message });
    const url = `data:${result.images[0].mimeType};base64,${result.images[0].base64}`;
    const doc  = await ToolsAiDoc.create({ user: req.user._id, title: prompt.slice(0,60), type: 'aiImage', content: '', data: { imageUrl: url, prompt } });
    res.json({ success: true, url, docId: doc._id });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// AI Speech
exports.aiSpeech = async (req, res) => {
  try {
    return res.status(501).json({ success: false, message: 'Text-to-speech is not available with the current free Gemini integration.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// AI Transcribe
exports.aiTranscribe = async (req, res) => {
  try {
    return res.status(501).json({ success: false, message: 'Audio transcription is not available with the current free Gemini integration.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Chat
exports.getConversations = async (req, res) => {
  try { res.json({ success: true, conversations: await ToolsAiConv.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('template','title') }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createConversation = async (req, res) => {
  try {
    const conv = await ToolsAiConv.create({ user: req.user._id, template: req.body.templateId, title: req.body.title || 'New Chat' });
    res.status(201).json({ success: true, conversation: conv });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.chatMessage = async (req, res) => {
  try {
    const conv = await ToolsAiConv.findOne({ _id: req.params.id, user: req.user._id });
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    const userMsg = { content: req.body.message, role: 'user' };
    conv.messages.push(userMsg);
    const messages = conv.messages.map(m => ({ role: m.role, content: m.content }));
    const aiReply = await gemini.chat({ messages, maxTokens: 1000 });
    conv.messages.push({ content: aiReply, role: 'assistant' });
    await conv.save();
    res.json({ success: true, message: aiReply, conversationId: conv._id });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteConversation = async (req, res) => {
  try {
    await ToolsAiConv.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Documents
exports.getDocs = async (req, res) => {
  try {
    const { type, bookmark, page = 1, limit = 20 } = req.query;
    const q = { user: req.user._id };
    if (type)     q.type       = type;
    if (bookmark) q.isBookmark = true;
    const [docs, total] = await Promise.all([
      ToolsAiDoc.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
      ToolsAiDoc.countDocuments(q),
    ]);
    res.json({ success: true, docs, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateDoc = async (req, res) => {
  try {
    const doc = await ToolsAiDoc.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    res.json({ success: true, doc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteDoc = async (req, res) => {
  try {
    await ToolsAiDoc.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Support
exports.getTickets = async (req, res) => {
  try { res.json({ success: true, tickets: await ToolsAiSupport.find({ user: req.user._id }).sort({ createdAt: -1 }) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createTicket = async (req, res) => {
  try {
    const t = await ToolsAiSupport.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, ticket: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.replyTicket = async (req, res) => {
  try {
    const t = await ToolsAiSupport.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $push: { replies: { author: req.user._id, content: req.body.content, isAdmin: req.user.role === 'admin' } }, status: req.user.role === 'admin' ? 'answered' : 'open' },
      { new: true }
    );
    res.json({ success: true, ticket: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Blog (public)
exports.getBlogPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    const q = { status: 'published' };
    if (category) q.categories = category;
    const [posts, total] = await Promise.all([
      ToolsAiBlog.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit).select('-content').populate('author','name').populate('categories','name slug'),
      ToolsAiBlog.countDocuments(q),
    ]);
    res.json({ success: true, posts, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getBlogPost = async (req, res) => {
  try {
    const post = await ToolsAiBlog.findOneAndUpdate({ slug: req.params.slug, status: 'published' }, { $inc: { views: 1 } }, { new: true }).populate('author','name').populate('categories','name slug');
    if (!post) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Admin
exports.adminCreateBlog = async (req, res) => {
  try {
    const slug = req.body.slug || req.body.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const post = await ToolsAiBlog.create({ ...req.body, slug, author: req.user._id });
    res.status(201).json({ success: true, post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminUpdateBlog = async (req, res) => {
  try {
    const post = await ToolsAiBlog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminDeleteBlog = async (req, res) => {
  try {
    await ToolsAiBlog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminCreateTemplate = async (req, res) => {
  try {
    const slug = req.body.slug || req.body.title.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const t = await ToolsAiTemplate.create({ ...req.body, slug });
    res.status(201).json({ success: true, template: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminUpdateTemplate = async (req, res) => {
  try {
    const t = await ToolsAiTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, template: t });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.adminStats = async (req, res) => {
  try {
    const [docs, convs, tickets, blogs] = await Promise.all([
      ToolsAiDoc.countDocuments(),
      ToolsAiConv.countDocuments(),
      ToolsAiSupport.countDocuments({ status: 'open' }),
      ToolsAiBlog.countDocuments({ status: 'published' }),
    ]);
    res.json({ success: true, stats: { totalDocs: docs, totalConversations: convs, openTickets: tickets, publishedPosts: blogs } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
