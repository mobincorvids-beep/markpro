const { Brand, AiGenerate } = require('../../models/SocialAI.models');
const { generateText, buildBrandSystemPrompt } = require('../../services/aiProviders.service');
const { deductCredits } = require('../../utils/credits');

// ── List brands ───────────────────────────────────────────────────────────
exports.getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ user_id: req.user._id }).sort({ createdAt: -1 });
    res.json({ status: 'success', data: brands });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Get single brand ──────────────────────────────────────────────────────
exports.getBrand = async (req, res) => {
  try {
    const brand = await Brand.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!brand) return res.json({ status: 'error', message: 'Brand not found.' });
    res.json({ status: 'success', data: brand });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Create brand ──────────────────────────────────────────────────────────
exports.createBrand = async (req, res) => {
  try {
    const planLimit = req.user.plan_data?.brands ?? 1;
    const count = await Brand.countDocuments({ user_id: req.user._id });
    if (planLimit !== -1 && count >= planLimit)
      return res.json({ status: 'error', message: `Your plan allows ${planLimit} brand(s). Upgrade to create more.` });

    const { name, description, slogan, color } = req.body;
    if (!name) return res.json({ status: 'error', message: 'Brand name is required.' });

    const brand = await Brand.create({
      user_id: req.user._id, name, description, slogan, color: color || {},
    });
    res.json({ status: 'success', message: 'Brand created.', data: brand });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Update brand ──────────────────────────────────────────────────────────
exports.updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      req.body, { new: true }
    );
    if (!brand) return res.json({ status: 'error', message: 'Brand not found.' });
    res.json({ status: 'success', message: 'Brand updated.', data: brand });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Delete brand ──────────────────────────────────────────────────────────
exports.deleteBrand = async (req, res) => {
  try {
    const { BrandPost } = require('../../models/SocialAI.models');
    const brand = await Brand.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
    if (!brand) return res.json({ status: 'error', message: 'Brand not found.' });
    await BrandPost.deleteMany({ brand_id: brand._id });
    res.json({ status: 'success', message: 'Brand deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── AI: Generate brand identities ─────────────────────────────────────────
exports.generateBrandIdentities = async (req, res) => {
  try {
    const brand = await Brand.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!brand) return res.json({ status: 'error', message: 'Brand not found.' });

    const COST = 5;
    const remaining = await deductCredits(req.user._id, COST, 'AI brand identity generation', brand._id, 'Brand');
    if (remaining === false) return res.json({ status: 'error', message: 'Insufficient credits.' });

    const prompt = `Generate brand identities (mission, vision, values) for a brand named "${brand.name}".
Description: ${brand.description || 'Not provided'}.
Return a JSON object with keys: mission, vision, values. Each is a 2-3 sentence string. Return only valid JSON.`;

    const raw = await generateText(prompt, 'You are a brand strategy expert. Return only valid JSON.', 600);
    const clean = raw.replace(/```json|```/g, '').trim();
    const identities = JSON.parse(clean);

    brand.identities = identities;
    await brand.save();

    await AiGenerate.create({ user_id: req.user._id, brand_id: brand._id, type: 'brand', prompt, result: identities, credits_used: COST });

    res.json({ status: 'success', message: 'Brand identities generated.', data: brand });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'AI generation failed. Please try again.' });
  }
};

// ── AI: Generate audience profile ─────────────────────────────────────────
exports.generateAudiences = async (req, res) => {
  try {
    const brand = await Brand.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!brand) return res.json({ status: 'error', message: 'Brand not found.' });

    const COST = 5;
    const remaining = await deductCredits(req.user._id, COST, 'AI audience generation', brand._id, 'Brand');
    if (remaining === false) return res.json({ status: 'error', message: 'Insufficient credits.' });

    const prompt = `Define 3 target audience personas for the brand "${brand.name}". Description: ${brand.description || 'N/A'}.
Return a JSON array of objects with: name (persona name), age_range, interests (array), pain_points (array), goals (array). Only valid JSON.`;

    const raw = await generateText(prompt, 'You are a market research expert. Return only valid JSON array.', 800);
    const clean = raw.replace(/```json|```/g, '').trim();
    const audiences = JSON.parse(clean);

    brand.audiences = audiences;
    await brand.save();
    await AiGenerate.create({ user_id: req.user._id, brand_id: brand._id, type: 'brand', prompt, result: audiences, credits_used: COST });

    res.json({ status: 'success', message: 'Audience profiles generated.', data: brand });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'AI generation failed.' });
  }
};

// ── AI: Generate brand voice ──────────────────────────────────────────────
exports.generateVoice = async (req, res) => {
  try {
    const brand = await Brand.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!brand) return res.json({ status: 'error', message: 'Brand not found.' });

    const COST = 5;
    const remaining = await deductCredits(req.user._id, COST, 'AI voice generation', brand._id, 'Brand');
    if (remaining === false) return res.json({ status: 'error', message: 'Insufficient credits.' });

    const prompt = `Define the brand voice for "${brand.name}". Description: ${brand.description || 'N/A'}.
Return a JSON object with: message (core brand message string), tones (object with tone names as keys, each having enabled:true/false and description string). Include: professional, friendly, humorous, bold, empathetic, authoritative. Only valid JSON.`;

    const raw = await generateText(prompt, 'You are a brand voice specialist. Return only valid JSON.', 600);
    const clean = raw.replace(/```json|```/g, '').trim();
    const voice = JSON.parse(clean);

    brand.voices = voice;
    await brand.save();
    await AiGenerate.create({ user_id: req.user._id, brand_id: brand._id, type: 'brand', prompt, result: voice, credits_used: COST });

    res.json({ status: 'success', message: 'Brand voice generated.', data: brand });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'AI generation failed.' });
  }
};

// ── AI: Generate social strategy ──────────────────────────────────────────
exports.generateStrategy = async (req, res) => {
  try {
    const brand = await Brand.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!brand) return res.json({ status: 'error', message: 'Brand not found.' });

    const COST = 10;
    const remaining = await deductCredits(req.user._id, COST, 'AI strategy generation', brand._id, 'Brand');
    if (remaining === false) return res.json({ status: 'error', message: 'Insufficient credits.' });

    const prompt = buildBrandSystemPrompt(brand) + `\n\nCreate a comprehensive social media strategy for this brand. 
Include: content pillars (3-4), posting frequency per platform, best posting times, content mix (educational/promotional/entertaining %), 
engagement tactics, and KPIs to track. Write as a structured markdown document.`;

    const strategy = await generateText(prompt, null, 1500);

    brand.strategy = strategy;
    await brand.save();
    await AiGenerate.create({ user_id: req.user._id, brand_id: brand._id, type: 'brand', prompt, result: strategy, credits_used: COST });

    res.json({ status: 'success', message: 'Strategy generated.', data: brand });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'AI generation failed.' });
  }
};

// ── AI: Generate slogan ───────────────────────────────────────────────────
exports.generateSlogan = async (req, res) => {
  try {
    const brand = await Brand.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!brand) return res.json({ status: 'error', message: 'Brand not found.' });

    const COST = 3;
    const remaining = await deductCredits(req.user._id, COST, 'AI slogan generation', brand._id, 'Brand');
    if (remaining === false) return res.json({ status: 'error', message: 'Insufficient credits.' });

    const prompt = `Generate 5 catchy slogans for the brand "${brand.name}". Description: ${brand.description || 'N/A'}.
Return a JSON array of 5 slogan strings. Only valid JSON.`;

    const raw = await generateText(prompt, 'You are a creative copywriter. Return only a JSON array of strings.', 400);
    const clean = raw.replace(/```json|```/g, '').trim();
    const slogans = JSON.parse(clean);

    await AiGenerate.create({ user_id: req.user._id, brand_id: brand._id, type: 'text', prompt, result: slogans, credits_used: COST });

    res.json({ status: 'success', data: slogans });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'AI generation failed.' });
  }
};
