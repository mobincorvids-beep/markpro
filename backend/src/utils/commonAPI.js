const nodemailer = require('nodemailer');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');

// ── S3 Client ────────────────────────────────────────────────────────────
const getS3Client = () => new S3Client({
  region:      process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  ...(process.env.AWS_ENDPOINT ? { endpoint: process.env.AWS_ENDPOINT } : {}),
});

const BUCKET = process.env.AWS_BUCKET;

// ── S3 Upload ────────────────────────────────────────────────────────────
const uploadToS3 = async (fileBuffer, remotePath, contentType = 'application/octet-stream') => {
  const client = getS3Client();
  const upload = new Upload({
    client,
    params: {
      Bucket:      BUCKET,
      Key:         remotePath,
      Body:        fileBuffer,
      ContentType: contentType,
      ACL:         'public-read',
    },
  });
  await upload.done();
  return `https://${BUCKET}.s3.amazonaws.com/${remotePath}`;
};

// ── Get Pre-signed Download URL ──────────────────────────────────────────
const getObjectSignedURL = async (remotePath) => {
  if (!remotePath) return '';
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: remotePath });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

// ── Get Pre-signed Upload URL ────────────────────────────────────────────
const getPutObjectSignedURL = async (remotePath) => {
  const client = getS3Client();
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: remotePath });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

// ── Delete from S3 ───────────────────────────────────────────────────────
const deleteFromS3 = async (remotePath) => {
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: remotePath }));
};

// ── Email ─────────────────────────────────────────────────────────────────
const createTransporter = (settings = {}) => {
  if (settings.emailService === 'smtp' || !settings.emailService) {
    return nodemailer.createTransport({
      host: settings.smtpHost || process.env.SMTP_HOST,
      port: settings.smtpPort || process.env.SMTP_PORT || 587,
      auth: {
        user: settings.smtpUsername || process.env.SMTP_USER,
        pass: settings.smtpPassword || process.env.SMTP_PASS,
      },
    });
  }
  // Add other providers (sendgrid, mandrill) here as needed
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
};

const sendMail = async ({ to, subject, html }, settings = {}) => {
  const transporter = createTransporter(settings);
  return transporter.sendMail({
    from: settings.smtpFrom || process.env.SMTP_FROM || 'noreply@pixaurl.com',
    to, subject, html,
  });
};

module.exports = { uploadToS3, getObjectSignedURL, getPutObjectSignedURL, deleteFromS3, sendMail };
