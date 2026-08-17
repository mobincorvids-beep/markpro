const { Brand, BrandPost, BrandPostPlatform, UserPlatform, AiGenerate } = require('../../models/SocialAI.models');
const { generateText, generateImage, buildBrandSystemPrompt } = require('../../services/aiProviders.service');
const { publishPost } = require('../../services/saPublisher.service');
const { deductCredits } = require('../../utils/credits');

// ── List posts ────────────────────────────────────────────────────────────
exports.getPosts = async (req, res) => {
  try {
    const { brand_id, status, page = 1, limit = 20 } = req.query;
    const query = { user_id: req.user._id };
    if (brand_id) query.brand_id = brand_id;
    if (status)   query.status   = status;
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      BrandPost.find(query).sort({ createdAt: -1 }).skip(skip).limit(+limit)
        .populate('brand_id', 'name logo color'),
      BrandPost.countDocuments(query),
    ]);
    // Attach platforms to each post
    const postIds = posts.map(p => p._id);
    const platforms = await BrandPostPlatform.find({ brand_post_id: { $in: postIds } });
    const platMap = {};
    for (const pl of platforms) {
      if (!platMap[pl.brand_post_id]) platMap[pl.brand_post_id] = [];
      platMap[pl.brand_post_id].push(pl);
    }
    const data = posts.map(p => ({ ...p.toObject(), platforms: platMap[p._id] || [] }));
    res.json({ status: 'success', data, total, page: +page });
  } catch (err) { console.error(err); res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Get single post ───────────────────────────────────────────────────────
exports.getPost = async (req, res) => {
  try {
    const post = await BrandPost.findOne({ _id: req.params.id, user_id: req.user._id })
      .populate('brand_id');
    if (!post) return res.json({ status: 'error', message: 'Post not found.' });
    const platforms = await BrandPostPlatform.find({ brand_post_id: post._id });
    res.json({ status: 'success', data: { ...post.toObject(), platforms } });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Create post ───────────────────────────────────────────────────────────
exports.createPost = async (req, res) => {
  try {
    const { brand_id, title, input, image, platforms: platData = [] } = req.body;
    if (!brand_id || !title) return res.json({ status: 'error', message: 'brand_id and title are required.' });

    const brand = await Brand.findOne({ _id: brand_id, user_id: req.user._id });
    if (!brand) return res.json({ status: 'error', message: 'Brand not found.' });

    const post = await BrandPost.create({ brand_id, user_id: req.user._id, title, input, image });

    // Create per-platform entries
    if (platData.length) {
      for (const pl of platData) {
        await BrandPostPlatform.create({
          brand_post_id: post._id,
          platform:      pl.platform,
          content:       pl.content || '',
          media:         pl.media   || [],
          media_type:    pl.media_type || 'text',
          status:        pl.scheduled_at ? 'scheduled' : 'draft',
          scheduled_at:  pl.scheduled_at || null,
          user_platform_id: pl.user_platform_id || null,
        });
      }
    }

    res.json({ status: 'success', message: 'Post created.', data: post });
  } catch (err) { console.error(err); res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Update post ───────────────────────────────────────────────────────────
exports.updatePost = async (req, res) => {
  try {
    const { title, input, image, status } = req.body;
    const post = await BrandPost.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { title, input, image, status }, { new: true }
    );
    if (!post) return res.json({ status: 'error', message: 'Post not found.' });
    res.json({ status: 'success', message: 'Post updated.', data: post });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Update platform content ───────────────────────────────────────────────
exports.updatePlatformContent = async (req, res) => {
  try {
    const { platform_id, content, media, media_type, scheduled_at } = req.body;
    const pl = await BrandPostPlatform.findByIdAndUpdate(
      platform_id,
      { content, media, media_type, scheduled_at, status: scheduled_at ? 'scheduled' : 'draft' },
      { new: true }
    );
    if (!pl) return res.json({ status: 'error', message: 'Platform post not found.' });
    res.json({ status: 'success', data: pl });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── Delete post ───────────────────────────────────────────────────────────
exports.deletePost = async (req, res) => {
  try {
    const post = await BrandPost.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
    if (!post) return res.json({ status: 'error', message: 'Post not found.' });
    await BrandPostPlatform.deleteMany({ brand_post_id: post._id });
    res.json({ status: 'success', message: 'Post deleted.' });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// ── AI: Generate post content ─────────────────────────────────────────────
exports.generatePostContent = async (req, res) => {
  try {
    const { brand_id, platforms = [], input, tone, language } = req.body;
    if (!brand_id || !platforms.length)
      return res.json({ status: 'error', message: 'brand_id and platforms[] are required.' });

    const brand = await Brand.findOne({ _id: brand_id, user_id: req.user._id });
    if (!brand) return res.json({ status: 'error', message: 'Brand not found.' });

    const COST_PER_PLATFORM = 2;
    const totalCost = platforms.length * COST_PER_PLATFORM;
    const remaining = await deductCredits(req.user._id, totalCost, `AI post content for ${platforms.join(', ')}`, brand._id, 'Brand');
    if (remaining === false) return res.json({ status: 'error', message: 'Insufficient credits.' });

    const systemPrompt = buildBrandSystemPrompt(brand);
    const results = {};

    for (const platform of platforms) {
      const limits = {
        twitter:   '280 characters maximum',
        instagram: '2200 characters max, use relevant hashtags',
        facebook:  '500 characters ideal, engaging and shareable',
        linkedin:  '700 characters, professional tone',
        tiktok:    '150 characters, trendy and catchy',
      };
      const prompt = `Write a ${platform} post for: "${input || brand.name}".
Platform constraint: ${limits[platform] || 'engaging content'}.
${tone ? `Tone: ${tone}.` : ''}
${language ? `Language: ${language}.` : ''}
Return only the post content, no quotes, no labels.`;

      results[platform] = await generateText(prompt, systemPrompt, 400);
    }

    await AiGenerate.create({
      user_id: req.user._id, brand_id: brand._id,
      type: 'text', prompt: input,
      result: results, credits_used: totalCost,
    });

    res.json({ status: 'success', data: results });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'AI generation failed.' });
  }
};

// ── AI: Generate post image ───────────────────────────────────────────────
exports.generatePostImage = async (req, res) => {
  try {
    const { prompt, style, size = '1024x1024' } = req.body;
    if (!prompt) return res.json({ status: 'error', message: 'Prompt is required.' });

    if (!(req.user.plan_data?.image_generation))
      return res.json({ status: 'error', message: 'Your plan does not include image generation.' });

    const COST = 10;
    const remaining = await deductCredits(req.user._id, COST, 'AI image generation');
    if (remaining === false) return res.json({ status: 'error', message: 'Insufficient credits.' });

    const fullPrompt = style ? `${prompt}, ${style} style` : prompt;
    const urls = await generateImage(fullPrompt, size);

    await AiGenerate.create({ user_id: req.user._id, type: 'image', prompt: fullPrompt, result: urls, credits_used: COST });

    res.json({ status: 'success', data: urls });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Image generation failed.' });
  }
};

// ── Publish post now ──────────────────────────────────────────────────────
exports.publishNow = async (req, res) => {
  try {
    const { platform_id } = req.body;
    const pl = await BrandPostPlatform.findById(platform_id);
    if (!pl) return res.json({ status: 'error', message: 'Platform post not found.' });

    const userPlatform = await UserPlatform.findById(pl.user_platform_id);
    if (!userPlatform) return res.json({ status: 'error', message: 'Social account not connected.' });

    const result = await publishPost(
      pl.platform,
      userPlatform.access_token,
      pl.content,
      pl.media,
      { platform_id: userPlatform.platform_id, page_id: userPlatform.meta?.page_id }
    );

    if (result.success) {
      pl.status       = 'published';
      pl.published_at = new Date();
      pl.data         = { ...pl.data, post_id: result.post_id };
      await pl.save();

      // Update parent post status if all platforms published
      const allPlats = await BrandPostPlatform.find({ brand_post_id: pl.brand_post_id });
      const allDone  = allPlats.every(p => p.status === 'published');
      if (allDone) await BrandPost.findByIdAndUpdate(pl.brand_post_id, { status: 'published' });

      return res.json({ status: 'success', message: 'Post published successfully!', data: pl });
    } else {
      pl.status = 'failed';
      pl.error  = result.error;
      await pl.save();
      return res.json({ status: 'error', message: `Publish failed: ${result.error}` });
    }
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Server error.' });
  }
};

// ── Calendar view ─────────────────────────────────────────────────────────
exports.getCalendar = async (req, res) => {
  try {
    const { month, year } = req.query;
    const start = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
    const end   = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

    const platforms = await BrandPostPlatform.find({
      scheduled_at: { $gte: start, $lte: end },
    }).populate({ path: 'brand_post_id', match: { user_id: req.user._id }, populate: { path: 'brand_id', select: 'name color' } });

    const events = platforms.filter(p => p.brand_post_id).map(p => ({
      id:           p._id,
      title:        p.brand_post_id.title,
      platform:     p.platform,
      status:       p.status,
      scheduled_at: p.scheduled_at,
      brand:        p.brand_post_id.brand_id,
    }));

    res.json({ status: 'success', data: events });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};
