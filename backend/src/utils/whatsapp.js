const axios = require('axios');

const BASE = () =>
  `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v19.0'}/${process.env.WHATSAPP_PHONE_NUMBER_ID}`;
const HEADERS = () => ({
  Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
  'Content-Type': 'application/json',
});

/**
 * Send a plain text message
 */
async function sendText(to, text, replyToWamid = null) {
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text },
  };
  if (replyToWamid) body.context = { message_id: replyToWamid };
  const { data } = await axios.post(`${BASE()}/messages`, body, { headers: HEADERS() });
  return data;
}

/**
 * Send a WhatsApp template message
 * params: { templateName, language, components: [...] }
 */
async function sendTemplate(to, templateName, language = 'en_US', components = []) {
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: { name: templateName, language: { code: language }, components },
  };
  const { data } = await axios.post(`${BASE()}/messages`, body, { headers: HEADERS() });
  return data;
}

/**
 * Send a media message (image / video / document / audio)
 */
async function sendMedia(to, type, mediaUrl, caption = '', filename = '') {
  const mediaObj = { link: mediaUrl };
  if (caption) mediaObj.caption = caption;
  if (filename && type === 'document') mediaObj.filename = filename;

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type,
    [type]: mediaObj,
  };
  const { data } = await axios.post(`${BASE()}/messages`, body, { headers: HEADERS() });
  return data;
}

/**
 * Send an interactive list/button message
 */
async function sendInteractive(to, interactive) {
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive,
  };
  const { data } = await axios.post(`${BASE()}/messages`, body, { headers: HEADERS() });
  return data;
}

/**
 * Mark a message as read
 */
async function markAsRead(wamid) {
  const body = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: wamid,
  };
  const { data } = await axios.post(`${BASE()}/messages`, body, { headers: HEADERS() });
  return data;
}

/**
 * Fetch templates from Meta Business API
 */
async function fetchTemplates() {
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const version = process.env.WHATSAPP_API_VERSION || 'v19.0';
  const { data } = await axios.get(
    `https://graph.facebook.com/${version}/${wabaId}/message_templates`,
    { headers: HEADERS() }
  );
  return data.data || [];
}

/**
 * Build template components array from campaign params
 */
function buildTemplateComponents(template, headerParams = [], bodyParams = [], footerParams = [], filename = null) {
  const components = [];

  // Header
  if (template.headerDataFormat) {
    if (template.headerDataFormat === 'TEXT' && headerParams.length) {
      components.push({
        type: 'header',
        parameters: headerParams.map(v => ({ type: 'text', text: v })),
      });
    } else if (['IMAGE','VIDEO','DOCUMENT'].includes(template.headerDataFormat) && filename) {
      const mediaType = template.headerDataFormat.toLowerCase();
      components.push({
        type: 'header',
        parameters: [{ type: mediaType, [mediaType]: { link: filename } }],
      });
    }
  }

  // Body
  if (bodyParams.length) {
    components.push({
      type: 'body',
      parameters: bodyParams.map(v => ({ type: 'text', text: v })),
    });
  }

  return components;
}

module.exports = { sendText, sendTemplate, sendMedia, sendInteractive, markAsRead, fetchTemplates, buildTemplateComponents };
