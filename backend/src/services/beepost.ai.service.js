const gemini = require('./gemini.service');
const fs    = require('fs');
const path  = require('path');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_DIR } = require('../middleware/upload');

/**
 * Generate text content (captions, posts, hashtags) using Gemini
 */
async function generateText({ prompt, model, maxTokens = 500, temperature = 0.8 }) {
  if (!gemini.isConfigured()) throw new Error('GEMINI_API_KEY not configured');

  const text = await gemini.generateText({
    prompt,
    system: 'You are an expert social media content creator. Generate engaging, platform-appropriate content.',
    model,
    maxTokens,
    temperature,
  });
  const tokensUsed = Math.ceil(text.length / 4);
  return { text, tokensUsed };
}

/**
 * Generate image using Gemini and save locally
 */
async function generateImage({ prompt, model, n = 1 }) {
  if (!gemini.isConfigured()) throw new Error('GEMINI_API_KEY not configured');

  const result = await gemini.generateImage({ prompt, model, n });
  if (result.error) throw new Error(result.message);

  const files = [];
  for (const img of result.images) {
    const fname = `${uuidv4()}.png`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fname), Buffer.from(img.base64, 'base64'));
    files.push(`/api/uploads/${fname}`);
  }
  return { files, imagesGenerated: files.length };
}

/**
 * Build a social-media prompt from template + variables
 */
function buildPrompt(template, variables = {}, options = {}) {
  let prompt = template.promptTemplate || template;
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  const { platform, tone, includeEmoji, includeHashtags, hashtagCount = 5 } = options;
  if (platform) prompt += `\nPlatform: ${platform}`;
  if (tone)     prompt += `\nTone: ${tone}`;
  if (includeHashtags) prompt += `\nInclude ${hashtagCount} relevant hashtags.`;
  if (includeEmoji)    prompt += '\nAdd relevant emojis.';
  prompt += '\nOutput only the post content, no extra explanation.';
  return prompt;
}

// Count approximate word tokens
function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

module.exports = { generateText, generateImage, buildPrompt, countWords };
