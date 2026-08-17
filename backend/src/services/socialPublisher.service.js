const axios = require('axios');

/**
 * Publish a post to a connected social account.
 * Returns { success, postId, url, error }
 */
async function publishToAccount(account, postData) {
  const { content, mediaUrls = [], link } = postData;

  try {
    switch (account.platform) {
      case 'facebook':   return await publishToFacebook(account, content, mediaUrls, link);
      case 'instagram':  return await publishToInstagram(account, content, mediaUrls);
      case 'twitter':    return await publishToTwitter(account, content, mediaUrls);
      case 'linkedin':   return await publishToLinkedIn(account, content, mediaUrls);
      case 'tiktok':     return await publishToTikTok(account, content, mediaUrls);
      case 'youtube':    return await publishToYouTube(account, content, mediaUrls);
      case 'threads':    return await publishToThreads(account, content, mediaUrls);
      default:           return { success: false, error: `Platform "${account.platform}" not supported` };
    }
  } catch (e) {
    return { success: false, error: e.response?.data?.error?.message || e.response?.data?.message || e.message };
  }
}

// ── Facebook ──────────────────────────────────────
async function publishToFacebook(account, content, mediaUrls) {
  const pageId    = account.pageId || account.accountId;
  const pageToken = account.pageToken || account.accessToken;

  if (mediaUrls.length > 0) {
    // Upload photo then post
    const { data: photo } = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/photos`, {
      url: mediaUrls[0], caption: content, access_token: pageToken, published: true,
    });
    const postId = photo.post_id || photo.id;
    return { success: true, postId, url: `https://facebook.com/${postId}` };
  } else {
    const { data } = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
      message: content, access_token: pageToken,
    });
    return { success: true, postId: data.id, url: `https://facebook.com/${data.id}` };
  }
}

// ── Instagram ─────────────────────────────────────
async function publishToInstagram(account, content, mediaUrls) {
  const igAccountId = account.accountId;
  const token       = account.accessToken;

  if (!mediaUrls.length) return { success: false, error: 'Instagram requires at least one image' };

  // Step 1: Create container
  const { data: container } = await axios.post(
    `https://graph.facebook.com/v18.0/${igAccountId}/media`,
    { image_url: mediaUrls[0], caption: content, access_token: token }
  );
  // Step 2: Publish
  const { data: pub } = await axios.post(
    `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
    { creation_id: container.id, access_token: token }
  );
  return { success: true, postId: pub.id, url: `https://instagram.com/p/${pub.id}` };
}

// ── Twitter / X ────────────────────────────────────
async function publishToTwitter(account, content) {
  // Twitter v2 API
  const { data } = await axios.post('https://api.twitter.com/2/tweets',
    { text: content.slice(0, 280) },
    { headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' } }
  );
  const tweetId = data.data?.id;
  return { success: true, postId: tweetId, url: `https://twitter.com/i/web/status/${tweetId}` };
}

// ── LinkedIn ──────────────────────────────────────
async function publishToLinkedIn(account, content) {
  const urn    = `urn:li:person:${account.accountId}`;
  const { data } = await axios.post('https://api.linkedin.com/v2/ugcPosts', {
    author: urn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }, { headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' } });

  const postId = data.id;
  return { success: true, postId, url: `https://linkedin.com/feed/update/${postId}` };
}

// ── TikTok ────────────────────────────────────────
async function publishToTikTok(account, content, mediaUrls) {
  // TikTok Content Posting API (video required)
  // Using share API as fallback
  return { success: false, error: 'TikTok posting requires video upload - feature coming soon. Post was saved as draft.' };
}

// ── YouTube ───────────────────────────────────────
async function publishToYouTube(account, content, mediaUrls) {
  // YouTube Data API v3 - video required for posting
  return { success: false, error: 'YouTube posting requires video upload - feature coming soon. Post was saved as draft.' };
}

// ── Threads ───────────────────────────────────────
async function publishToThreads(account, content, mediaUrls) {
  // Threads API (similar to Instagram)
  const { data: container } = await axios.post(
    `https://graph.threads.net/v1.0/${account.accountId}/threads`,
    {
      media_type: mediaUrls.length ? 'IMAGE' : 'TEXT',
      text: content,
      ...(mediaUrls.length ? { image_url: mediaUrls[0] } : {}),
      access_token: account.accessToken,
    }
  );
  const { data: pub } = await axios.post(
    `https://graph.threads.net/v1.0/${account.accountId}/threads_publish`,
    { creation_id: container.id, access_token: account.accessToken }
  );
  return { success: true, postId: pub.id, url: `https://threads.net/@${account.accountHandle}/post/${pub.id}` };
}

// ── Webhook trigger ───────────────────────────────
async function triggerWebhooks(webhooks, event, payload) {
  for (const wh of webhooks) {
    if (!wh.active || !wh.events.includes(event)) continue;
    try {
      await axios.post(wh.url, { event, data: payload, timestamp: new Date() }, {
        headers: { 'Content-Type': 'application/json', 'X-BeePost-Event': event, 'X-BeePost-Secret': wh.secret },
        timeout: 8000,
      });
    } catch {}
  }
}

module.exports = { publishToAccount, triggerWebhooks };
