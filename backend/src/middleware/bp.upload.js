const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = process.env.VERCEL
  ? path.join('/tmp', 'bp-uploads')
  : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|gif|webp|mp4|mov|avi|webm/i;
    if (allowed.test(path.extname(file.originalname).slice(1))) cb(null, true);
    else cb(new Error(`File type not supported`));
  },
});

module.exports = { upload, UPLOAD_DIR };

// Memory-storage variant for tools that process an image in-memory and
// return the result directly (no need to persist the original to disk).
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|gif|webp/i;
    if (allowed.test(path.extname(file.originalname).slice(1))) cb(null, true);
    else cb(new Error('File type not supported — use jpg, png, gif, or webp'));
  },
});

module.exports.memoryUpload = memoryUpload;
