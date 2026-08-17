# MarkPro — The Complete Beginner's Setup Guide 🇵🇰

**Written for someone who has never done any of this before.**
Follow it top to bottom. Every step says exactly where to click, what to copy, and where to paste it. Nothing is assumed.

Everything here is **free or has a free alternative**, except two things I'll clearly mark. PayPal is not used anywhere — this guide uses Pakistan-friendly options only.

---

## Table of contents

| Part | What you'll do | Time |
|---|---|---|
| [0](#part-0--how-this-app-is-put-together) | Understand the 3 pieces of your app | 5 min |
| [1](#part-1--the-two-env-files-your-control-panel) | The two `.env` files (your control panel) | 10 min |
| [2](#part-2--the-must-have-keys-app-wont-start-without-these) | Must-have keys — app won't start without these | 30 min |
| [3](#part-3--login-with-google-free) | Login with Google (free) | 20 min |
| [4](#part-4--login-with-apple-99year) | Login with Apple ($99/year) | 30 min |
| [5](#part-5--sending-emails-free) | Sending emails (free) | 20 min |
| [6](#part-6--ai-features-free-tier-available) | AI features (free tier available) | 15 min |
| [7](#part-7--taking-money-in-pakistan-no-paypal) | Taking money in Pakistan (no PayPal) | 30 min |
| [8](#part-8--file--image-storage-free) | File & image storage (free) | 15 min |
| [9](#part-9--social-media-publishing) | Social media publishing | 1–2 weeks (approval) |
| [10](#part-10--whatsapp--sms) | WhatsApp & SMS | 1 day |
| [11](#part-11--seo--utility-keys-all-free) | SEO & utility keys (all free) | 20 min |
| [12](#part-12--going-live-hosting-domain-https) | Going live: hosting, domain, HTTPS | 2 hours |
| [13](#part-13--the-real-world-checklist) | The real-world checklist (backups, security, legal) | 1 day |

**Suggested order for a first launch:** Part 1 → 2 → 3 → 5 → 6 → 12. That gets you a real, working, signed-in app on the internet. Everything else you add later, one at a time.

---

## Part 0 — How this app is put together

Your project has three pieces:

```
markpro/
├── backend/     ← the "brain". Node.js server. Holds ALL secret keys. Runs on port 5000.
├── frontend/    ← the "face". React app the user sees in the browser. Runs on port 3000.
└── (database)   ← MongoDB. Stores users, campaigns, posts, everything.
```

**The single most important rule of this whole guide:**

> 🔴 Secret keys go in `backend/.env` ONLY.
> Anything you put in `frontend/.env.local` is **visible to every visitor** — right-click → View Source and it's there.
> The frontend only ever gets *public* IDs (like a Google Client ID), never secrets.

If you ever accidentally put a secret in the frontend, go to that provider's dashboard, delete the key, and make a new one. This is called "rotating" a key.

---

## Part 1 — The two `.env` files (your control panel)

An `.env` file is just a plain text file of `NAME=value` lines. It's where your app reads all its settings and keys.

### Create them

Open a terminal (Command Prompt on Windows, Terminal on Mac) in your project folder:

```bash
cd backend
cp .env.example .env

cd ../frontend
cp .env.example .env.local
```

On Windows use `copy` instead of `cp`.

Now open `backend/.env` in a text editor (VS Code, Notepad++, even Notepad). You'll see blocks with comments. You fill in the blanks after the `=` sign. **No quotes, no spaces around the `=`:**

```
✅ JWT_SECRET=8f3a9b2c1d...
❌ JWT_SECRET = "8f3a9b2c1d..."
```

### The golden rules

1. **Never commit `.env` to GitHub.** Check your `.gitignore` contains `.env` and `.env.local`. It already does in this project.
2. **After changing `.env`, restart the server.** The app reads it once at startup. Ctrl+C, then start again.
3. **Frontend changes need a rebuild.** React bakes `REACT_APP_*` values into the built files, so run `npm run build` again after changing `frontend/.env.local`.
4. Any key you leave blank = that feature quietly turns itself off. The app will **not** crash. This is by design so you can launch with 5 keys and add the rest later.

---

## Part 2 — The must-have keys (app won't start without these)

These are the only ones that are truly mandatory. All free.

### 2.1 The database — MongoDB Atlas (FREE forever)

MongoDB Atlas gives you a free 512 MB cloud database. That's enough for thousands of users.

1. Go to **https://www.mongodb.com/cloud/atlas/register**
2. Sign up with your email (or your Google account).
3. When it asks what you're building, pick anything — it doesn't matter.
4. On the "Deploy your cluster" screen, choose the **M0 FREE** tier.
   - Provider: **AWS**
   - Region: **Mumbai (ap-south-1)** — closest to Pakistan, fastest for your users.
   - Click **Create Deployment**.
5. A popup appears: **"Connect to Cluster"** with a username and password.
   - **Copy that password into a notepad right now.** It's only shown once.
   - Click **Create Database User**.
6. Click **Choose a connection method** → **Drivers** → it shows a string like:
   ```
   mongodb+srv://myuser:<db_password>@cluster0.ab1cd.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<db_password>` with the password you saved, and add your database name `/markpro` before the `?`:
   ```
   mongodb+srv://myuser:MyRealPass123@cluster0.ab1cd.mongodb.net/markpro?retryWrites=true&w=majority
   ```
8. **Network access** (important — this is the #1 reason people get "connection timed out"):
   - Left sidebar → **Network Access** → **Add IP Address**
   - While developing on your own laptop: click **Add Current IP Address**.
   - Once your app is on a server: add that server's IP address.
   - `0.0.0.0/0` (allow everyone) works but is less safe — only use it temporarily.

Paste into `backend/.env`:
```
MONGO_URI=mongodb+srv://myuser:MyRealPass123@cluster0.ab1cd.mongodb.net/markpro?retryWrites=true&w=majority
```

> ⚠️ If your password contains `@ : / ? # &`, you must "URL-encode" it. Easiest fix: go back to Atlas → Database Access → Edit user → **Autogenerate Secure Password**, and use a password with only letters and numbers.

**Free alternative:** install MongoDB on your own computer/server and use `MONGO_URI=mongodb://localhost:27017/markpro`. Atlas is easier and includes automatic backups, so start there.

### 2.2 The random secrets (FREE — you generate them yourself)

These aren't from any website. They're just long random strings your app uses to sign login tokens and encrypt stored credentials. **Nobody gives these to you — you make them.**

On Mac/Linux, run this 5 times and use a different result for each:
```bash
openssl rand -hex 32
```

On Windows PowerShell:
```powershell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

No terminal? Use **https://www.random.org/strings/** (64 characters, hexadecimal) — or just mash your keyboard for 64+ characters. Anything long and unpredictable works.

Fill in:
```
JWT_SECRET=<paste random string 1>
JWT_REFRESH_SECRET=<paste random string 2 — must be DIFFERENT from the first>
SESSION_SECRET=<paste random string 3>
TOKEN_ENCRYPTION_KEY=<paste random string 4 — must be EXACTLY 64 hex characters>
CRON_SECRET=<paste random string 5>
```

> 🔴 `TOKEN_ENCRYPTION_KEY` must be exactly 64 characters of `0-9a-f`. This one encrypts all your users' connected social-media tokens. **If you ever change it, every stored connection breaks and users must reconnect.** Set it once and never touch it.

> 🔴 If you change `JWT_SECRET`, everyone gets logged out. That's fine and expected.

### 2.3 The URLs

While testing on your own laptop:
```
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:5000
APP_NAME=MarkPro
```

Once live (Part 12), change to your real domain:
```
NODE_ENV=production
FRONTEND_URL=https://markpro.pk
APP_URL=https://api.markpro.pk
```

And in `frontend/.env.local`:
```
REACT_APP_API_URL=http://localhost:5000/api        ← while testing
REACT_APP_API_URL=https://api.markpro.pk/api       ← once live
```

### 2.4 Your admin account

```
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=<a strong password you'll actually remember>
```

Then run once, from the `backend` folder:
```bash
npm run seed
```
This creates your admin user and the default plans. **Change the password from inside the app afterwards**, then blank out `ADMIN_PASSWORD` in `.env`.

### 2.5 Start it up 🎉

```bash
# Terminal 1
cd backend && npm install && npm run dev

# Terminal 2
cd frontend && npm install && npm start
```

Open **http://localhost:3000**. Sign up, log in, click around. **You now have a working app.** Everything below adds features on top.

If it doesn't start, see [Troubleshooting](#troubleshooting).

---

## Part 3 — Login with Google (FREE)

Completely free, no credit card, works from Pakistan. Takes about 20 minutes. **I already built the code for this — you just need the key.**

### Step by step

1. Go to **https://console.cloud.google.com/** and sign in with any Google account.
2. Top-left, click the project dropdown → **New Project**.
   - Name: `MarkPro` → **Create**. Wait ~15 seconds, then select it.
3. Left menu → **APIs & Services** → **OAuth consent screen**.
   - User type: **External** → **Create**.
   - App name: `MarkPro`
   - User support email: your email
   - App logo: optional (upload later)
   - **Authorized domains:** add your domain, e.g. `markpro.pk` (skip while testing on localhost)
   - Developer contact email: your email
   - **Save and Continue**.
4. **Scopes** screen → click **Add or Remove Scopes** → tick these three only:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`

   → **Update** → **Save and Continue**.
5. **Test users** screen → add your own email → **Save and Continue** → **Back to Dashboard**.
6. Left menu → **Credentials** → **+ Create Credentials** → **OAuth client ID**.
   - Application type: **Web application**
   - Name: `MarkPro Web`
   - **Authorized JavaScript origins** — click ADD URI for each:
     ```
     http://localhost:3000
     https://markpro.pk
     https://www.markpro.pk
     ```
   - **Authorized redirect URIs** — add the same URLs:
     ```
     http://localhost:3000
     https://markpro.pk
     ```
   - **Create**.
7. A popup shows **Client ID** and **Client secret**. Copy the **Client ID** — it looks like:
   ```
   848213947261-a1b2c3d4e5f6g7h8.apps.googleusercontent.com
   ```

### Paste it in — BOTH files, same value

`backend/.env`:
```
GOOGLE_CLIENT_ID=848213947261-a1b2c3d4e5f6g7h8.apps.googleusercontent.com
```

`frontend/.env.local`:
```
REACT_APP_GOOGLE_CLIENT_ID=848213947261-a1b2c3d4e5f6g7h8.apps.googleusercontent.com
```

Restart both, hard-refresh the browser (Ctrl+Shift+R). The **Google** button on your login screen is now live.

### How it actually works (so you can debug it)

1. User clicks **Google** → Google shows its own account chooser popup.
2. Google hands the browser a signed "identity token" proving who they are.
3. Your React app sends that token to `POST /api/auth/social/google`.
4. **Your server verifies the signature directly with Google** and checks the token was issued for *your* Client ID. Only then does it create/find the user and issue your app's own login tokens.

Because the server verifies everything, a hacker can't fake a login by sending a made-up token. The Client ID is **not** a secret — it's designed to be public.

### Publishing your consent screen

While in "Testing" mode only the emails you listed can sign in. Before launch: **OAuth consent screen** → **Publish App**. With only email/profile/openid scopes, Google approves instantly — no review, no video, no cost.

### Common Google errors

| Error | Fix |
|---|---|
| `redirect_uri_mismatch` | The URL in your browser isn't in Authorized JavaScript origins. Add it exactly, including `http`/`https` and no trailing slash. |
| `Google token was issued for a different app` | Backend `GOOGLE_CLIENT_ID` ≠ frontend one. Make them identical. |
| Button does nothing | Pop-ups blocked, or a browser blocking third-party cookies. Try Chrome, allow pop-ups. |
| `access_blocked` | Consent screen still in Testing and your email isn't a test user. Add it, or publish the app. |

---

## Part 4 — Login with Apple ($99/year — the only unavoidable paid item)

**Be honest with yourself about whether you need this.** Apple sign-in requires the Apple Developer Program: **$99 USD per year**, no free tier, ever.

**When you actually need it:** only if you ship a native iOS app that also offers Google/Facebook login — then Apple's App Store rules *force* you to offer Sign in with Apple.

**When you don't:** a website-only product. Skip it. Leave the keys blank and the Apple button **automatically disappears** from your login screen — I built it that way. Nothing breaks.

**Free alternative:** none exists. There is no way to offer "Sign in with Apple" without paying Apple. Ship with Google-only and add Apple the day you have paying customers.

### If you're going ahead

Pakistani cards sometimes get declined by Apple; a Payoneer or Wise card usually works. Enrollment takes 24–48 hours to verify your identity.

1. **https://developer.apple.com/programs/enroll/** → enroll as Individual (or Company, which additionally needs a D-U-N-S number).
2. Once approved, go to **Certificates, Identifiers & Profiles** → **Identifiers**.
3. **+** → **App IDs** → **App** → Continue.
   - Description: `MarkPro`
   - Bundle ID: `com.markpro.app` (explicit)
   - Scroll capabilities → tick **Sign In with Apple** → Continue → Register.
4. **+** again → **Services IDs** → Continue.
   - Description: `MarkPro Web`
   - Identifier: `com.markpro.web` ← **this is your `APPLE_CLIENT_ID`**
   - Register.
5. Click your new Services ID → tick **Sign In with Apple** → **Configure**:
   - Primary App ID: the App ID from step 3
   - **Domains and Subdomains:** `markpro.pk` (no `https://`)
   - **Return URLs:** `https://markpro.pk/login`
   - Save → Continue → Save.

> 🔴 Apple **does not accept `localhost`** and **requires HTTPS**. You cannot test Apple sign-in on your laptop. Deploy first (Part 12), then test on the live site.

Paste in:

`backend/.env`:
```
APPLE_CLIENT_ID=com.markpro.web
```
`frontend/.env.local`:
```
REACT_APP_APPLE_CLIENT_ID=com.markpro.web
REACT_APP_APPLE_REDIRECT_URI=https://markpro.pk/login
```

### Two Apple quirks you must know

1. **The name only arrives once.** Apple sends the user's real name on their *very first* authorization and never again. My code captures it on that first sign-in. If you're testing repeatedly, revoke access at **appleid.apple.com → Sign-In and Security → Sign in with Apple** to get a fresh first-time flow.
2. **Private relay emails.** Users can choose "Hide My Email", and you'll receive something like `x7k2m9@privaterelay.appleid.com`. Emails to it forward to the real address, but **only if you verify your sending domain with Apple** (Certificates → More → Configure Sign in with Apple for Email Communication). Skip this and your welcome emails to those users silently vanish.

---

## Part 5 — Sending emails (FREE)

Your app sends verification emails, password resets and notifications. Without this, nobody can reset a forgotten password.

### Option A — Brevo (best free option, recommended) 🏆

**300 emails/day free, forever. No credit card. Works from Pakistan.**

1. **https://www.brevo.com/** → Sign up free.
2. Verify your email, complete the short onboarding.
3. Left menu → **Senders, Domains & Dedicated IPs** → **Senders** → **Add a sender** → enter your name and email → verify via the link they mail you.
4. Top-right, click your name → **SMTP & API** → **SMTP** tab.
5. Copy the **Login** (an email like `8a1b2c@smtp-brevo.com`) and click **Generate a new SMTP key** → copy the key.

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=8a1b2c@smtp-brevo.com
SMTP_PASS=<the SMTP key>
SMTP_FROM=noreply@markpro.pk
SMTP_FROM_NAME=MarkPro
```

### Option B — Gmail (fastest, for testing only)

Free but capped around 500/day and Google throttles app traffic. Fine for the first week.

1. Your Google account **must** have 2-Step Verification on (**myaccount.google.com → Security**).
2. Go to **https://myaccount.google.com/apppasswords**
3. App name: `MarkPro` → **Create** → copy the 16-character password.

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=abcdefghijklmnop        ← the 16-char app password, NOT your Gmail password
SMTP_FROM=youremail@gmail.com
SMTP_FROM_NAME=MarkPro
```

### Other free options

| Service | Free tier | Note |
|---|---|---|
| **Brevo** | 300/day forever | ⭐ Best choice |
| **Resend** | 3,000/month | Cleanest developer experience |
| **Mailgun** | 100/day (needs card) | Set `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` |
| **SendGrid** | 100/day | Set `SENDGRID_API_KEY`; signup can be strict about new accounts |
| **Zoho Mail** | Free with your domain | Also gives you a real `you@markpro.pk` inbox |

### Make your emails actually reach the inbox

If you skip this, most of your mail lands in spam. In your **domain registrar's DNS panel** add the records your email provider shows you:

- **SPF** — a TXT record on `@`: `v=spf1 include:spf.brevo.com ~all`
- **DKIM** — a TXT record your provider generates. Copy-paste exactly.
- **DMARC** — a TXT record on `_dmarc`: `v=DMARC1; p=none; rua=mailto:you@markpro.pk`

Then test at **https://www.mail-tester.com/** — send it an email and aim for 9/10 or better.

---

## Part 6 — AI features (free tier available)

Your app has AI content generation, image generation, and voice.

### Text AI — Google Gemini (FREE, recommended for Pakistan) 🏆

Genuinely free tier, no credit card, works from Pakistan without a VPN.

1. **https://aistudio.google.com/app/apikey**
2. Sign in with Google → **Create API key** → **Create API key in new project**.
3. Copy it (starts with `AIza...`).

```
GEMINI_API_KEY=AIzaSyD...
DEFAULT_AI_MODEL=gemini
```

Free limits: ~15 requests/minute, ~1,500/day on Gemini Flash. Plenty to launch with.

### Text AI — alternatives

| Provider | Cost | Pakistan notes |
|---|---|---|
| **Google Gemini** | Free tier | ⭐ Works directly, no card |
| **Groq** | Free, very fast | https://console.groq.com — great free fallback |
| **OpenRouter** | Some free models | https://openrouter.ai — one key, many models |
| **Mistral** | Free tier | https://console.mistral.ai → `MISTRAL_API_KEY` |
| **OpenAI** | Paid only, ~$5 min | Needs an international card; no free tier |

```
OPENAI_API_KEY=sk-...          # optional, paid
MISTRAL_API_KEY=...            # optional, free tier
```

### Image generation

| Provider | Cost | Key |
|---|---|---|
| **Gemini / Imagen** | Free tier | reuses `GEMINI_API_KEY` |
| **Stability AI** | ~25 free credits, then paid | `STABILITY_API_KEY` from https://platform.stability.ai |
| **Unsplash** (stock photos, not AI) | Free, 50/hr | `UNSPLASH_ACCESS_KEY` from https://unsplash.com/developers |

Unsplash is free and instant — great for launching with real-looking imagery:
1. https://unsplash.com/developers → **Register as a developer** → **New Application**
2. Accept terms, name it `MarkPro` → copy the **Access Key**.
```
UNSPLASH_ACCESS_KEY=...
```

### Background removal
**https://www.remove.bg/api** → free tier is 50 images/month.
```
REMOVE_BG_API_KEY=...
```

### Voice / speech
- **Azure Speech**: free tier of 5 hours/month. https://portal.azure.com → Create resource → *Speech* → Free F0 tier → Keys and Endpoint.
```
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=eastus
```
- Requires an Azure account with a card for verification (it won't charge on F0). Skip if you don't need voice.

### 💰 Protect yourself from a surprise bill

Any paid AI key can be abused if it leaks. Do all three:
1. Set a **hard spending limit** in the provider's billing dashboard (OpenAI: Settings → Limits → Hard limit $10).
2. Never put an AI key in the frontend — always the backend.
3. Your app has per-user credit pricing (`PER_WORD_PRICING`, `IMAGE_PRICING_*`). Set these so users can't burn unlimited credits:
```
PER_WORD_PRICING=0.02
IMAGE_PRICING_256=1
IMAGE_PRICING_512=2
IMAGE_PRICING_1024=4
TEXT_TO_SPEECH_PRICING=1
SPEECH_TO_TEXT_PRICING=1
```

---

## Part 7 — Taking money in Pakistan (no PayPal)

PayPal does not operate in Pakistan. Ignore every `PAYPAL_*` variable — leave them blank and that module stays off.

Here's what actually works, in order of how easy they are:

### Option A — Manual bank / JazzCash / Easypaisa transfer (WORKS TODAY, FREE) 🏆

Your app already has a **local payments** module built in. The customer sees your account details, pays, uploads a screenshot, and you approve it in the admin panel. Their credits are added instantly on approval.

**Zero fees, zero paperwork, zero approval, works from day one.** This is how most Pakistani SaaS products start.

```
BANK_NAME=Meezan Bank
BANK_ACCOUNT_TITLE=Your Name / Your Company
BANK_IBAN=PK36MEZN0001234567890123
JAZZCASH_ACCOUNT_TITLE=Your Name
JAZZCASH_ACCOUNT_NUMBER=03001234567
EASYPAISA_ACCOUNT_TITLE=Your Name
EASYPAISA_ACCOUNT_NUMBER=03001234567
LOCAL_PAYMENT_MIN=500
LOCAL_PAYMENT_MAX=200000
CURRENCY_CODE=PKR
```

**Set `CURRENCY_CODE=PKR`** so prices show in rupees.

> Tip: keep a business account separate from your personal one, and always ask for the transaction ID plus a screenshot. Approve manually within a few hours — customers are fine with that if you say so upfront.

### Option B — Automated Pakistani gateways

Once you're doing real volume, automate it. All of these need a **registered business** (sole proprietorship with an NTN is usually enough) and take 1–4 weeks to approve.

| Gateway | Good for | Roughly |
|---|---|---|
| **Safepay** (safepay.pk) | Cards + wallets, best developer docs | ~2.9% + Rs 5 |
| **PayFast** (payfast.com.pk) | Cards, JazzCash, Easypaisa, bank | ~2–3% |
| **JazzCash Merchant** | Direct wallet payments | ~1.5–2.5% |
| **Easypaisa Merchant** | Direct wallet payments | ~1.5–2.5% |
| **1LINK / PayPro** | Bank-heavy, invoicing | varies |

What they'll ask for: CNIC, NTN certificate, business bank account letter, and your live website with **Terms of Service, Privacy Policy, and Refund Policy pages** (they will reject you without these — see Part 13).

**Start with Safepay** — it has the cleanest API and the friendliest onboarding for small businesses.

### Option C — Stripe for international customers only

Stripe **does not support Pakistani businesses**. Do not try to fake it — accounts get frozen with funds held.

Legitimate route if you're selling to the US/EU: use **Paddle** or **Lemon Squeezy** as a *merchant of record*. They handle the payment, the tax, and pay you out to Payoneer/Wise. They accept sellers in Pakistan.

- **Lemon Squeezy** — https://lemonsqueezy.com — 5% + 50¢, easiest for a solo founder
- **Paddle** — https://paddle.com — 5% + 50¢, requires a short review

Your app's Stripe variables can stay blank:
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### My recommendation for you

**Launch with Option A today.** Add Safepay when you cross ~30 paying customers and the manual approvals get annoying. Add Lemon Squeezy only if foreign customers start showing up.

---

## Part 8 — File & image storage (FREE)

Uploaded avatars, generated images and documents need somewhere to live.

### Option A — Local disk (free, already working)
Files save into `backend/uploads/`. Fine to launch with. **Caveat:** if you use Docker or redeploy, make sure that folder is a mounted volume or you'll lose files. Your `docker-compose.yml` already handles this.

### Option B — Cloudflare R2 (FREE 10 GB, no egress fees) 🏆

Best free option, and it's S3-compatible so it drops straight into the existing `AWS_*` variables.

1. **https://dash.cloudflare.com/** → sign up (free).
2. Left sidebar → **R2** → **Create bucket** → name it `markpro` → Create.
3. **Manage R2 API Tokens** → **Create API Token** → permission **Object Read & Write** → Create.
4. Copy the **Access Key ID**, **Secret Access Key**, and the **S3 endpoint** URL.

```
AWS_ACCESS_KEY_ID=<R2 access key id>
AWS_SECRET_ACCESS_KEY=<R2 secret access key>
AWS_BUCKET=markpro
AWS_REGION=auto
AWS_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
```

### Option C — Wasabi
$6.99/TB/month, 30-day free trial. Uses the `WASABI_*` variables. Only worth it above ~1 TB.

### Option D — AWS S3
Free tier is only 5 GB for the first 12 months, then you pay — including for bandwidth. R2 is strictly better for a small app.

---

## Part 9 — Social media publishing

This is the slowest part of the whole guide, because every platform reviews your app manually. **Start these applications early and build everything else while you wait.**

### Facebook + Instagram (free, 1–2 weeks review)

1. **https://developers.facebook.com/** → Log in → **My Apps** → **Create App**
2. Use case: **Other** → Type: **Business** → name it `MarkPro` → Create.
3. **Settings → Basic**: copy **App ID** and **App Secret** (click Show).
4. Add products: **Facebook Login** and **Instagram Graph API**.
5. **Facebook Login → Settings → Valid OAuth Redirect URIs:**
   ```
   https://api.markpro.pk/api/social/facebook/callback
   ```
6. **App Review → Permissions and Features** — request:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`

   They will require: a screencast of your app using each permission, a privacy policy URL, a data deletion URL, and a verified business. Budget two weeks.

```
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_REDIRECT_URI=https://api.markpro.pk/api/social/facebook/callback
CF_WEBHOOK_VERIFY_TOKEN=<any random string you invent — paste the same one into Meta's webhook settings>
```

> While in **Development mode**, everything works fully for accounts listed under **Roles → Testers**. Use that to test before review.

### X / Twitter (free tier is limited)

1. **https://developer.twitter.com/en/portal/dashboard** → sign up for a Free account.
2. Create a Project + App → **Keys and tokens** → generate everything.
3. **User authentication settings** → OAuth 2.0 → Type: **Web App** → Callback: `https://api.markpro.pk/api/social/twitter/callback`

```
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
TWITTER_BEARER_TOKEN=...
TWITTER_REDIRECT_URI=https://api.markpro.pk/api/social/twitter/callback
```
Free tier: 1,500 posts/month, no reading of others' tweets. Basic is $100/month.

### LinkedIn (free, ~1 week)
**https://www.linkedin.com/developers/apps** → Create app (needs a LinkedIn Company Page you own) → Products → request **Share on LinkedIn** + **Sign In with LinkedIn**.
```
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=https://api.markpro.pk/api/social/linkedin/callback
```

### YouTube (free)
Same Google Cloud project as Part 3:
**APIs & Services → Library → YouTube Data API v3 → Enable**, then Credentials → API key + OAuth client.
```
YOUTUBE_API_KEY=...
YOUTUBE_CLIENT_ID=...
YOUTUBE_REDIRECT_URI=https://api.markpro.pk/api/social/youtube/callback
```

### TikTok (free, strict review)
**https://developers.tiktok.com/** → Manage apps → add **Login Kit** and **Content Posting API**.
```
TIKTOK_CLIENT_KEY=...
TIKTOK_REDIRECT_URI=https://api.markpro.pk/api/social/tiktok/callback
```

---

## Part 10 — WhatsApp & SMS

### WhatsApp Cloud API (free tier: 1,000 conversations/month)

1. In the same Meta app from Part 9 → **Add Product** → **WhatsApp** → Set up.
2. Meta gives you a free test number instantly. Copy the **Phone number ID** and **WhatsApp Business Account ID**.
3. **API Setup** → Temporary access token (24 h). For a permanent one: **Business Settings → System Users → Add** → assign the app → **Generate token** with `whatsapp_business_messaging` + `whatsapp_business_management`, no expiry.
4. **Configuration → Webhook**: callback `https://api.markpro.pk/api/webhooks/whatsapp`, verify token = whatever you invent below. Subscribe to `messages`.

```
WHATSAPP_API_TOKEN=<permanent system user token>
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_API_VERSION=v21.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<random string, same one you typed into Meta>
WML_WEBHOOK_VERIFY_TOKEN=<random string>
```

> To message a real customer number you must add your own business number and get it verified — Meta requires business verification (free, but they'll ask for NTN/registration documents).

### SMS (Pakistan)

Twilio works but is expensive for Pakistan and requires an international card.

| Provider | Notes |
|---|---|
| **Telenor / Jazz corporate SMS** | Cheapest per SMS in Pakistan; needs a business contract |
| **BulkSMS.pk, Branded SMS Pakistan** | Local, easy signup, PKR billing |
| **Vonage** | Free trial credit; `VONAGE_API_KEY` / `VONAGE_API_SECRET` |
| **Twilio** | Best docs, most expensive; also powers the in-app dialer |

```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
```
Leave blank if you don't need SMS — nothing breaks.

---

## Part 11 — SEO & utility keys (ALL FREE)

Quick wins. Grab them in one sitting.

| Key | Where | Free limit | 2-second summary |
|---|---|---|---|
| `PAGESPEED_API_KEY` | Google Cloud → enable **PageSpeed Insights API** → Credentials → API key | 25k/day | Site speed scores |
| `SAFE_BROWSING_API_KEY` | Same project → enable **Safe Browsing API** | 10k/day | Malware checks |
| `IPINFO_TOKEN` | https://ipinfo.io/signup | 50k/month | Visitor geo-location |
| `VIRUSTOTAL_API_KEY` | https://www.virustotal.com → profile → API key | 500/day | URL/file scanning |
| `BITLY_API_KEY` | https://bitly.com → Settings → API | 1,000 links/mo | Link shortening |
| `REBRANDLY_API_KEY` | https://app.rebrandly.com → API keys | 500 links/mo | Branded short links |
| `UNSPLASH_ACCESS_KEY` | https://unsplash.com/developers | 50/hour | Stock photos |

(Yes — three of those reuse the same Google Cloud project from Part 3. Just enable each API and reuse one API key if you like. Do click **Restrict key → HTTP referrers / API restrictions** so a leaked key can't be abused.)

Also set the misc tuning values:
```
CACHE_TTL=3600
DB_TABLE_PREFIX=
BP_CREDIT_PER_POST=1
BP_AFFILIATE_COMMISSION_RATE=10
```

---

## Part 12 — Going live: hosting, domain, HTTPS

### 12.1 Buy a domain (~Rs 3,000–4,000/year)

- **Namecheap** (namecheap.com) — accepts most Pakistani cards, free WHOIS privacy
- **Cloudflare Registrar** — sells at cost price, cheapest long-term
- **PKNIC** (pknic.net.pk) — for a `.pk` domain, pay locally in rupees

### 12.2 Get a server

| Option | Price | Best for |
|---|---|---|
| **Hostinger VPS** | ~$5/mo | Cheapest, has a Pakistan-friendly billing flow |
| **DigitalOcean Droplet** | $6/mo | Best tutorials for beginners ⭐ |
| **Contabo VPS** | ~$6/mo | Most RAM per dollar |
| **Railway / Render** | Free tier → $5 | No Linux knowledge needed at all |

**Easiest path if you've never used a server:** deploy the frontend to **Vercel** (free) and the backend to **Railway** or **Render** ($5/mo). You upload your code from GitHub and paste your `.env` values into a web form. No terminal, no nginx.

**Recommended for control:** one DigitalOcean droplet, Ubuntu 22.04, 2 GB RAM, in Bangalore (closest region to Pakistan).

### 12.3 Deploy on a VPS (the full path)

Your project already includes `docker-compose.yml`, `ecosystem.config.js` (PM2) and `nginx.conf` — everything's prepared.

```bash
# 1. SSH into your server
ssh root@your.server.ip

# 2. Install Node 20, nginx, PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx
npm install -g pm2

# 3. Get your code onto the server
git clone https://github.com/you/markpro.git /var/www/markpro
cd /var/www/markpro

# 4. Backend
cd backend
npm ci --omit=dev
nano .env            # paste your production values
pm2 start ecosystem.config.js
pm2 save
pm2 startup          # run the command it prints — this survives reboots

# 5. Frontend
cd ../frontend
npm ci
nano .env.local      # REACT_APP_API_URL=https://api.markpro.pk/api
npm run build        # produces the build/ folder nginx will serve

# 6. Nginx
cp ../nginx.conf /etc/nginx/sites-available/markpro
ln -s /etc/nginx/sites-available/markpro /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 12.4 Point your domain at it

In your registrar's DNS panel:
```
A     @      your.server.ip
A     www    your.server.ip
A     api    your.server.ip
```
Wait 5–30 minutes for it to propagate.

### 12.5 Free HTTPS certificate (required — do not skip)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d markpro.pk -d www.markpro.pk -d api.markpro.pk
```
Answer the prompts, choose **redirect HTTP to HTTPS**. It auto-renews every 90 days. Free forever.

> Google sign-in requires HTTPS in production. Apple requires it always. Browsers block camera/mic/geolocation without it. This step is mandatory.

### 12.6 Lock down the server

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```
Port 5000 (your backend) should **not** be open to the world — nginx proxies to it internally.

### 12.7 Update every URL you registered

Go back through this guide and swap `localhost` for your real domain everywhere:
- Google Cloud → Credentials → Authorized origins + redirect URIs
- Meta app → OAuth redirect URIs and webhook URLs
- Apple Services ID → domains and return URLs
- `backend/.env` → `FRONTEND_URL`, `APP_URL`
- `frontend/.env.local` → `REACT_APP_API_URL`, then **`npm run build` again**

**This is the step everyone forgets.** If social login worked locally and breaks live, it's almost always this.

---

## Part 13 — The real-world checklist

Keys alone don't make a product. Here's the rest.

### 🔒 Security
- [ ] `.env` is in `.gitignore` and was **never** pushed to GitHub. If it was: rotate every single key, immediately. Deleting the commit is not enough — it's in the history.
- [ ] `NODE_ENV=production` in production. This turns off detailed error messages that leak internals.
- [ ] CORS locked to your domain only (check `FRONTEND_URL` is exact, not `*`).
- [ ] Rate limiting on `/api/auth/login` so nobody can brute-force passwords.
- [ ] Admin password changed from the seeded one, and `ADMIN_PASSWORD` blanked in `.env`.
- [ ] MongoDB Atlas → Network Access lists **only your server's IP**, not `0.0.0.0/0`.
- [ ] Every API key restricted in its provider dashboard (Google: HTTP referrer restrictions; AI keys: spending caps).

### 💾 Backups
- [ ] MongoDB Atlas free tier includes snapshots — enable them under **Backup**.
- [ ] Also run your own nightly dump to R2:
  ```bash
  mongodump --uri="$MONGO_URI" --archive=/tmp/markpro-$(date +%F).gz --gzip
  ```
  Add it to `crontab -e` as a daily job.
- [ ] **Test a restore once.** A backup you've never restored is not a backup.

### ⏰ Scheduled jobs
Your app has cron endpoints (scheduled posts, subscription expiry, report generation). They need something to call them:
```bash
crontab -e
# every 5 minutes
*/5 * * * * curl -s -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://api.markpro.pk/api/cron/run
```
Or use **cron-job.org** (free web-based) if you're on Vercel/Railway and have no server crontab.

### 📊 Monitoring
- [ ] **Sentry** (https://sentry.io) — free tier, emails you when the app crashes. Genuinely essential.
- [ ] **UptimeRobot** (https://uptimerobot.com) — free, texts you when the site goes down.
- [ ] **Google Analytics** or **Plausible** — see who's actually using it.
- [ ] `pm2 logs` and `pm2 monit` for live server health.

### ⚖️ Legal (you literally cannot get a payment gateway without these)
- [ ] **Terms of Service** page
- [ ] **Privacy Policy** page — must say what data you collect and how to delete it
- [ ] **Refund Policy** page
- [ ] **Data Deletion** URL — Meta requires this for app review
- [ ] **Contact page** with a real address and phone number

Generate decent first drafts free at **https://www.termsfeed.com/** or **https://getterms.io/**, then have someone read them.

### 🚀 Before you tell anyone about it
- [ ] Sign up as a brand-new user with a real email — did the verification mail arrive?
- [ ] Forgot password → did the reset email arrive and work?
- [ ] Google sign-in on the live domain, in an incognito window
- [ ] Make a payment (or a manual top-up) end to end
- [ ] Open it on a phone — every page, not just the homepage
- [ ] Run https://pagespeed.web.dev/ on your homepage
- [ ] Check https://securityheaders.com/ for your domain

---

## The absolute minimum to launch

If you do nothing else in this document, do this. **Total cost: Rs 3,500 for a domain + $5/month for a server.**

```bash
# backend/.env
NODE_ENV=production
PORT=5000
MONGO_URI=<Atlas free cluster>              # Part 2.1 — free
FRONTEND_URL=https://markpro.pk
APP_URL=https://api.markpro.pk
APP_NAME=MarkPro
JWT_SECRET=<random 64 hex>                  # Part 2.2 — free
JWT_REFRESH_SECRET=<different random>
SESSION_SECRET=<random>
TOKEN_ENCRYPTION_KEY=<exactly 64 hex>
CRON_SECRET=<random>
ADMIN_EMAIL=you@markpro.pk
ADMIN_PASSWORD=<strong>
GOOGLE_CLIENT_ID=<Google Cloud>             # Part 3  — free
SMTP_HOST=smtp-relay.brevo.com              # Part 5  — free
SMTP_PORT=587
SMTP_USER=<brevo login>
SMTP_PASS=<brevo smtp key>
SMTP_FROM=noreply@markpro.pk
SMTP_FROM_NAME=MarkPro
GEMINI_API_KEY=<AI Studio>                  # Part 6  — free
CURRENCY_CODE=PKR
BANK_NAME=...                               # Part 7  — free, manual payments
BANK_IBAN=...
JAZZCASH_ACCOUNT_NUMBER=...
EASYPAISA_ACCOUNT_NUMBER=...

# frontend/.env.local
REACT_APP_API_URL=https://api.markpro.pk/api
REACT_APP_GOOGLE_CLIENT_ID=<same Google Client ID>
```

That's **14 real values**, and every single one is free. Everything else in this guide is an upgrade you add later.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `MongooseServerSelectionError` | Your IP isn't whitelisted | Atlas → Network Access → Add Current IP |
| `bad auth : authentication failed` | Wrong DB password, or unescaped special characters | Regenerate an alphanumeric-only password |
| App starts then instantly exits | A required var is missing | Read the first error line — it names the variable |
| `CORS policy` error in browser console | `FRONTEND_URL` doesn't exactly match the browser URL | Match protocol, domain, and port exactly |
| Google button does nothing | Client ID missing in the **frontend** file, or pop-ups blocked | Set `REACT_APP_GOOGLE_CLIENT_ID`, rebuild, allow pop-ups |
| `redirect_uri_mismatch` | URL not registered in Google Cloud | Add the exact URL to Authorized origins |
| Frontend still uses old API URL | React bakes env values into the build | `npm run build` again after any `REACT_APP_*` change |
| Emails go to spam | No SPF/DKIM | Add the DNS records, test at mail-tester.com |
| Verification email never arrives | SMTP wrong, or sender not verified | Check `pm2 logs`; verify your sender in Brevo |
| Charts show "sample data" | Nothing real in the database yet | Normal — it switches to real data automatically once there is some |
| Apple sign-in fails on localhost | Apple requires HTTPS and a real domain | Test on the live site only |
| 502 Bad Gateway | Backend crashed | `pm2 logs` → read the error → `pm2 restart all` |

---

## What was already built for you

The Google and Apple sign-in flow is **already coded** in this project — you only need the keys:

- `backend/src/controllers/auth.social.controller.js` — verifies Google tokens against Google's servers and Apple tokens against Apple's public signing keys, then creates or links the user account.
- `backend/src/routes/auth.routes.js` — exposes `POST /api/auth/social/google` and `POST /api/auth/social/apple`.
- `frontend/src/services/socialAuth.js` — loads each provider's official SDK on demand.
- `frontend/src/pages/auth/index.jsx` — the Google/Apple buttons on both the Sign in and Sign up screens. **A button only appears if its key is configured**, so an unconfigured provider never shows a broken button.

Existing email accounts are automatically linked when someone signs in with a Google/Apple account using the same verified email address — no duplicate accounts.

---

*Take it one Part at a time. Get Parts 1, 2, 3, 5 and 12 done first and you'll have a real product on the internet with working logins and emails. Everything else is decoration you can add on a slow afternoon.*
