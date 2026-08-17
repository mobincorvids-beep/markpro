/**
 * Dashboard overview — every number here is aggregated from MongoDB for the
 * signed-in user. No dummy series, no hardcoded activity.
 *
 * Every aggregation is individually guarded: a module whose collection does
 * not exist yet simply contributes zero instead of failing the whole request.
 */
const mongoose = require('mongoose');

// Resolve a mongoose model, loading its file first so the model is registered
// even when no other route has imported it yet in this process.
const MODEL_FILES = {
  ToolUsage: '../models/ToolUsage.model',
  WalletLedger: '../models/WalletLedger.model',
  SMM_Order: '../models/SMM_Order.model',
  Document: '../models/Document.model',
  AuditLog: '../models/AuditLog.model',
  BPPost: '../models/BPPost.model',
  AccountNotification: '../models/AccountNotification.model',
};

const model = name => {
  try { require(MODEL_FILES[name]); } catch { /* optional module */ }
  try { return mongoose.model(name); } catch { return null; }
};

const safe = async (fn, fallback) => {
  try { const v = await fn(); return v === undefined || v === null ? fallback : v; }
  catch { return fallback; }
};

const WEEKS = 8;

/** Start of the ISO-ish week bucket, `i` weeks back from now. */
const weekStart = i => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() - 7 * i);
  return d;
};

const emptyWeeks = () => {
  const out = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    out.push({ key: weekStart(i).getTime(), week: `W${WEEKS - i}`, visits: 0, engagement: 0 });
  }
  return out;
};

/** Bucket a list of {createdAt} docs into the 8-week series under `field`. */
const bucket = (series, docs, field) => {
  const oldest = series[0].key;
  for (const doc of docs) {
    const t = new Date(doc.createdAt || doc.publishedAt || doc.updatedAt || 0).getTime();
    if (!t || t < oldest) continue;
    for (let i = series.length - 1; i >= 0; i--) {
      if (t >= series[i].key) { series[i][field] += 1; break; }
    }
  }
};

const MODULE_LABELS = {
  smm: 'SMM', aigen: 'AI', ai: 'AI', pen: 'Pen AI', publish: 'Publish',
  whatsapp: 'WhatsApp', docs: 'Docs', rank: 'Rank', seo: 'SEO',
  mailer: 'Mailer', social: 'Social', balance: 'Wallet',
};
const label = m => MODULE_LABELS[m] || (m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Other');

const PALETTE = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];

exports.getOverview = async (req, res) => {
  const userId = req.user._id;
  const since = weekStart(WEEKS - 1);

  const ToolUsage = model('ToolUsage');
  const WalletLedger = model('WalletLedger');
  const SMMOrder = model('SMM_Order');
  const Document = model('Document');
  const AuditLog = model('AuditLog');
  const BPPost = model('BPPost');
  const AccountNotification = model('AccountNotification');

  /* ── traffic & engagement: tool runs vs. published posts, per week ────── */
  const [toolRuns, posts] = await Promise.all([
    safe(() => ToolUsage
      ? ToolUsage.find({ user: userId, createdAt: { $gte: since } }).select('createdAt toolId toolName').lean()
      : [], []),
    safe(() => BPPost
      ? BPPost.find({ user: userId, createdAt: { $gte: since } }).select('createdAt').lean()
      : [], []),
  ]);

  const traffic = emptyWeeks();
  bucket(traffic, toolRuns, 'visits');
  bucket(traffic, posts, 'engagement');

  const thisWeek = traffic[traffic.length - 1];
  const lastWeek = traffic[traffic.length - 2] || { visits: 0 };
  const trend = lastWeek.visits
    ? ((thisWeek.visits - lastWeek.visits) / lastWeek.visits) * 100
    : (thisWeek.visits ? 100 : 0);

  /* ── module usage: real counts of what the user actually created ──────── */
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [seoRuns, orderCount, docCount, postCount, ledgerCount] = await Promise.all([
    safe(() => ToolUsage ? ToolUsage.countDocuments({ user: userId, createdAt: { $gte: monthAgo } }) : 0, 0),
    safe(() => SMMOrder ? SMMOrder.countDocuments({ userId, createdAt: { $gte: monthAgo } }) : 0, 0),
    safe(() => Document ? Document.countDocuments({ owner: userId, createdAt: { $gte: monthAgo } }) : 0, 0),
    safe(() => BPPost ? BPPost.countDocuments({ user: userId, createdAt: { $gte: monthAgo } }) : 0, 0),
    safe(() => WalletLedger ? WalletLedger.countDocuments({ userId, createdAt: { $gte: monthAgo } }) : 0, 0),
  ]);

  const usage = [
    { name: 'Tools', runs: seoRuns },
    { name: 'SMM', runs: orderCount },
    { name: 'Docs', runs: docCount },
    { name: 'Publish', runs: postCount },
    { name: 'Wallet', runs: ledgerCount },
  ];

  /* ── spend split: real debits from the wallet ledger, grouped by module ─ */
  const spendRows = await safe(() => WalletLedger
    ? WalletLedger.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), amount: { $lt: 0 } } },
        { $group: { _id: '$module', total: { $sum: { $abs: '$amount' } } } },
        { $sort: { total: -1 } },
        { $limit: 6 },
      ])
    : [], []);

  const spendTotal = spendRows.reduce((s, r) => s + r.total, 0);
  const spend = spendRows.map((r, i) => ({
    name: label(r._id),
    value: spendTotal ? Math.round((r.total / spendTotal) * 100) : 0,
    amount: Number(r.total.toFixed(2)),
    color: PALETTE[i % PALETTE.length],
  }));

  /* ── recent activity: audit log + latest orders, merged & sorted ──────── */
  const [audits, recentOrders] = await Promise.all([
    safe(() => AuditLog
      ? AuditLog.find({ user: userId }).sort({ createdAt: -1 }).limit(8).lean()
      : [], []),
    safe(() => SMMOrder
      ? SMMOrder.find({ userId }).sort({ createdAt: -1 }).limit(5).select('serviceName status charge createdAt').lean()
      : [], []),
  ]);

  const activity = [
    ...audits.map(a => ({
      kind: a.targetType || 'document',
      title: `${a.action.replace(/_/g, ' ')} ${a.targetName || a.targetType}`.trim(),
      module: 'Docs',
      at: a.createdAt,
    })),
    ...recentOrders.map(o => ({
      kind: 'order',
      title: `${o.serviceName || 'SMM order'} — ${o.status}`,
      module: 'SMM Panel',
      at: o.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6);

  /* ── wallet + notifications ───────────────────────────────────────────── */
  const [spent30, notifications] = await Promise.all([
    safe(async () => {
      if (!WalletLedger) return 0;
      const r = await WalletLedger.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), amount: { $lt: 0 }, createdAt: { $gte: monthAgo } } },
        { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
      ]);
      return Number((r[0]?.total || 0).toFixed(2));
    }, 0),
    safe(() => AccountNotification
      ? AccountNotification.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean()
      : [], []),
  ]);

  res.json({
    success: true,
    data: {
      traffic,
      trend: Number(trend.toFixed(1)),
      usage,
      spend,
      activity,
      notifications,
      wallet: {
        balance: Number(req.user.balance ?? 0),
        spent30,
      },
      counts: { toolRuns: seoRuns, orders: orderCount, documents: docCount, posts: postCount },
      generatedAt: new Date(),
    },
  });
};
