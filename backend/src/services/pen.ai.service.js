const gemini  = require('./gemini.service');
const axios   = require('axios');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

// ── Text generation (Gemini) ───────────────────────────────────────────────
exports.generateText = async ({ prompt, model, temperature = 0.7, max_tokens = 2000, messages = null }) => {
  const msgs = messages || [{ role: 'user', content: prompt }];
  const text = await gemini.chat({ messages: msgs, model, temperature: parseFloat(temperature), maxTokens: parseInt(max_tokens) });
  const tokens_used = Math.ceil(text.length / 4);
  return { text, tokens_used, model: model || process.env.GEMINI_MODEL || 'gemini-flash-latest' };
};

// ── Build prompt from template about_text + user fields ───────────────────
exports.buildPrompt = (aboutText, paramNames, paramValues, language = null) => {
  let prompt = aboutText || '';
  if (paramNames && paramValues) {
    const names  = Array.isArray(paramNames)  ? paramNames  : [paramNames];
    const values = Array.isArray(paramValues) ? paramValues : [paramValues];
    for (let i = 0; i < names.length; i++) {
      const re = new RegExp(`\\{\\{${names[i]}\\}\\}`, 'g');
      prompt = prompt.replace(re, values[i] || '');
    }
  }
  if (language && language !== 'en') {
    prompt += `\n\nPlease generate the output in ${language} language.`;
  }
  return prompt;
};

// ── Image generation (Gemini) ──────────────────────────────────────────────
exports.generateDalleImage = async ({ prompt, n = 1 }) => {
  const result = await gemini.generateImage({ prompt, n: parseInt(n) });
  if (result.error) throw new Error(result.message);

  const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'images');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const urls = [];
  for (const img of result.images) {
    const filename = `${crypto.randomBytes(8).toString('hex')}.png`;
    fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(img.base64, 'base64'));
    urls.push(`/uploads/images/${filename}`);
  }
  return urls;
};

// ── TTS (Gemini free tier does not support audio synthesis via this API) ──
exports.generateOpenAIAudio = async () => {
  throw new Error('Text-to-speech is not available with the current Gemini free-tier integration.');
};

// ── Stable Diffusion image generation ────────────────────────────────────
exports.generateStableDiffusion = async ({ prompt, negative_prompt = '', width = 1024, height = 1024, steps = 30, apiKey = null }) => {
  const key = apiKey || process.env.STABILITY_API_KEY;
  if (!key) throw new Error('Stability AI API key not configured.');

  const res = await axios.post(
    'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    {
      text_prompts: [
        { text: prompt, weight: 1 },
        ...(negative_prompt ? [{ text: negative_prompt, weight: -1 }] : []),
      ],
      cfg_scale: 7,
      height, width,
      steps,
      samples: 1,
    },
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${key}` } }
  );

  const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'images');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const urls = [];
  for (const artifact of res.data.artifacts) {
    const filename = `${crypto.randomBytes(8).toString('hex')}.png`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, Buffer.from(artifact.base64, 'base64'));
    urls.push(`/uploads/images/${filename}`);
  }

  return urls;
};

// ── Google Cloud TTS ──────────────────────────────────────────────────────
exports.generateGoogleTTS = async ({ text, voice_name = 'en-US-Standard-A', language_code = 'en-US', speaking_rate = 1, pitch = 0 }) => {
  const textToSpeech = require('@google-cloud/text-to-speech');
  const client = new textToSpeech.TextToSpeechClient();

  const [res] = await client.synthesizeSpeech({
    input: { text },
    voice: { name: voice_name, languageCode: language_code },
    audioConfig: { audioEncoding: 'MP3', speakingRate: parseFloat(speaking_rate), pitch: parseFloat(pitch) },
  });

  const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'audio');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const filename = `${crypto.randomBytes(8).toString('hex')}.mp3`;
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, res.audioContent, 'binary');

  return { url: `/uploads/audio/${filename}`, filename };
};

// ── Azure TTS ─────────────────────────────────────────────────────────────
exports.generateAzureTTS = async ({ text, voice_name = 'en-US-JennyNeural', language = 'en-US', rate = '0%', pitch = '0Hz' }) => {
  const key    = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';
  if (!key) throw new Error('Azure Speech key not configured.');

  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${language}'><voice name='${voice_name}'><prosody rate='${rate}' pitch='${pitch}'>${text}</prosody></voice></speak>`;

  const res = await axios.post(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    ssml,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'AI2Pen',
      },
      responseType: 'arraybuffer',
    }
  );

  const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'audio');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const filename = `${crypto.randomBytes(8).toString('hex')}.mp3`;
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, Buffer.from(res.data));

  return { url: `/uploads/audio/${filename}`, filename };
};

// ── Chat stream (SSE) via Gemini ───────────────────────────────────────────
exports.streamChatCompletion = async ({ messages, model, temperature = 0.7, onChunk, onDone }) => {
  const full = await gemini.streamText({ messages, model, temperature: parseFloat(temperature), onChunk });
  const tokens = Math.ceil(full.length / 4);
  if (onDone) onDone(full, tokens);
  return { text: full };
};
