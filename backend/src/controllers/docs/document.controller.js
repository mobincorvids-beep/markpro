const path     = require('path');
const fs       = require('fs');
const mime     = require('mime-types');
const { v4: uuidv4 } = require('uuid');
const Document = require('../../models/Document.model');
const Folder   = require('../../models/Folder.model');
const User     = require('../../models/User.model');
const AuditLog = require('../../models/AuditLog.model');
const Notification = require('../../models/DocNotification.model');
const { UPLOAD_DIR } = require('../../middleware/upload');

const ok  = (res, data)       => res.json({ success: true, ...data });
const err = (res, msg, s=400) => res.status(s).json({ success: false, message: msg });
const getIp = req => (req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.socket.remoteAddress || '';

const log = async (user, action, targetType, target, details, req) => {
  try {
    await AuditLog.create({
      user: user._id, action, targetType,
      targetId: target?._id, targetName: target?.name || target?.originalName || '',
      details: details || '', ip: getIp(req || {}),
    });
  } catch {}
};

// ══════════════════════════════════════════════
// GET /api/documents - list (with filters)
// ══════════════════════════════════════════════
exports.list = async (req, res) => {
  try {
    const { folder, search, type, starred, trashed, status, sort = '-createdAt', page = 1, limit = 50 } = req.query;
    const filter = {
      $or: [
        { owner: req.user._id },
        { 'sharedWith.user': req.user._id },
      ],
    };
    if (trashed === 'true') {
      filter.trashed = true;
      filter.owner = req.user._id; // only own trash
      delete filter.$or;
    } else {
      filter.trashed = false;
    }
    if (folder !== undefined) filter.folder = folder === 'null' || folder === '' ? null : folder;
    if (search) filter.$text = { $search: search };
    if (type)   filter.documentType = type;
    if (starred === 'true') filter.isStarred = true;
    if (status) filter.status = status;

    const skip = (Number(page)-1) * Number(limit);
    const [docs, total] = await Promise.all([
      Document.find(filter)
        .populate('owner', 'name email avatar')
        .populate('sharedWith.user', 'name email avatar')
        .sort(sort).skip(skip).limit(Number(limit)),
      Document.countDocuments(filter),
    ]);
    ok(res, { documents: docs, total, page: Number(page), pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// GET /api/documents/:id - single doc detail
// ══════════════════════════════════════════════
exports.getOne = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('sharedWith.user', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('versions.uploadedBy', 'name email');
    if (!doc) return err(res, 'Document not found', 404);
    const hasAccess = doc.owner._id.equals(req.user._id) || doc.sharedWith.some(s => s.user?._id.equals(req.user._id)) || doc.isPublic;
    if (!hasAccess) return err(res, 'Access denied', 403);

    doc.viewCount += 1;
    await doc.save();
    await log(req.user, 'view', 'document', doc, '', req);
    ok(res, { document: doc });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// POST /api/documents/upload - upload new document
// ══════════════════════════════════════════════
exports.upload = async (req, res) => {
  try {
    if (!req.file) return err(res, 'No file uploaded');
    const { name, description, documentType, folder, tags, expiryDate, reminderDate } = req.body;

    const sizeMB = req.file.size / (1024*1024);
    if (req.user.storageUsedMB + sizeMB > req.user.storageQuotaMB)
      return err(res, 'Storage quota exceeded');

    const doc = await Document.create({
      name: name || req.file.originalname,
      description: description || '',
      documentType: documentType || 'General',
      tags: tags ? tags.split(',').map(t=>t.trim()).filter(Boolean) : [],
      folder: folder || null,
      owner: req.user._id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype || mime.lookup(req.file.originalname) || 'application/octet-stream',
      extension: path.extname(req.file.originalname).slice(1).toLowerCase(),
      versions: [{
        versionNumber: 1, fileName: req.file.filename, originalName: req.file.originalname,
        size: req.file.size, mimeType: req.file.mimetype, uploadedBy: req.user._id, note: 'Initial upload',
      }],
      currentVersion: 1,
      expiryDate: expiryDate || undefined,
      reminderDate: reminderDate || undefined,
    });

    req.user.storageUsedMB += sizeMB;
    await req.user.save();
    await log(req.user, 'upload', 'document', doc, `${(sizeMB).toFixed(2)} MB`, req);

    const populated = await Document.findById(doc._id).populate('owner', 'name email avatar');
    res.status(201).json({ success: true, document: populated });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// POST /api/documents/:id/versions - upload new version
// ══════════════════════════════════════════════
exports.uploadVersion = async (req, res) => {
  try {
    if (!req.file) return err(res, 'No file uploaded');
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    if (!doc.owner.equals(req.user._id) && !doc.sharedWith.some(s=>s.user?.equals(req.user._id)&&s.permission==='edit'))
      return err(res, 'Permission denied', 403);

    const newVersion = doc.currentVersion + 1;
    doc.versions.push({
      versionNumber: newVersion, fileName: req.file.filename, originalName: req.file.originalname,
      size: req.file.size, mimeType: req.file.mimetype, uploadedBy: req.user._id, note: req.body.note || '',
    });
    // Update active file pointers
    doc.fileName     = req.file.filename;
    doc.originalName = req.file.originalname;
    doc.size         = req.file.size;
    doc.mimeType     = req.file.mimetype;
    doc.currentVersion = newVersion;
    await doc.save();

    await log(req.user, 'version_upload', 'document', doc, `v${newVersion}`, req);
    ok(res, { document: doc });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// POST /api/documents/:id/versions/:vnum/restore
// ══════════════════════════════════════════════
exports.restoreVersion = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    if (!doc.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);

    const v = doc.versions.find(v => v.versionNumber === Number(req.params.vnum));
    if (!v) return err(res, 'Version not found', 404);

    const newVersion = doc.currentVersion + 1;
    doc.versions.push({
      versionNumber: newVersion, fileName: v.fileName, originalName: v.originalName,
      size: v.size, mimeType: v.mimeType, uploadedBy: req.user._id, note: `Restored from v${v.versionNumber}`,
    });
    doc.fileName = v.fileName; doc.originalName = v.originalName;
    doc.size = v.size; doc.mimeType = v.mimeType;
    doc.currentVersion = newVersion;
    await doc.save();

    await log(req.user, 'version_restore', 'document', doc, `restored v${v.versionNumber} as v${newVersion}`, req);
    ok(res, { document: doc });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// GET /api/documents/:id/download
// ══════════════════════════════════════════════
exports.download = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    const hasAccess = doc.owner.equals(req.user._id) || doc.sharedWith.some(s=>s.user?.equals(req.user._id)) || doc.isPublic;
    if (!hasAccess) return err(res, 'Access denied', 403);

    const filePath = path.join(UPLOAD_DIR, doc.fileName);
    if (!fs.existsSync(filePath)) return err(res, 'File not found on server', 404);

    doc.downloadCount += 1;
    await doc.save();
    await log(req.user, 'download', 'document', doc, '', req);

    res.download(filePath, doc.originalName);
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// GET /api/documents/:id/preview - inline view
// ══════════════════════════════════════════════
exports.preview = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    const hasAccess = doc.owner.equals(req.user._id) || doc.sharedWith.some(s=>s.user?.equals(req.user._id)) || doc.isPublic;
    if (!hasAccess) return err(res, 'Access denied', 403);

    const filePath = path.join(UPLOAD_DIR, doc.fileName);
    if (!fs.existsSync(filePath)) return err(res, 'File not found on server', 404);

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// PUT /api/documents/:id - update metadata
// ══════════════════════════════════════════════
exports.update = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    if (!doc.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);

    const { name, description, documentType, tags, folder, expiryDate, reminderDate, status } = req.body;
    if (name !== undefined) doc.name = name;
    if (description !== undefined) doc.description = description;
    if (documentType !== undefined) doc.documentType = documentType;
    if (tags !== undefined) doc.tags = Array.isArray(tags) ? tags : tags.split(',').map(t=>t.trim()).filter(Boolean);
    if (folder !== undefined) doc.folder = folder || null;
    if (expiryDate !== undefined) doc.expiryDate = expiryDate || undefined;
    if (reminderDate !== undefined) doc.reminderDate = reminderDate || undefined;
    if (status !== undefined) doc.status = status;
    await doc.save();

    await log(req.user, 'update', 'document', doc, '', req);
    ok(res, { document: doc });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// PUT /api/documents/:id/star - toggle star
// ══════════════════════════════════════════════
exports.toggleStar = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    if (!doc.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);
    doc.isStarred = !doc.isStarred;
    await doc.save();
    await log(req.user, doc.isStarred?'star':'unstar', 'document', doc, '', req);
    ok(res, { isStarred: doc.isStarred });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// DELETE /api/documents/:id - move to trash
// ══════════════════════════════════════════════
exports.trash = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    if (!doc.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);
    doc.trashed = true; doc.trashedAt = new Date();
    await doc.save();
    await log(req.user, 'delete', 'document', doc, '', req);
    ok(res, { message: 'Moved to trash' });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// POST /api/documents/:id/restore - restore from trash
// ══════════════════════════════════════════════
exports.restore = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    if (!doc.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);
    doc.trashed = false; doc.trashedAt = undefined;
    await doc.save();
    await log(req.user, 'restore', 'document', doc, '', req);
    ok(res, { message: 'Restored' });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// DELETE /api/documents/:id/permanent - permanently delete
// ══════════════════════════════════════════════
exports.permanentDelete = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    if (!doc.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);

    // Delete all version files from disk
    for (const v of doc.versions) {
      const p = path.join(UPLOAD_DIR, v.fileName);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    const sizeMB = doc.size / (1024*1024);
    req.user.storageUsedMB = Math.max(0, req.user.storageUsedMB - sizeMB);
    await req.user.save();

    await log(req.user, 'permanent_delete', 'document', doc, '', req);
    await doc.deleteOne();
    ok(res, { message: 'Permanently deleted' });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// POST /api/documents/:id/share - share with user/email
// ══════════════════════════════════════════════
exports.share = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    if (!doc.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);

    const { email, permission = 'view', expiresAt } = req.body;
    if (!email) return err(res, 'Email is required');
    const targetUser = await User.findOne({ email: email.toLowerCase() });

    const existing = doc.sharedWith.find(s => s.email === email.toLowerCase());
    if (existing) {
      existing.permission = permission;
      existing.expiresAt  = expiresAt || undefined;
      if (targetUser) existing.user = targetUser._id;
    } else {
      doc.sharedWith.push({ user: targetUser?._id, email: email.toLowerCase(), permission, expiresAt: expiresAt || undefined });
    }
    await doc.save();

    if (targetUser) {
      await Notification.create({
        user: targetUser._id, type: 'share',
        title: `${req.user.name} shared "${doc.name}" with you`,
        message: `Permission: ${permission}`,
        link: `/documents/${doc._id}`,
      });
    }

    await log(req.user, 'share', 'document', doc, `shared with ${email}`, req);
    const populated = await Document.findById(doc._id).populate('sharedWith.user', 'name email avatar');
    ok(res, { document: populated });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// DELETE /api/documents/:id/share/:shareId - unshare
// ══════════════════════════════════════════════
exports.unshare = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    if (!doc.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);

    doc.sharedWith = doc.sharedWith.filter(s => s._id.toString() !== req.params.shareId);
    await doc.save();
    await log(req.user, 'unshare', 'document', doc, '', req);
    ok(res, { document: doc });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// POST /api/documents/:id/public-link - toggle public link
// ══════════════════════════════════════════════
exports.togglePublicLink = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    if (!doc.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);

    doc.isPublic = !doc.isPublic;
    if (doc.isPublic && !doc.publicLink) doc.publicLink = uuidv4();
    await doc.save();
    await log(req.user, doc.isPublic?'share':'unshare', 'document', doc, 'public link', req);
    ok(res, { isPublic: doc.isPublic, publicLink: doc.publicLink });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// GET /api/public/:link - public access (no auth)
// ══════════════════════════════════════════════
exports.getPublic = async (req, res) => {
  try {
    const doc = await Document.findOne({ publicLink: req.params.link, isPublic: true })
      .populate('owner', 'name email avatar');
    if (!doc) return err(res, 'Document not found or link expired', 404);
    ok(res, { document: doc });
  } catch (e) { err(res, e.message, 500); }
};

exports.downloadPublic = async (req, res) => {
  try {
    const doc = await Document.findOne({ publicLink: req.params.link, isPublic: true });
    if (!doc) return err(res, 'Document not found or link expired', 404);
    const filePath = path.join(UPLOAD_DIR, doc.fileName);
    if (!fs.existsSync(filePath)) return err(res, 'File not found', 404);
    doc.downloadCount += 1;
    await doc.save();
    res.download(filePath, doc.originalName);
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// POST /api/documents/:id/comments
// ══════════════════════════════════════════════
exports.addComment = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    const hasAccess = doc.owner.equals(req.user._id) || doc.sharedWith.some(s=>s.user?.equals(req.user._id));
    if (!hasAccess) return err(res, 'Access denied', 403);

    const { text } = req.body;
    if (!text) return err(res, 'Comment text is required');
    doc.comments.push({ user: req.user._id, text });
    await doc.save();

    if (!doc.owner.equals(req.user._id)) {
      await Notification.create({
        user: doc.owner, type: 'comment',
        title: `${req.user.name} commented on "${doc.name}"`,
        message: text.slice(0,100), link: `/documents/${doc._id}`,
      });
    }

    await log(req.user, 'comment', 'document', doc, '', req);
    const populated = await Document.findById(doc._id).populate('comments.user', 'name email avatar');
    ok(res, { comments: populated.comments });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// GET /api/documents/:id/audit - audit trail for doc
// ══════════════════════════════════════════════
exports.getAuditTrail = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return err(res, 'Document not found', 404);
    if (!doc.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);

    const logs = await AuditLog.find({ targetType:'document', targetId: doc._id })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 }).limit(100);
    ok(res, { logs });
  } catch (e) { err(res, e.message, 500); }
};

// ══════════════════════════════════════════════
// GET /api/documents/stats - dashboard stats
// ══════════════════════════════════════════════
exports.getStats = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const [total, starred, shared, trashed, byType, recent, expiringSoon] = await Promise.all([
      Document.countDocuments({ owner: ownerId, trashed: false }),
      Document.countDocuments({ owner: ownerId, trashed: false, isStarred: true }),
      Document.countDocuments({ 'sharedWith.user': ownerId, trashed: false }),
      Document.countDocuments({ owner: ownerId, trashed: true }),
      Document.aggregate([
        { $match: { owner: ownerId, trashed: false } },
        { $group: { _id: '$documentType', count: { $sum: 1 }, size: { $sum: '$size' } } },
        { $sort: { count: -1 } },
      ]),
      Document.find({ owner: ownerId, trashed: false }).sort({ createdAt: -1 }).limit(5).select('name mimeType size createdAt extension'),
      Document.find({ owner: ownerId, trashed: false, expiryDate: { $gte: new Date(), $lte: new Date(Date.now()+7*86400000) } })
        .select('name expiryDate').limit(10),
    ]);

    ok(res, {
      total, starred, shared, trashed, byType, recent, expiringSoon,
      storageUsedMB: req.user.storageUsedMB,
      storageQuotaMB: req.user.storageQuotaMB,
    });
  } catch (e) { err(res, e.message, 500); }
};


// GET /api/docs/documents/:id/share - list a document's shares
exports.listShares = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, owner: req.user._id }).populate('sharedWith.user', 'name email');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, shares: doc.sharedWith });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
