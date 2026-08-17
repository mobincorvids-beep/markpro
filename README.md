# MarkPro v5 — Complete Marketing Platform

> 37 standalone MERN projects unified under one auth, one database, one admin panel.
> 0 missing modules. All gaps closed.

---

## Quick Start

```bash
cd backend && cp .env.example .env   # fill in your keys
npm install && npm run seed
npm run dev                          # backend :5000

cd ../frontend && npm install
npm start                            # frontend :3000
```

---

## All 24 Modules

| # | Module | Route | Source projects |
|---|--------|-------|----------------|
| 1 | SEO Tools (50+) | `/api/seo` | A to Z SEO |
| 2 | SEO Manager (meta/OG/JSON-LD CMS) | `/api/seo-manager` | seo-tools-mern |
| 3 | Cyber/Dev Tools (95+) | `/api/cyber` | CyberTools, seo-tools-mern_1 |
| 4 | Rank Tracker | `/api/rank` | PHPRank SEO |
| 5 | Bio Pages | `/api/bio` | PixaURL |
| 6 | BioLinks (37 block types) | `/api/biolinks` | 66BioLinks |
| 7 | Document Vault | `/api/docs` | DocManage |
| 8 | WhatsApp Cloud API | `/api/whatsapp` | WhatsMark |
| 9 | WhatsApp Dual-Channel | `/api/whatsml` | WhatsML (Cloud API + Baileys Web) |
| 10 | Publish & Brand AI | `/api/publish` | BeePost + SocialAI |
| 11 | SocialVibe AI Scheduler | `/api/socialvibe` | SocialVibe |
| 12 | StackPosts (multi-team) | `/api/sp` | StackPosts |
| 13 | ChatFlow (Messenger + ecom) | `/api/chatflow` | ChatFlow |
| 14 | Teleman (VoIP + SMS) | `/api/teleman` | Teleman |
| 15 | Design Studio (Fabric.js) | `/api/design` | PixaGuru |
| 16 | Mailer (Email + SMS) | `/api/mailer` | XSender |
| 17 | ToolsAI (GPT-4 suite) | `/api/toolsai` | ToolsAI |
| 18 | SiteSpy (analytics + URLs) | `/api/sitespy` | SiteSpy |
| 19 | Social Proof | `/api/social` | social-proof-mern, smartpanel-socialproof-merged |
| 20 | SMM Panel | `/api/smm` | SmartPanel, SMMlab, PanelNova |
| 21 | Social Stream | `/api/stream` | mern-social-stream, merged-stream-seo-mern |
| 22 | AI Suite | `/api/ai` | AIGen, AI Social Replier, Leonardo AI, merged-mern-saas |
| 23 | Pen AI | `/api/pen` | AI2Pen |
| 24 | ZAM Nexus (CRM + Lead Gen) | `/api/zam` | zam-nexus |

---

## Backend Stats

| Item | Count |
|------|-------|
| Mongoose model files | 46 |
| Individual schemas | 120+ |
| Route files | 56 |
| Route mounts in index.js | 55 |
| Controller files | 63 |
| Cron jobs | 16 |
| AI providers | 6 (OpenAI, Gemini, Mistral, Stability AI, Google TTS, Azure TTS) |
| Payment gateways | 6 (Stripe, PayPal, Razorpay, Paystack, Bank Transfer, Manual) |
| Social networks | 9 (Twitter/X, Facebook, Instagram, LinkedIn, TikTok, Pinterest, YouTube, Telegram, RSS) |
| Email/SMS providers | 5 (SMTP, SendGrid, Mailgun, Twilio, Vonage) |
| WhatsApp channels | 2 (Meta Cloud API, Baileys Web QR) |

---

## Cron Jobs (16 total)

| Job | Interval | Module |
|-----|----------|--------|
| Drip-feed order runner | 1 min | SMM Panel |
| API order submit | 1 min | SMM Panel |
| API order sync | 5 min | SMM Panel |
| BeePost post publisher | 1 min | Publish |
| BeePost autopilot AI | 5 min | Publish |
| BeePost token reset | Daily midnight | Publish |
| BeePost plan expiry | Daily 1am | Publish |
| StackPosts post publisher | 1 min | StackPosts |
| StackPosts RSS auto-posting | 10 min | StackPosts |
| StackPosts AI campaigns | 15 min | StackPosts |
| Mailer scheduled campaigns | 1 min | Mailer |
| ChatFlow sequence drip-sender | 1 min | ChatFlow |
| SocialVibe post publisher | 1 min | SocialVibe |
| WhatsML campaign bulk-sender | 1 min | WhatsML |
| Mailer scheduled dispatch | 30 min | Mailer |
| PanelNova mock delivery | 2 min | SMM Panel |

---

## Key Environment Variables

```env
# Core
MONGODB_URI=mongodb://localhost:27017/markpro
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
FRONTEND_URL=http://localhost:3000
PORT=5000

# AI Providers
OPENAI_API_KEY=
GEMINI_API_KEY=                  # ZAM Nexus 180+ SEO tools
STABILITY_API_KEY=               # AIGen image-to-video

# Stripe (multiple webhooks)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# WhatsApp
WML_WEBHOOK_VERIFY_TOKEN=        # WhatsML Cloud API
CF_WEBHOOK_VERIFY_TOKEN=         # ChatFlow Messenger
BAILEYS_SERVICE_URL=http://localhost:3001

# Email/SMS
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS=
SENDGRID_API_KEY=
MAILGUN_API_KEY= MAILGUN_DOMAIN=
TWILIO_ACCOUNT_SID= TWILIO_AUTH_TOKEN= TWILIO_PHONE_NUMBER=
VONAGE_API_KEY= VONAGE_API_SECRET=

# Storage & APIs
REMOVE_BG_API_KEY=               # PixaGuru background removal
UNSPLASH_ACCESS_KEY=             # PixaGuru stock photos
AWS_S3_BUCKET= AWS_ACCESS_KEY_ID= AWS_SECRET_ACCESS_KEY=

# SiteSpy
IPINFO_TOKEN=
VIRUSTOTAL_API_KEY=
SAFE_BROWSING_API_KEY=

# BeePost / Publish
BP_AFFILIATE_COMMISSION_RATE=0.10
CRON_SECRET=                     # External HTTP cron endpoint
```

---

## Frontend Modules Still Needed

These backend modules have complete APIs but need React pages built:

| Module | Pages needed |
|--------|-------------|
| `/design` | Canvas editor (Fabric.js), project dashboard, template browser, media library |
| `/mailer` | Contact groups, campaign wizard (4-step), analytics dashboard, settings |
| `/sp` | Team picker, post calendar, AI writer, RSS feeds, blog admin, affiliate dashboard |
| `/chatflow` | Page manager, subscriber inbox, automation rules, sequence builder, storefront |
| `/teleman` | Browser dialer (WebRTC), contact list, campaign manager, call history |
| `/whatsml` | Dual-channel dashboard, QR scanner, number checker, scrape jobs |
| `/socialvibe` | Post calendar, AI writer, team management |
| `/toolsai` | Template gallery, AI writer (SSE), chat, image generator, blog |
| `/sitespy` | Analytics dashboard, URL shortener, WHOIS tool |
| `/zam` | SEO tool runner (180 tools), CRM contacts + map view, lead search wizard |
| `/seo-manager` | Page editor (tabbed: meta/OG/Twitter/JSON-LD), bulk import, audit tool |

---

## Source Projects Reference (37 total)

All covered. 2 exact duplicates (md5 verified), 3 MarkPro version zips that are v5 itself.

`ai2pen-mern` `aigen-mern` `ai-social-replier-mern` `atoz-seo-mern` `beepost-mern`
`biolinks-mern` `chatflow-mern` `cybertools-mern` `docmanage-mern` `leonardo-mern`
`markpro-platform` `markpro-v2-complete` `merged-mern-saas` `merged-mern-saas__1__`
`merged-stream-seo-mern` `merged-stream-seo-mern__1__` `mern-social-stream`
`panelnova-mern` `phprank-mern-final` `pixaguru-mern` `pixaurl-mern`
`seo-tools-mern` `seo-tools-mern_1` `sitespy-mern` `smartpanel-mern`
`smartpanel-socialproof-merged` `smmlab-mern` `socialai-mern` `social-proof-mern`
`socialvibe-mern` `stackposts-mern` `teleman-mern` `toolsai-mern`
`whatsmark-mern` `whatsml-mern` `xsender-mern` `zam-nexus`
