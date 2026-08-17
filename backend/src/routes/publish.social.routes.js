const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const SocialAccount = require('../models/BPSocialAccount.model');
const { protect } = require('../middleware/auth.middleware');

const ok  = (res, d)        => res.json({ success: true, ...d });
const err = (res, m, s=400) => res.status(s).json({ success: false, message: m });

// GET /api/social/accounts - list connected accounts
router.get('/accounts', protect, async (req, res) => {
  try {
    const accounts = await SocialAccount.find({ user: req.user._id, active: true }).sort({ platform: 1 });
    ok(res, { accounts });
  } catch (e) { err(res, e.message, 500); }
});

// DELETE /api/social/accounts/:id - disconnect
router.delete('/accounts/:id', protect, async (req, res) => {
  try {
    const acc = await SocialAccount.findOne({ _id: req.params.id, user: req.user._id });
    if (!acc) return err(res, 'Account not found', 404);
    await acc.deleteOne();
    ok(res, { message: 'Account disconnected' });
  } catch (e) { err(res, e.message, 500); }
});

// ── OAuth flow helpers ────────────────────────────

// GET /api/social/oauth/:platform - get OAuth URL
router.get('/oauth/:platform', protect, (req, res) => {
  const { platform } = req.params;
  const state = Buffer.from(JSON.stringify({ userId: req.user._id, platform })).toString('base64');
  let url;

  switch (platform) {
    case 'facebook':
      url = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${process.env.FACEBOOK_APP_ID}&` +
        `redirect_uri=${encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI)}&` +
        `scope=pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish&` +
        `state=${state}`;
      break;
    case 'twitter':
      url = `https://twitter.com/i/oauth2/authorize?` +
        `response_type=code&client_id=${process.env.TWITTER_API_KEY}&` +
        `redirect_uri=${encodeURIComponent(process.env.TWITTER_REDIRECT_URI)}&` +
        `scope=tweet.read+tweet.write+users.read+offline.access&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
      break;
    case 'linkedin':
      url = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI)}&` +
        `scope=r_liteprofile+w_member_social&state=${state}`;
      break;
    case 'tiktok':
      url = `https://www.tiktok.com/auth/authorize/?` +
        `client_key=${process.env.TIKTOK_CLIENT_KEY}&scope=user.info.basic,video.publish&` +
        `response_type=code&redirect_uri=${encodeURIComponent(process.env.TIKTOK_REDIRECT_URI)}&state=${state}`;
      break;
    case 'youtube':
      url = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.YOUTUBE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.YOUTUBE_REDIRECT_URI)}&` +
        `response_type=code&scope=https://www.googleapis.com/auth/youtube.upload+https://www.googleapis.com/auth/youtube.readonly&` +
        `access_type=offline&state=${state}`;
      break;
    default:
      return err(res, 'Unsupported platform');
  }
  ok(res, { url });
});

// GET /api/social/oauth/facebook/callback
router.get('/oauth/facebook/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    // Exchange code for token
    const { data: tokenData } = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
        code,
      },
    });
    const accessToken = tokenData.access_token;

    // Get user info
    const { data: me } = await axios.get(`https://graph.facebook.com/me?fields=id,name,picture&access_token=${accessToken}`);

    // Get Pages
    const { data: pagesData } = await axios.get(`https://graph.facebook.com/me/accounts?access_token=${accessToken}`);
    const pages = pagesData.data || [];

    // Save each page as a social account
    for (const page of pages) {
      await SocialAccount.findOneAndUpdate(
        { user: userId, platform: 'facebook', accountId: page.id },
        {
          user: userId, platform: 'facebook', accountId: page.id,
          accountName: page.name, accountType: 'page',
          accessToken: accessToken, pageId: page.id, pageToken: page.access_token,
          active: true,
        },
        { upsert: true, new: true }
      );
    }

    // Also save personal account
    await SocialAccount.findOneAndUpdate(
      { user: userId, platform: 'facebook', accountId: me.id },
      {
        user: userId, platform: 'facebook', accountId: me.id,
        accountName: me.name, avatar: me.picture?.data?.url || '',
        accountType: 'personal', accessToken, active: true,
      },
      { upsert: true, new: true }
    );

    res.redirect(`${process.env.FRONTEND_URL}/social?connected=facebook`);
  } catch (e) {
    res.redirect(`${process.env.FRONTEND_URL}/social?error=${encodeURIComponent(e.message)}`);
  }
});

// GET /api/social/oauth/twitter/callback
router.get('/oauth/twitter/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    const { data: tokenData } = await axios.post('https://api.twitter.com/2/oauth2/token', {
      code, grant_type: 'authorization_code',
      client_id: process.env.TWITTER_API_KEY,
      redirect_uri: process.env.TWITTER_REDIRECT_URI,
      code_verifier: 'challenge',
    }, {
      auth: { username: process.env.TWITTER_API_KEY, password: process.env.TWITTER_API_SECRET },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { data: me } = await axios.get('https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    await SocialAccount.findOneAndUpdate(
      { user: userId, platform: 'twitter', accountId: me.data.id },
      {
        user: userId, platform: 'twitter', accountId: me.data.id,
        accountName: me.data.name, accountHandle: `@${me.data.username}`,
        avatar: me.data.profile_image_url,
        followers: me.data.public_metrics?.followers_count || 0,
        accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token || '',
        active: true,
      },
      { upsert: true, new: true }
    );

    res.redirect(`${process.env.FRONTEND_URL}/social?connected=twitter`);
  } catch (e) {
    res.redirect(`${process.env.FRONTEND_URL}/social?error=${encodeURIComponent(e.message)}`);
  }
});

// GET /api/social/oauth/linkedin/callback
router.get('/oauth/linkedin/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    const { data: tokenData } = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code', code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      },
    });

    const { data: me } = await axios.get('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    await SocialAccount.findOneAndUpdate(
      { user: userId, platform: 'linkedin', accountId: me.id },
      {
        user: userId, platform: 'linkedin', accountId: me.id,
        accountName: `${me.localizedFirstName} ${me.localizedLastName}`,
        accessToken: tokenData.access_token, active: true,
      },
      { upsert: true, new: true }
    );

    res.redirect(`${process.env.FRONTEND_URL}/social?connected=linkedin`);
  } catch (e) {
    res.redirect(`${process.env.FRONTEND_URL}/social?error=${encodeURIComponent(e.message)}`);
  }
});

// POST /api/social/accounts/manual - add account manually (for testing/demo)
router.post('/accounts/manual', protect, async (req, res) => {
  try {
    const { platform, accountName, accountHandle, accessToken, accountId } = req.body;
    if (!platform || !accountName) return err(res, 'Platform and account name required');

    const plan = req.user.plan;
    if (plan && plan.socialProfiles > 0) {
      const count = await SocialAccount.countDocuments({ user: req.user._id, active: true });
      if (count >= plan.socialProfiles)
        return err(res, `Social profile limit reached (${plan.socialProfiles} profiles on your plan)`);
    }

    const account = await SocialAccount.findOneAndUpdate(
      { user: req.user._id, platform, accountId: accountId || accountName },
      {
        user: req.user._id, platform,
        accountId: accountId || accountName,
        accountName, accountHandle: accountHandle || '',
        accessToken: accessToken || '', active: true,
      },
      { upsert: true, new: true }
    );
    ok(res, { account });
  } catch (e) { err(res, e.message, 500); }
});


// GET /api/publish/social/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const User = require('../models/User.model');
    const user = await User.findById(req.user._id).select('-password').populate('plan');
    ok(res, { profile: user });
  } catch (e) { err(res, e.message, 500); }
});

// PUT /api/publish/social/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const User = require('../models/User.model');
    const allowed = ['name', 'avatar', 'preferences', 'timezone', 'language'];
    const upd = {};
    for (const k of allowed) if (req.body[k] !== undefined) upd[k] = req.body[k];
    const user = await User.findByIdAndUpdate(req.user._id, upd, { new: true }).select('-password').populate('plan');
    ok(res, { profile: user });
  } catch (e) { err(res, e.message, 500); }
});

module.exports = router;
