/**
 * storage.js
 * Mirrors the AWS S3 and Wasabi upload logic in king-leo-ajax.php.
 * Falls back to local disk storage if cloud is not configured.
 */

const fs   = require('fs');
const path = require('path');
const axios = require('axios');
const Settings = require('../models/Settings.model');

// Lazy-load AWS SDK only when needed
let S3Client, PutObjectCommand;
try {
  ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'));
} catch {
  // AWS SDK not installed - cloud upload disabled
}

/**
 * downloadBuffer(url)
 * Fetches a remote image URL and returns a Buffer.
 */
async function downloadBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(res.data);
}

/**
 * buildLocalPath(ext)
 * Returns { dir, filename, urlPath } for local disk storage.
 */
function buildLocalPath(ext = 'png') {
  const year  = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const dir   = process.env.VERCEL ? path.join('/tmp', String(year), month) : path.join(__dirname, '..', 'uploads', String(year), month);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  return { dir, filename, urlPath: `/uploads/${year}/${month}/${filename}` };
}

/**
 * uploadToS3(buffer, filename, bucketSettings, folder)
 * Uploads a Buffer to AWS S3 or Wasabi (same API, different endpoint).
 * Returns the public URL. `folder` groups files by feature (e.g. 'documents',
 * 'avatars', 'design-media') instead of always writing under 'ai-images/'.
 */
async function uploadToS3(buffer, filename, { region, bucket, accessKey, secretKey, endpoint }, folder = 'ai-images', contentType = 'image/png') {
  if (!S3Client) throw new Error('AWS SDK not installed. Run: npm install @aws-sdk/client-s3');

  const client = new S3Client({
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    ...(endpoint ? { endpoint } : {}),
  });

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `${folder}/${filename}`,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  }));

  if (endpoint) {
    // Wasabi public URL pattern
    return `https://s3.${region}.wasabisys.com/${bucket}/${folder}/${filename}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${folder}/${filename}`;
}

let warnedNoCloudStorage = false;

/**
 * uploadFile(buffer, { folder, filename, contentType })
 * Generic file persistence for ANY upload feature (documents, avatars,
 * design media, WhatsApp attachments, etc.) — not just AI images. Uses
 * AWS S3 or Wasabi if configured (via admin Settings or env vars), else
 * falls back to local disk. On Vercel, local disk means /tmp, which does
 * NOT persist between requests — so without cloud storage configured,
 * uploaded files will disappear. This function logs a one-time warning in
 * that case so it shows up clearly in the server logs instead of silently
 * losing files.
 */
async function uploadFile(buffer, { folder = 'uploads', filename, contentType = 'application/octet-stream' } = {}) {
  const finalName = filename || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const awsEnabled    = await Settings.get('aws_enabled',    false);
  const wasabiEnabled = await Settings.get('wasabi_enabled', false);

  if (awsEnabled) {
    const url = await uploadToS3(buffer, finalName, {
      region:    await Settings.get('aws_region', process.env.AWS_REGION),
      bucket:    await Settings.get('aws_bucket', process.env.AWS_BUCKET),
      accessKey: process.env.AWS_ACCESS_KEY_ID,
      secretKey: process.env.AWS_SECRET_ACCESS_KEY,
    }, folder, contentType);
    return { url, storageType: 'aws' };
  }

  if (wasabiEnabled) {
    const region = await Settings.get('wasabi_region', process.env.WASABI_REGION);
    const url = await uploadToS3(buffer, finalName, {
      region,
      bucket:    await Settings.get('wasabi_bucket', process.env.WASABI_BUCKET),
      accessKey: process.env.WASABI_ACCESS_KEY,
      secretKey: process.env.WASABI_SECRET_KEY,
      endpoint:  `https://s3.${region}.wasabisys.com`,
    }, folder, contentType);
    return { url, storageType: 'wasabi' };
  }

  if (process.env.VERCEL && !warnedNoCloudStorage) {
    warnedNoCloudStorage = true;
    // eslint-disable-next-line no-console
    console.warn(
      '[storage] No AWS/Wasabi configured — uploaded files are being written to ' +
      '/tmp on Vercel, which does NOT persist between requests. Files will ' +
      'disappear. Configure AWS_* or WASABI_* env vars (and enable them in ' +
      'Admin → Settings) to fix this permanently.'
    );
  }

  const year  = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const dir   = process.env.VERCEL
    ? path.join('/tmp', folder, String(year), month)
    : path.join(__dirname, '..', 'uploads', folder, String(year), month);
  fs.mkdirSync(dir, { recursive: true });
  const fullPath = path.join(dir, finalName);
  fs.writeFileSync(fullPath, buffer);
  return { url: `/uploads/${folder}/${year}/${month}/${finalName}`, storageType: 'local' };
}

/**
 * saveImage(sourceUrl, { watermark, resize })
 * Main export: downloads the image from sourceUrl, optionally resizes/watermarks,
 * then stores it using whichever storage backend is configured (local / AWS / Wasabi).
 * Returns the final public URL string and the storage type used.
 */
async function saveImage(sourceUrl, opts = {}) {
  const { resize, watermark = false, isBase64 = false } = opts;

  let buffer = isBase64
    ? Buffer.from(sourceUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    : await downloadBuffer(sourceUrl);

  // Optional sharp processing
  try {
    const sharp = require('sharp');
    let s = sharp(buffer);
    if (resize) s = s.resize(resize, resize, { fit: 'inside' });
    if (watermark) {
      const wmPath = path.join(__dirname, '..', 'watermark', 'watermark.png');
      if (fs.existsSync(wmPath)) {
        s = s.composite([{ input: wmPath, gravity: 'southeast' }]);
      }
      buffer = await s.webp({ quality: 90 }).toBuffer();
    } else {
      buffer = await s.png().toBuffer();
    }
  } catch {
    // sharp not available - skip processing
  }

  const ext = watermark ? 'webp' : 'png';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  return uploadFile(buffer, { folder: 'ai-images', filename, contentType: watermark ? 'image/webp' : 'image/png' });
}

module.exports = { saveImage, uploadFile };
