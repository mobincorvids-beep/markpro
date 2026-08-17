const nodemailer = require('nodemailer');
const logger = require('./logger');

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to, subject, html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email error: ${error.message}`);
    throw error;
  }
};

const sendVerificationEmail = (user, token) => sendEmail({
  to: user.email,
  subject: 'Verify your Social Proof account',
  html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
    <h2 style="color:#6366f1">Welcome to Social Proof!</h2>
    <p>Hi ${user.name}, please verify your email to activate your account.</p>
    <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;margin:16px 0">Verify Email</a>
    <p style="color:#888;font-size:12px">Link expires in 24 hours.</p></div>`,
});

const sendPasswordResetEmail = (user, token) => sendEmail({
  to: user.email,
  subject: 'Reset your Social Proof password',
  html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
    <h2 style="color:#6366f1">Password Reset</h2>
    <p>Hi ${user.name}, click below to reset your password (expires in 1 hour).</p>
    <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;margin:16px 0">Reset Password</a>
    </div>`,
});

const sendWelcomeEmail = (user) => sendEmail({
  to: user.email,
  subject: `Welcome to ${process.env.APP_NAME || 'Social Proof'}!`,
  html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
    <h2 style="color:#6366f1">You're in!</h2>
    <p>Hi ${user.name}, your account is ready. Start creating campaigns to boost your conversions with social proof widgets.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;margin:16px 0">Go to Dashboard</a>
    </div>`,
});

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail };
