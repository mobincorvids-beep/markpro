# MarkPro v5 — Server Deployment Guide

## Requirements

| Item | Minimum | Recommended |
|------|---------|-------------|
| OS | Ubuntu 20.04 | Ubuntu 22.04 LTS |
| RAM | 2 GB | 4–8 GB |
| CPU | 2 vCPU | 4 vCPU |
| Storage | 20 GB SSD | 50 GB SSD |
| Node.js | 18.x | 20.x LTS |
| MongoDB | 6.x | 7.x |

---

## Step 1 — Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB 7.x
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl enable --now mongod

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## Step 2 — Upload Code

```bash
# On your local machine
scp -r markpro-v5/ user@YOUR_SERVER_IP:/var/www/markpro

# Or clone from your repo
git clone https://your-repo.git /var/www/markpro
```

---

## Step 3 — Backend Setup

```bash
cd /var/www/markpro/backend

# Install dependencies
npm install --production

# Configure environment
cp .env.example .env
nano .env  # Fill in all required values (see .env.example)

# Generate secure JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # Run twice

# Seed database
npm run seed

# Create uploads directory
mkdir -p uploads/{docs,designs,design-media,sp-media,zam-assets,ai-speech}
chmod 755 uploads/
```

---

## Step 4 — Frontend Build

```bash
cd /var/www/markpro/frontend

# Install dependencies
npm install

# Set production API URL
echo "REACT_APP_API_URL=https://yourdomain.com/api" > .env.production

# Build
npm run build

# Output is in /var/www/markpro/frontend/build
```

---

## Step 5 — Nginx Configuration

```bash
# Copy nginx config
sudo cp /var/www/markpro/nginx.conf /etc/nginx/sites-available/markpro

# Edit to replace yourdomain.com with your actual domain
sudo nano /etc/nginx/sites-available/markpro

# Enable site
sudo ln -s /etc/nginx/sites-available/markpro /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

---

## Step 6 — Start with PM2

```bash
cd /var/www/markpro

# Start API server
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Auto-start on reboot
pm2 startup
# Run the command it outputs

# Monitor logs
pm2 logs markpro-api
pm2 monit
```

---

## Step 7 — Optional: Baileys WhatsApp Web Microservice

The WhatsML dual-channel module uses a separate Baileys microservice for WhatsApp Web QR sessions.

```bash
# Clone Baileys microservice
git clone https://github.com/your-baileys-service /var/www/baileys-service
cd /var/www/baileys-service
npm install

# Configure
echo "PORT=3001\nMAIN_API_URL=http://localhost:5000" > .env

# Start with PM2
pm2 start src/index.js --name baileys-service
pm2 save
```

---

## Environment Variables Checklist

### Required (app won't start without these)
- [x] `MONGODB_URI`
- [x] `JWT_SECRET` (min 32 chars)
- [x] `JWT_REFRESH_SECRET` (min 32 chars)
- [x] `FRONTEND_URL`

### Required for core features
- [ ] `OPENAI_API_KEY` — AI Suite, ToolsAI, SocialVibe, StackPosts AI writer
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` — All billing
- [ ] `SMTP_*` — Email sending

### Optional (modules gracefully degrade without them)
- [ ] `GEMINI_API_KEY` — ZAM Nexus 180+ SEO tools
- [ ] `SENDGRID_API_KEY` / `MAILGUN_*` — Alternative email providers
- [ ] `TWILIO_*` — Teleman VoIP + SMS
- [ ] `REMOVE_BG_API_KEY` — Design Studio background removal
- [ ] `UNSPLASH_ACCESS_KEY` — Design Studio stock photos
- [ ] `AWS_*` — S3 file storage (uses local storage otherwise)
- [ ] `IPINFO_TOKEN` — SiteSpy geo detection
- [ ] `VIRUSTOTAL_API_KEY` — SiteSpy security scans

---

## Stripe Webhook Setup

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/api/publish/billing/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
4. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

Repeat for each module that uses Stripe (Rank Tracker, Social Proof, Pen AI, etc.) or use one webhook for all.

---

## MongoDB Indexes (auto-created on first run)

All indexes are defined in Mongoose schemas and created automatically on server start. No manual setup required.

---

## Firewall Setup

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Monitoring

```bash
# View all running processes
pm2 list

# Real-time logs
pm2 logs --lines 100

# CPU/Memory usage
pm2 monit

# Restart after code update
pm2 restart markpro-api

# Zero-downtime reload
pm2 reload markpro-api
```

---

## Backup

```bash
# Backup MongoDB daily
mongodump --uri="mongodb://localhost:27017/markpro_v5" --out=/backup/$(date +%Y-%m-%d)

# Add to crontab
crontab -e
# 0 2 * * * mongodump --uri="mongodb://localhost:27017/markpro_v5" --out=/backup/$(date +\%Y-\%m-\%d) --gzip
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot connect to MongoDB` | Check `MONGODB_URI` and that `mongod` is running |
| `JWT_SECRET must be at least 32 chars` | Generate with `openssl rand -hex 32` |
| `Port 5000 already in use` | `pm2 delete all` then restart, or change `PORT` |
| `CORS error in browser` | Check `FRONTEND_URL` matches your actual frontend URL |
| `Stripe webhook 400` | Verify `STRIPE_WEBHOOK_SECRET` matches dashboard secret |
| `File upload fails` | Check `uploads/` directory exists and is writable |
| `OpenAI 401` | Check `OPENAI_API_KEY` is valid and has credits |
