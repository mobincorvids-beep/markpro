const router = require('express').Router();

// 
//  AUTH  (unified)
// 
router.use('/auth', require('./auth.routes'));

// 
//  WORKSPACE ACCOUNT  (topbar notifications, profile menu, avatar upload)
// 
router.use('/account', require('./account.routes'));

// 
//  LOCAL PAYMENTS  (JazzCash / EasyPaisa / bank transfer)
// 
router.use('/payments', require('./payments.routes'));

// 
//  SEO TOOLS  (50+ tools - A to Z SEO)
// 
router.use('/seo/tools', require('./seo.tools.routes'));
router.use('/seo/admin', require('./seo.admin.routes'));

// 
//  DEV / CYBER TOOLS  (95+ tools - CyberTools)
// 
router.use('/cyber/tools', require('./cyber.tools.routes'));

// 
//  RANK TRACKER  (PHPRank - projects, reports, 14 tools)
// 
router.use('/rank',       require('./rank.api.routes'));
router.use('/rank/admin', require('./rank.admin.routes'));

// 
//  BIO PAGES & LINKS  (PixaURL + 66BioLinks)
// 
router.use('/bio',      require('./bio.routes'));
router.use('/biolinks', require('./biolinks.routes'));

// 
//  DOCUMENT VAULT  (DocManage)
// 
router.use('/docs/documents',     require('./docs.documents.routes'));
router.use('/docs/folders',       require('./docs.folders.routes'));
router.use('/docs/requests',      require('./docs.requests.routes'));
router.use('/docs/notifications', require('./docs.notifications.routes'));
router.use('/docs/admin',         require('./docs.admin.routes'));
router.use('/docs/public',        require('./docs.public.routes'));

// 
//  WHATSAPP MARKETING - CLOUD API  (WhatsMark)
// 
router.use('/whatsapp', require('./whatsapp.routes'));

// 
//  WHATSAPP DUAL-CHANNEL - CLOUD API + BAILEYS WEB  (WhatsML)
// 
router.use('/whatsml', require('./whatsml.routes'));

// 
//  PUBLISH  (BeePost + SocialAI brand builder)
// 
router.use('/publish/posts',   require('./publish.posts.routes'));
router.use('/publish/social',  require('./publish.social.routes'));
router.use('/publish/ai',      require('./publish.ai.routes'));
router.use('/publish/billing', require('./publish.billing.routes'));
router.use('/publish',         require('./publish.admin.routes'));
router.use('/publish/brand',   require('./socialai.routes'));

// 
//  SOCIALVIBE  (AI scheduling - 14-day trial, post templates, team roles)
// 
router.use('/socialvibe', require('./socialvibe.routes'));

// 
//  STACKPOSTS  (multi-team social + RSS + AI campaigns + blog + affiliate)
// 
router.use('/sp', require('./stackposts.routes'));

// 
//  CHATFLOW  (Facebook Messenger bots + e-commerce)
// 
router.use('/chatflow', require('./chatflow.routes'));

// 
//  TELEMAN  (Twilio VoIP calls + SMS telemarketing)
// 
router.use('/teleman', require('./teleman.routes'));

// 
//  DESIGN STUDIO  (PixaGuru - Fabric.js canvas editor)
// 
router.use('/design', require('./design.routes'));

// 
//  MAILER  (XSender - mass email + SMS marketing)
// 
router.use('/mailer', require('./mailer.routes'));

// 
//  TOOLSAI  (Gemini write/code/image + blog CMS + support)
// 
router.use('/toolsai', require('./toolsai.routes'));

// 
//  SITESPY  (visitor analytics pixel + URL shortener + WHOIS + DNS)
// 
router.use('/sitespy', require('./sitespy.routes'));

// 
//  SOCIAL PROOF  (30+ notification types, pixel tracking, leads)
// 
router.use('/social/campaigns', require('./social.campaign.routes'));
router.use('/social/plans',     require('./social.plan.routes'));
router.use('/social/pixel',     require('./social.pixel.routes'));
router.use('/social/user',      require('./social.user.routes'));

// 
//  SMM PANEL  (SmartPanel + SMMlab extras)
// 
router.use('/smm/services',      require('./smm.services.routes'));
router.use('/smm/orders',        require('./smm.orders.routes'));
router.use('/smm/tickets',       require('./smm.tickets.routes'));
router.use('/smm/add-funds',     require('./smm.addFunds.routes'));
router.use('/smm/profile',       require('./smm.profile.routes'));
router.use('/smm/transactions',  require('./smm.transactions.routes'));
router.use('/smm/subscriptions', require('./smm.subscriptions.routes'));
router.use('/smm/v1',            require('./smm.publicApi.routes'));
router.use('/smm/v2',            require('./smm.publicApi.routes')); // PanelNova compat
router.use('/smm',               require('./smm.lab.routes'));       // deposits, favorites, cron logs

// 
//  SOCIAL STREAM  (9 networks, 6 layouts, embed widget)
// 
router.use('/stream', require('./stream.routes'));

// 
//  AI SUITE  (reply + AIGen 7-generator + credit wallet)
// 
router.use('/ai/replies',     require('./ai.reply.routes'));
router.use('/ai/images',      require('./ai.image.routes'));
router.use('/ai/plans',       require('./ai.plan.routes'));
router.use('/ai/prompts',     require('./aigen.prompts.routes'));
router.use('/ai/credits',     require('./aigen.credits.routes'));
router.use('/ai/aigen-admin', require('./aigen.admin.routes'));

// 
//  PEN AI  (AI2Pen - template-driven + Gemini images + teams)
// 
router.use('/pen', require('./pen.routes'));

// 
//  UNIFIED ADMIN
// 
router.use('/admin', require('./admin.routes'));

// 
//  SEO TOOLS MANAGER  (seo-tools-mern - per-page meta/OG/JSON-LD CMS)
// 
router.use('/seo-manager', require('./seomanager.routes'));

// 
//  ZAM NEXUS  (CRM + Lead Gen + 180+ Gemini AI SEO tools)
// 
router.use('/zam', require('./zamnexus.routes'));

//  Platform info 
router.get('/platform-info', (_, res) => res.json({
  platform: 'MarkPro',
  version:  '5.0.0',
  modules:  24,
  gaps_resolved: 'all 6 partial/missing gaps closed in final patch',
  sections: [
    'SEO Tools (50+)', 'SEO Manager (per-page meta/OG/JSON-LD)', 'Cyber/Dev Tools (95+)', 'Rank Tracker',
    'Bio Pages (PixaURL)', 'BioLinks (66BioLinks + coupon redeem)',
    'Document Vault', 'WhatsApp Cloud API (WhatsMark)', 'WhatsApp Dual-Channel (WhatsML)',
    'Publish & Brand AI (BeePost + affiliate/wallet/cron)', 'SocialVibe AI Scheduler',
    'StackPosts (Multi-team)', 'ChatFlow (Messenger+ecom)',
    'Teleman (VoIP+SMS)', 'Design Studio (PixaGuru)',
    'Mailer (Email+SMS)', 'ToolsAI (Gemini Suite)',
    'SiteSpy (Analytics+URLs)', 'Social Proof (Slack+Discord handlers + lead CSV)',
    'SMM Panel (SmartPanel+SMMlab+PanelNova mock delivery)', 'Social Stream',
    'AI Suite (AIGen+Replier+Leonardo)', 'Pen AI (AI2Pen)',
    'ZAM Nexus (CRM + Lead Gen + 180+ Gemini AI SEO tools)',
  ],
}));

module.exports = router;
