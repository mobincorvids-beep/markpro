# MarkPro v5 — User Manual

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [SEO Tools Hub](#3-seo-tools-hub)
4. [SEO Manager](#4-seo-manager)
5. [Cyber / Dev Tools](#5-cyberdev-tools)
6. [Rank Tracker](#6-rank-tracker)
7. [Bio Pages (PixaURL)](#7-bio-pages-pixaurl)
8. [BioLinks (66BioLinks)](#8-biolinks-66biolinks)
9. [Document Vault](#9-document-vault)
10. [WhatsApp Marketing](#10-whatsapp-marketing)
11. [WhatsML Dual-Channel WhatsApp](#11-whatsml-dual-channel-whatsapp)
12. [Publish & Brand AI](#12-publish--brand-ai)
13. [SocialVibe AI Scheduler](#13-socialvibe-ai-scheduler)
14. [StackPosts Multi-Team Social](#14-stackposts-multi-team-social)
15. [ChatFlow Messenger + eCommerce](#15-chatflow-messenger--ecommerce)
16. [Teleman VoIP & Telemarketing](#16-teleman-voip--telemarketing)
17. [Design Studio](#17-design-studio)
18. [Mailer Email & SMS](#18-mailer-email--sms)
19. [ToolsAI GPT-4 Suite](#19-toolsai-gpt-4-suite)
20. [SiteSpy Analytics](#20-sitespy-analytics)
21. [Social Proof Widgets](#21-social-proof-widgets)
22. [SMM Panel](#22-smm-panel)
23. [Social Stream](#23-social-stream)
24. [AI Suite](#24-ai-suite)
25. [Pen AI](#25-pen-ai)
26. [ZAM Nexus](#26-zam-nexus)
27. [Account & Billing](#27-account--billing)
28. [Admin Panel](#28-admin-panel)

---

## 1. Getting Started

### Registration & Login
1. Visit your MarkPro URL (e.g. `https://yourdomain.com`)
2. Click **Sign Up** → Enter name, email, password
3. Check email for verification link (if enabled by admin) → click to verify
4. Log in with your email and password

### First Login
After logging in you'll see the **Dashboard**. The left sidebar contains all 24 modules. Click any section header to expand it.

### Plan Selection
- Many modules require an active subscription plan
- Go to **Account → Billing** to view available plans
- Click **Upgrade** on any plan to go to Stripe Checkout
- After payment, your plan activates immediately

---

## 2. Dashboard Overview

The main dashboard shows:
- **Quick Stats**: posts scheduled, campaigns sent, contacts count, AI credits used
- **Recent Activity**: last 5 actions across all modules
- **Quick Links**: one-click shortcuts to the most-used features

**Sidebar Navigation**:
- Click any module name in the left sidebar to navigate
- Active section highlighted in purple
- Hover over collapsed icons to see labels
- Admin users see an extra **Admin** section at the bottom

---

## 3. SEO Tools Hub

**Path**: Sidebar → SEO Tools

### Running a Tool
1. Click **SEO Tools** in the sidebar
2. Browse tools by category (Content, Meta & Tags, Domain & DNS, etc.)
3. Click any tool card
4. Fill in the required inputs (keyword, URL, domain, text, etc.)
5. Click **Run** or **Analyze**
6. Results appear below; most tools show a detailed breakdown

### Useful Tools for Beginners
- **SEO Audit**: enter your website URL → get a 30+ point analysis with score
- **Keyword Suggestions**: enter a seed keyword → get 20 related keywords
- **Meta Tag Generator**: fill in page details → copy generated HTML tags
- **WHOIS Lookup**: check who owns a domain and when it expires

### Tool History
- Your last 50 tool runs are saved under **SEO Tools → History**
- Click any history entry to re-view results

---

## 4. SEO Manager

**Path**: Sidebar → SEO Manager

The SEO Manager lets you control meta tags for every page of your website from one dashboard.

### Adding a New Page
1. Click **+ New Page**
2. Enter the **Slug** — this is your page identifier (e.g. `/about`, `/products/shoes`)
3. Fill in **Title** (50–60 chars recommended) and **Description** (120–160 chars)
4. Click **Preview Tags** to see the generated HTML without saving
5. Click **Save Page**

### Editing a Page (Full Editor)
1. Find the page in the list → click **Edit**
2. The 5-tab editor opens:

**Tab 1 — Meta**: Basic title, description, keywords, robots directive, canonical URL, webmaster verification codes

**Tab 2 — Open Graph**: Optimizes how your page appears when shared on Facebook, WhatsApp, LinkedIn. Fill in OG title, description, image URL, page type (website/article/product)

**Tab 3 — Twitter Card**: Controls Twitter/X share previews. Select card type (Summary Large Image recommended), add image URL

**Tab 4 — JSON-LD**: Add structured data schemas. Click **+ Add Schema**, select type (Article, Product, Organization, BreadcrumbList), enter JSON properties

**Tab 5 — Advanced**: hreflang tags for multilingual sites, pagination links, AMP link, custom `<head>` HTML

3. Click **Preview Tags** at any time to see the full generated HTML
4. Click **Save**

### Getting Your Tags
- From the pages list, click the **📋 button** next to any page
- The generated HTML meta tags are copied to your clipboard
- Paste into your website's `<head>` section

### Bulk Import
1. Click the pages list → **Import JSON** or **Import CSV**
2. JSON format: array of page objects with `slug` and other fields
3. CSV format: columns `slug`, `title`, `description`, `keywords`, `robots`, `canonical`
4. Duplicate slugs are updated (upsert)

### URL Audit
1. Click **🔍 Audit URL**
2. Enter any public URL
3. Get an instant SEO score (0–100) with specific issues and suggestions

---

## 5. Cyber/Dev Tools

**Path**: Sidebar → Dev Tools

### Finding a Tool
- Use the **search bar** at the top of the tools page — searches by name instantly
- Or browse by category tab: Text, Security, Color, Code, Network, Misc

### Using Tools
All tools work without any account connection:
1. Select a tool
2. Enter your input in the text area or form fields
3. Click **Run** or the tool button
4. Output appears instantly; most have a **Copy** button

### Popular Tools
- **Base64 Encoder/Decoder**: paste text → get base64, or paste base64 → get text
- **JSON Validator**: paste JSON → validates and beautifies
- **Password Generator**: set length + complexity → generate secure password
- **QR Code Generator**: enter any text/URL → download QR image
- **Hash Generator**: enter text → get MD5/SHA-1/SHA-256 in one click
- **Case Converter**: paste text → convert to camelCase, snake_case, etc.

---

## 6. Rank Tracker

**Path**: Sidebar → Rank Tracker

### Running a Site Audit
1. Click **+ New Audit** or select a tool from the toolbar
2. Enter your website URL
3. Select the audit type (Full SEO Audit, PageSpeed, Meta Tags, etc.)
4. Click **Run**
5. Results appear with a numerical score and itemised issues sorted by severity

### Creating a Project
1. Click **+ New Project**
2. Enter your website domain (e.g. `example.com`)
3. Save — the project now appears in your project list
4. Click the project → **Run Report** to start a new audit
5. All reports save automatically under the project history

### Reading Audit Results
- Green checkmarks = passing
- Orange warnings = recommendations
- Red ✕ = critical issues to fix
- Click any issue to expand details and see the fix suggestion

### Billing
- Free tier: 1 project, 5 reports/month
- Pro: 10 projects, 100 reports/month (Stripe Checkout)
- Agency: unlimited

---

## 7. Bio Pages (PixaURL)

**Path**: Sidebar → Bio Pages

### Creating Your Bio Page
1. Click **Create Campaign**
2. Choose a name for your campaign
3. In the editor, click sections to add:
   - Avatar/photo
   - Headline and bio text
   - Social media links (Instagram, Twitter, TikTok, etc.)
   - Custom links with titles and URLs
   - Contact button
4. Click **Preview** to see how it looks
5. Click **Publish**

### Customizing Your Page
- Click **Theme** to choose from template designs (color palettes, fonts, backgrounds)
- Drag sections up/down to reorder
- Toggle sections visible/hidden without deleting

### Your Bio Link
- Your page URL is: `yourdomain.com/bio/:your-username`
- Share this link in all social media bios

### Analytics
- Click **Analytics** on any campaign
- See: total visits, unique visitors, link clicks, traffic source, device breakdown
- Date range filter (7 days / 30 days / 90 days / custom)

---

## 8. BioLinks (66BioLinks)

**Path**: Sidebar → BioLinks

### Creating a Bio Link Page
1. Click **+ Create Link**
2. Enter your username/slug (this becomes your public URL)
3. Pick a theme template from the gallery
4. Click **Add Block** to add content:

### Adding Blocks
Click **+ Add Block** → choose from 37 types:

| Block | Use Case |
|-------|----------|
| **Link** | Any URL with title + icon |
| **Header** | Section title text |
| **Image Grid** | 2–4 image gallery |
| **Video** | YouTube/Vimeo embed |
| **Countdown** | Timer to an event/launch |
| **FAQ** | Accordion Q&A |
| **Product Card** | Product with buy button |
| **Newsletter Signup** | Email capture form |
| **Social Proof** | Testimonial or review |
| **WhatsApp Chat** | WhatsApp direct link button |
| **PayPal Button** | Donation/payment button |

### Reordering Blocks
- Drag the ≡ handle on any block to reorder

### Short Links
1. Click **Short Links** in the top tabs
2. Enter a long URL → click **Shorten**
3. Optionally enter a custom slug
4. Copy your short link: `yourdomain.com/s/:slug`

### QR Codes
1. Click **QR Codes** tab
2. Enter text or URL → click **Generate**
3. Download as PNG or SVG
4. Color customization available

### Analytics
- Click **Statistics** on any bio link
- See clicks per block, total visits, geographic breakdown, device types, referrer sources

### Redeeming a Coupon Code
1. Go to **Account → Billing**
2. Find the **Redeem Code** section
3. Enter your coupon or redeem code
4. **Coupon**: applies a discount to your next plan purchase
5. **Redeem**: activates a plan immediately (no payment required)

---

## 9. Document Vault

**Path**: Sidebar → Document Vault

### Uploading Documents
1. Click **Upload Files** (or drag-and-drop onto the upload zone)
2. Select one or multiple files (max 50MB each)
3. Files appear in the current folder

### Organizing with Folders
1. Click **+ New Folder** → enter a name and pick a color
2. Drag files into folders
3. Click a folder to open it; click **← Back** to go up

### Sharing a Document
1. Click the **Share** icon on any file
2. Choose:
   - **Share with user**: search by email; set permission (view/edit/download)
   - **Public link**: anyone with the link can access without login
3. Click **Copy Link** to share

### File Requests
Use this to get files from clients or partners without them needing an account:
1. Click **File Requests** in the sidebar
2. Click **+ New Request** → enter title, description, expiry date
3. Copy the unique upload link and send it to your contact
4. They visit the link and upload files directly
5. You get a notification when they upload

### Version Control
1. Click any file → **Versions**
2. Click **Upload New Version** to add a revision
3. All previous versions are listed with upload date
4. Click **Restore** on any past version to make it the current one

### Audit Trail
- Click any file → **Activity Log**
- See every action: who viewed, downloaded, edited, or shared the file and when

### Setting Expiry Dates
1. Click a file → **Edit Details**
2. Set an **Expiry Date**
3. On that date, the file becomes inaccessible to shared users (not deleted)
4. You receive an email reminder 7 days before expiry

---

## 10. WhatsApp Marketing

**Path**: Sidebar → WhatsApp

### Connecting Your WhatsApp Business Account
1. Go to **Settings** in the WhatsApp module
2. Enter your Meta WhatsApp Cloud API credentials:
   - Phone Number ID
   - WhatsApp Business Account ID
   - Permanent Access Token
3. Click **Save** — your number is now active

### Adding Contacts
1. Click **Contacts → + Add Contact**
2. Enter name, phone number (with country code, e.g. +15551234567), email
3. Or click **Import CSV** → upload a CSV with `name`, `phone`, `email` columns

### Sending a Bulk Campaign
1. Click **Campaigns → + New Campaign**
2. Select your contacts or a contact group
3. Choose message type: Text or Template (for template messages, sync first)
4. Write your message using merge fields: `{{name}}`, `{{phone}}`
5. Click **Send** or schedule for later
6. Campaign status updates in real-time

### Syncing WhatsApp Templates
1. Go to **Templates**
2. Click **Sync from Meta**
3. Your approved Meta message templates appear in the list
4. Use them in campaigns for higher deliverability

### Live Chat Inbox
1. Click **Chat Inbox**
2. All incoming messages appear on the left
3. Click a conversation to open it on the right
4. Type a reply and press **Send**
5. Click **AI Suggest** to get an AI-generated reply based on the conversation

### Setting Up Auto-Reply Bots
1. Click **Message Bots → + New Bot**
2. Choose trigger: **Keyword** (e.g. when someone sends "PRICE") or **Template**
3. Write your auto-reply message
4. Click **Save** — the bot activates immediately

---

## 11. WhatsML Dual-Channel WhatsApp

**Path**: Sidebar → WhatsML

WhatsML gives you two ways to connect WhatsApp without requiring a Meta Business Account.

### Channel 1 — Meta Cloud API (Official)
1. Click **+ Connect Cloud API**
2. Enter your Meta credentials (Phone Number ID, Access Token)
3. Status shows "Connected" when active

### Channel 2 — WhatsApp Web QR (No Meta Account Needed)
1. Click **+ New Session**
2. A QR code appears — scan it with the WhatsApp app on your phone:
   - Open WhatsApp → three dots (⋮) → Linked Devices → Link a Device
3. Scan the QR code → your WhatsApp Web session is now active
4. Status updates to "Connected"

> **Note**: The Baileys microservice must be running (`BAILEYS_SERVICE_URL` configured) for QR sessions.

### Unified Inbox
- All conversations from both channels appear together
- Channel type badge (Cloud/Web) on each conversation
- Click **🤖 AI** button to get an AI-powered reply suggestion

### Bulk Campaigns
1. Click **Campaigns → + New Campaign**
2. Select channel (Cloud API or Web session)
3. Choose recipients (individual customers, groups, or tags)
4. Write your message with `{{name}}` substitution
5. Set a delay between messages (e.g. 5 seconds) to avoid being flagged as spam
6. Click **Start Campaign**

### Number Checker
1. Click **Number Checker**
2. Paste phone numbers (one per line, with country code)
3. Click **Check** — validates which numbers have active WhatsApp accounts
4. Download results as CSV

### AI Knowledge Base (RAG Training)
1. Click **AI Training**
2. Click **+ Add Training Set**
3. Enter: topic name, content text (your FAQs, product info, policies)
4. Save — the AI will use this as context when generating auto-replies

---

## 12. Publish & Brand AI

**Path**: Sidebar → Publish

### Connecting Social Accounts
1. Click **Social Accounts → + Connect**
2. Choose platform (Twitter/X, Facebook, Instagram, LinkedIn)
3. Authorize via OAuth (live) or enter mock credentials (testing)

### Creating a Post
1. Click **+ New Post**
2. Write your post content in the composer
3. Add images or videos if desired
4. Select which connected accounts to post to
5. Choose: **Post Now** or set a **Schedule Date/Time**
6. Click **Save**

### Using the AI Writer
1. Click **AI Writer** in the post composer
2. Enter a topic or product name
3. Select platform (Twitter/X, LinkedIn, Instagram, etc.)
4. Choose tone (professional, casual, witty, etc.)
5. Click **Generate** — 3 variations appear
6. Click any variation to use it as your post content
7. Edit if needed, then post or schedule

### Content Calendar
- Click **Calendar** to see all scheduled posts in a monthly calendar view
- Click any day to see posts scheduled that day
- Click any post to edit or delete it

### Using the Brand Builder (SocialAI)
1. Click **Brand Builder**
2. Fill in your brand info: company name, industry, target audience, tone
3. Click **Generate Brand Kit** — AI creates:
   - Mission statement, Vision, 3 brand personas
   - 5 taglines, Brand voice guide, Social media strategy
4. Use the generated content in your posts and marketing

### Affiliate Program
1. Click **Affiliate** in the Publish sidebar
2. Click **Generate Code** to get your unique referral link
3. Share your link — earn 10% commission for every paying referral
4. Check your **Wallet** for earned commissions
5. Click **Request Withdrawal** → enter amount, method, account details

---

## 13. SocialVibe AI Scheduler

**Path**: Sidebar → SocialVibe

### Connecting Your Social Accounts
1. Click **Accounts → + Connect**
2. Select the platform (Facebook, Instagram, Twitter, LinkedIn)
3. Enter your account name and access credentials
4. Account appears in your list with follower count and active status

### Composing a Post
1. Click **+ Compose** or click any day in the calendar
2. Left panel: Use AI to generate content
   - Enter what you want to post about
   - Select target platform
   - Click **Generate 3 Variations**
   - Click a variation to use it
3. Right panel: Finalize your post
   - Edit content freely
   - Click **# Hashtags** to auto-generate relevant hashtags
   - Click **Rewrite** to get a different version
   - Select which accounts to post to (checkboxes)
   - Set schedule date/time (leave blank to post now)
4. Click **Schedule Post** or **Save Draft**

### Content Calendar
- Click **Calendar** in the sidebar
- Navigate months with ← → arrows
- Posts show as colored dots:
  - Blue = scheduled
  - Green = published
  - Red = failed
  - Grey = draft
- Click any post dot to see details

### Post Templates
1. Click **Templates**
2. Click **+ New Template**
3. Name your template, write the content (can include `{{topic}}` placeholders)
4. Category: select or create
5. When composing, click **Templates** to load a saved template

### Team Management
1. Click **Team**
2. Enter email + role (Admin/Editor/Viewer)
3. Click **Invite** — the user receives an email
4. Team members can log in and access your account with their role permissions:
   - **Admin**: full access
   - **Editor**: create/edit posts, no billing or team settings
   - **Viewer**: read-only, can see calendar and analytics

---

## 14. StackPosts Multi-Team Social

**Path**: Sidebar → StackPosts

### Creating a Team
1. Click **+ New Team** at the top
2. Enter team name → click **Create**
3. The team now appears in the team selector dropdown

### Connecting Social Accounts (per Team)
1. Select your team from the dropdown
2. Click **Accounts → + Connect**
3. Choose network and authorize

### Publishing a Post
1. Select your team
2. Click **+ New Post**
3. Compose content; assign to one or more accounts
4. Set media (optional): click paperclip to attach images/video from the team media library
5. Schedule or post now

### RSS Auto-Posting
1. Click **RSS Feeds → + Add Feed**
2. Enter the RSS/Atom feed URL
3. Set post template using Handlebars: `{{title}}\n{{description}}\n{{link}}`
4. Set max posts per fetch (e.g. 3)
5. Click **Save** — new items auto-post every 10 minutes

### AI Campaigns (Recurring AI Posts)
1. Click **AI Studio**
2. Write a general prompt (e.g. "motivational marketing tip")
3. Select target accounts and frequency (hourly/daily/weekly)
4. Click **Start Campaign** — AI generates and posts content automatically at the set interval

### Affiliate Withdrawals
1. Click **Affiliate** in the StackPosts sidebar
2. Check your earnings and referral count
3. Click **Request Withdrawal**
4. Enter amount, payout method (PayPal/bank), account details
5. Withdrawal processed within 1–5 business days (admin approval required)

---

## 15. ChatFlow Messenger + eCommerce

**Path**: Sidebar → ChatFlow

### Connecting a Facebook Page

**Mock Mode** (for testing — no Facebook required):
1. Click **+ Connect Page**
2. Select **Mock Mode**
3. Enter a page name
4. Click **Connect** — you can now test bot responses without real Messenger

**Live Mode** (real Facebook Messenger):
1. Set up a Facebook App at developers.facebook.com
2. Add the Messenger product and connect your Facebook Page
3. Set webhook URL to: `https://yourdomain.com/api/chatflow/webhook/messenger`
4. In MarkPro: click **+ Connect Page** → Live Mode → enter Page Access Token

### Creating Automation Rules
1. Click **Automation → + New Rule**
2. Select trigger type:
   - **Keyword**: fires when user sends a matching word/phrase
   - **Welcome**: fires when a new subscriber starts a conversation
   - **Default Reply**: fires when no other rule matches
3. Enter keywords (comma-separated for keyword rules)
4. Write reply messages (one or more; sent in sequence)
5. Click **Save** — rule activates immediately

### Drip Sequences
1. Click **Sequences → + New Sequence**
2. Name your sequence (e.g. "Onboarding Flow")
3. Click **+ Add Step**:
   - Write the message
   - Set delay (e.g. 60 = send 60 minutes after previous step)
4. Save the sequence
5. Enroll subscribers manually: click **Subscribers** → select user → **Enroll in Sequence**
6. Or auto-enroll from an automation rule: edit the rule → select sequence to enroll in

### Sending a Broadcast
1. Click **Broadcasts → + New Broadcast**
2. Write your message (use `{{name}}` for personalization)
3. Select target page and optionally filter by tag
4. Click **Send Now** — delivers to all matching subscribers

### Managing Your Store
**Products**:
1. Click **Products → + Add Product**
2. Enter name, price, stock quantity, description, category
3. Save

**Public Storefront**:
- Your store URL: `https://yourdomain.com/api/chatflow/store/:tenantId/products`
- Share this link — customers can browse and checkout without logging in

**Orders**:
1. Click **Orders** to see all customer orders
2. Update status: Pending → Confirmed → Processing → Shipped → Delivered
3. Mark payment as Paid/Refunded

---

## 16. Teleman VoIP & Telemarketing

**Path**: Sidebar → Teleman

### Setting Up Your Twilio Provider
1. Get a Twilio account at twilio.com (free trial available)
2. In Twilio Console, create a TwiML App and note the App SID
3. Get an API Key pair (API Key + API Secret) from Twilio Console
4. In MarkPro: click **Providers → + Add Provider**
5. Fill in: Account SID, Auth Token, API Key, API Secret, App SID, From Number
6. Click **Test Connection** — green = ready to call

### Making a Call (Browser Dialer)
1. Click **Dialer** in the Teleman sidebar
2. Click **Initialize Dialer** — loads Twilio Voice SDK (requires microphone permission in browser)
3. Status shows **Ready**
4. Type a phone number (with country code, e.g. +15551234567)
   - Or click a contact from **Quick Dial** panel
5. Click **📞 Call** — call connects through your browser
6. During call:
   - **Mute** — silences your microphone
   - **Hang Up** — ends the call
7. Call timer shows elapsed time

### Importing Contacts
1. Click **Contacts → ⬆ Import CSV**
2. CSV columns: `firstName`, `lastName`, `phone`, `email`, `company`, `jobTitle`
3. All rows with a valid phone number are imported
4. Duplicates (same phone number) are skipped automatically

### Creating a Calling Campaign
1. Click **Campaigns → + New Campaign**
2. Fill in:
   - Campaign name
   - Select Twilio Provider
   - Select a Call Script (see below)
   - Set call hours (e.g. 9am–5pm weekdays only)
   - Max attempts per contact (e.g. 3)
   - Retry interval in hours
3. Click **Save**
4. Click **+ Add Contacts** → select contacts or groups
5. Click **Start Campaign** (status changes to Active)

### Creating Call Scripts
1. Click **Scripts → + New Script**
2. Enter script name and category
3. Write the script content (the dialer shows this during active calls)
4. Use `{{firstName}}`, `{{company}}` as merge fields
5. Save — script is available when creating campaigns

### Sending SMS
1. Click **Dialer → Send SMS** tab (or use the SMS campaign button)
2. Enter recipient number, message body
3. Click **Send** — sent immediately via your active Twilio provider

---

## 17. Design Studio

**Path**: Sidebar → Design Studio

### Creating a New Design
1. Click **+ New Design**
2. Choose a size preset:
   - Instagram Post (1080×1080)
   - Instagram Story (1080×1920)
   - YouTube Thumbnail (1280×720)
   - Facebook Post (1200×630)
   - LinkedIn Banner (1584×396)
   - Custom Size (enter width and height in pixels)
3. Click **Create Design** — the canvas editor opens

### Canvas Editor — Quick Guide

**Left Toolbar** (top to bottom):
- **↖ Select**: click and drag to select objects; drag corners to resize
- **T Text**: click to add a text box; double-click to edit text
- **🖼 Image**: switch to image mode → click + Image to upload from device
- **🗑 Delete**: removes the currently selected object
- **▭ ▭ Shapes**: click Rectangle, Circle, Triangle, or Line to add shapes

**Right Panel — Properties**:
- When nothing selected: change canvas background color
- When object selected: adjust position (X/Y), size, rotation, opacity, fill color, stroke color and width

**For text objects, extra controls appear**:
- Font family (8 fonts available)
- Font size
- Bold, Italic, Underline toggles

**Layer Order** (right panel):
- **⤒ Front**: bring object in front of everything
- **⤓ Back**: send object behind everything
- **↑ Forward**: move up one layer
- **↓ Backward**: move down one layer

**Layers Panel** (top-left toggle ≡):
- Lists all objects on the canvas
- Text objects show first 20 characters
- Shape objects show type icon

### Undo / Redo
- Top bar buttons: ↩ (undo) and ↪ (redo)
- Up to 30 steps of history

### Zoom
- Dropdown in top bar: 25% → 200%

### Exporting Your Design
- **PNG**: lossless, transparent background support
- **JPG**: smaller file, white background
- **SVG**: vector format, scalable to any size
- Click the format button in the top bar → file downloads automatically

### Using Templates
1. Click **Templates** tab on the Design Dashboard
2. Browse by category
3. Click **Use Template** on any design → opens in editor with all elements loaded
4. Edit as needed → export

### Media Library
1. Click **Media Library** in the sidebar
2. **Upload**: drag files or click Upload (accepts JPG, PNG, GIF, WebP, SVG)
3. **Remove.bg**: click **✂ BG** on any uploaded image → AI removes background automatically
4. **Unsplash**: click the **Unsplash** tab → search for photos → click **Add to Library**

### Sharing a Design
1. Open any design in the editor
2. Click **🔗 Share** in the top bar
3. A shareable link is generated and copied to your clipboard
4. Anyone with the link can view and download the design (read-only)

---

## 18. Mailer Email & SMS

**Path**: Sidebar → Mailer

### Configuring Your Email Provider
1. Click **Settings** in the Mailer sidebar
2. Choose provider: SMTP, SendGrid, or Mailgun
3. Enter credentials:
   - **SMTP**: host, port, username, password
   - **SendGrid**: paste API key
   - **Mailgun**: API key + domain
4. Click **Save Settings**

### Adding Contacts
**Manually**:
1. Click **Contacts → + Add Contact**
2. Enter first name, last name, email, phone
3. Optionally assign to a group
4. Click **Save**

**Via CSV Import**:
1. Click **Contacts → ⬆ Import CSV**
2. Prepare CSV with columns: `firstName`, `lastName`, `email`, `phone`
3. Upload file → click **Import**
4. Duplicates (same email) are skipped automatically

### Creating Groups
1. Click **Groups → + New Group**
2. Enter group name and pick a color
3. Assign contacts to groups when adding them, or edit existing contacts

### Creating an Email Campaign (4 Steps)
**Step 1 — Type & Name**:
- Campaign name (e.g. "April Newsletter")
- Type: Email or SMS
- Email provider: SMTP / SendGrid / Mailgun
- Click **Next**

**Step 2 — Audience**:
- Toggle "All Contacts" to send to everyone
- Or select specific groups (checkboxes)
- Optionally set a schedule date/time (leave blank to send immediately)
- Click **Next**

**Step 3 — Content** (Email):
- From Name and From Email address
- Subject line
- HTML body: write your HTML email (use `{{firstName}}`, `{{email}}` for personalization)
- Plain text fallback
- Toggle: Track Opens, Track Clicks, Include Unsubscribe Link
- Click **Next**

**Step 3 — Content** (SMS):
- Write your SMS message
- Character counter shows 160-char segments
- Use `{{firstName}}`, `{{phone}}` for personalization
- Click **Next**

**Step 4 — Review & Send**:
- Review all settings
- Click **Save & Send Now** to send immediately
- Click **Save as Draft** to schedule or edit later

### Managing Campaigns
- Click **Campaigns** in the sidebar
- Filter by status: All / Draft / Scheduled / Sending / Sent / Paused / Failed
- **Send**: manually trigger a draft campaign
- **Pause**: pause an in-flight campaign
- **Edit**: edit drafts before sending

---

## 19. ToolsAI GPT-4 Suite

**Path**: Sidebar → ToolsAI

### AI Writer (Streaming)
1. Click **AI Writer**
2. Enter your topic or detailed prompt in the left panel
3. Click **✨ Generate** — output streams word by word in the right panel
4. Generated content is auto-saved to your document library
5. Click **Copy** to copy the full text

### AI Chat
1. Click **AI Chat**
2. Type your question or message → press Enter
3. AI responds in real-time
4. Conversation history is maintained for the session
5. Click **+ New Chat** to start a fresh conversation

### AI Image Generator
1. Click **AI Images**
2. Write a detailed description (e.g. "A futuristic city at sunset, digital art, highly detailed")
3. Click **🎨 Generate Image**
4. Image appears below — right-click to save

### AI Code Generator
1. Click **Code** (under AI Writer section)
2. Select programming language from dropdown
3. Describe what you want (e.g. "Python function to sort a list of dictionaries by a key")
4. Click **Generate** — code streams in with syntax highlighting
5. Click **Copy** to copy the code block

### AI Templates
1. Click **Templates** tab on the ToolsAI dashboard
2. Browse by category (Blog, Ads, Email, Social, Business, Code)
3. Click a template → fill in the required fields (keyword, tone, brand name, etc.)
4. Click **Generate**

### Your Documents
- All AI-generated content saves automatically
- Click **Documents** to browse your history
- Click the ☆ icon to bookmark important documents
- Filter by type: aiWrite, aiCode, aiImage, aiSpeech

---

## 20. SiteSpy Analytics

**Path**: Sidebar → SiteSpy

### Tracking a New Website
1. Click **+ Track New Site**
2. Enter your domain name (e.g. `mywebsite.com`)
3. Click **Add** — a tracking code is generated

### Installing the Tracking Script
1. In the Sites list, find your site
2. Copy the embed snippet shown below the site card:
   ```html
   <script src="https://yourdomain.com/api/sitespy/tracker/SSP-XXXX/tracker.js" async></script>
   ```
3. Paste this into your website's `<head>` section (before `</head>`)
4. The script is lightweight (~500 bytes) and loads asynchronously

### Viewing Analytics
1. Click **View Analytics** on any tracked site
2. Dashboard shows:
   - **Total Visits** and **Today's Visits**
   - **Traffic Sources**: Organic / Direct / Referral / Social (donut chart)
   - **Devices**: Desktop / Mobile / Tablet (bar chart)
   - **Top Browsers**: Chrome, Firefox, Safari, etc.
   - **Top Pages**: most visited URLs on your site
3. Use the **date range** selector to filter (last 7/30/90 days or custom)

### URL Shortener
1. Click **URL Shortener** in the sidebar
2. Paste a long URL in the input box
3. Optionally add a custom slug (e.g. `my-promo`)
4. Click **Shorten**
5. Your short URL: `yourdomain.com/s/my-promo`
6. Click count tracked automatically on every redirect

### WHOIS & DNS Lookup
1. Click **WHOIS / DNS Tools**
2. Enter a domain name
3. **WHOIS**: click **Lookup** → see registrar, registration date, expiry, name servers
4. **DNS**: select record type (A, MX, TXT, NS, CNAME) → click **Lookup** → see all records

### Security Scan
1. Click **WHOIS / DNS Tools → Security Scan** section
2. Enter a full URL (including https://)
3. Click **Scan**
4. Results: Safe ✓ or Threats Detected ⚠ with specific threat names

---

## 21. Social Proof Widgets

**Path**: Sidebar → Social Proof

### Creating a Campaign
1. Click **+ New Campaign**
2. Enter a campaign name
3. Click **Save**
4. The campaign appears with a unique embed script

### Installing the Widget
1. Click **Embed** on any campaign
2. Copy the 2-line embed script
3. Paste it into your website's `<head>` section
4. The widget script loads automatically on all pages where it's installed

### Adding Notifications to a Campaign
1. Click on a campaign → **+ Add Notification**
2. Choose a notification type:
   - **Live Visitor Counter**: "🔥 24 people are watching this"
   - **Recent Conversion**: "✅ John from New York just purchased..."
   - **Email Collector**: popup form to capture visitor emails
   - **Countdown Timer**: countdown to sale/event end
   - **Coupon**: discount code reveal widget
   - And 25+ more types
3. Configure: timing (delay), display position, frequency, appearance (colors/text)
4. Click **Save**

### Lead Collection
- When you add an **Email Collector** notification, leads are captured automatically
- Click **Leads** in the campaign to see captured emails/names/phones
- Click **Export CSV** to download all leads

### Notification Handlers (Instant Alerts)
Get notified when leads come in:
1. Click **Notification Handlers → + Add Handler**
2. Choose type:
   - **Webhook**: POST to a URL (Zapier, Make, etc.)
   - **Email**: receive email alert for each lead
   - **Slack**: message to a Slack channel
   - **Discord**: embed message to a Discord channel
   - **Telegram**: message to a bot/group
3. Configure the destination
4. Click **Save** — all future leads trigger this notification

---

## 22. SMM Panel

**Path**: Sidebar → SMM Panel

### Placing an Order
1. Click **New Order**
2. Browse the service catalog or search by name
3. Click **Order** on any service
4. Enter:
   - **Link**: the social media URL (e.g. your Instagram post URL)
   - **Quantity**: how many followers/likes/views to add (within Min/Max range)
5. Click **Place Order**
6. Funds deducted from your balance automatically

### Mass Order (Bulk)
1. Click **Mass Order**
2. Add multiple orders at once using the table format: paste service ID, link, quantity
3. Click **Submit All**

### Checking Order Status
- Click **Orders** in the sidebar
- All orders listed with current status: Pending / In Progress / Processing / Completed / Partial / Failed / Refunded
- Click **Refresh** or enable auto-refresh to see real-time updates
- Click **Refill** on any completed order to request a top-up

### Adding Funds
1. Click **Add Funds**
2. Choose payment method: PayPal, Stripe, Manual/Bank
3. Enter the amount
4. Complete the payment
5. Balance credited to your account instantly (Stripe/PayPal) or after admin approval (manual)

### API Access (Reseller)
For resellers building their own panel:
- Click **API** in the sidebar → copy your API Key
- API endpoint: `https://yourdomain.com/api/smm/v1`
- Actions: `services`, `add`, `status`, `status_multi`, `balance`, `refill`, `cancel`

Example API call:
```bash
curl -X POST https://yourdomain.com/api/smm/v1 \
  -d "key=YOUR_API_KEY&action=services"
```

### Starring Favorite Services
- Click the ⭐ icon on any service card
- Starred services appear in **Favorites** tab for quick access

---

## 23. Social Stream

**Path**: Sidebar → Social Stream

### Creating a Social Feed
1. Click **+ New Feed**
2. Enter a feed name (e.g. "Company Social Wall")
3. Choose which networks to include: Twitter/X, Facebook, Instagram, YouTube, Reddit, TikTok, RSS, Pinterest, LinkedIn
4. For each network: enter account handle or URL
5. Choose display layout: Wall, Timeline, Carousel, Rotating, Ajax Tabbed, Ticker
6. Pick a color theme
7. Click **Save**

### Embedding on Your Website
1. Click **Embed** on any saved feed
2. Copy the embed code (`<script>` + `<div>`)
3. Paste into your website wherever you want the feed to appear

### Viewing Your Feed
- Click any feed to preview it in MarkPro
- Use the network filter buttons to show/hide specific networks
- Infinite scroll loads more posts automatically

---

## 24. AI Suite

**Path**: Sidebar → AI Suite

### AI Reply Generator
Perfect for customer service, community management, and social media responses.

1. Click **Reply Generator**
2. Paste the original message or comment you want to reply to
3. Choose:
   - **AI Provider**: GPT-4o-mini, Gemini, or Mistral
   - **Tone**: Professional, Casual, Witty, Empathetic, Formal
   - **Language**: 10+ options
4. Click **Generate Reply**
5. Reply appears instantly — click **Copy** to copy, or **Regenerate** for a different variation
6. Click ☆ to favorite any reply
7. All generated replies save to **History** automatically

### AI Image Generator (Leonardo / Stable Diffusion)
1. Click **Image Generator**
2. Write a descriptive prompt (more detail = better results)
3. Select:
   - **Model**: KingStudio (Stable Diffusion) or DALL-E 3
   - **Size**: 512×512, 768×768, 1024×1024
   - **Style**: Photorealistic, Digital Art, Anime, Oil Painting, etc.
4. Click **Generate**
5. Image saves to your gallery automatically
6. Click ♥ to mark as favorite, or the download icon to save locally

### AIGen Multi-Generator
1. Click **Multi-Gen Studio**
2. Select generation type from the top tabs: Text / Code / Image / Speech / Translate
3. Enter your prompt or content
4. Click **Generate**
5. **Text/Code**: output streams in real-time with SSE
6. **Speech**: choose voice → download MP3
7. **Image**: DALL-E 3 or Stable Diffusion
8. **Translation**: select target language → translated text appears

### Managing AI Credits
- Credits display in the top bar
- Each generation type deducts a different number of credits
- To add credits: click your credit count → **Buy Credits** → Stripe Checkout

---

## 25. Pen AI

**Path**: Sidebar → Pen AI

### Generating Content
1. Click **Content Generator**
2. Browse template categories in the left panel (Marketing, Blog, Product, Email, Social, etc.)
3. Click a template
4. Fill in the input fields specific to that template:
   - e.g. "Product Name", "Target Audience", "Key Benefits"
5. Click **Generate** — AI produces the content
6. Edit the output in the right panel if needed
7. Click **Save to Library** to keep it

### AI Chat (Pen)
- Separate chat interface with full conversation history per session
- Multiple concurrent sessions

### Text-to-Speech (3 Providers)
1. Click **Speech Generator**
2. Write or paste your text
3. Choose provider: OpenAI TTS / Google Cloud TTS / Azure Neural TTS
4. Select voice from the dropdown (6+ voices)
5. Click **Generate Audio**
6. Preview and download as MP3

### Team Sharing
1. Click **Team Settings**
2. Click **Invite Member** → enter email + role
3. Set sub-quotas: how many tokens/images/audio-minutes this member can use per month

---

## 26. ZAM Nexus

**Path**: Sidebar → ZAM Nexus

### Using SEO Tools (180+ Tools)
1. Click **SEO Tools**
2. Browse by category (tabs): Keyword, Content, Technical, Link Building, SERP, Local, Image
3. Click any tool name in the left panel
4. Enter your input in the text area (topic, keyword, domain, content, etc.)
5. Click **▶ Run Tool**
6. Results appear in the right panel — structured JSON for most tools
7. All tool runs saved to history automatically

**Example flows**:
- **Blog Content**: Content → Blog Outline Generator → enter topic → get full outline → AI Writer → full article
- **Local Business**: Local → Google My Business Description → enter business + location → 3 ready-to-paste descriptions
- **Technical Fix**: Technical → Robots.txt Analyzer → paste your robots.txt → see issues + recommendations

### CRM Contacts
**Adding Contacts**:
1. Click **CRM** in the ZAM sidebar
2. Click **+ Add Contact**
3. Fill in: first name, last name, email, phone, company, job title, etc.
4. Save

**Importing**:
1. Click **⬆ Import CSV**
2. Prepare CSV with columns: `firstName`, `lastName`, `email`, `phone`, `company`, `jobTitle`, `city`, `country`
3. Upload → duplicates (same email) are skipped automatically

**Searching & Filtering**:
- Use the search bar to find by name, email, company
- Filter by status (Active/Lead/Prospect/Customer) or tags

**AI Enrichment**:
- Click any contact → **✨ Enrich**
- AI fetches: bio, skills, industry insights, estimated company size, suggested LinkedIn/Twitter profiles
- Enriched data saves to the contact record automatically

**Finding & Merging Duplicates**:
1. Click **Find Duplicates** button
2. Duplicate groups appear (by email or name+company)
3. Click **Merge** on any group
4. Select which contact to keep as primary
5. Click **Merge** — duplicate info fills in empty fields on the primary contact

**Exporting**:
1. Select contacts with checkboxes (or select all)
2. Click **Export CSV** — downloads immediately

### Lead Generation
1. Click **Lead Gen** in the ZAM sidebar
2. Enter your search criteria:
   - **Keyword**: business type (e.g. "dentist", "plumber", "restaurant")
   - **City, State, Country**: location
3. Click **🔍 Search Leads**
4. AI generates leads in the background (takes 10–30 seconds)
5. When status shows "Completed", click the job to see results
6. Review leads in the table below
7. Select leads → click **Import to CRM** to add them to your CRM contacts
8. Or click **Export CSV** to download

---

## 27. Account & Billing

### Updating Profile
1. Click your avatar → **Profile Settings**
2. Update: name, email, phone, avatar
3. Click **Save**

### Changing Password
1. Click avatar → **Security**
2. Enter current password + new password (twice)
3. Click **Change Password**

### Managing Subscriptions
- Each module may have its own subscription (separate plans for SMM Panel, Bio Pages, Social Proof, Rank Tracker, etc.)
- To manage: click the module → **Billing** or **Upgrade Plan**
- Click **Manage Subscription** to open the Stripe Billing Portal (change plan, cancel, view invoices)

### Wallet (BeePost/Publish module)
- Check balance: **Publish → Billing → Wallet**
- Add funds: click **Deposit** → enter amount → Stripe Checkout
- Request withdrawal: enter amount, method, account details → admin approves within 24 hours

### Affiliate Program (Publish module)
- Click **Publish → Affiliate**
- Generate your unique referral link
- Share with friends/clients
- Earn 10% commission for every paying sign-up via your link

---

## 28. Admin Panel

**Path**: Sidebar → Admin (visible only to admin accounts)

### User Management
1. Click **Admin → Users**
2. Search, filter, view all registered users
3. Click a user:
   - View all their data, plan, balance, usage
   - **Edit**: change name, email, role, plan, balance
   - **Verify**: manually verify email (bypass verification email)
   - **Suspend**: disable login
   - **Grant Credits**: add AI credits, balance, etc.
   - **Delete**: permanently remove user and all their data

### Platform Settings
- Click **Admin → Settings**
- Set: site name, logo, maintenance mode, registration (open/closed)
- Email SMTP defaults for the platform
- Per-module global settings (commission rates, plan limits, etc.)

### SMM Panel Admin
- **Services**: create/edit/delete SMM services and categories
- **Orders**: view all orders across all users; override status
- **Providers**: add/edit upstream SMM providers; toggle mock mode
- **Deposits**: approve/reject pending deposit requests

### Withdrawal Requests
- **Admin → Withdrawals**
- See all pending withdrawal requests from affiliate + wallet earnings
- Click **Approve** → funds are marked as paid
- Click **Reject** → amount is automatically refunded to user wallet

### Cron Logs
- **Admin → Cron Logs**
- View all 16 cron job run history (when ran, how long, how many records processed)
- Click **Clear Old Logs** to delete entries older than 30 days

### Plans Management
Each module has plan CRUD in its admin section:
- **SMM Panel → Plans**: pricing for SMM reseller accounts
- **Bio Pages → Plans**: PixaURL subscription tiers
- **BioLinks → Plans**: 66BioLinks plan tiers
- **Social Proof → Plans**: notification widget subscription tiers
- **Rank Tracker → Plans**: audit report plan tiers
- **AI Suite → Plans**: credit package pricing

---

## Quick Reference: Keyboard Shortcuts

| Location | Shortcut | Action |
|----------|----------|--------|
| Design Editor | Ctrl+Z | Undo |
| Design Editor | Ctrl+Y | Redo |
| Design Editor | Delete/Backspace | Delete selected object |
| Chat Inbox | Enter | Send message |
| AI Writer | Enter | New line (content area) |
| Any text input | Tab | Next field |

---

## Getting Help

- **In-app support tickets**: each module has a **Support** or **Tickets** section — create tickets from inside the module
- **Admin contact**: tickets are reviewed by the admin and replied to in-thread
- **Documentation**: refer to FEATURES.md for complete technical feature reference
- **Deployment**: refer to DEPLOY.md for server setup instructions
