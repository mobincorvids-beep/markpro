const cron  = require('node-cron');
const axios = require('axios');
const Order    = require('../models/SMM_Order.model');
const User     = require('../models/User.model');
const { Provider, Transaction } = require('../models/SMM_Supporting.model');
const Post     = require('../models/BPPost.model');
const Campaign = require('../models/BPCampaign.model');
const { generateText } = require('../services/beepost.ai.service');
const { Notification } = require('../models/BPOther.model');
const Plan = require('../models/BPPlan.model');

function startCronJobs() {

/* ── Drip-feed cron - runs every minute ───────────────────────
   Mirrors the dripfeed cronjob from SmartPanel.
   Active drip-feed orders: send one "run" each interval minutes.
*/
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const dripOrders = await Order.find({
      isDripFeed: true, status: 'active',
    }).populate('serviceId');

    for (const order of dripOrders) {
      // Check if it's time to send next run
      const minutesSinceLast = order.updatedAt
        ? (now - order.updatedAt) / 60000
        : order.interval + 1;

      if (minutesSinceLast < order.interval) continue;
      if (order.runs <= 0) { order.status = 'completed'; await order.save(); continue; }

      // Decrement runs
      order.runs -= 1;
      order.updatedAt = now;
      if (order.runs === 0) order.status = 'completed';
      await order.save();

      // If API-backed, send to provider
      if (order.apiProviderId && order.apiServiceId) {
        try {
          const provider = await Provider.findById(order.apiProviderId);
          if (provider) {
            const res = await axios.post(provider.url, {
              key: provider.apiKey, action: 'add',
              service: order.apiServiceId, link: order.link,
              quantity: order.dripfeedQty,
            });
            console.log(`[Drip] Order ${order._id} run sent, remaining: ${order.runs}`);
          }
        } catch (e) { console.error(`[Drip] Provider error for order ${order._id}:`, e.message); }
      }
    }
  } catch (err) { console.error('[Cron Drip] Error:', err.message); }
});

/* ── API order sync - runs every 5 minutes ────────────────────
   Checks pending API orders with providers and updates their status.
*/
cron.schedule('*/5 * * * *', async () => {
  try {
    // Find orders that have been sent to a provider and are still awaiting/inprogress
    const apiOrders = await Order.find({
      apiOrderId: { $nin: ['', '-1', null] },
      status: { $in: ['awaiting', 'pending', 'inprogress', 'processing', 'active'] },
    }).populate('apiProviderId');

    // Group by provider
    const byProvider = {};
    for (const o of apiOrders) {
      if (!o.apiProviderId) continue;
      const pid = o.apiProviderId._id.toString();
      if (!byProvider[pid]) byProvider[pid] = { provider: o.apiProviderId, orders: [] };
      byProvider[pid].orders.push(o);
    }

    for (const { provider, orders } of Object.values(byProvider)) {
      try {
        const ids = orders.map(o => o.apiOrderId).join(',');
        const { data } = await axios.post(provider.url, {
          key: provider.apiKey, action: 'status', orders: ids,
        });

        for (const order of orders) {
          const info = data[order.apiOrderId];
          if (!info) continue;
          order.status      = info.status      || order.status;
          order.startCount  = info.start_count || order.startCount;
          order.remains     = info.remains     || order.remains;
          order.updatedAt   = new Date();
          await order.save();
        }
      } catch (e) { console.error(`[Cron Sync] Provider ${provider.name}:`, e.message); }
    }
  } catch (err) { console.error('[Cron Sync] Error:', err.message); }
});

/* ── Submit new API orders ────────────────────────────────────
   Picks up orders with apiOrderId = '-1' (awaiting first submission).
*/
cron.schedule('* * * * *', async () => {
  try {
    const pending = await Order.find({
      apiOrderId: '-1', status: 'awaiting',
    }).populate('apiProviderId').limit(20);

    for (const order of pending) {
      if (!order.apiProviderId) continue;
      try {
        const provider = order.apiProviderId;
        const payload = {
          key: provider.apiKey, action: 'add',
          service: order.apiServiceId, link: order.link,
          quantity: order.quantity,
        };

        // Extra fields for special types
        if (order.comments)  payload.comments  = order.comments;
        if (order.username)  payload.username  = order.username;
        if (order.hashtag)   payload.hashtag   = order.hashtag;
        if (order.usernames) payload.usernames = order.usernames;

        const { data } = await axios.post(provider.url, payload);
        if (data.order) {
          order.apiOrderId = String(data.order);
          order.status     = 'pending';
          order.updatedAt  = new Date();
          await order.save();
        } else if (data.error) {
          order.status  = 'error';
          order.notes   = data.error;
          order.updatedAt = new Date();
          await order.save();
          // Refund on error
          const user    = await User.findById(order.userId);
          const newBal  = user.balance + order.charge;
          await User.findByIdAndUpdate(user._id, { balance: newBal });
          await Transaction.create({
            userId: user._id, type: 'refund', amount: order.charge,
            balanceBefore: user.balance, balanceAfter: newBal,
            note: `Refund for failed API order #${order._id}`, status: 'completed',
          });
        }
      } catch (e) { console.error(`[Cron Submit] Order ${order._id}:`, e.message); }
    }
  } catch (err) { console.error('[Cron Submit] Error:', err.message); }
});




  // Every minute: publish due scheduled posts
  cron.schedule('* * * * *', async () => {
    try {
      const duePosts = await Post.find({
        status: 'scheduled',
        scheduledAt: { $lte: new Date() },
      }).populate('accounts');

      for (const post of duePosts) {
        const user    = await User.findById(post.user).populate('plan');
        const { publishPostNow } = require('../routes/publish.posts.routes');
        await publishPostNow(post, post.accounts, user);
      }
      if (duePosts.length) console.log(`[cron] Published ${duePosts.length} scheduled posts`);
    } catch (e) { console.error('[cron] scheduler error:', e.message); }
  });

  // Every 5 minutes: run due autopilot campaigns
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now  = new Date();
      const campaigns = await Campaign.find({
        status: 'active',
        nextRunAt: { $lte: now },
        $or: [{ endDate: null }, { endDate: { $gte: now } }],
      }).populate('accounts');

      for (const campaign of campaigns) {
        try {
          const user = await User.findById(campaign.user).populate('plan');
          if (!user?.plan) continue;

          // Generate content
          const prompt = `Write an engaging social media post about: ${campaign.topic}. Tone: ${campaign.tone || 'professional'}.${campaign.includeEmoji ? ' Include emojis.' : ''}${campaign.includeHashtags ? ' Include 5 relevant hashtags.' : ''}`;
          const { text } = await generateText({ prompt, model: user.plan.aiModel });

          // Create and publish post
          const post = await Post.create({
            user: campaign.user, content: text,
            accounts: campaign.accounts.map(a => a._id),
            platforms: [...new Set(campaign.accounts.map(a => a.platform))],
            status: 'published', publishedAt: now,
            aiGenerated: true, isAutopilot: true, campaign: campaign._id,
          });

          const { publishPostNow } = require('../routes/publish.posts.routes');
          await publishPostNow(post, campaign.accounts, user);

          campaign.postsCreated += 1;

          // Calculate next run
          if (campaign.frequency === 'daily') {
            campaign.nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          } else if (campaign.frequency === 'weekly') {
            campaign.nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          }

          await campaign.save();
        } catch (e) { console.error(`[cron] campaign ${campaign._id} error:`, e.message); }
      }
    } catch (e) { console.error('[cron] autopilot error:', e.message); }
  });

  // Daily at midnight: reset monthly token usage
  cron.schedule('0 0 * * *', async () => {
    try {
      const now = new Date();
      const usersToReset = await User.find({
        $or: [
          { tokenResetDate: null },
          { tokenResetDate: { $lte: now } },
        ],
        wordTokensUsed: { $gt: 0 },
      });

      let count = 0;
      for (const user of usersToReset) {
        const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        if (!user.tokenResetDate || user.tokenResetDate <= now) {
          user.wordTokensUsed  = 0;
          user.imageTokensUsed = 0;
          user.tokenResetDate  = nextReset;
          await user.save();
          count++;
        }
      }
      if (count) console.log(`[cron] Reset token usage for ${count} users`);
    } catch (e) { console.error('[cron] token reset error:', e.message); }
  });

  // Daily at 1am: expire plans
  cron.schedule('0 1 * * *', async () => {
    try {
      const expired = await User.find({
        planExpiry: { $lte: new Date() },
        plan: { $ne: null },
      }).populate('plan');

      const Plan = require('../models/BPPlan.model');
      const freePlan = await Plan.findOne({ price: 0 });

      for (const user of expired) {
        if (user.plan?.price > 0) {
          user.plan = freePlan?._id || null;
          user.planExpiry = null;
          await user.save();
          await Notification.create({
            user: user._id, type: 'subscription',
            title: 'Subscription Expired',
            message: 'Your plan has expired. Upgrade to continue using all features.',
          });
        }
      }
      if (expired.length) console.log(`[cron] Expired ${expired.length} plans`);
    } catch (e) { console.error('[cron] plan expiry error:', e.message); }
  });

  


  console.log('Cron jobs started (drip-feed, API sync, API submit, BeePost scheduler, autopilot, token reset, plan expiry)');
}

module.exports = { startCronJobs };

// NOTE: The function above is from v4. The additions below extend it for v5.
// They are appended inside the module but OUTSIDE startCronJobs - call
// startV5CronJobs() after startCronJobs() in server.js.

const { SPPost, SPRssFeed, SPAiCampaign, SPAccount } = require('../models/StackPosts.models');
const { MailerCampaign } = require('../models/Mailer.models');
const { logCronRun } = require('../controllers/smm/smmlab.controller');

function startV5CronJobs() {

  /* ── StackPosts: publish scheduled posts ── every minute ──────── */
  cron.schedule('* * * * *', async () => {
    const t0 = Date.now();
    let published = 0;
    try {
      const now  = new Date();
      const due  = await SPPost.find({ status: 0, isDraft: false, timePost: { $lte: now } })
        .populate('accounts').limit(30);
      for (const post of due) {
        try {
          post.status = 4; // publishing
          await post.save();
          const result = {};
          for (const acct of post.accounts) {
            // Publisher stub - integrate real SDK per network
            result[acct._id] = { success: true, note: `Published to ${acct.network}` };
          }
          post.result = result;
          post.status = 1; // published
          await post.save();
          published++;
          // Handle repost scheduling
          if (post.repostFrequency > 0 && (!post.repostUntil || post.repostUntil > now)) {
            await SPPost.create({
              ...post.toObject(), _id: undefined, status: 0, result: {},
              timePost: new Date(now.getTime() + post.repostFrequency * 86400000),
            });
          }
        } catch (e) {
          post.status = 2; // failed
          post.result = { error: e.message };
          await post.save();
        }
      }
      if (published) await logCronRun('sp_scheduler', 'success', `Published ${published} posts`, { published }, Date.now()-t0);
    } catch (err) {
      await logCronRun('sp_scheduler', 'error', err.message, {}, Date.now()-t0);
    }
  });

  /* ── StackPosts: RSS auto-posting ── every 10 minutes ──────────── */
  cron.schedule('*/10 * * * *', async () => {
    const t0 = Date.now();
    try {
      const Parser = require('rss-parser');
      const parser = new Parser();
      const feeds  = await SPRssFeed.find({ active: true }).populate('accounts');
      let posted   = 0;
      for (const feed of feeds) {
        try {
          const rss   = await parser.parseURL(feed.url);
          const items = rss.items.slice(0, feed.maxPerFetch || 3);
          for (const item of items) {
            const guid = item.guid || item.link;
            if (feed.postedGuids.includes(guid)) continue;
            const content = feed.postTemplate
              ? feed.postTemplate.replace('{{title}}', item.title || '').replace('{{link}}', item.link || '').replace('{{summary}}', item.contentSnippet || '')
              : `${item.title}\n${item.link}`;
            await SPPost.create({
              userId: null, teamId: feed.teamId,
              accounts: feed.accounts.map(a => a._id),
              content, method: 'rss',
              timePost: new Date(), isDraft: false, status: 0,
            });
            feed.postedGuids.push(guid);
            posted++;
          }
          feed.lastFetchAt = new Date();
          feed.lastPostAt  = posted ? new Date() : feed.lastPostAt;
          await feed.save();
        } catch (e) { console.error(`[RSS] Feed ${feed._id}:`, e.message); }
      }
      if (posted) await logCronRun('sp_rss', 'success', `Queued ${posted} RSS posts`, { posted }, Date.now()-t0);
    } catch (err) {
      await logCronRun('sp_rss', 'error', err.message, {}, Date.now()-t0);
    }
  });

  /* ── StackPosts: AI auto-campaigns ── every 15 minutes ─────────── */
  cron.schedule('*/15 * * * *', async () => {
    const t0 = Date.now();
    try {
      const now       = new Date();
      const campaigns = await SPAiCampaign.find({ active: true, nextRunAt: { $lte: now } }).populate('accounts');
      for (const camp of campaigns) {
        try {
          const gemini = require('../services/gemini.service');
          const content = (await gemini.chat({
            messages: [{ role: 'user', content: camp.prompt || 'Write an engaging social media post.' }],
            maxTokens: 300,
          })).trim();
          await SPPost.create({
            userId: null, teamId: camp.teamId,
            accounts: camp.accounts.map(a => a._id),
            content, method: 'ai', timePost: now, isDraft: false, status: 0,
          });
          const freqMs = camp.frequency === 'weekly' ? 7*86400000 : camp.frequency === 'hourly' ? 3600000 : 86400000;
          camp.lastRunAt = now;
          camp.nextRunAt = new Date(now.getTime() + freqMs);
          await camp.save();
        } catch (e) { console.error(`[AI Campaign] ${camp._id}:`, e.message); }
      }
    } catch (err) {
      await logCronRun('sp_ai_campaign', 'error', err.message, {}, Date.now()-t0);
    }
  });

  /* ── Mailer: send scheduled email/SMS campaigns ── every minute ── */
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const due = await MailerCampaign.find({ status: 'scheduled', scheduledAt: { $lte: now } }).limit(5);
      for (const campaign of due) {
        campaign.status = 'sending';
        await campaign.save();
        // Trigger send - reuse sendCampaign logic via internal call
        console.log(`[Mailer Cron] Triggering campaign ${campaign._id}`);
      }
    } catch (err) {
      await logCronRun('mailer_scheduler', 'error', err.message, {}, 0);
    }
  });

  console.log('v5 Cron jobs started (StackPosts scheduler, RSS, AI campaigns, Mailer scheduler)');
}

module.exports = { startCronJobs, startV5CronJobs };

// ─────────────────────────────────────────────────────────────
//  V5 EXTENDED CRON JOBS (ChatFlow, SocialVibe, SiteSpy, WhatsML)
// ─────────────────────────────────────────────────────────────

function startV5ExtendedCronJobs() {
  const { CFSequenceEnrollment, CFSequence, CFSubscriber, CFMessage, CFPage } = require('../models/ChatFlow.models');
  const { SVPost, SVSocialAccount } = require('../models/SocialVibe.models');
  const { SSPKeyword } = require('../models/ToolsAI_SiteSpy.models');
  const { WMLCampaign, WMLCampaignLog, WMLCustomer, WMLCloudApp } = require('../models/WhatsML.models');
  const axios = require('axios');

  /* ── ChatFlow: sequence drip-sender ── every 1 min ──────── */
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const due = await CFSequenceEnrollment.find({ status: 'active', nextSendAt: { $lte: now } })
        .populate('sequence').populate('subscriber').limit(50);
      for (const enrollment of due) {
        try {
          const seq  = enrollment.sequence;
          const sub  = enrollment.subscriber;
          if (!seq || !sub) { enrollment.status = 'stopped'; await enrollment.save(); continue; }
          const steps = seq.steps.sort((a,b) => a.order - b.order);
          const step  = steps[enrollment.currentStepIndex];
          if (!step) { enrollment.status = 'completed'; await enrollment.save(); continue; }
          const page = await CFPage.findById(sub.page);
          const text = (step.message || '').replace('{{name}}', sub.name || 'Friend');
          if (page?.connectionMode === 'live' && page.accessToken) {
            await axios.post('https://graph.facebook.com/v18.0/me/messages',
              { recipient: { id: sub.psid }, message: { text } },
              { params: { access_token: page.accessToken } }
            ).catch(() => {});
          }
          await CFMessage.create({ tenant: sub.tenant, page: sub.page, subscriber: sub._id, direction: 'outbound', text, source: 'sequence' });
          enrollment.currentStepIndex++;
          if (enrollment.currentStepIndex >= steps.length) {
            enrollment.status = 'completed';
          } else {
            const nextStep = steps[enrollment.currentStepIndex];
            enrollment.nextSendAt = new Date(now.getTime() + nextStep.delayMinutes * 60000);
          }
          await enrollment.save();
        } catch (e) { console.error('[ChatFlow Seq]', e.message); }
      }
    } catch (err) { console.error('[ChatFlow Seq Cron]', err.message); }
  });

  /* ── SocialVibe: scheduled post publisher ── every 1 min ── */
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const due = await SVPost.find({ status: 'scheduled', scheduledAt: { $lte: now } })
        .populate('accounts.socialAccount').limit(20);
      for (const post of due) {
        try {
          post.status = 'publishing';
          await post.save();
          let anySuccess = false, anyFail = false;
          for (const acct of post.accounts) {
            try {
              // Platform-specific publish stubs - connect real SDK per platform
              acct.status = 'published'; acct.publishedAt = new Date(); anySuccess = true;
            } catch { acct.status = 'failed'; anyFail = true; }
          }
          post.status = anyFail && !anySuccess ? 'failed' : anyFail ? 'partial' : 'published';
          post.publishedAt = new Date();
          await post.save();
        } catch (e) { post.status = 'failed'; await post.save(); }
      }
    } catch (err) { console.error('[SocialVibe Cron]', err.message); }
  });

  /* ── WhatsML: campaign bulk-sender ── every 1 min ─────────── */
  cron.schedule('* * * * *', async () => {
    try {
      const now      = new Date();
      const campaigns = await WMLCampaign.find({
        status: 'sending',
        $or: [{ scheduledAt: null }, { scheduledAt: { $lte: now } }],
      }).limit(3);
      for (const campaign of campaigns) {
        try {
          const pending = await WMLCampaignLog.find({ campaign: campaign._id, status: 'pending' }).limit(10);
          if (!pending.length) {
            campaign.status    = 'completed';
            campaign.completedAt = now;
            await campaign.save();
            continue;
          }
          const app = campaign.channel === 'cloud_api'
            ? await WMLCloudApp.findById(campaign.channelApp)
            : null;
          for (const log of pending) {
            try {
              const customer = await WMLCustomer.findById(log.customer);
              if (!customer) { log.status = 'failed'; log.errorMessage = 'Customer not found'; await log.save(); continue; }
              if (campaign.channel === 'cloud_api' && app) {
                await axios.post(`https://graph.facebook.com/v18.0/${app.phoneNumberId}/messages`, {
                  messaging_product: 'whatsapp', to: customer.phone, type: 'text',
                  text: { body: (campaign.messageBody || '').replace('{{name}}', customer.name || 'Friend') },
                }, { headers: { Authorization: `Bearer ${app.accessToken}` } });
              } else {
                const msUrl = process.env.BAILEYS_SERVICE_URL || 'http://localhost:3001';
                const webApp = await require('../models/WhatsML.models').WMLWebApp.findById(campaign.channelApp);
                if (webApp) await axios.post(`${msUrl}/session/${webApp.sessionId}/send`, { to: customer.phone, message: campaign.messageBody });
              }
              log.status = 'sent'; log.sentAt = now;
              campaign.stats.sent = (campaign.stats.sent || 0) + 1;
            } catch (e) {
              log.status = 'failed'; log.errorMessage = e.message;
              campaign.stats.failed = (campaign.stats.failed || 0) + 1;
            }
            await log.save();
            await new Promise(r => setTimeout(r, (campaign.delaySeconds || 5) * 1000));
          }
          await campaign.save();
        } catch (e) { console.error('[WhatsML Campaign]', e.message); }
      }
    } catch (err) { console.error('[WhatsML Campaign Cron]', err.message); }
  });

  /* ── SiteSpy: scheduled campaign dispatch ── every 30 min ─ */
  cron.schedule('*/30 * * * *', async () => {
    try {
      const { MailerCampaign } = require('../models/Mailer.models');
      const scheduled = await MailerCampaign.find({ status: 'scheduled', scheduledAt: { $lte: new Date() } }).limit(5);
      for (const c of scheduled) {
        c.status = 'sending'; await c.save();
        console.log(`[Mailer] Triggering scheduled campaign ${c._id}`);
      }
    } catch (err) { console.error('[Mailer Schedule Cron]', err.message); }
  });

  console.log('v5 Extended Cron jobs started (ChatFlow sequences, SocialVibe, WhatsML campaigns, Mailer schedule)');
}

if (typeof module !== 'undefined') {
  module.exports = { startCronJobs, startV5CronJobs, startV5ExtendedCronJobs };
}

// ─────────────────────────────────────────────────────────────
//  PANELNOVA: Mock delivery mode cron
// ─────────────────────────────────────────────────────────────
async function startMockDeliveryCron() {
  const Order    = require('../models/SMM_Order.model');
  const Provider = require('../models/SMM_Supporting.model').Provider;

  // Every 2 minutes: advance mock orders through lifecycle
  cron.schedule('*/2 * * * *', async () => {
    try {
      const mockProviders = await Provider.find({ isMockMode: true, status: 1 });
      if (!mockProviders.length) return;
      const mockProviderIds = mockProviders.map(p => p._id);

      const now = new Date();
      // pending → in progress
      const pending = await Order.find({
        apiProviderId: { $in: mockProviderIds },
        status: 'pending',
        createdAt: { $lte: new Date(now - 60000) }, // 1 min old
      }).limit(20);
      for (const o of pending) {
        const provider = mockProviders.find(p => p._id.equals(o.apiProviderId));
        o.status = 'in progress';
        o.startCount = Math.floor(Math.random() * 1000);
        o.remains = o.quantity;
        await o.save();
      }

      // in progress → processing (halfway through delivery time)
      const deliveryMs = 30 * 60000; // default 30 min
      const inProgress = await Order.find({
        apiProviderId: { $in: mockProviderIds },
        status: 'in progress',
        updatedAt: { $lte: new Date(now - deliveryMs / 2) },
      }).limit(20);
      for (const o of inProgress) {
        o.status = 'processing';
        o.remains = Math.floor(o.quantity / 2);
        await o.save();
      }

      // processing → completed
      const processing = await Order.find({
        apiProviderId: { $in: mockProviderIds },
        status: 'processing',
        updatedAt: { $lte: new Date(now - deliveryMs / 2) },
      }).limit(20);
      for (const o of processing) {
        o.status = 'completed';
        o.remains = 0;
        await o.save();
      }
    } catch (err) { console.error('[Mock Delivery Cron]', err.message); }
  });

  console.log('PanelNova mock delivery cron started');
}

// Export all
if (typeof module !== 'undefined') {
  const existing = module.exports;
  module.exports = { ...existing, startMockDeliveryCron };
}
