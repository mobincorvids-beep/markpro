/**
 * Workspace account API — powers the top-right topbar:
 *   bell menu (notifications), profile menu, avatar picture upload.
 *
 * Everything here is real MongoDB-backed data for the signed-in user.
 */
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { protect } = require('../middleware/auth.middleware');
const { ok, err, asyncHandler } = require('../utils/response');
const AccountNotification = require('../models/AccountNotification.model');
const User = require('../models/User.model');

/* ── avatar upload storage ─────────────────────────────────────────────── */
const avatarDir = process.env.VERCEL
  ? path.join('/tmp', 'avatars')
  : path.join(__dirname, '..', '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.png').toLowerCase();
      cb(null, `${req.user._id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only PNG, JPG, GIF or WEBP images are allowed'));
  },
});

const publicUrl = (req, filename) => {
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/uploads/avatars/${filename}`;
};

const sanitize = u => ({
  _id: u._id,
  id: u._id,
  name: u.name,
  username: u.username,
  email: u.email,
  role: u.role,
  avatar: u.avatar || null,
  balance: u.balance ?? 0,
  isEmailVerified: u.isEmailVerified,
  createdAt: u.createdAt,
});

const { getOverview } = require('../controllers/overview.controller');

router.use(protect);

/* ── dashboard overview (real aggregated MongoDB data) ───────────────── */
router.get('/overview', asyncHandler(getOverview));

/* ── profile ───────────────────────────────────────────────────────────── */
router.get('/me', asyncHandler(async (req, res) => ok(res, { user: sanitize(req.user) })));

router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const allowed = ['name', 'username', 'avatar', 'timezone', 'language', 'contactNumber'];
    const u = await User.findById(req.user._id);
    if (!u) return err(res, 'User not found', 404);
    for (const key of allowed) if (req.body[key] !== undefined) u[key] = req.body[key];
    await u.save();
    ok(res, { user: sanitize(u) });
  })
);

/* ── avatar picture upload ─────────────────────────────────────────────── */
router.post(
  '/avatar',
  (req, res, next) =>
    upload.single('avatar')(req, res, e => (e ? err(res, e.message, 400) : next())),
  asyncHandler(async (req, res) => {
    if (!req.file) return err(res, 'No image uploaded', 400);
    const url = publicUrl(req, req.file.filename);
    const u = await User.findByIdAndUpdate(req.user._id, { avatar: url }, { new: true });
    await AccountNotification.push(req.user._id, {
      title: 'Profile picture updated',
      body: 'Your new profile picture is now visible across MarkPro.',
      type: 'system',
    });
    ok(res, { avatar: url, user: sanitize(u) });
  })
);

router.delete(
  '/avatar',
  asyncHandler(async (req, res) => {
    const u = await User.findByIdAndUpdate(req.user._id, { avatar: null }, { new: true });
    ok(res, { avatar: null, user: sanitize(u) });
  })
);

/* ── notifications ─────────────────────────────────────────────────────── */
router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const [notifications, unread] = await Promise.all([
      AccountNotification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit).lean(),
      AccountNotification.countDocuments({ user: req.user._id, read: false }),
    ]);
    ok(res, { notifications, unread });
  })
);

router.post(
  '/notifications',
  asyncHandler(async (req, res) => {
    const { title, body = '', type = 'info', link = '' } = req.body || {};
    if (!title) return err(res, 'title is required', 400);
    const n = await AccountNotification.create({ user: req.user._id, title, body, type, link });
    ok(res, { notification: n }, 201);
  })
);

router.patch(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    const n = await AccountNotification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!n) return err(res, 'Notification not found', 404);
    ok(res, { notification: n });
  })
);

router.post(
  '/notifications/read-all',
  asyncHandler(async (req, res) => {
    const r = await AccountNotification.updateMany(
      { user: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );
    ok(res, { updated: r.modifiedCount ?? 0 });
  })
);

router.delete(
  '/notifications/:id',
  asyncHandler(async (req, res) => {
    await AccountNotification.deleteOne({ _id: req.params.id, user: req.user._id });
    ok(res, { deleted: true });
  })
);

module.exports = router;
