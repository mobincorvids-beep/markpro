const Folder   = require('../../models/Folder.model');
const Document = require('../../models/Document.model');
const AuditLog = require('../../models/AuditLog.model');
const { v4: uuidv4 } = require('uuid');

const ok  = (res, data)       => res.json({ success: true, ...data });
const err = (res, msg, s=400) => res.status(s).json({ success: false, message: msg });
const getIp = req => (req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.socket.remoteAddress || '';
const log = async (user, action, target, details, req) => {
  try { await AuditLog.create({ user: user._id, action, targetType:'folder', targetId: target?._id, targetName: target?.name||'', details: details||'', ip: getIp(req||{}) }); } catch {}
};

// GET /api/folders?parent=xxx
exports.list = async (req, res) => {
  try {
    const { parent, trashed, starred } = req.query;
    const filter = {
      $or: [{ owner: req.user._id }, { 'sharedWith.user': req.user._id }],
    };
    if (trashed === 'true') { filter.trashed = true; filter.owner = req.user._id; delete filter.$or; }
    else filter.trashed = false;
    if (parent !== undefined) filter.parent = parent === 'null' || parent === '' ? null : parent;
    if (starred === 'true') filter.isStarred = true;

    const folders = await Folder.find(filter).populate('owner', 'name email avatar').sort({ name: 1 });
    ok(res, { folders });
  } catch (e) { err(res, e.message, 500); }
};

// GET /api/folders/:id/breadcrumb
exports.breadcrumb = async (req, res) => {
  try {
    const trail = [];
    let current = await Folder.findById(req.params.id);
    while (current) {
      trail.unshift({ _id: current._id, name: current.name });
      current = current.parent ? await Folder.findById(current.parent) : null;
    }
    ok(res, { breadcrumb: trail });
  } catch (e) { err(res, e.message, 500); }
};

// POST /api/folders
exports.create = async (req, res) => {
  try {
    const { name, parent, color } = req.body;
    if (!name) return err(res, 'Folder name is required');

    let folderPath = '/';
    if (parent) {
      const parentFolder = await Folder.findById(parent);
      if (!parentFolder) return err(res, 'Parent folder not found', 404);
      folderPath = (parentFolder.path === '/' ? '' : parentFolder.path) + '/' + parentFolder.name;
    }

    const folder = await Folder.create({ name, parent: parent || null, owner: req.user._id, color, path: folderPath });
    await log(req.user, 'folder_create', folder, '', req);
    ok(res, { folder });
  } catch (e) { err(res, e.message, 500); }
};

// PUT /api/folders/:id
exports.update = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return err(res, 'Folder not found', 404);
    if (!folder.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);

    const { name, color, parent, isStarred } = req.body;
    const renamed = name !== undefined && name !== folder.name;
    if (name !== undefined) folder.name = name;
    if (color !== undefined) folder.color = color;
    if (parent !== undefined) folder.parent = parent || null;
    if (isStarred !== undefined) folder.isStarred = isStarred;
    await folder.save();

    await log(req.user, renamed ? 'folder_rename' : (parent!==undefined?'folder_move':'update'), folder, '', req);
    ok(res, { folder });
  } catch (e) { err(res, e.message, 500); }
};

// DELETE /api/folders/:id - move to trash (cascades)
exports.trash = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return err(res, 'Folder not found', 404);
    if (!folder.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);

    folder.trashed = true; folder.trashedAt = new Date();
    await folder.save();
    // Cascade: trash documents directly in this folder
    await Document.updateMany({ folder: folder._id, owner: req.user._id }, { trashed: true, trashedAt: new Date() });

    await log(req.user, 'folder_delete', folder, '', req);
    ok(res, { message: 'Folder moved to trash' });
  } catch (e) { err(res, e.message, 500); }
};

// POST /api/folders/:id/restore
exports.restore = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return err(res, 'Folder not found', 404);
    if (!folder.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);
    folder.trashed = false; folder.trashedAt = undefined;
    await folder.save();
    await Document.updateMany({ folder: folder._id, owner: req.user._id }, { trashed: false, $unset:{ trashedAt:1 } });
    await log(req.user, 'restore', folder, '', req);
    ok(res, { message: 'Restored' });
  } catch (e) { err(res, e.message, 500); }
};

// DELETE /api/folders/:id/permanent
exports.permanentDelete = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return err(res, 'Folder not found', 404);
    if (!folder.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);

    const docCount = await Document.countDocuments({ folder: folder._id });
    if (docCount > 0) return err(res, 'Folder contains documents - delete or move them first');

    await log(req.user, 'permanent_delete', folder, '', req);
    await folder.deleteOne();
    ok(res, { message: 'Permanently deleted' });
  } catch (e) { err(res, e.message, 500); }
};

// POST /api/folders/:id/share
exports.share = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return err(res, 'Folder not found', 404);
    if (!folder.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);

    const User = require('../../models/User.model');
    const { email, permission = 'view' } = req.body;
    const targetUser = await User.findOne({ email: email?.toLowerCase() });
    if (!targetUser) return err(res, 'User not found');

    const existing = folder.sharedWith.find(s => s.user?.equals(targetUser._id));
    if (existing) existing.permission = permission;
    else folder.sharedWith.push({ user: targetUser._id, permission });
    await folder.save();

    await log(req.user, 'share', folder, `shared with ${email}`, req);
    ok(res, { folder });
  } catch (e) { err(res, e.message, 500); }
};

// POST /api/folders/:id/public-link
exports.togglePublicLink = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return err(res, 'Folder not found', 404);
    if (!folder.owner.equals(req.user._id)) return err(res, 'Permission denied', 403);

    folder.isPublic = !folder.isPublic;
    if (folder.isPublic && !folder.publicLink) folder.publicLink = uuidv4();
    await folder.save();
    ok(res, { isPublic: folder.isPublic, publicLink: folder.publicLink });
  } catch (e) { err(res, e.message, 500); }
};
