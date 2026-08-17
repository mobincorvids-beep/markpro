const { AiTemplate, AiGenerate, UserPlatform, Category } = require('../../models/SocialAI.models');
const { generateText, generateImage } = require('../../services/aiProviders.service');
const { getOAuthUrl } = require('../../services/saPublisher.service');
const { deductCredits } = require('../../utils/credits');
const axios = require('axios');

// ══════════════════════════════════════════════════════════════════
//  AI TEMPLATES
// ══════════════════════════════════════════════════════════════════

exports.getTemplates = async (req, res) => {
  try {
    const { type, category_id, search } = req.query;
    const query = { status: 1 };
    if (type)        query.type       = type;
    if (category_id) query.categories = category_id;
    if (search)      query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
    const templates = await AiTemplate.find(query)
      .sort({ is_featured: -1, sort_order: 1 })
      .populate('categories', 'name');
    res.json({ status: 'success', data: templates });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.getTemplate = async (req, res) => {
  try {
    const template = await AiTemplate.findOne({ _id: req.params.id, status: 1 }).populate('categories', 'name');
    if (!template) return res.json({ status: 'error', message: 'Template not found.' });
    res.json({ status: 'success', data: template });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.runTemplate = async (req, res) => {
  try {
    const template = await AiTemplate.findById(req.params.id);
    if (!template) return res.json({ status: 'error', message: 'Template not found.' });

    const COST = template.type === 'image' ? 10 : 3;
    const remaining = await deductCredits(req.user._id, COST, `AI template: ${template.name}`, template._id, 'AiTemplate');
    if (remaining === false) return res.json({ status: 'error', message: 'Insufficient credits.' });

    // Replace field placeholders in prompt
    let prompt = template.prompt || '';
    for (const [key, val] of Object.entries(req.body)) {
      prompt = prompt.replace(new RegExp(`\\[${key}\\]`, 'gi'), val);
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'gi'), val);
    }

    let result;
    if (template.type === 'image') {
      result = await generateImage(prompt);
    } else {
      result = await generateText(prompt, template.meta?.system_prompt || null, 1500);
    }

    const gen = await AiGenerate.create({
      user_id: req.user._id, template_id: template._id,
      type: template.type, prompt, result, credits_used: COST,
    });

    res.json({ status: 'success', data: { result, generation_id: gen._id, credits_used: COST, credits_remaining: remaining } });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'AI generation failed.' });
  }
};

exports.getGenerations = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const query = { user_id: req.user._id };
    if (type) query.type = type;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      AiGenerate.find(query).sort({ createdAt: -1 }).skip(skip).limit(+limit)
        .populate('template_id', 'name icon type')
        .populate('brand_id', 'name'),
      AiGenerate.countDocuments(query),
    ]);
    res.json({ status: 'success', data, total });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.deleteGeneration = async (req, res) => {
  try {
    await AiGenerate.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
    res.json({ status: 'success', message: 'Deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ══════════════════════════════════════════════════════════════════
//  SOCIAL PLATFORMS / OAUTH
// ══════════════════════════════════════════════════════════════════

exports.getPlatforms = async (req, res) => {
  try {
    const platforms = await UserPlatform.find({ user_id: req.user._id }).sort({ platform: 1 });
    res.json({ status: 'success', data: platforms });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.disconnectPlatform = async (req, res) => {
  try {
    await UserPlatform.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
    res.json({ status: 'success', message: 'Platform disconnected.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.getOAuthUrl = async (req, res) => {
  try {
    const { platform } = req.params;
    const url = getOAuthUrl(platform);
    res.json({ status: 'success', data: { url } });
  } catch (err) { res.json({ status: 'error', message: err.message }); }
};

// Facebook OAuth callback
exports.facebookCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const userId = req.user._id;

    // Exchange code for token
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id:     process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri:  process.env.FACEBOOK_REDIRECT_URI,
        code,
      },
    });
    const accessToken = tokenRes.data.access_token;

    // Get user info
    const meRes = await axios.get('https://graph.facebook.com/v19.0/me', {
      params: { fields: 'id,name,picture', access_token: accessToken },
    });

    // Get managed pages
    const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/${meRes.data.id}/accounts`, {
      params: { access_token: accessToken },
    });

    const pages = pagesRes.data.data || [];
    const saved = [];

    for (const page of pages) {
      const existing = await UserPlatform.findOneAndUpdate(
        { user_id: userId, platform: 'facebook', platform_id: page.id },
        {
          user_id: userId, platform: 'facebook',
          platform_id: page.id, name: page.name,
          access_token: page.access_token,
          type: 'page',
          picture: `https://graph.facebook.com/v19.0/${page.id}/picture`,
          meta: { page_id: page.id },
        },
        { upsert: true, new: true }
      );
      saved.push(existing);
    }

    res.redirect(`${process.env.FRONTEND_URL}/platforms?connected=facebook`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.FRONTEND_URL}/platforms?error=facebook_failed`);
  }
};

// Twitter OAuth callback
exports.twitterCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const userId   = req.user._id;

    const tokenRes = await axios.post('https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({ code, grant_type: 'authorization_code', redirect_uri: process.env.TWITTER_REDIRECT_URI, code_verifier: 'challenge' }),
      { auth: { username: process.env.TWITTER_CLIENT_ID, password: process.env.TWITTER_CLIENT_SECRET } }
    );
    const accessToken = tokenRes.data.access_token;

    const meRes = await axios.get('https://api.twitter.com/2/users/me', {
      params: { 'user.fields': 'profile_image_url,username' },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const twUser = meRes.data.data;
    await UserPlatform.findOneAndUpdate(
      { user_id: userId, platform: 'twitter', platform_id: twUser.id },
      { user_id: userId, platform: 'twitter', platform_id: twUser.id, name: twUser.name, username: twUser.username, access_token: accessToken, picture: twUser.profile_image_url, type: 'profile' },
      { upsert: true, new: true }
    );

    res.redirect(`${process.env.FRONTEND_URL}/platforms?connected=twitter`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.FRONTEND_URL}/platforms?error=twitter_failed`);
  }
};

// LinkedIn OAuth callback
exports.linkedinCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const userId   = req.user._id;

    const params = new URLSearchParams({
      grant_type: 'authorization_code', code,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      client_id:    process.env.LINKEDIN_CLIENT_ID,
      client_secret:process.env.LINKEDIN_CLIENT_SECRET,
    });
    const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params);
    const accessToken = tokenRes.data.access_token;

    const meRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const li = meRes.data;

    await UserPlatform.findOneAndUpdate(
      { user_id: userId, platform: 'linkedin', platform_id: li.sub },
      { user_id: userId, platform: 'linkedin', platform_id: li.sub, name: li.name, access_token: accessToken, picture: li.picture, type: 'profile' },
      { upsert: true, new: true }
    );

    res.redirect(`${process.env.FRONTEND_URL}/platforms?connected=linkedin`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.FRONTEND_URL}/platforms?error=linkedin_failed`);
  }
};
