const User     = require('../../models/User.model');
const Document = require('../../models/Document.model');
const Folder   = require('../../models/Folder.model');
const AuditLog = require('../../models/AuditLog.model');

const ok  = (res, data)       => res.json({ success: true, ...data });
const err = (res, msg, s=400) => res.status(s).json({ success: false, message: msg });

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const [users, documents, folders, totalStorage, byType, recentLogs, activeUsers] = await Promise.all([
      User.countDocuments(),
      Document.countDocuments({ trashed: false }),
      Folder.countDocuments({ trashed: false }),
      Document.aggregate([{ $match:{trashed:false} }, { $group:{ _id:null, total:{$sum:'$size'} } }]),
      Document.aggregate([
        { $match:{trashed:false} },
        { $group:{ _id:'$documentType', count:{$sum:1}, size:{$sum:'$size'} } },
        { $sort:{count:-1} },
      ]),
      AuditLog.find().populate('user','name email').sort({createdAt:-1}).limit(20),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now()-30*86400000) } }),
    ]);
    ok(res, {
      users, documents, folders, activeUsers,
      totalStorageMB: ((totalStorage[0]?.total||0)/(1024*1024)).toFixed(2),
      byType, recentLogs,
    });
  } catch (e) { err(res, e.message, 500); }
};

// GET /api/admin/users
exports.listUsers = async (req, res) => {
  try {
    const { search, role, page=1, limit=50 } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: new RegExp(search,'i') }, { email: new RegExp(search,'i') }];
    if (role)   filter.role = role;
    const skip = (page-1)*limit;
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({createdAt:-1}).skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
    ]);
    // Attach document counts
    const usersWithCounts = await Promise.all(users.map(async u => {
      const docCount = await Document.countDocuments({ owner: u._id, trashed: false });
      return { ...u.toObject(), docCount };
    }));
    ok(res, { users: usersWithCounts, total, pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e.message, 500); }
};

// POST /api/admin/users - create user
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, storageQuotaMB, department, jobTitle } = req.body;
    if (!name || !email || !password) return err(res, 'Name, email and password are required');
    if (await User.findOne({ email })) return err(res, 'Email already exists');
    const user = await User.create({ name, email, password, role: role||'user', storageQuotaMB: storageQuotaMB||1024, department, jobTitle });
    ok(res, { user: user.toSafeObject() });
  } catch (e) { err(res, e.message, 500); }
};

// PUT /api/admin/users/:id
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return err(res, 'User not found', 404);
    const { name, role, active, storageQuotaMB, department, jobTitle, permissions } = req.body;
    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (active !== undefined) user.active = active;
    if (storageQuotaMB !== undefined) user.storageQuotaMB = storageQuotaMB;
    if (department !== undefined) user.department = department;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;
    if (permissions !== undefined) user.permissions = { ...user.permissions.toObject(), ...permissions };
    await user.save();
    ok(res, { user: user.toSafeObject() });
  } catch (e) { err(res, e.message, 500); }
};

// PUT /api/admin/users/:id/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return err(res, 'User not found', 404);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return err(res, 'Password must be at least 6 characters');
    user.password = newPassword;
    await user.save();
    ok(res, { message: 'Password reset successfully' });
  } catch (e) { err(res, e.message, 500); }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) return err(res, 'Cannot delete your own account');
    await User.findByIdAndDelete(req.params.id);
    ok(res, { message: 'User deleted' });
  } catch (e) { err(res, e.message, 500); }
};

// GET /api/admin/audit-logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { page=1, limit=50, action, user } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (user)   filter.user = user;
    const skip = (page-1)*limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).populate('user','name email').sort({createdAt:-1}).skip(skip).limit(Number(limit)),
      AuditLog.countDocuments(filter),
    ]);
    ok(res, { logs, total, pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e.message, 500); }
};
