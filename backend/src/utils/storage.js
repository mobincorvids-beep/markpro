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
  const dir   = path.join(__dirname, '..', 'uploads', String(year), month);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  return { dir, filename, urlPath: `/uploads/${year}/${month}/${filename}` };
}

/**
 * uploadToS3(buffer, filename, bucketSettings)
 * Uploads a Buffer to AWS S3 or Wasabi (same API, different endpoint).
 * Returns the public URL.
 */
async function uploadToS3(buffer, filename, { region, bucket, accessKey, secretKey, endpoint }) {
  if (!S3Client) throw new Error('AWS SDK not installed. Run: npm install @aws-sdk/client-s3');

  const client = new S3Client({
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    ...(endpoint ? { endpoint } : {}),
  });

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `ai-images/${filename}`,
    Body: buffer,
    ContentType: 'image/png',
    ACL: 'public-read',
  }));

  if (endpoint) {
    // Wasabi public URL pattern
    return `https://s3.${region}.wasabisys.com/${bucket}/ai-images/${filename}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/ai-images/${filename}`;
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

  // Check configured storage backend
  const awsEnabled    = await Settings.get('aws_enabled',    false);
  const wasabiEnabled = await Settings.get('wasabi_enabled', false);

  if (awsEnabled) {
    const url = await uploadToS3(buffer, filename, {
      region:    await Settings.get('aws_region',  process.env.AWS_REGION),
      bucket:    await Settings.get('aws_bucket',  process.env.AWS_BUCKET),
      accessKey: process.env.AWS_ACCESS_KEY_ID,
      secretKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    return { url, storageType: 'aws' };
  }

  if (wasabiEnabled) {
    const region = await Settings.get('wasabi_region', process.env.WASABI_REGION);
    const url = await uploadToS3(buffer, filename, {
      region,
      bucket:    await Settings.get('wasabi_bucket', process.env.WASABI_BUCKET),
      accessKey: process.env.WASABI_ACCESS_KEY,
      secretKey: process.env.WASABI_SECRET_KEY,
      endpoint:  `https://s3.${region}.wasabisys.com`,
    });
    return { url, storageType: 'wasabi' };
  }

  // Default: local disk
  const { dir, urlPath } = buildLocalPath(ext);
  fs.writeFileSync(path.join(dir, filename.split('/').pop() || filename), buffer);
  // buildLocalPath already wrote to the right dir; write using the full path
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, buffer);
  return { url: urlPath, storageType: 'local' };
}

module.exports = { saveImage };
