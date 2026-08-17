const axios = require('axios');
const fs    = require('fs');
const path  = require('path');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_DIR } = require('../middleware/upload');
const gemini = require('./gemini.service');

const STABILITY_API_KEY = () => process.env.STABILITY_API_KEY || '';

function stabilityHeaders() {
  return { Authorization: `Bearer ${STABILITY_API_KEY()}`, 'Content-Type': 'application/json', Accept: 'application/json' };
}

// ══════════════════════════════════════════════
// TEXT / CODE / TRANSLATION - streaming SSE (now via Gemini)
// ══════════════════════════════════════════════
async function generateText({ systemPrompt, userPrompt, model, res }) {
  // Stream SSE back to the client
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const fullText = await gemini.streamText({
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
    model,
    onChunk: (delta) => {
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    },
  });

  res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`);
  res.end();
  return fullText;
}

// Non-streaming version (used for credit pre-calculation)
async function generateTextDirect({ systemPrompt, userPrompt, model }) {
  return gemini.chat({ messages: [{ role: 'user', content: userPrompt }], system: systemPrompt, model });
}

// ══════════════════════════════════════════════
// IMAGE GENERATION - Gemini (replaces OpenAI DALL-E)
// ══════════════════════════════════════════════
async function generateImageOpenAI({ prompt, size = '512x512', n = 1, stylePreset }) {
  const fullPrompt = stylePreset ? `${prompt} Image should be in ${stylePreset} style.` : prompt;
  const result = await gemini.generateImage({ prompt: fullPrompt, n });

  if (result.error) throw new Error(result.message);

  const files = [];
  for (const img of result.images || []) {
    const fname = `${uuidv4()}.png`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fname), Buffer.from(img.base64, 'base64'));
    files.push(fname);
  }
  return files;
}

// ══════════════════════════════════════════════
// IMAGE GENERATION - Stable Diffusion (stability.ai)
// ══════════════════════════════════════════════
async function generateImageStableDiffusion({ prompt, model, stylePreset, width, height }) {
  const w = width  || (model?.includes('1024') ? 1024 : 512);
  const h = height || (model?.includes('1024') ? 1024 : 512);

  const body = {
    text_prompts: [{ text: prompt, weight: 1 }],
    samples: 1, width: w, height: h,
  };
  if (stylePreset) body.style_preset = stylePreset;

  const { data } = await axios.post(
    `https://api.stability.ai/v1/generation/${model || 'stable-diffusion-xl-1024-v1-0'}/text-to-image`,
    body, { headers: stabilityHeaders() }
  );

  const files = [];
  for (const artifact of data.artifacts || []) {
    if (artifact.base64) {
      const fname = `${uuidv4()}.png`;
      fs.writeFileSync(path.join(UPLOAD_DIR, fname), Buffer.from(artifact.base64, 'base64'));
      files.push(fname);
    }
  }
  return files;
}

// ══════════════════════════════════════════════
// TEXT-TO-SPEECH - not available on Gemini free tier via this API;
// kept as a clear, non-paid-API error instead of calling OpenAI.
// ══════════════════════════════════════════════
async function generateSpeech({ text, model, voice, speed }) {
  throw new Error('Text-to-speech is not available with the current Gemini free-tier integration.');
}

// ══════════════════════════════════════════════
// SPEECH-TO-TEXT - not available on Gemini free tier via this API;
// kept as a clear, non-paid-API error instead of calling OpenAI Whisper.
// ══════════════════════════════════════════════
async function transcribeAudio({ filePath, language }) {
  throw new Error('Speech-to-text is not available with the current Gemini free-tier integration.');
}

// ══════════════════════════════════════════════
// IMAGE ANIMATION (image-to-video via Stability)
// ══════════════════════════════════════════════
async function generateImageAnimation({ imagePath }) {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath));
  form.append('seed', '0');
  form.append('motion_bucket_id', '127');

  try {
    const initRes = await axios.post(
      'https://api.stability.ai/v2beta/image-to-video',
      form,
      { headers: { ...form.getHeaders(), Authorization: `Bearer ${STABILITY_API_KEY()}` } }
    );
    const generationId = initRes.data?.id;
    if (!generationId) throw new Error('No generation ID returned');

    // Poll for result
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const pollRes = await axios.get(
        `https://api.stability.ai/v2beta/image-to-video/result/${generationId}`,
        { headers: { Authorization: `Bearer ${STABILITY_API_KEY()}`, Accept: 'video/*' }, responseType: 'arraybuffer', validateStatus: () => true }
      );
      if (pollRes.status === 200) {
        const fname = `${uuidv4()}.mp4`;
        fs.writeFileSync(path.join(UPLOAD_DIR, fname), Buffer.from(pollRes.data));
        return fname;
      }
      if (pollRes.status !== 202) break;
    }
    throw new Error('Image animation generation timed out');
  } catch (e) {
    throw new Error('Image animation failed: ' + (e.response?.data?.message || e.message));
  }
}

module.exports = {
  generateText, generateTextDirect,
  generateImageOpenAI, generateImageStableDiffusion,
  generateSpeech, transcribeAudio, generateImageAnimation,
};
