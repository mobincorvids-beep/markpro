const axios = require('axios');
const Parser = require('rss-parser');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 300 });
const rssParser = new Parser({ timeout: 10000 });

// ──────────────────────────────────────────────
// TWITTER / X  (Bearer token, public timelines)
// ──────────────────────────────────────────────
async function fetchTwitter(account) {
  const cacheKey = `twitter_${account.accountId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const url = `https://api.twitter.com/2/users/by/username/${account.accountId}`;
  const { data: userData } = await axios.get(url, {
    headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
  });
  const userId = userData.data.id;

  const tweetsUrl = `https://api.twitter.com/2/users/${userId}/tweets?tweet.fields=created_at,public_metrics,attachments,text&expansions=attachments.media_keys&media.fields=url,preview_image_url,type&max_results=20`;
  const { data: tweetsData } = await axios.get(tweetsUrl, {
    headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
  });

  const mediaMap = {};
  (tweetsData.includes?.media || []).forEach((m) => { mediaMap[m.media_key] = m; });

  const posts = (tweetsData.data || []).map((tweet) => {
    const mediaKeys = tweet.attachments?.media_keys || [];
    const media = mediaKeys.map((k) => mediaMap[k]).filter(Boolean);
    const images = media.filter((m) => m.type === 'photo').map((m) => m.url);
    const video = media.find((m) => m.type === 'video' || m.type === 'animated_gif');

    return {
      postId: tweet.id,
      network: 'twitter',
      text: tweet.text,
      mediaType: video ? 'video' : images.length ? 'image' : 'none',
      mediaUrls: images,
      thumbnailUrl: video?.preview_image_url || images[0] || '',
      link: `https://twitter.com/${account.accountId}/status/${tweet.id}`,
      authorName: account.label,
      authorUsername: account.accountId,
      likes: tweet.public_metrics?.like_count || 0,
      comments: tweet.public_metrics?.reply_count || 0,
      shares: tweet.public_metrics?.retweet_count || 0,
      publishedAt: new Date(tweet.created_at),
    };
  });

  cache.set(cacheKey, posts);
  return posts;
}

// ──────────────────────────────────────────────
// FACEBOOK (Graph API)
// ──────────────────────────────────────────────
async function fetchFacebook(account) {
  const cacheKey = `facebook_${account.accountId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const token = account.accessToken || process.env.FACEBOOK_ACCESS_TOKEN;
  const fields = 'id,message,story,full_picture,permalink_url,created_time,reactions.summary(true),comments.summary(true),shares,attachments';
  const url = `https://graph.facebook.com/v18.0/${account.accountId}/posts?fields=${fields}&limit=20&access_token=${token}`;

  const { data } = await axios.get(url);
  const posts = (data.data || []).map((post) => {
    const attachment = post.attachments?.data?.[0];
    const mediaType = attachment?.type === 'video' ? 'video' : post.full_picture ? 'image' : 'none';

    return {
      postId: post.id,
      network: 'facebook',
      text: post.message || post.story || '',
      mediaType,
      mediaUrls: post.full_picture ? [post.full_picture] : [],
      thumbnailUrl: post.full_picture || '',
      link: post.permalink_url,
      authorName: account.label,
      authorUsername: account.accountId,
      likes: post.reactions?.summary?.total_count || 0,
      comments: post.comments?.summary?.total_count || 0,
      shares: post.shares?.count || 0,
      publishedAt: new Date(post.created_time),
    };
  });

  cache.set(cacheKey, posts);
  return posts;
}

// ──────────────────────────────────────────────
// INSTAGRAM (Basic Display API / Graph API)
// ──────────────────────────────────────────────
async function fetchInstagram(account) {
  const cacheKey = `instagram_${account.accountId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const token = account.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,username';
  const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=20&access_token=${token}`;

  const { data } = await axios.get(url);
  const posts = (data.data || []).map((item) => ({
    postId: item.id,
    network: 'instagram',
    text: item.caption || '',
    mediaType: item.media_type === 'VIDEO' ? 'video' : item.media_type === 'CAROUSEL_ALBUM' ? 'gallery' : 'image',
    mediaUrls: [item.media_url].filter(Boolean),
    thumbnailUrl: item.thumbnail_url || item.media_url || '',
    link: item.permalink,
    authorName: account.label,
    authorUsername: item.username || account.accountId,
    likes: item.like_count || 0,
    comments: item.comments_count || 0,
    publishedAt: new Date(item.timestamp),
  }));

  cache.set(cacheKey, posts);
  return posts;
}

// ──────────────────────────────────────────────
// YOUTUBE (Data API v3)
// ──────────────────────────────────────────────
async function fetchYouTube(account) {
  const cacheKey = `youtube_${account.accountId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const apiKey = process.env.YOUTUBE_API_KEY;
  // account.accountId can be a channel ID or a @handle
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${account.accountId}&maxResults=20&order=date&type=video&key=${apiKey}`;

  const { data } = await axios.get(searchUrl);
  const posts = (data.items || []).map((item) => ({
    postId: item.id.videoId,
    network: 'youtube',
    text: item.snippet.title,
    html: `<p>${item.snippet.description}</p>`,
    mediaType: 'video',
    mediaUrls: [],
    thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
    link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    authorName: item.snippet.channelTitle,
    authorUsername: account.accountId,
    publishedAt: new Date(item.snippet.publishedAt),
  }));

  cache.set(cacheKey, posts);
  return posts;
}

// ──────────────────────────────────────────────
// REDDIT  (public JSON API, no auth needed)
// ──────────────────────────────────────────────
async function fetchReddit(account) {
  const cacheKey = `reddit_${account.accountId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  // accountId = subreddit name (e.g. "technology") OR "u/username"
  const path = account.accountId.startsWith('u/')
    ? `user/${account.accountId.slice(2)}/submitted`
    : `r/${account.accountId}/new`;

  const url = `https://www.reddit.com/${path}.json?limit=20`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'SocialStream/1.0' },
  });

  const posts = (data.data?.children || []).map((child) => {
    const p = child.data;
    const isImage = p.post_hint === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(p.url);
    const isVideo = p.is_video || p.post_hint === 'hosted:video';

    return {
      postId: p.id,
      network: 'reddit',
      text: p.title,
      html: p.selftext_html || '',
      mediaType: isVideo ? 'video' : isImage ? 'image' : p.url ? 'link' : 'none',
      mediaUrls: isImage ? [p.url] : [],
      thumbnailUrl: p.thumbnail && p.thumbnail.startsWith('http') ? p.thumbnail : '',
      link: `https://www.reddit.com${p.permalink}`,
      authorName: p.author,
      authorUsername: p.author,
      likes: p.score || 0,
      comments: p.num_comments || 0,
      publishedAt: new Date(p.created_utc * 1000),
    };
  });

  cache.set(cacheKey, posts);
  return posts;
}

// ──────────────────────────────────────────────
// RSS Feed
// ──────────────────────────────────────────────
async function fetchRSS(account) {
  const cacheKey = `rss_${account.accountId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const feed = await rssParser.parseURL(account.accountId);
  const posts = (feed.items || []).slice(0, 20).map((item) => {
    // Try to extract an image from content
    const imgMatch = (item.content || item['content:encoded'] || '').match(/<img[^>]+src=["']([^"']+)["']/);
    const imgUrl = imgMatch ? imgMatch[1] : '';

    return {
      postId: item.guid || item.link || item.title,
      network: 'rss',
      text: item.title || '',
      html: item.content || item['content:encoded'] || item.contentSnippet || '',
      mediaType: imgUrl ? 'image' : 'link',
      mediaUrls: imgUrl ? [imgUrl] : [],
      thumbnailUrl: imgUrl,
      link: item.link || '',
      authorName: item.creator || feed.title || account.label,
      authorUsername: account.label,
      tags: item.categories || [],
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    };
  });

  cache.set(cacheKey, posts);
  return posts;
}

// ──────────────────────────────────────────────
// DISPATCHER
// ──────────────────────────────────────────────
async function fetchPostsForAccount(account) {
  try {
    switch (account.network) {
      case 'twitter':   return await fetchTwitter(account);
      case 'facebook':  return await fetchFacebook(account);
      case 'instagram': return await fetchInstagram(account);
      case 'youtube':   return await fetchYouTube(account);
      case 'reddit':    return await fetchReddit(account);
      case 'rss':       return await fetchRSS(account);
      default:          return [];
    }
  } catch (err) {
    console.error(`[fetchPostsForAccount] ${account.network}/${account.accountId}: ${err.message}`);
    return [];
  }
}

function clearCacheForAccount(account) {
  cache.del(`${account.network}_${account.accountId}`);
}

module.exports = { fetchPostsForAccount, clearCacheForAccount };
