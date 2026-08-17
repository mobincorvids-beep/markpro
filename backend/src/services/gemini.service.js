// ══════════════════════════════════════════════════════════════════
//  Unified Google Gemini service (free tier) - REST API via fetch
//  Replaces all previous OpenAI/GPT usage across the backend.
// ══════════════════════════════════════════════════════════════════

// gemini-2.0-flash and gemini-1.5-flash were both shut down by Google in 2026
// (all requests now 404). Current free-tier text models are the 2.5 Flash family.
// Verified against the live ListModels response for this project's key:
// the 2.0/2.5 flash aliases now 404 with "no longer available to new users",
// so the rolling `-latest` alias is used and a lite model backs it up.
const DEFAULT_MODEL = () => process.env.GEMINI_MODEL || 'gemini-flash-latest';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite';
// gemini-2.0-flash-preview-image-generation was deprecated/shut down. Current
// free-tier image model is gemini-2.5-flash-image ("nano banana").
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
// Google gives most keys a free-tier quota of 0 on the newest image model, which
// surfaces as a 429 "limit: 0" RESOURCE_EXHAUSTED. Walking a chain of image
// models means generation still succeeds on whichever one the key can use.
const IMAGE_MODEL_CHAIN = [
  IMAGE_MODEL,
  'gemini-3.1-flash-lite-image',
  'gemini-2.5-flash-image',
  'gemini-3-pro-image',
].filter((m, i, a) => m && a.indexOf(m) === i);
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function getApiKey() {
  return process.env.GEMINI_API_KEY || '';
}

function isConfigured() {
  return !!getApiKey();
}

function toGeminiContents(messages, system) {
  const contents = (messages || []).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content || '' }],
  }));
  const body = { contents };
  if (system) {
    body.systemInstruction = { role: 'system', parts: [{ text: system }] };
  }
  return body;
}

function extractText(data) {
  const cand = data?.candidates?.[0];
  if (!cand) return '';
  return (cand.content?.parts || []).map(p => p.text || '').join('');
}

// Google accepts two credential styles:
//   * AI Studio API keys  ("AIza…")      -> ?key= query parameter
//   * OAuth / short-lived tokens ("AQ.…") -> Authorization: Bearer header
// Detecting the style means either kind of credential in GEMINI_API_KEY works.
function isQueryKey(key) {
  // OAuth access tokens are the only credential Google wants in the
  // Authorization header; every AI Studio key style (AIza…, AQ.…) goes in ?key=.
  return !/^ya29\./.test(key);
}

function authFor(key) {
  return isQueryKey(key)
    ? { query: `?key=${encodeURIComponent(key)}`, headers: {} }
    : { query: '', headers: { Authorization: `Bearer ${key}` } };
}

function retryDelayFromBody(text, fallbackMs) {
  const m = /"?retryDelay"?\s*:\s*"?(\d+(?:\.\d+)?)s/i.exec(text || '')
    || /retry in (\d+(?:\.\d+)?)s/i.exec(text || '');
  if (m) return Math.min(Math.ceil(parseFloat(m[1]) * 1000) + 250, 20000);
  return fallbackMs;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callGenerateContent(model, body, { retries = 2 } = {}) {
  const key = getApiKey();
  if (!key) throw new Error('GEMINI_API_KEY is not configured.');

  const { query, headers } = authFor(key);
  const url = `${BASE_URL}/${model}:generateContent${query}`;

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

    if (res.ok) return res.json();

    const text = await res.text().catch(() => '');
    const err = new Error(`Gemini API error (${res.status}) for model "${model}"`);
    err.status = res.status;
    err.body = text;
    err.model = model;
    lastErr = err;

    // 429 (quota) and 503 (overloaded) are transient — honour Google's
    // retryDelay hint and try again before giving up on this model.
    const transient = res.status === 429 || res.status === 503;
    if (!transient || attempt === retries) break;
    await sleep(retryDelayFromBody(text, 1200 * (attempt + 1)));
  }
  throw lastErr;
}

async function callWithFallback(model, body) {
  try {
    return await callGenerateContent(model, body);
  } catch (e) {
    const shouldFallback = [400, 404, 429, 503].includes(e.status) && model !== FALLBACK_MODEL;
    if (shouldFallback) {
      return await callGenerateContent(FALLBACK_MODEL, body);
    }
    throw e;
  }
}

// ── generateText ──────────────────────────────────────────────────
async function generateText({ prompt, system, model, maxTokens, temperature, json } = {}) {
  const useModel = model || DEFAULT_MODEL();
  const body = toGeminiContents([{ role: 'user', content: prompt }], system);
  body.generationConfig = {};
  if (maxTokens != null) body.generationConfig.maxOutputTokens = Number(maxTokens);
  if (temperature != null) body.generationConfig.temperature = Number(temperature);
  if (json) body.generationConfig.responseMimeType = 'application/json';

  const data = await callWithFallback(useModel, body);
  const text = extractText(data).trim();

  if (json) {
    try { return JSON.parse(text); } catch (_) { return text; }
  }
  return text;
}

// ── chat ──────────────────────────────────────────────────────────
async function chat({ messages = [], system, model, maxTokens, temperature } = {}) {
  const useModel = model || DEFAULT_MODEL();
  const body = toGeminiContents(messages, system);
  body.generationConfig = {};
  if (maxTokens != null) body.generationConfig.maxOutputTokens = Number(maxTokens);
  if (temperature != null) body.generationConfig.temperature = Number(temperature);

  const data = await callWithFallback(useModel, body);
  return extractText(data).trim();
}

// ── streamText (SSE via streamGenerateContent, falls back to non-stream) ──
async function streamText({ messages = [], system, model, maxTokens, temperature, onChunk } = {}) {
  const useModel = model || DEFAULT_MODEL();
  const key = getApiKey();
  if (!key) throw new Error('GEMINI_API_KEY is not configured.');

  const body = toGeminiContents(messages, system);
  body.generationConfig = {};
  if (maxTokens != null) body.generationConfig.maxOutputTokens = Number(maxTokens);
  if (temperature != null) body.generationConfig.temperature = Number(temperature);

  const doStream = async (m) => {
    const { query, headers: authHeaders } = authFor(key);
    const url = `${BASE_URL}/${m}:streamGenerateContent?alt=sse${query.replace('?', '&')}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Gemini API error (${res.status}) for model "${m}": ${text}`);
      err.status = res.status;
      throw err;
    }
    if (!res.body) throw new Error('No stream body from Gemini');

    let full = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const raw = trimmed.replace(/^data:\s*/, '');
        if (!raw || raw === '[DONE]') continue;
        try {
          const parsed = JSON.parse(raw);
          const delta = extractText(parsed);
          if (delta) {
            full += delta;
            if (onChunk) onChunk(delta);
          }
        } catch (_) {}
      }
    }
    return full;
  };

  try {
    return await doStream(useModel);
  } catch (e) {
    // Fallback: try fallback model streaming, then non-streaming as last resort
    try {
      if (useModel !== FALLBACK_MODEL) return await doStream(FALLBACK_MODEL);
      throw e;
    } catch (_) {
      const text = await chat({ messages, system, model: useModel, maxTokens, temperature });
      if (onChunk) onChunk(text);
      return text;
    }
  }
}

// ── generateImage ─────────────────────────────────────────────────
async function generateImage({ prompt, model, n = 1 } = {}) {
  const key = getApiKey();
  if (!key) {
    return { error: true, code: 'no_key', message: 'Image generation is unavailable: GEMINI_API_KEY is not configured on the server.' };
  }
  if (!prompt || !String(prompt).trim()) {
    return { error: true, code: 'no_prompt', message: 'Enter a prompt describing the image you want.' };
  }

  const body = {
    contents: [{ role: 'user', parts: [{ text: String(prompt) }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  };

  const chain = model ? [model, ...IMAGE_MODEL_CHAIN.filter(m => m !== model)] : IMAGE_MODEL_CHAIN;
  const attempts = [];
  let quotaHit = false;

  for (const useModel of chain) {
    try {
      const data = await callGenerateContent(useModel, body, { retries: 0 });
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const images = parts
        .filter(p => p.inlineData?.data)
        .map(p => ({ mimeType: p.inlineData.mimeType || 'image/png', base64: p.inlineData.data }));

      if (images.length) return { images: images.slice(0, n), model: useModel };

      const blocked = data?.promptFeedback?.blockReason;
      if (blocked) {
        return {
          error: true,
          code: 'blocked',
          message: `The prompt was rejected by Gemini's safety filters (${blocked}). Try rephrasing it.`,
        };
      }
      attempts.push(`${useModel}: no image returned`);
    } catch (e) {
      if (e.status === 429) quotaHit = true;
      if (e.status === 401 || e.status === 403) {
        return {
          error: true,
          code: 'auth',
          message: 'Gemini rejected the API credential. Check that GEMINI_API_KEY is a valid, enabled key for the Generative Language API.',
        };
      }
      attempts.push(`${useModel}: HTTP ${e.status || '?'}`);
    }
  }

  if (quotaHit) {
    return {
      error: true,
      code: 'quota',
      message:
        'Gemini image generation is out of quota for this API key. Google grants a free-tier limit of 0 requests on the image models, ' +
        'so image generation needs billing enabled on the Google Cloud project behind the key (text generation keeps working). ' +
        'Enable billing at aistudio.google.com, or wait for the quota window to reset and try again.',
      attempts,
    };
  }

  return {
    error: true,
    code: 'failed',
    message: 'Gemini did not return an image for this prompt. Try a more descriptive prompt.',
    attempts,
  };
}

// ── describeImage (vision input — analyse an image, return text) ──
async function describeImage({ prompt, imageBase64, mimeType = 'image/jpeg', model, maxTokens, temperature } = {}) {
  const key = getApiKey();
  if (!key) throw new Error('GEMINI_API_KEY is not configured.');
  if (!imageBase64) throw new Error('imageBase64 is required.');
  const useModel = model || DEFAULT_MODEL();
  const body = {
    contents: [{
      role: 'user',
      parts: [
        { text: prompt || 'Describe this image.' },
        { inlineData: { mimeType, data: imageBase64 } },
      ],
    }],
    generationConfig: {},
  };
  if (maxTokens != null) body.generationConfig.maxOutputTokens = Number(maxTokens);
  if (temperature != null) body.generationConfig.temperature = Number(temperature);

  const data = await callWithFallback(useModel, body);
  return extractText(data).trim();
}

module.exports = {
  generateText,
  chat,
  streamText,
  generateImage,
  describeImage,
  isConfigured,
};
