const nodemailer = require('nodemailer');
const transport = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
exports.sendMail = async ({ to, subject, html }) =>
  transport().sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'SocialAI'}" <${process.env.SMTP_FROM}>`,
    to, subject, html,
  });
