const Campaign = require('../../models/Campaign.model');
const Notification = require('../../models/Notification.model');
const { NotificationLog } = require('../../models/secondary.models');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const logger = require('../../utils/logger');

// GET /pixel.js?key=CAMPAIGN_KEY  - serves the tracking pixel JS
exports.servePixelScript = async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).send('// Missing key');

    const campaign = await Campaign.findOne({ pixelKey: key, isEnabled: true });
    if (!campaign) return res.status(404).send('// Campaign not found');

    const notifications = await Notification.find({ campaign: campaign._id, isEnabled: true }).lean();
    const trackUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/pixel/track`;

    // Build the JS payload
    const script = `
(function() {
  var _sp = {
    campaignId: "${campaign._id}",
    pixelKey: "${key}",
    trackUrl: "${trackUrl}",
    notifications: ${JSON.stringify(notifications.map(n => ({ id: n._id, type: n.type, settings: n.settings })))},
    visitorId: (function() {
      var id = localStorage.getItem('_sp_vid');
      if (!id) { id = Math.random().toString(36).substr(2) + Date.now().toString(36); localStorage.setItem('_sp_vid', id); }
      return id;
    })(),
    track: function(notifId, type, meta) {
      fetch(_sp.trackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: _sp.campaignId, notificationId: notifId, type: type,
          visitorId: _sp.visitorId, pageUrl: window.location.href,
          referrer: document.referrer, meta: meta || {} })
      }).catch(function(){});
    },
    renderNotifications: function() {
      _sp.notifications.forEach(function(n) {
        if (n.settings && n.settings.displayAfterSeconds >= 0) {
          setTimeout(function() { _sp.showNotification(n); _sp.track(n.id, 'impression'); },
            (n.settings.displayAfterSeconds || 3) * 1000);
        }
      });
    },
    showNotification: function(n) {
      var el = document.createElement('div');
      el.id = '_sp_notif_' + n.id;
      el.style.cssText = 'position:fixed;z-index:999999;bottom:20px;left:20px;max-width:320px;background:'
        + (n.settings.backgroundColor || '#fff')
        + ';color:' + (n.settings.textColor || '#000')
        + ';border-radius:' + (n.settings.borderRadius || 8) + 'px'
        + ';padding:14px 18px;box-shadow:0 4px 24px rgba(0,0,0,.15);font-family:sans-serif;font-size:14px;animation:_sp_fadein .4s ease;';
      el.innerHTML = '<strong>' + (n.settings.title || '') + '</strong>'
        + (n.settings.description ? '<p style="margin:4px 0 0;opacity:.8">' + n.settings.description + '</p>' : '')
        + (n.settings.ctaText ? '<a href="' + (n.settings.ctaUrl || '#') + '" onclick="_sp.track(\\'' + n.id + '\\',\\'click\\')" style="display:inline-block;margin-top:8px;background:' + (n.settings.ctaColor || '#6366f1') + ';color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:13px">' + n.settings.ctaText + '</a>' : '');
      var close = document.createElement('button');
      close.style.cssText = 'position:absolute;top:6px;right:8px;background:none;border:none;cursor:pointer;font-size:16px;opacity:.5';
      close.innerHTML = '&times;';
      close.onclick = function() { el.remove(); };
      el.appendChild(close);
      document.body.appendChild(el);
      var dur = (n.settings.displayDurationSeconds || 8) * 1000;
      if (dur > 0) setTimeout(function() { el && el.remove(); }, dur);
    }
  };
  var style = document.createElement('style');
  style.innerHTML = '@keyframes _sp_fadein{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(style);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _sp.renderNotifications);
  else _sp.renderNotifications();
})();
`.trim();

    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(script);
  } catch (err) {
    logger.error('Pixel script error:', err);
    res.status(500).send('// Error');
  }
};

// POST /api/pixel/track  - records an event from the widget
exports.track = async (req, res) => {
  try {
    const { campaignId, notificationId, type, visitorId, pageUrl, referrer, meta } = req.body;
    if (!campaignId || !notificationId || !type) return res.status(400).json({ success: false });

    // Geo & device detection
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
    const geo = geoip.lookup(ip) || {};
    const ua = UAParser(req.headers['user-agent'] || '');
    const deviceType = ua.device?.type === 'mobile' ? 'mobile' : ua.device?.type === 'tablet' ? 'tablet' : 'desktop';

    await NotificationLog.create({
      campaign: campaignId, notification: notificationId,
      user: (await Campaign.findById(campaignId).select('user'))?.user,
      type, visitorId, ip, pageUrl, referrer,
      country: geo.country || null, city: geo.city || null,
      device: deviceType, browser: ua.browser?.name, os: ua.os?.name,
      metadata: meta,
    });

    // Increment stats
    const statKey = `stats.${type === 'impression' ? 'impressions' : type === 'click' ? 'clicks' : type === 'conversion' ? 'conversions' : 'leads'}`;
    await Promise.all([
      Notification.updateOne({ _id: notificationId }, { $inc: { [statKey]: 1 } }),
      Campaign.updateOne({ _id: campaignId }, { $inc: { [`stats.total${type.charAt(0).toUpperCase() + type.slice(1)}s`]: 1 } }),
    ]);

    res.json({ success: true });
  } catch (err) {
    logger.error('Track error:', err);
    res.status(500).json({ success: false });
  }
};

// ── Lead capture + handler dispatch ──────────────────────────
// POST /api/pixel/lead  - captures a lead form submission from widget
exports.captureLead = async (req, res) => {
  try {
    const { campaignId, notificationId, email, name, phone, meta = {} } = req.body;
    if (!campaignId || !email) return res.status(400).json({ success: false });

    const { Lead, NotificationHandler } = require('../../models/secondary.models');
    const Campaign = require('../../models/Campaign.model');

    const campaign = await Campaign.findById(campaignId).select('user');
    if (!campaign) return res.json({ success: false, message: 'Campaign not found' });

    const lead = await Lead.create({
      user: campaign.user, campaign: campaignId,
      notification: notificationId || null,
      email, name: name || '', phone: phone || '',
      metadata: meta,
    });

    await Campaign.updateOne({ _id: campaignId }, { $inc: { 'stats.totalLeads': 1 } });

    // Dispatch to all active handlers for this user
    const handlers = await NotificationHandler.find({ user: campaign.user, isActive: true });
    for (const handler of handlers) {
      try {
        await dispatchHandler(handler, lead, campaign);
      } catch (e) { logger.error(`Handler ${handler._id} dispatch failed:`, e.message); }
    }

    res.json({ success: true, message: 'Lead captured' });
  } catch (err) {
    logger.error('Lead capture:', err);
    res.status(500).json({ success: false });
  }
};

// Internal: dispatch a single handler
async function dispatchHandler(handler, lead, campaign) {
  const axios = require('axios');
  const nodemailer = require('nodemailer');

  const payload = {
    campaign: campaign._id,
    lead: { email: lead.email, name: lead.name, phone: lead.phone },
    capturedAt: lead.createdAt || new Date(),
  };

  switch (handler.type) {
    case 'webhook':
      if (handler.webhookUrl) {
        await axios.post(handler.webhookUrl, payload, { timeout: 5000,
          headers: handler.webhookSecret ? { 'X-Handler-Secret': handler.webhookSecret } : {} });
      }
      break;

    case 'email':
      if (handler.email) {
        const transport = nodemailer.createTransport({
          host:   process.env.SMTP_HOST || 'smtp.gmail.com',
          port:   +process.env.SMTP_PORT || 587,
          secure: false,
          auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transport.sendMail({
          from:    process.env.SMTP_USER || 'noreply@markpro.app',
          to:      handler.email,
          subject: `New lead captured - ${lead.email}`,
          html:    `<p><b>Email:</b> ${lead.email}</p><p><b>Name:</b> ${lead.name || '-'}</p><p><b>Phone:</b> ${lead.phone || '-'}</p>`,
        });
      }
      break;

    case 'slack':
      if (handler.slackWebhookUrl) {
        await axios.post(handler.slackWebhookUrl, {
          text: `*New Lead Captured*`,
          attachments: [{
            color: '#6366f1',
            fields: [
              { title: 'Email',  value: lead.email,        short: true },
              { title: 'Name',   value: lead.name || '-',  short: true },
              { title: 'Phone',  value: lead.phone || '-', short: true },
            ],
            footer: `Campaign: ${campaign._id}`,
            ts:     Math.floor(Date.now() / 1000),
          }],
        }, { timeout: 5000 });
      }
      break;

    case 'discord':
      if (handler.discordWebhookUrl) {
        await axios.post(handler.discordWebhookUrl, {
          username: 'MarkPro Leads',
          embeds: [{
            title:       'New Lead Captured',
            color:       0x6366f1,
            description: `**Email:** ${lead.email}\n**Name:** ${lead.name || '-'}\n**Phone:** ${lead.phone || '-'}`,
            footer:      { text: `Campaign: ${campaign._id}` },
            timestamp:   new Date().toISOString(),
          }],
        }, { timeout: 5000 });
      }
      break;

    case 'telegram':
      if (handler.telegramBotToken && handler.telegramChatId) {
        await axios.post(`https://api.telegram.org/bot${handler.telegramBotToken}/sendMessage`, {
          chat_id:    handler.telegramChatId,
          text:       `*New Lead*\nEmail: ${lead.email}\nName: ${lead.name || '-'}\nPhone: ${lead.phone || '-'}`,
          parse_mode: 'Markdown',
        }, { timeout: 5000 });
      }
      break;

    default:
      break;
  }
}
