# MarkPro v5 — Complete Feature List

> 37 standalone MERN projects unified · 24 modules · 183 frontend routes · 54 backend route files · 46 Mongoose models · 16 cron jobs

---

## Module 1 — SEO Tools Hub (`/api/seo`)
*Source: A to Z SEO Tools*

50+ server-side SEO tools across 8 categories:

**Content Tools**
- Article Rewriter, Word Counter, Keyword Density Analyzer, Keyword Suggestions, SERP Position Checker, Spell Checker

**Meta & Tags**
- Meta Tag Generator/Analyzer, Open Graph Checker, Twitter Card Checker, Schema Markup Generator

**Domain & DNS**
- WHOIS Lookup, Domain Age Checker, DNS Records (A/AAAA/MX/TXT/NS/CNAME), SSL Certificate Checker, Domain Hosting Checker

**Website Analysis**
- Full SEO Audit (30+ scored checks), Link Analyzer, PageSpeed (Core Web Vitals via Google PSI), Broken Link Finder, Spider Simulator, Google Index Checker

**Network & Server**
- Server Status Checker (20 URLs), Ping Tool, Redirect Chain Tracer, HTTP Headers Inspector, GZip Test

**Generators**
- Robots.txt Generator, XML Sitemap Crawler, .htaccess/Nginx Rules Generator, URL Encoder/Decoder, MD5 Hash Generator

**Features**
- Per-tool usage tracking (auto-expires after 90 days)
- Rate limiting: 100 requests/15 min per IP
- Admin dashboard: usage stats, user management, tool history

---

## Module 2 — SEO Manager (`/api/seo-manager`)
*Source: seo-tools-mern (artesaos/seotools port)*

Per-page meta tag content management system:

- **Full CRUD** for SEO pages by URL slug
- **Meta Tags**: title, description, keywords, robots, canonical, charset, viewport
- **Open Graph**: title, description, image, URL, type (website/article/product/profile/book/video/place), site_name, locale, article properties (author, section, dates, tags), product properties (price, currency, availability)
- **Twitter Cards**: summary, summary_large_image, app, player — with title, description, image, site, creator
- **JSON-LD Schemas**: multiple schemas per page — WebPage, Article, Product, Organization, BreadcrumbList, any custom type
- **hreflang**: alternate language tags per page for international SEO
- **Pagination**: prev/next link tags for paginated content
- **AMP**: amphtml link tag
- **Webmaster Verification**: Google, Bing, Yandex
- **Custom head HTML**: inject any raw HTML into `<head>`
- **Preview**: generate full HTML tag block without saving
- **Bulk Import**: JSON array or CSV file upload
- **SEO Audit**: live URL scoring — title, description, H1, canonical, OG, Twitter Card, JSON-LD (0–100 score)
- **Copy to clipboard**: one-click copy of generated HTML tags

---

## Module 3 — Cyber/Dev Tools (`/api/cyber`)
*Source: CyberTools, seo-tools-mern_1 (identical)*

95+ developer utilities across 6 categories with instant sidebar search and dark-mode UI:

**Text Tools (29)**: Base64/URL/HTML/ROT13 encode-decode, text↔binary/hex, 8-case converter (camelCase, PascalCase, snake_case, kebab-case, SCREAMING_SNAKE, dot.case, Title Case, sentence case), slug generator, regex find & replace, word frequency counter, Lorem Ipsum generator, email/URL extractor from text

**Security Tools (9)**: Hash generator (MD4/MD5/SHA-1/224/256/384/512/RIPEMD-160), bcrypt generate+verify, password generator with strength meter, UUID v4 generator, Luhn algorithm validator, JWT decoder

**Color Tools (2)**: Hex↔RGB↔HSL converter, color palette generator

**Code Tools (18)**: CSS/JS/HTML formatter & minifier, HTML↔Markdown converter, JSON validator/beautifier, JSON↔XML converter, CSV↔JSON converter, SQL beautifier, JavaScript obfuscator, diff checker

**Network Tools (15, server-side)**: DNS lookup, WHOIS lookup, SSL certificate checker, ping, HTTP status checker, redirect chain tracer, URL unshortener, port checker, GZip test, IP geolocation, reverse DNS, CIDR calculator

**Miscellaneous (22)**: QR code generator, barcode generator, image to base64, base64 to image, timestamp converter, cron expression parser, ASCII art generator, text to morse code, number base converter, roman numerals converter, word scrambler, text reverser, duplicate line remover, line sorter, whitespace remover

---

## Module 4 — Rank Tracker (`/api/rank`)
*Source: PHPRank SEO*

- **14 SEO audit tools**: SEO Audit (30+ checks, scored), Meta Tags analyzer (OG/Twitter/JSON-LD), PageSpeed (Google PSI — Core Web Vitals), Keyword Density, Broken Links, SSL Checker, DNS Lookup, WHOIS, Sitemap Parser, Robots.txt Checker, Redirect Chain, Social Media Preview, IP/Geo Lookup, Readability (Flesch-Kincaid score)
- All tools usable without login
- **Project tracking**: monitor multiple websites with historical audit scores
- **Report history**: paginated, real-time polling for running reports, issue browser with severity sorting
- **Stripe billing**: 3 plan tiers (Free/Pro/Agency), Checkout + Billing Portal + webhook sync
- Admin panel: users, plans, payments dashboard

---

## Module 5 — Bio Pages (`/api/bio`)
*Source: PixaURL*

Link-in-bio SaaS platform:

- Bio page builder with custom themes, sections, social links
- Multi-page campaigns per user
- Section-level CRUD in visual editor
- Visit + click analytics per page and per campaign
- Email verification, forgot/reset password
- S3/Spaces file upload for avatars and media
- **5 payment gateways**: Stripe, Razorpay, PayPal, Paystack, Bank Transfer (manual admin approval)
- Admin: user management, template & theme libraries, plan CRUD, payment history, pending transfers
- 17 Mongoose models, RTK Redux with 80+ typed API calls

---

## Module 6 — BioLinks (`/api/biolinks`)
*Source: 66BioLinks*

Full link-in-bio SaaS with 37 block types:

**Block Types**: link, header, avatar/profile, text, HTML embed, image grid, video (YouTube/Vimeo/direct), audio, file download, PDF viewer, countdown timer, map embed, tweet embed, Spotify embed, YouTube channel, TikTok embed, Instagram embed, vCard contact, PayPal button, Discord invite, WhatsApp chat button, FAQ accordion, product card, newsletter signup, social proof, icon grid, testimonial, booking link, RSS feed, github repo, stack overflow, linkedin profile, custom form, divider, spacer, code block

**Features**:
- Short link creation with custom slugs, redirect tracking, enable/disable toggle
- Click analytics per link and per block with date-range filtering
- QR code generation and management
- Custom domain support (admin-managed + user-assigned)
- Email collector block with public subscribe endpoint + export
- Tracking pixel CRUD (Facebook Pixel, Google Analytics, GTM, TikTok Pixel)
- Plan limits: biolinks, short links, QR codes, pixels, domains, projects
- **Coupon/redeem codes**: coupon type (discount on next plan), redeem type (activate plan immediately)
- Admin: users, plans, themes, bio templates, settings, payments, domains, codes

---

## Module 7 — Document Vault (`/api/docs`)
*Source: DocManage*

Secure document management system:

- Drag-and-drop multi-file upload with progress
- Hierarchical folders with color-coding and nesting
- Grid/list view toggle
- **Version control**: upload new versions, restore any previous version
- **Expiry dates** with automated email reminders via cron
- Threaded comments per document
- **Audit trail**: every view, download, edit, share action logged with timestamp + user
- In-browser preview: images, PDFs, video, audio, text files
- **Sharing**: share with specific users (view/edit/download permissions), public share links (no login required)
- **File requests**: secure upload link to anyone without an account; auto-notify on fulfilment
- Role-based access: admin, manager, user, client; per-user storage quotas
- In-app notification bell with unread counts
- **Storage providers**: local disk | AWS S3 | Wasabi (configure via `DOC_STORAGE_PROVIDER` env var)

---

## Module 8 — WhatsApp Marketing (`/api/whatsapp`)
*Source: WhatsMark*

Meta WhatsApp Cloud API marketing platform:

- WhatsApp Cloud API v18.0: send text, templates, media, interactive messages
- Webhook verify + inbound message handling
- Real-time chat inbox via Socket.IO: message history, send text/media/templates
- **AI auto-reply**: OpenAI-powered reply suggestions; toggle per conversation
- Canned replies with `/slash` trigger shortcut
- **Contacts**: full CRUD, notes, CSV import, custom status/source fields, per-contact stats
- **Bulk campaigns**: merge field substitution ({{name}}, {{phone}}, etc.), pause/resume/retry, per-recipient delivery tracking
- **Message bots**: keyword trigger bots, template bots; bot stop per chat
- **Meta template sync**: fetch and store approved templates from Meta Graph API
- External Public API (X-Api-Token header): programmatic contact create + message send
- Campaign scheduler cron (every 1 min)

---

## Module 9 — WhatsML Dual-Channel WhatsApp (`/api/whatsml`)
*Source: WhatsML*

**Two WhatsApp channels in one platform:**

**Channel 1 — Meta Cloud API** (same as Module 8 but multi-connection):
- Connect multiple WhatsApp Business accounts per user
- Per-app inbound webhook handler with full message routing

**Channel 2 — WhatsApp Web via Baileys** (no Meta approval needed):
- QR code session management with real-time polling
- Connects to separate Baileys microservice (`BAILEYS_SERVICE_URL`)
- Session reconnect logic; status tracking (initializing/qr_pending/connected/disconnected)

**Unified Inbox**: conversations from both channels shown together, labeled by channel type

**CRM Contacts**: groups, tags, custom fields, CSV import, opt-out tracking

**Bulk Campaigns**: group/tag targeting, message body with merge fields, throttled sending with configurable delay, per-recipient status tracking

**AI Auto-Reply**:
- Keyword-based rules (exact/contains/starts_with/regex matching)
- AI mode: GPT-4o powered auto-replies using conversation history
- Active hours restriction (only respond 9am–6pm, configurable)
- Trainable knowledge base (RAG-lite): upload text, Q&A pairs, or URLs

**AI Content Tools**: 8+ message templates (order confirmation, abandoned cart, promotional, appointment reminder, custom prompts) + DALL-E 3 image generation

**Number Checker**: bulk validate which numbers have active WhatsApp (via Baileys session)

**Web Scraping**: lead generation integration point — create scrape jobs (Google Maps / website), review results, import valid leads to CRM contacts

---

## Module 10 — Publish & Brand AI (`/api/publish`)
*Source: BeePost + SocialAI*

Social media scheduling + AI brand building:

**BeePost Scheduler**:
- Schedule and auto-publish to Twitter/X, Facebook, LinkedIn, Instagram
- Multi-file attachment support; per-platform character limit indicators
- Post states: draft → scheduled → published/failed with retry
- Visual post calendar (month view)
- Failed post auto-refund (1 post credit restored on failure)
- Support ticket system with admin reply thread

**BeePost Billing**:
- Stripe Checkout for subscription packages with webhook sync
- Affiliate program: generate referral code → earn commission on referred user purchases
- Wallet: deposit credits via Stripe, request withdrawals (PayPal/bank transfer)
- Admin: approve/reject withdrawals, view referral history
- External HTTP cron endpoint: `POST /api/publish/cron/run` with `X-Cron-Secret` header (for VPS crontab / cPanel)

**SocialAI Brand Builder**:
- AI Brand Kit: mission, vision, values, 3 audience personas, brand voice profile, 6 tone options, social media strategy, 5 tagline variations
- AI Post Composer: per-platform content generation (Twitter 280 chars, LinkedIn professional, Instagram with hashtags)
- DALL-E 3 image generation per post
- 37 AI prompt templates across 5 categories (Ads, Business, Emails, Social Media, Other) with user-defined placeholder fields
- Credit system: every AI action deducts credits; admin can grant credits
- Autopilot: AI auto-publishes scheduled content every 5 minutes

---

## Module 11 — SocialVibe AI Scheduler (`/api/socialvibe`)
*Source: SocialVibe*

- **Multi-platform scheduler**: Facebook, Instagram, Twitter/X, LinkedIn from one composer
- **AI Writer**: generate posts with 3 variations, rewrite existing content, hashtag suggestions (GPT-4o-mini)
- **Visual content calendar**: month view with color-coded status dots (draft/scheduled/published/failed); click any day to compose
- Post states: draft → scheduled → publishing → published/failed with retry
- **Post templates**: save and reuse best-performing content with category organization
- Native OAuth account connection per platform with token storage
- **Team collaboration**: invite members with role-based permissions (admin/editor/viewer)
- Separate scheduler worker: SocialVibe post publisher cron (every 1 min)
- Support ticketing with admin reply thread
- 14-day trial plan tier
- Stripe Checkout + Billing Portal + webhook sync; 4 plan tiers (Free/Trial/Pro/Agency)

---

## Module 12 — StackPosts Multi-Team Social (`/api/sp`)
*Source: StackPosts*

Enterprise-grade social media publishing platform:

**Multi-team Architecture**:
- Every resource scoped to a team, not user
- Team roles: admin/editor/viewer with granular permissions
- Member invite via email with pending/active status

**Networks**: Facebook, Instagram, Twitter/X, LinkedIn, TikTok, Pinterest, YouTube (stub), Telegram, Threads

**Post Composer**:
- Per-account content customization
- Media attachments (image/video/GIF) with team media library
- Scheduling with repost/recycle (repostFrequency in days, repostUntil date)
- Post states: draft/scheduled/publishing/published/failed
- Campaign labels and color-coded labels for organization
- Post duplication

**AI Studio**: caption generation (3 variations), rewrite, hashtag suggestions, saved AI prompt templates, AI auto-post campaigns

**RSS Auto-Posting** (10-minute cron): poll RSS feeds, auto-post new items with Handlebars template, skip already-posted GUIDs

**AI Campaigns** (15-minute cron): recurring AI-generated posts at hourly/daily/weekly intervals

**Blog CMS**: article categories, tags, SEO-friendly slugs, draft/published states, public listing + admin CRUD

**Affiliate Program**: referral codes, commission tracking, withdrawal requests, admin approve/reject with automatic refund on rejection

**Support Desk**: threaded replies, priority levels, admin inbox

---

## Module 13 — ChatFlow Messenger + eCommerce (`/api/chatflow`)
*Source: ChatFlow*

Facebook Messenger chatbot builder with e-commerce:

**Messenger Automation**:
- Connect Facebook Pages (mock mode — no Facebook App required; live mode — real Messenger webhooks)
- Keyword trigger automation rules with exact/contains/any matching
- Default reply rule for unmatched messages
- Welcome message for new subscribers
- Automated reply messages (multiple replies per rule)
- Enroll subscribers in drip sequences from automation rules

**Drip Sequences** (1-minute cron):
- Multi-step sequences with per-step delay in minutes
- Enrollment tracking with step index and nextSendAt
- Completion/stopped status management

**Broadcasts**:
- Bulk message to all subscribers or filtered by tag
- Mock/live send mode; per-subscriber delivery tracking
- Schedule broadcasts for future sending

**Subscriber Management**:
- Auto-create subscribers from Messenger webhook events
- Tags and segmentation
- Full conversation inbox with outbound agent replies

**E-Commerce Storefront**:
- Product categories and catalog management
- Public storefront (no login) accessible at `/api/chatflow/store/:tenantId/products`
- Public checkout endpoint — creates orders with customer details and item list
- Order management: status tracking (pending/confirmed/processing/shipped/delivered/cancelled), payment status (unpaid/paid/refunded)

**Multi-tenant**: each business gets isolated data; Superadmin manages all tenants

---

## Module 14 — Teleman VoIP & Telemarketing (`/api/teleman`)
*Source: Teleman*

Browser-based VoIP calling platform powered by Twilio:

**Browser Dialer (WebRTC)**:
- Twilio Voice SDK dialpad in the browser — no phone hardware needed
- Live call timer, mute/unmute, hang up controls
- Quick-dial from contacts list
- Call script display panel during active calls
- Twilio voice token endpoint for SDK initialization

**Per-tenant Twilio Credentials**:
- Multiple Twilio accounts per tenant (Provider model)
- Store Account SID, Auth Token, API Key, API Secret, App SID, From Number
- Connectivity test — verifies credentials against Twilio API
- Default provider selection

**Departments**: organize agents into calling departments with assigned Twilio numbers

**Contacts**: full CRUD + CSV import; notes; tags; lead score/status (new/contacted/qualified/converted/lost); DNC (Do Not Call) flag

**Call Scripts**: create and manage call scripts with categories; display during active calls

**Campaigns**:
- Outbound calling campaigns with agent assignment
- Call hours restriction (start/end time, working days, timezone)
- Max attempts per contact with configurable interval
- Contact status tracking per campaign (pending/called/answered/voicemail/failed/converted/dnc)
- Disposition capture

**SMS Marketing**: single send and bulk campaign via Twilio or Vonage

**Call History**: full log with to/from/direction/status/duration/recording URL

**Support Tickets**: threaded replies, priority levels, per-tenant isolation

---

## Module 15 — Design Studio (`/api/design`)
*Source: PixaGuru*

Canva-style graphic design platform powered by Fabric.js:

**Canvas Editor**:
- Drag-and-drop design editor with Fabric.js 5.3.1 (loaded via CDN)
- Canvas sizes: presets (Instagram Post 1080×1080, Story 1080×1920, YouTube thumbnail, Facebook, LinkedIn, A4, Presentation 16:9) + custom size
- **Text tool**: fonts (8+ web fonts), size, bold/italic/underline, color, alignment, letter spacing, line height
- **Shape tools**: rectangle, circle, triangle, line with fill/stroke/corner radius/opacity
- **Image tools**: upload from device, resize, opacity
- **Background**: solid color, gradient presets, custom image
- **Layers panel**: reorder, hide, lock objects; object type indicators
- **Properties panel**: position (X/Y), size (W/H), rotation, opacity, fill color, stroke color/width
- **Layer ordering**: Bring to Front, Bring Forward, Send Backward, Send to Back
- **Undo/Redo**: 30-step history
- **Auto-save**: saves to MongoDB every 2 seconds when changes detected

**Export**:
- Export as PNG, JPG, or SVG at native canvas resolution
- Save thumbnail (JPEG, 30% scale) to project card

**Templates**:
- Browse templates by category
- Premium templates locked to paid plans (requirePremium check)
- Usage counter per template; "Use Template" creates project copy

**Media Library**:
- Upload images from device (JPEG, PNG, GIF, WebP, SVG)
- **Remove.bg** background removal via Remove.bg API
- **Unsplash** stock photo search — browse and add to library
- File management with delete

**Sharing**: public share link with unique token — viewers can download without account

---

## Module 16 — Mailer Email + SMS (`/api/mailer`)
*Source: XSender*

Mass email and SMS marketing platform:

**Email Providers**: SMTP, SendGrid, Mailgun (per-user API keys stored in `user.settings.mailer`)
**SMS Providers**: Twilio, Vonage (per-user credentials)

**Contacts**:
- Full CRUD with first/last name, email, phone, custom fields
- CSV import with smart duplicate detection
- Assign to multiple groups
- Status: active/unsubscribed/bounced/complained
- Per-contact stats: emails sent/opened/clicked, SMS sent

**Groups**: color-coded groups with contact count, tags

**Templates**: reusable email/SMS templates with Handlebars variables (`{{firstName}}`, `{{email}}`, `{{phone}}`, any custom field)

**Campaigns** (4-step wizard):
1. Type & Name — choose email or SMS, select provider
2. Audience — all contacts, or specific groups
3. Content — HTML body, plain text fallback, subject, from name/email; or SMS body with character counter
4. Review & Schedule — send now or schedule for future

**Campaign Engine**:
- Background async send (doesn't block the API response)
- Per-recipient status tracking (pending/sent/delivered/opened/clicked/bounced/failed)
- Handlebars variable substitution per recipient
- Pause in-flight campaigns
- Track opens, track clicks, unsubscribe link (configurable per campaign)

**Scheduled Campaigns** (1-minute cron): auto-triggers campaigns with past `scheduledAt`

**Analytics**: total campaigns, sent, opened, clicked, bounced, failed across all campaigns; contact count

---

## Module 17 — ToolsAI GPT-4 Suite (`/api/toolsai`)
*Source: ToolsAI*

Full-featured AI tools SaaS:

**AI Writer** (SSE streaming):
- Template-driven content generation via GPT-4o-mini
- Server-Sent Events for real-time streaming output
- 30+ built-in templates across categories (Ads, Blog, Email, Social, Business, Code)
- Saved document library with bookmark toggle
- Word/token usage tracking per user

**AI Code Generator** (SSE streaming):
- Language selector, description input
- Stream generated code directly to browser

**AI Image Generation**:
- DALL-E 3 — 1024×1024, vivid/natural style, standard/HD quality
- Image gallery with saved history

**Text-to-Speech**:
- OpenAI TTS-1/HD models, 6 voice options (alloy, echo, fable, onyx, nova, shimmer)
- Download as MP3

**Speech-to-Text** (Whisper):
- Upload audio file → transcription text

**Multi-turn AI Chat**:
- Persistent conversation history per session
- Template-based system prompts
- Multiple concurrent conversations

**Support Tickets**: threaded admin reply system

**Blog CMS** (public):
- Articles with categories, tags, thumbnail, SEO fields
- Public listing and detail pages
- Admin CRUD (create/update/delete, draft/published states)
- View count tracking

**Plan-based Billing**: Stripe subscriptions per plan tier, with limits per plan (documents/month, words/month, images/month, speech minutes, chat messages)

---

## Module 18 — SiteSpy Analytics (`/api/sitespy`)
*Source: SiteSpy*

Visitor analytics + URL shortener + SEO tools:

**Visitor Analytics Pixel**:
- Embeddable `tracker.js` script (served from `/api/sitespy/tracker/:code/tracker.js`)
- Captures: page URL, referrer, page title, visitor cookie (30-day), session ID, new/returning flag
- Geo detection via IPInfo.io (country, city, region, coordinates)
- Browser, browser version, OS, device type (desktop/mobile/tablet)
- Traffic source classification (organic/direct/referral/social/email/paid)
- All data stored in `SSPVisitor` collection per tracked website

**Analytics Dashboard** (per site):
- Total visitors, unique visitors, new visitors
- Traffic sources breakdown (pie/bar chart)
- Device distribution (desktop/mobile/tablet)
- Top browsers (top 10)
- Top pages (top 10)
- Date range filtering

**URL Shortener**:
- Internal short links (yourplatform.com/s/:code)
- Bitly integration (via per-user API key)
- Rebrandly integration
- Custom slug support
- Click tracking with IP, country, browser, referrer, timestamp
- Redirect with 301 permanent redirect

**Domain Tools**:
- WHOIS lookup (via `whois` npm package)
- DNS lookup — A, AAAA, MX, TXT, NS, CNAME record types
- Security scan — VirusTotal (malicious detection count) + Google Safe Browsing (threat type)

**Keyword Tracking**: track keyword positions per domain + search engine, history over time

---

## Module 19 — Social Proof (`/api/social`)
*Source: social-proof-mern, smartpanel-socialproof-merged*

30+ notification widget types for conversion optimization:

**Notification Types**: live visitor counter, recent conversion/purchase, email collector form, countdown timer, coupon widget, video popup, review/rating display, social share bar, WhatsApp chat button, cookie consent notice, custom HTML widget, subscriber milestone, trust badge, product hot streak, stock urgency counter

**Campaign Management**: group multiple notifications under one embed snippet, per-campaign settings

**Embeddable JS Pixel** (`/api/social/pixel/pixel.js`):
- Lightweight tracking script served as JavaScript
- Captures impressions, clicks, conversions, leads with geo + device detection
- `POST /api/social/pixel/lead` — form widget lead capture endpoint

**Lead Collection**:
- Email, name, phone from form widgets
- Export as CSV (GET `/api/social/user/leads/export?campaignId=...`)

**Notification Handlers** (per-user dispatch on each lead):
- Webhook: POST to any URL with optional `X-Handler-Secret` header
- Email: Nodemailer SMTP notification
- Slack: rich attachment format with field blocks
- Discord: embed format with color coding
- Telegram: Markdown message to bot

**Domain Allowlist**: restrict which domains can load campaign widgets

**Billing**: Stripe Checkout + Billing Portal + webhook sync; 4 plan tiers

---

## Module 20 — SMM Panel (`/api/smm`)
*Source: SmartPanel, SMMlab, PanelNova*

Full-featured social media marketing reseller panel:

**Service Catalog**: categories, 11 service types (default, custom_comments, package, subscriptions, drip-feed, mentions_custom_list, mentions_with_hashtags, and more)

**Ordering**:
- Place orders by link + quantity
- Mass/bulk order via CSV-style input
- Order refill requests
- Order status tracking: pending → in progress → processing → completed

**Payment**: PayPal create/capture, Stripe Checkout, manual payment methods, coupon validation

**Deposits** (SMMlab addition):
- Multi-gateway deposit flow (PayPal, Stripe, manual/bank)
- Admin approve/reject with atomic balance credit
- Deposit history per user

**Service Favorites**: star/unstar services for quick access

**Subscriptions**: create, pause, resume automated recurring orders

**Drip-feed** (1-minute cron): drip-feed order delivery

**API Order Submit** (1-minute cron): submit new orders to upstream provider API

**API Order Sync** (5-minute cron): sync order statuses from provider

**Reseller Public API v1** (`/api/smm/v1`): action-based — services, add, status, status_multi, balance, refill, cancel

**Reseller Public API v2** (`/api/smm/v2`): PanelNova-format alias (compatible with different reseller scripts)

**Mock Delivery Mode** (2-minute cron): when `provider.isMockMode=true`, automatically advances orders through lifecycle (pending→in progress→processing→completed) with configurable timing — for demos without a real upstream provider

**Provider Sync**: sync service catalog from upstream provider with configurable markup %, check provider balance

**Cron Logs**: admin viewer for all cron job run history, status, duration, errors; clear logs older than N days

---

## Module 21 — Social Stream (`/api/stream`)
*Source: mern-social-stream, merged-stream-seo-mern*

Social media feed aggregator:

- Aggregate posts from **9 networks**: Twitter/X, Facebook, Instagram, YouTube, Reddit, TikTok, RSS, Pinterest, LinkedIn
- **6 display layouts**: Wall (masonry), Timeline, Carousel, Rotating, Ajax Tabbed, Ticker
- **4 color themes** per layout
- Save named stream configurations
- Embeddable widget via `embed.js` for any external website
- Server-side caching with configurable TTL
- Infinite scroll with paginated loading
- Real-time search + per-network filter buttons
- Per-network stats dashboard
- Force re-fetch any account on demand

---

## Module 22 — AI Suite (`/api/ai`)
*Source: AIGen, AI Social Replier, Leonardo AI, merged-mern-saas*

7-in-1 AI generation platform:

**AI Social Reply Generator**:
- 3 AI providers: GPT-4o-mini, Gemini 2.0 Flash, Mistral Small
- 5 tone styles: Professional, Casual, Witty, Empathetic, Formal
- 10+ language output options
- Custom prompt override (paid plans)
- Reply history with filters, favourites, rating/feedback
- Per-plan monthly generation limits

**AIGen Multi-Modal Generator**:
- **Text generation** with real-time SSE streaming
- **Code generation** for any programming language
- **Translation** across 20+ languages
- **DALL-E 2/3 + Stable Diffusion** image generation with style presets
- **Text-to-Speech** via OpenAI TTS-1/HD — 6 voice options
- **Speech-to-Text** transcription via OpenAI Whisper
- **Image-to-Video** animation via Stability AI
- 35 prompt templates across 5 categories
- Credit wallet: deduct per usage type; admin grant credits; Stripe Checkout for credit packages

**Leonardo AI Image Generator**:
- KingStudio API (Stable Diffusion) + DALL-E 2/3
- Model selector, size selector, style picker per generation
- Public image gallery with infinite scroll + private images + favourites
- Optional watermarking on thumbnails via sharp
- AWS S3 or Wasabi storage

---

## Module 23 — Pen AI (`/api/pen`)
*Source: AI2Pen*

Template-driven AI content platform:

- **AI content generation**: 25+ template categories (marketing copy, blog posts, product descriptions, emails, social posts, ad copy, etc.)
- **DALL-E 3 + Stable Diffusion XL** image generation
- **Text-to-Speech**: OpenAI, Google Cloud, Azure Neural — 3 TTS providers, 6 voice options
- Multi-turn AI chat sessions with full session history
- **Team/agency mode**: invite members with individual sub-quotas
- 3 independent usage quotas: tokens, images, audio minutes (tracked as `penTokenUsed`, `penImageUsed`, `penAudioUsed` on User model)
- Own `/pen` auth namespace with Pen-specific JWT middleware
- Stripe subscription billing with plan-gated module access
- Saved/favourite documents library; paginated generation history with soft-delete
- Admin: users CRUD, credit top-up, package assign, template & group CRUD

---

## Module 24 — ZAM Nexus (`/api/zam`)
*Source: zam-nexus*

SEO mega-suite + CRM + lead generation platform:

**180+ Gemini AI SEO Tools** across 8 categories:

| Category | Tools |
|----------|-------|
| Keyword Research | Keyword Generator, Difficulty Checker, YouTube/Amazon/Bing Keywords, Long-tail, Semantic, Gap Analyzer |
| Content & AI | AI Writer, Rewriter, AI Detector, Plagiarism Checker, Grammar Checker, Readability, Meta Description Generator, Title Generator, FAQ Generator, Blog Outline |
| Technical SEO | SEO Audit, Robots.txt Analyzer, Schema Generator, Hreflang Generator, XML Sitemap Analyzer, Canonical Checker, Page Speed Advisor |
| Link Building | Backlink Analyzer, Broken Link Finder, Link Building Ideas, Anchor Text Generator, Guest Post Pitch Writer |
| SERP Analysis | SERP Snippet Preview, Featured Snippet Optimizer, People Also Ask Generator, Competitor Analysis |
| Local SEO | Local SEO Audit, Google My Business Description, Local Keyword Generator, NAP Consistency Checker |
| Image SEO | Alt Text Generator, Image Filename Generator |

**CRM Contacts**:
- Full CRUD with 20+ fields (name, email, phone, company, title, website, social links, address, coordinates, tags, status, custom fields)
- CSV import/export
- Bulk delete
- **Smart merge & deduplication**: detect duplicates by email or by name+company; merge selected contacts (auto-fill empty fields from duplicates, merge tags, move notes)
- **AI enrichment** (Gemini): generates bio, skills, industry insights, company size, estimated revenue, LinkedIn/Twitter profiles
- Geographic map view data (lat/lng on each contact)
- Contact notes with type (note/call/email/meeting/task)
- Lead scoring and status tracking

**Lead Generation**:
- Multi-filter location wizard: keyword + country/state/city/postal code + job title/company/industry
- Background AI-powered lead generation (Gemini generates realistic leads while you wait)
- View leads per search job
- Import leads to CRM contacts (dedup check)
- Export leads as CSV

**Asset Library**: upload and manage images, documents, videos, audio files; tags

---

## Cron Jobs (16 total)

| # | Job | Interval | Module |
|---|-----|----------|--------|
| 1 | SMM drip-feed runner | 1 min | SMM Panel |
| 2 | SMM API order submit | 1 min | SMM Panel |
| 3 | SMM API order sync | 5 min | SMM Panel |
| 4 | PanelNova mock delivery | 2 min | SMM Panel |
| 5 | BeePost post publisher | 1 min | Publish |
| 6 | BeePost AI autopilot | 5 min | Publish |
| 7 | BeePost token/usage reset | Daily midnight | Publish |
| 8 | BeePost plan expiry check | Daily 1am | Publish |
| 9 | StackPosts post publisher | 1 min | StackPosts |
| 10 | StackPosts RSS auto-posting | 10 min | StackPosts |
| 11 | StackPosts AI campaigns | 15 min | StackPosts |
| 12 | Mailer scheduled send | 1 min | Mailer |
| 13 | Mailer scheduled dispatch | 30 min | Mailer |
| 14 | ChatFlow sequence drip | 1 min | ChatFlow |
| 15 | SocialVibe post publisher | 1 min | SocialVibe |
| 16 | WhatsML campaign sender | 1 min | WhatsML |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Lazy loading, Recharts, TanStack Query |
| Backend | Node.js 20, Express 4, MongoDB 7 + Mongoose 8 |
| Auth | JWT access + refresh token rotation, bcrypt hashing |
| AI | OpenAI GPT-4o, DALL-E 3, Whisper, TTS; Google Gemini; Mistral; Stability AI |
| Payments | Stripe (6 separate integrations), PayPal, Razorpay, Paystack |
| Email | Nodemailer SMTP, SendGrid, Mailgun |
| SMS | Twilio, Vonage |
| Storage | Local disk, AWS S3, Wasabi (configurable per module) |
| WhatsApp | Meta Cloud API v18.0, Baileys Web QR sessions |
| VoIP | Twilio Voice SDK (WebRTC browser dialer) |
| Design | Fabric.js 5.3.1 (canvas editor) |
| Social Networks | Twitter/X, Facebook, Instagram, LinkedIn, TikTok, Pinterest, YouTube, Telegram, Threads |
| Real-time | Socket.IO (WhatsApp chat) |
| Background Jobs | node-cron (16 jobs) |
| Process Manager | PM2 cluster mode |
| Reverse Proxy | Nginx |
