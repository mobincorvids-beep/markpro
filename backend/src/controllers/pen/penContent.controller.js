const { AiTemplate, TemplateGroup, SearchContent, SavedDoc } = require('../../models/AI2Pen.models');
const { generateText, buildPrompt, generateDalleImage, generateStableDiffusion, generateOpenAIAudio, generateGoogleTTS, generateAzureTTS, streamChatCompletion } = require('../../services/pen.ai.service');
const { deductUsage } = require('../../utils/pen.usage');

// ── Helper: Get Gemini API key from settings (falls back to env) ──────────
const getAdminApiKey = async () => {
  const { Setting } = require('../../models/AI2Pen.models');
  const s = await Setting.findOne({ key: 'gemini_api_key' });
  return s?.value || process.env.GEMINI_API_KEY;
};

// ══════════════════════════════════════════════════════════════════
//  TEMPLATES
// ══════════════════════════════════════════════════════════════════

exports.getTemplateGroups = async (req, res) => {
  try {
    const { type } = req.query;
    const query = { status: '1' };
    if (type) query.type = type;
    const groups = await TemplateGroup.find(query).sort({ sort_order: 1 });
    res.json({ status: '1', data: groups });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.getTemplates = async (req, res) => {
  try {
    const { type, group_id, search } = req.query;
    const query = { status: '1' };
    if (type)     query.type     = type;
    if (group_id) query.group_id = group_id;
    if (search)   query.$or = [{ template_name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];

    const templates = await AiTemplate.find(query)
      .sort({ sort_order: 1 })
      .populate('group_id', 'group_name group_slug group_icon group_color');
    res.json({ status: '1', data: templates });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.getTemplate = async (req, res) => {
  try {
    const t = await AiTemplate.findOne({ _id: req.params.id, status: '1' }).populate('group_id', 'group_name group_slug group_icon');
    if (!t) return res.json({ status: '0', message: 'Template not found.' });
    res.json({ status: '1', data: t });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ══════════════════════════════════════════════════════════════════
//  TEXT GENERATION
// ══════════════════════════════════════════════════════════════════

exports.generateTextContent = async (req, res) => {
  try {
    const { template_id, param_names, param_values, language, tone, creativity = 0.7, max_tokens = 2000, model } = req.body;

    const template = await AiTemplate.findById(template_id);
    if (!template) return res.json({ status: '0', message: 'Template not found.' });

    const apiKey = await getAdminApiKey();
    const prompt = buildPrompt(template.about_text, param_names, param_values, language);

    // Add tone if provided
    const finalPrompt = tone ? `${prompt}\n\nTone: ${tone}` : prompt;

    const useModel = model || template.ai_model || req.user.preferredAiModel || null;
    const result   = await generateText({ prompt: finalPrompt, model: useModel, temperature: parseFloat(creativity), max_tokens: parseInt(max_tokens), apiKey });

    // Save to history
    const saved = await SearchContent.create({
      user_id:           req.user._id,
      ai_template_id:    template._id,
      template_group_id: template.group_id,
      template_slug:     template.template_slug,
      group_slug:        template.group_id?.group_slug,
      content_type:      'text',
      result:            result.text,
      tokens:            result.tokens_used,
      ai_model:          result.model,
      prompt:            finalPrompt,
      language,
      api_group:         template.api_group || 'gemini',
    });

    // Deduct usage
    await deductUsage(req.user._id, 'token', result.tokens_used, `Text: ${template.template_name}`, saved._id);

    res.json({ status: '1', data: { result: result.text, tokens_used: result.tokens_used, history_id: saved._id } });
  } catch (err) {
    console.error(err);
    res.json({ status: '0', message: err.message || 'Text generation failed.' });
  }
};

// ── Custom prompt (no template) ───────────────────────────────────────────
exports.generateCustomText = async (req, res) => {
  try {
    const { prompt, language, tone, creativity = 0.7, max_tokens = 2000, model } = req.body;
    if (!prompt) return res.json({ status: '0', message: 'Prompt is required.' });

    const apiKey     = await getAdminApiKey();
    const useModel   = model || req.user.preferredAiModel || null;
    const finalPrompt = language ? `${prompt}\n\nRespond in ${language} language. ${tone ? `Tone: ${tone}.` : ''}` : prompt;

    const result = await generateText({ prompt: finalPrompt, model: useModel, temperature: parseFloat(creativity), max_tokens: parseInt(max_tokens), apiKey });

    const saved = await SearchContent.create({
      user_id: req.user._id, content_type: 'text',
      result: result.text, tokens: result.tokens_used,
      ai_model: result.model, prompt: finalPrompt, language,
    });

    await deductUsage(req.user._id, 'token', result.tokens_used, 'Custom text generation', saved._id);

    res.json({ status: '1', data: { result: result.text, tokens_used: result.tokens_used, history_id: saved._id } });
  } catch (err) {
    console.error(err);
    res.json({ status: '0', message: err.message || 'Text generation failed.' });
  }
};

// ══════════════════════════════════════════════════════════════════
//  IMAGE GENERATION
// ══════════════════════════════════════════════════════════════════

exports.generateImage = async (req, res) => {
  try {
    const { prompt, template_id, api_group = 'gemini', model, size = '1024x1024', quality = 'standard', n = 1,
      negative_prompt = '', width = 1024, height = 1024, steps = 30 } = req.body;

    if (!prompt) return res.json({ status: '0', message: 'Prompt is required.' });

    let urls = [];
    let usedApiGroup = api_group;

    if (api_group === 'stable_diffusion') {
      urls = await generateStableDiffusion({ prompt, negative_prompt, width: +width, height: +height, steps: +steps });
    } else {
      urls = await generateDalleImage({ prompt, n: +n });
      usedApiGroup = 'gemini';
    }

    const template = template_id ? await AiTemplate.findById(template_id) : null;

    const saved = await SearchContent.create({
      user_id:        req.user._id,
      ai_template_id: template?._id,
      content_type:   'image',
      image_urls:     urls,
      image_count:    urls.length,
      prompt,
      ai_model:       model || process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
      api_group:      usedApiGroup,
    });

    await deductUsage(req.user._id, 'image', urls.length, 'Image generation', saved._id);

    res.json({ status: '1', data: { urls, image_count: urls.length, history_id: saved._id } });
  } catch (err) {
    console.error(err);
    res.json({ status: '0', message: err.message || 'Image generation failed.' });
  }
};

// ══════════════════════════════════════════════════════════════════
//  AUDIO / TTS GENERATION
// ══════════════════════════════════════════════════════════════════

exports.generateAudio = async (req, res) => {
  try {
    const { text, api_group = 'gemini', voice = 'alloy', model, language_code = 'en-US',
      voice_name, speaking_rate = 1, pitch = 0, rate = '0%' } = req.body;

    if (!text) return res.json({ status: '0', message: 'Text is required.' });

    let audioResult;

    switch (api_group) {
      case 'google_tts':
        audioResult = await generateGoogleTTS({ text, voice_name: voice_name || 'en-US-Standard-A', language_code, speaking_rate: +speaking_rate, pitch: +pitch });
        break;
      case 'azure_tts':
        audioResult = await generateAzureTTS({ text, voice_name: voice_name || 'en-US-JennyNeural', language: language_code, rate, pitch });
        break;
      default: // gemini free tier has no TTS endpoint; surface a clear error instead of failing silently
        audioResult = await generateOpenAIAudio();
    }

    const saved = await SearchContent.create({
      user_id:      req.user._id,
      content_type: 'audio',
      audio_url:    audioResult.url,
      prompt:       text,
      ai_model:     model || 'gemini',
      api_group,
    });

    await deductUsage(req.user._id, 'audio', 1, 'Audio generation', saved._id);

    res.json({ status: '1', data: { url: audioResult.url, history_id: saved._id } });
  } catch (err) {
    console.error(err);
    res.json({ status: '0', message: err.message || 'Audio generation failed.' });
  }
};

// ══════════════════════════════════════════════════════════════════
//  CHAT
// ══════════════════════════════════════════════════════════════════

exports.chat = async (req, res) => {
  try {
    const { session_id, message, model, temperature = 0.7 } = req.body;
    if (!message) return res.json({ status: '0', message: 'Message is required.' });

    const { ChatSession } = require('../../models/AI2Pen.models');
    let session;

    if (session_id) {
      session = await ChatSession.findOne({ _id: session_id, user_id: req.user._id });
    }
    if (!session) {
      session = await ChatSession.create({
        user_id: req.user._id,
        model: model || req.user.preferredAiModel || process.env.GEMINI_MODEL,
        title: message.slice(0, 50),
        messages: [],
      });
    }

    // Append user message
    session.messages.push({ role: 'user', content: message });

    const apiKey    = await getAdminApiKey();
    const useModel  = model || session.model || null;
    const msgs      = session.messages.map(m => ({ role: m.role, content: m.content }));

    const result = await generateText({ messages: msgs, model: useModel, temperature: parseFloat(temperature), apiKey });

    session.messages.push({ role: 'assistant', content: result.text });
    session.tokens_used += result.tokens_used;
    await session.save();

    await deductUsage(req.user._id, 'token', result.tokens_used, 'Chat generation', session._id);

    res.json({ status: '1', data: { reply: result.text, session_id: session._id, tokens_used: result.tokens_used } });
  } catch (err) {
    console.error(err);
    res.json({ status: '0', message: err.message || 'Chat failed.' });
  }
};

exports.getChatSessions = async (req, res) => {
  try {
    const { ChatSession } = require('../../models/AI2Pen.models');
    const sessions = await ChatSession.find({ user_id: req.user._id, status: 'active' }).sort({ updatedAt: -1 }).select('-messages');
    res.json({ status: '1', data: sessions });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.getChatSession = async (req, res) => {
  try {
    const { ChatSession } = require('../../models/AI2Pen.models');
    const session = await ChatSession.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!session) return res.json({ status: '0', message: 'Session not found.' });
    res.json({ status: '1', data: session });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.deleteChatSession = async (req, res) => {
  try {
    const { ChatSession } = require('../../models/AI2Pen.models');
    await ChatSession.findOneAndUpdate({ _id: req.params.id, user_id: req.user._id }, { status: 'archived' });
    res.json({ status: '1', message: 'Chat session archived.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ══════════════════════════════════════════════════════════════════
//  HISTORY
// ══════════════════════════════════════════════════════════════════

exports.getHistory = async (req, res) => {
  try {
    const { type, page = 1, limit = 20, search } = req.query;
    const query = { user_id: req.user._id, status: '1' };
    if (type)   query.content_type = type;
    if (search) query.$or = [{ document_name: { $regex: search, $options: 'i' } }, { prompt: { $regex: search, $options: 'i' } }];

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      SearchContent.find(query).sort({ searched_at: -1 }).skip(skip).limit(+limit)
        .populate('ai_template_id', 'template_name template_icon template_color'),
      SearchContent.countDocuments(query),
    ]);
    res.json({ status: '1', data, total, page: +page });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.getHistoryItem = async (req, res) => {
  try {
    const item = await SearchContent.findOne({ _id: req.params.id, user_id: req.user._id })
      .populate('ai_template_id', 'template_name template_icon template_color type');
    if (!item) return res.json({ status: '0', message: 'Not found.' });
    res.json({ status: '1', data: item });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.deleteHistory = async (req, res) => {
  try {
    await SearchContent.findOneAndUpdate({ _id: req.params.id, user_id: req.user._id }, { status: '0' });
    res.json({ status: '1', message: 'Deleted.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.updateHistoryName = async (req, res) => {
  try {
    const item = await SearchContent.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { document_name: req.body.name }, { new: true }
    );
    res.json({ status: '1', data: item });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

// ── Saved Docs ────────────────────────────────────────────────────────────
exports.getSavedDocs = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const query = { user_id: req.user._id };
    if (type) query.type = type;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      SavedDoc.find(query).sort({ createdAt: -1 }).skip(skip).limit(+limit),
      SavedDoc.countDocuments(query),
    ]);
    res.json({ status: '1', data, total });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.saveDoc = async (req, res) => {
  try {
    const { title, content, type, search_content_id, tags } = req.body;
    const doc = await SavedDoc.create({ user_id: req.user._id, title, content, type: type || 'text', search_content_id, tags: tags || [] });
    res.json({ status: '1', message: 'Document saved.', data: doc });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};

exports.deleteSavedDoc = async (req, res) => {
  try {
    await SavedDoc.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
    res.json({ status: '1', message: 'Deleted.' });
  } catch (err) { res.json({ status: '0', message: 'Server error.' }); }
};
