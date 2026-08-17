const nodemailer = require('nodemailer');
const logger = require('./logger');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
const sendMail = async ({ to, subject, html, text }) => {
  try {
    await transporter.sendMail({ from: `"${process.env.SMTP_FROM_NAME||'MarkPro'}" <${process.env.SMTP_FROM}>`, to, subject, html, text });
  } catch (err) { logger.error('Mailer error:', err.message); }
};
module.exports = { sendMail, transporter };
