const gemini = require('./gemini.service');
const logger = require('../utils/logger');

// ─── Gemini ───────────────────────────────────────────────────────────────────
const generateWithGemini = async ({ originalText, tone, platform, language, customPrompt }) => {
  const system = customPrompt ||
    `You are an expert social media manager. Generate a single, engaging, human-like reply for a ${platform} post.
     Tone: ${tone}. Language: ${language}. Keep it concise, authentic, and platform-appropriate.
     Reply only with the response text - no explanation, no quotes, no prefix.`;

  const text = await gemini.chat({
    messages: [{ role: 'user', content: `Generate a reply to this post:\n\n"${originalText}"` }],
    system,
    temperature: 0.8,
    maxTokens: 300,
  });

  return { text: text.trim(), tokensUsed: Math.ceil((system.length + originalText.length + text.length) / 4) };
};

// ─── Mistral ─────────────────────────────────────────────────────────────────
const generateWithMistral = async ({ originalText, tone, platform, language, customPrompt }) => {
  const systemPrompt = customPrompt ||
    `You are an expert social media manager. Generate a single engaging, human-like reply for a ${platform} post. 
     Tone: ${tone}. Language: ${language}. Reply only with the response text - no explanation, no prefix, no quotes.`;

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a reply to:\n\n"${originalText}"` },
      ],
      max_tokens: 300,
      temperature: 0.8,
    }),
  });

  if (!response.ok) throw new Error(`Mistral API error: ${response.statusText}`);
  const data = await response.json();

  return {
    text: data.choices[0].message.content.trim(),
    tokensUsed: data.usage?.total_tokens || 0,
  };
};

// ─── Main dispatcher ─────────────────────────────────────────────────────────
const generateReply = async ({ originalText, tone = 'professional', platform = 'general', language = 'en', customPrompt = '', aiModel }) => {
  let model = aiModel || process.env.DEFAULT_AI_MODEL || 'gemini';
  // Map any legacy OpenAI/GPT provider selection to Gemini.
  if (model === 'openai' || model === 'gpt' || String(model).startsWith('gpt-')) model = 'gemini';

  const params = { originalText, tone, platform, language, customPrompt };

  logger.info(`Generating reply with model: ${model}`);

  switch (model) {
    case 'mistral':
      return { ...(await generateWithMistral(params)), model: 'mistral' };
    case 'gemini':
    default:
      return { ...(await generateWithGemini(params)), model: 'gemini' };
  }
};

module.exports = { generateReply };
