const DocumentRequest = require('../../models/DocumentRequest.model');
const Document = require('../../models/Document.model');
const AuditLog = require('../../models/AuditLog.model');
const { sendMail } = require('../../utils/mailer');

const ok  = (res, data)       => res.json({ success: true, ...data });
const err = (res, msg, s=400) => res.status(s).json({ success: false, message: msg });

// GET /api/requests - list requests created by user
exports.list = async (req, res) => {
  try {
    const requests = await DocumentRequest.find({ requestedBy: req.user._id })
      .populate('fulfilledDocument', 'name originalName size')
      .sort({ createdAt: -1 });
    ok(res, { requests });
  } catch (e) { err(res, e.message, 500); }
};

// POST /api/requests - create a new request
exports.create = async (req, res) => {
  try {
    const { recipientEmail, recipientName, title, message, folder, expiresInDays = 7 } = req.body;
    if (!recipientEmail || !title) return err(res, 'Recipient email and title are required');

    const request = await DocumentRequest.create({
      requestedBy: req.user._id, recipientEmail, recipientName, title, message,
      folder: folder || null,
      expiresAt: new Date(Date.now() + Number(expiresInDays)*86400000),
    });

    const uploadLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/request/${request.token}`;
    await sendMail({
      to: recipientEmail,
      subject: `${req.user.name} requested a file: ${title}`,
      html: `
        <h2>Document Request</h2>
        <p><strong>${req.user.name}</strong> has requested a file from you:</p>
        <p style="font-size:16px;font-weight:600">${title}</p>
        ${message ? `<p>${message}</p>` : ''}
        <p><a href="${uploadLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;border-radius:6px;text-decoration:none">Upload File</a></p>
        <p style="color:#888;font-size:12px">This link expires in ${expiresInDays} days.</p>
      `,
    }).catch(()=>{});

    await AuditLog.create({ user: req.user._id, action:'request_sent', targetType:'request', targetId: request._id, targetName: title });
    ok(res, { request });
  } catch (e) { err(res, e.message, 500); }
};

// DELETE /api/requests/:id - cancel
exports.cancel = async (req, res) => {
  try {
    const request = await DocumentRequest.findOne({ _id: req.params.id, requestedBy: req.user._id });
    if (!request) return err(res, 'Request not found', 404);
    request.status = 'cancelled';
    await request.save();
    ok(res, { message: 'Request cancelled' });
  } catch (e) { err(res, e.message, 500); }
};

// ── Public endpoints (no auth) ──────────────────

// GET /api/requests/public/:token
exports.getPublic = async (req, res) => {
  try {
    const request = await DocumentRequest.findOne({ token: req.params.token })
      .populate('requestedBy', 'name email');
    if (!request) return err(res, 'Request not found', 404);
    if (request.status !== 'pending') return err(res, `This request has already been ${request.status}`);
    if (request.expiresAt < new Date()) {
      request.status = 'expired'; await request.save();
      return err(res, 'This request has expired');
    }
    ok(res, { request });
  } catch (e) { err(res, e.message, 500); }
};

// POST /api/requests/public/:token/upload - fulfil request (no auth, uses multer)
exports.fulfil = async (req, res) => {
  try {
    if (!req.file) return err(res, 'No file uploaded');
    const request = await DocumentRequest.findOne({ token: req.params.token });
    if (!request) return err(res, 'Request not found', 404);
    if (request.status !== 'pending') return err(res, `This request has already been ${request.status}`);
    if (request.expiresAt < new Date()) return err(res, 'This request has expired');

    const path = require('path');
    const doc = await Document.create({
      name: request.title,
      description: `Uploaded via document request from ${request.recipientEmail}`,
      documentType: 'Requested',
      folder: request.folder,
      owner: request.requestedBy,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      extension: path.extname(req.file.originalname).slice(1).toLowerCase(),
      versions: [{ versionNumber:1, fileName: req.file.filename, originalName: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype, uploadedBy: request.requestedBy, note: 'Uploaded via document request' }],
    });

    request.status = 'fulfilled';
    request.fulfilledDocument = doc._id;
    request.fulfilledAt = new Date();
    await request.save();

    const Notification = require('../../models/DocNotification.model');
    await Notification.create({
      user: request.requestedBy, type: 'request',
      title: `Document request fulfilled: ${request.title}`,
      message: `${request.recipientName || request.recipientEmail} uploaded a file`,
      link: `/documents/${doc._id}`,
    });

    await AuditLog.create({ user: request.requestedBy, action:'request_fulfilled', targetType:'request', targetId: request._id, targetName: request.title });
    ok(res, { message: 'File uploaded successfully. Thank you!' });
  } catch (e) { err(res, e.message, 500); }
};


// POST /api/docs/requests/:id/fulfill - mark request fulfilled (owner action)
exports.fulfillManual = async (req, res) => {
  try {
    const request = await DocumentRequest.findOne({ _id: req.params.id, requestedBy: req.user._id });
    if (!request) return err(res, 'Request not found', 404);
    request.status = 'fulfilled';
    request.fulfilledAt = new Date();
    await request.save();
    await AuditLog.create({ user: req.user._id, action: 'request_fulfilled', targetType: 'request', targetId: request._id, targetName: request.title }).catch(()=>{});
    ok(res, { request, message: 'Request marked as fulfilled' });
  } catch (e) { err(res, e.message, 500); }
};
