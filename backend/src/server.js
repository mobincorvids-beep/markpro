require('dotenv').config();

// Section B.4: the CLIENT_URL → FRONTEND_URL runtime alias that used to live
// here is gone. Every controller now reads FRONTEND_URL directly.

const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const path       = require('path');
const mongoose   = require('mongoose');
const { Server } = require('socket.io');
const logger     = require('./utils/logger');
const { startCronJobs, startV5CronJobs, startV5ExtendedCronJobs, startMockDeliveryCron } = require('./utils/cron');

const app    = express();

// ── Serverless detection (Vercel) ────────────────────────────────────────
// Vercel runs this file as a serverless function: no persistent process, so
// socket.io (needs a long-lived connection) and cron (needs a long-lived
// process) cannot run here. Both are skipped in that environment; every
// req.app.get('io') call in controllers already uses `?.` so this is safe.
const isServerless = !!process.env.VERCEL;
const server = isServerless ? null : http.createServer(app);

// ── Socket.IO (WhatsApp live chat) — disabled on Vercel ──────────────────
if (!isServerless) {
  const io = new Server(server, {
    cors: {
      origin: (process.env.FRONTEND_URL || 'http://localhost:3000').split(','),
      methods: ['GET', 'POST'],
    },
  });
  app.set('io', io);

  io.on('connection', (socket) => {
    socket.on('join_chat',  (chatId) => socket.join(`chat_${chatId}`));
    socket.on('leave_chat', (chatId) => socket.leave(`chat_${chatId}`));
    socket.on('disconnect', () => {});
  });
} else {
  app.set('io', null);
}

// ── Database ─────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/markpro';
const { runSeed } = require('./utils/seed');

// Serverless-safe connection. Vercel freezes/thaws this module between
// invocations, and MongoDB Atlas drops idle connections out from under us —
// that surfaces as "MongoDB error: read ECONNRESET" on whatever request
// happens to hit it next (this broke admin login, but it's not specific to
// login — any route can land on a stale connection). Cache the connect()
// promise across invocations and re-establish it on demand instead of
// relying on the one-shot connect() below still being valid by the time a
// request arrives.
let mongoReady = null;
function ensureMongoConnected() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!mongoReady) {
    mongoReady = mongoose.connect(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).catch(err => { mongoReady = null; throw err; });
  }
  return mongoReady;
}
mongoose.connection.on('disconnected', () => { mongoReady = null; });
mongoose.connection.on('error', () => { mongoReady = null; });

ensureMongoConnected()
  .then(async () => {
    logger.info('MongoDB connected');
    // Cron jobs need a long-lived process — skipped on Vercel serverless.
    if (!isServerless) {
      startCronJobs(); startV5CronJobs(); startV5ExtendedCronJobs(); startMockDeliveryCron();
    }
    // Auto-seed admin/demo/plans on first boot so you can log in immediately.
    try { await runSeed({ standalone: false }); }
    catch (e) { logger.error('Auto-seed skipped:', e.message); }
  })
  .catch(err => logger.error('MongoDB error:', err));

// ── Stripe webhook - THE single endpoint (raw body, BEFORE express.json) ──
// Section B.3: one registered endpoint, one signature verification, internal
// dispatch by metadata.module. See controllers/webhooks/stripe.controller.js.
const { handleStripeWebhook } = require('./controllers/webhooks/stripe.controller');
app.post('/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// NOTE: the WhatsApp webhook is a full Express router, already mounted at
// /api/whatsapp/webhook by routes/whatsapp.routes.js. The two app.get/app.post
// lines that used to sit here referenced `.verify` / `.receive` exports that
// the controller never had, so the server crashed on boot. Removed.

// ── Middleware ────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (process.env.FRONTEND_URL || 'http://localhost:3000').split(','),
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload({ useTempFiles: true, tempFileDir: '/tmp/', limits: { fileSize: 50 * 1024 * 1024 } }));
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));

// ── Rate limiting ─────────────────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 600, standardHeaders: true }));
app.use('/api/auth/', rateLimit({ windowMs: 15*60*1000, max: 30 }));
app.use('/api/rank/tools/:tool/run', rateLimit({ windowMs: 60*60*1000, max: 50 }));

// ── Response envelope (Section B.7) ───────────────────────────────────────
// Must sit BEFORE the routers so it can wrap res.json for every API reply.
app.use(require('./middleware/envelope.middleware'));

// ── All API Routes ────────────────────────────────────────────────────────
// wrapRouter (Section B.8) forwards any escaped async rejection to the
// terminal error handler below instead of hanging the request.
const { wrapRouter } = require('./utils/wrapRouter');
// ── DB reconnect guard ──────────────────────────────────────────────────
// Cheap no-op once connected. On a thawed serverless instance whose
// connection was dropped, this awaits a fresh one before any route handler
// touches the DB — instead of the request failing mid-query with ECONNRESET
// and bubbling up as a generic 500 (e.g. "Login failed").
app.use(async (req, res, next) => {
  try { await ensureMongoConnected(); next(); }
  catch (err) {
    logger.error('MongoDB reconnect failed:', err.message);
    res.status(503).json({ success: false, error: 'Database temporarily unavailable — please try again.' });
  }
});

app.use('/api', wrapRouter(require('./routes/index')));

// ── Static uploads ────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── React build in production ─────────────────────────────────────────────
// Skipped on Vercel: the frontend is deployed as its own separate Vercel
// project there, so this backend function never has a frontend/build folder
// to serve — leave routing entirely to the 404/error handlers below instead.
if (process.env.NODE_ENV === 'production' && !isServerless) {
  const build = path.join(__dirname, '../../frontend/build');
  app.use(express.static(build));
  app.get('*', (_, res) => res.sendFile(path.join(build, 'index.html')));
}

// ── Health ────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'ok', time: new Date(),
  platform: 'MarkPro v5 - Complete Marketing Platform',
  sections: 15,
  modules: ['SEO Tools','Cyber Tools','Rank Tracker','Bio Pages','BioLinks',
            'Document Vault','WhatsApp Marketing','Publish & Brand AI',
            'Design Studio','Mailer','StackPosts','Social Proof',
            'SMM Panel','Social Stream','AI Suite','Pen AI'],
}));

// ── 404 + terminal error handler (Section B.8) ────────────────────────────
const { notFound, errorHandler } = require('./middleware/errorHandler.middleware');
app.use(notFound);
app.use(errorHandler);

// Last line of defence: log and keep the process alive rather than dying
// mid-request on an unhandled rejection somewhere in a cron job or webhook.
process.on('unhandledRejection', (reason) => logger.error(`Unhandled rejection: ${reason?.stack || reason}`));
process.on('uncaughtException',  (e) => logger.error(`Uncaught exception: ${e?.stack || e}`));

if (!isServerless) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => logger.info(`MarkPro v2 → http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`));
}

// Exported as `app` (Vercel serverless entry point uses this) and as
// {app, server, io} for existing code that destructures those (webhook
// controller, smoke test). `server`/`io` are null on Vercel — nothing
// currently destructures them there.
module.exports = app;
module.exports.app = app;
module.exports.server = server;
module.exports.io = app.get('io');