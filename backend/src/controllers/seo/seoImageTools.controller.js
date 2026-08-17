/**
 * A-to-Z SEO Tools — Image group
 * Real, free-only implementations using multer (upload) + sharp (processing)
 * + Gemini vision (free tier) for alt-text. No paid APIs.
 *
 * Logo Maker is deliberately NOT implemented here: a genuine logo generator
 * needs AI image generation, which was explicitly descoped by the project
 * owner (Gemini image gen is unreliable on the free tier right now). Building
 * a fake "logo maker" that just stamps text in a box would be dishonest
 * marketing for a tool named "Logo Maker" — left as a roadmap item instead.
 */
const sharp = require('sharp');
const gemini = require('../../services/gemini.service');

const ok  = (res, data)       => res.json({ success: true, ...data });
const err = (res, msg, s=400) => res.status(s).json({ success: false, message: msg });

// Image Compressor — real compression via sharp, returns base64 result
// (no persistent storage needed; the user downloads/reuses it client-side)
exports.imageCompressor = async (req, res) => {
  if (!req.file) return err(res, 'Upload an image file (field name: "image")');
  try {
    const quality = Math.min(100, Math.max(10, parseInt(req.body.quality) || 75));
    const format = (req.body.format || 'auto').toLowerCase();
    const meta = await sharp(req.file.buffer).metadata();

    let pipeline = sharp(req.file.buffer);
    let outFormat = format;
    if (format === 'auto') outFormat = meta.format === 'png' ? 'png' : 'jpeg';

    if (outFormat === 'jpeg' || outFormat === 'jpg') pipeline = pipeline.jpeg({ quality });
    else if (outFormat === 'png') pipeline = pipeline.png({ quality, compressionLevel: 9 });
    else if (outFormat === 'webp') pipeline = pipeline.webp({ quality });
    else return err(res, 'Unsupported format. Use jpeg, png, or webp.');

    const outputBuffer = await pipeline.toBuffer();
    ok(res, {
      originalSizeKB: Math.round(req.file.buffer.length / 1024),
      compressedSizeKB: Math.round(outputBuffer.length / 1024),
      savingsPercent: Math.round((1 - outputBuffer.length / req.file.buffer.length) * 100),
      format: outFormat,
      dataUrl: `data:image/${outFormat};base64,${outputBuffer.toString('base64')}`,
    });
  } catch (e) { err(res, 'Compression failed: ' + e.message); }
};

// Alt Text Generator — real Gemini vision call, describes the actual image
exports.altTextGenerator = async (req, res) => {
  if (!req.file) return err(res, 'Upload an image file (field name: "image")');
  if (!gemini.isConfigured()) return err(res, 'Alt-text generation requires GEMINI_API_KEY to be configured.', 503);
  try {
    const { keyword } = req.body;
    const base64 = req.file.buffer.toString('base64');
    const prompt = `Write a concise, descriptive, SEO-friendly alt text for this image (under 125 characters, no "image of" prefix).${keyword ? ` Naturally include the keyword "${keyword}" if it fits the image content — never force it if it doesn't.` : ''} Return only the alt text, nothing else.`;
    const altText = await gemini.describeImage({ prompt, imageBase64: base64, mimeType: req.file.mimetype });
    ok(res, { altText: altText.replace(/^["']|["']$/g, ''), characterCount: altText.length });
  } catch (e) { err(res, 'Alt text generation failed: ' + e.message); }
};

// Image Rename Tool — SEO-friendly filename slug generator (no AI needed)
exports.imageRenameTool = (req, res) => {
  const { originalName, keywords = '' } = req.body;
  if (!originalName && !keywords) return err(res, 'Provide originalName and/or keywords');
  const ext = (originalName && originalName.includes('.')) ? originalName.split('.').pop().toLowerCase() : 'jpg';
  const base = keywords || originalName.replace(/\.[^.]+$/, '');
  const slug = base.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  ok(res, { suggestedFilename: `${slug}.${ext}`, slug });
};

// Favicon Generator — real multi-size favicon set via sharp, returned as base64 PNGs
exports.faviconGenerator = async (req, res) => {
  if (!req.file) return err(res, 'Upload a source image (field name: "image"), ideally square, at least 512x512');
  try {
    const sizes = [16, 32, 48, 96, 180, 192, 512];
    const outputs = {};
    for (const size of sizes) {
      const buf = await sharp(req.file.buffer)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toBuffer();
      outputs[`${size}x${size}`] = `data:image/png;base64,${buf.toString('base64')}`;
    }
    ok(res, {
      favicons: outputs,
      htmlSnippet: [
        `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">`,
        `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">`,
        `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`,
      ].join('\n'),
    });
  } catch (e) { err(res, 'Favicon generation failed: ' + e.message); }
};

module.exports = exports;
