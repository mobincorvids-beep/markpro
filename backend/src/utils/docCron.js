const cron = require('node-cron');
const Document = require('../models/Document.model');
const DocumentRequest = require('../models/DocumentRequest.model');
const Notification = require('../models/DocNotification.model');
const { sendMail } = require('./mailer');

function startCronJobs() {
  // Every hour: check for document reminders due
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const due = await Document.find({
        reminderDate: { $lte: now }, reminderSent: false, trashed: false,
      }).populate('owner', 'name email');

      for (const doc of due) {
        await Notification.create({
          user: doc.owner._id, type: 'reminder',
          title: `Reminder: ${doc.name}`,
          message: doc.expiryDate ? `This document expires on ${new Date(doc.expiryDate).toLocaleDateString()}` : 'You set a reminder for this document',
          link: `/documents/${doc._id}`,
        });
        await sendMail({
          to: doc.owner.email,
          subject: `Reminder: ${doc.name}`,
          html: `<p>This is a reminder about your document <strong>${doc.name}</strong>.</p>`,
        }).catch(()=>{});
        doc.reminderSent = true;
        await doc.save();
      }
      if (due.length) console.log(`[cron] Sent ${due.length} document reminders`);
    } catch (e) { console.error('[cron] reminder job error:', e.message); }
  });

  // Every day at midnight: mark expired documents and requests
  cron.schedule('0 0 * * *', async () => {
    try {
      const now = new Date();
      const expired = await Document.updateMany(
        { expiryDate: { $lte: now }, status: 'active', trashed: false },
        { status: 'expired' }
      );
      const expiredReqs = await DocumentRequest.updateMany(
        { expiresAt: { $lte: now }, status: 'pending' },
        { status: 'expired' }
      );
      console.log(`[cron] Marked ${expired.modifiedCount} documents and ${expiredReqs.modifiedCount} requests as expired`);
    } catch (e) { console.error('[cron] expiry job error:', e.message); }
  });

  console.log('⏰ Cron jobs scheduled');
}

module.exports = { startCronJobs };
