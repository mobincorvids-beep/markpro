const axios = require('axios');

/**
 * Publish a post to a social platform.
 * Returns { success, post_id, error }.
 */
exports.publishPost = async (platform, accessToken, content, media = [], meta = {}) => {
  try {
    switch (platform) {
      case 'facebook':  return await publishFacebook(accessToken, content, media, meta);
      case 'twitter':   return await publishTwitter(accessToken, content, media, meta);
      case 'linkedin':  return await publishLinkedIn(accessToken, content, media, meta);
      case 'instagram': return await publishInstagram(accessToken, content, media, meta);
      case 'tiktok':    return await publishTikTok(accessToken, content, media, meta);
      default:          return { success: false, error: `Unknown platform: ${platform}` };
    }
  } catch (err) {
    return { success: false, error: err.response?.data?.error?.message || err.message };
  }
};

// ── Facebook ──────────────────────────────────────────────────────────────
async function publishFacebook(accessToken, content, media, meta) {
  const pageId = meta.page_id || meta.platform_id;
  if (!pageId) return { success: false, error: 'Facebook page ID required.' };

  let endpoint = `https://graph.facebook.com/v19.0/${pageId}`;
  const body = { message: content, access_token: accessToken };

  if (media && media.length) {
    // Photo post
    endpoint += '/photos';
    body.url = media[0];
  } else {
    endpoint += '/feed';
  }

  const res = await axios.post(endpoint, body);
  return { success: true, post_id: res.data.id || res.data.post_id };
}

// ── Twitter / X ───────────────────────────────────────────────────────────
async function publishTwitter(accessToken, content, media, meta) {
  const body = { text: content };
  const res = await axios.post('https://api.twitter.com/2/tweets', body, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  return { success: true, post_id: res.data.data?.id };
}

// ── LinkedIn ──────────────────────────────────────────────────────────────
async function publishLinkedIn(accessToken, content, media, meta) {
  const urn = meta.platform_id ? `urn:li:person:${meta.platform_id}` : null;
  if (!urn) return { success: false, error: 'LinkedIn person URN required.' };

  const body = {
    author: urn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const res = await axios.post('https://api.linkedin.com/v2/ugcPosts', body, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
  });
  return { success: true, post_id: res.headers['x-restli-id'] };
}

// ── Instagram (Graph API via Facebook) ───────────────────────────────────
async function publishInstagram(accessToken, content, media, meta) {
  const igUserId = meta.platform_id;
  if (!igUserId) return { success: false, error: 'Instagram user ID required.' };
  if (!media || !media.length) return { success: false, error: 'Instagram posts require at least one image.' };

  // Step 1: Create media container
  const containerRes = await axios.post(
    `https://graph.facebook.com/v19.0/${igUserId}/media`,
    { image_url: media[0], caption: content, access_token: accessToken }
  );
  const containerId = containerRes.data.id;

  // Step 2: Publish container
  const publishRes = await axios.post(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
    { creation_id: containerId, access_token: accessToken }
  );
  return { success: true, post_id: publishRes.data.id };
}

// ── TikTok ────────────────────────────────────────────────────────────────
async function publishTikTok(accessToken, content, media, meta) {
  // TikTok requires video; text-only posts are limited
  // This uses TikTok Content Posting API v2
  const body = {
    post_info: { title: content.slice(0, 100), privacy_level: 'PUBLIC_TO_EVERYONE', disable_duet: false, disable_comment: false, disable_stitch: false },
    source_info: { source: 'PULL_FROM_URL', video_url: media[0], },
  };
  const res = await axios.post('https://open.tiktokapis.com/v2/post/publish/video/init/', body, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
  });
  return { success: true, post_id: res.data.data?.publish_id };
}

// ── OAuth URL builders ────────────────────────────────────────────────────
exports.getOAuthUrl = (platform) => {
  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI)}&scope=pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish&response_type=code`;
    case 'twitter':
      return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.TWITTER_REDIRECT_URI)}&scope=tweet.read+tweet.write+users.read+offline.access&state=state&code_challenge=challenge&code_challenge_method=plain`;
    case 'linkedin':
      return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI)}&scope=openid%20profile%20email%20w_member_social`;
    case 'tiktok':
      return `https://www.tiktok.com/v2/auth/authorize?client_key=${process.env.TIKTOK_CLIENT_KEY}&redirect_uri=${encodeURIComponent(process.env.TIKTOK_REDIRECT_URI)}&response_type=code&scope=user.info.basic,video.publish,video.upload`;
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
};
