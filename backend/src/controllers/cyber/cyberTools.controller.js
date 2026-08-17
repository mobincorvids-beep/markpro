const crypto = require('crypto');
const dns    = require('dns').promises;
const axios  = require('axios');
const bcrypt = require('bcryptjs');
const { URL } = require('url');
const net    = require('net');
const tls    = require('tls');
const punycode = require('punycode/');

// ── Helpers ────────────────────────────────────
const ok  = (res, data)  => res.json({ success: true,  ...data });
const err = (res, msg, status = 400) => res.status(status).json({ success: false, message: msg });

// ══════════════════════════════════════════════
// TEXT / ENCODING TOOLS
// ══════════════════════════════════════════════

exports.base64Encode = (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return err(res, 'Text is required');
    ok(res, { result: Buffer.from(text).toString('base64') });
  } catch { err(res, 'Encoding failed'); }
};

exports.base64Decode = (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return err(res, 'Text is required');
    ok(res, { result: Buffer.from(text, 'base64').toString('utf8') });
  } catch { err(res, 'Decoding failed'); }
};

exports.textToBinary = (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return err(res, 'Text is required');
    const result = text.split('').map(c =>
      c.charCodeAt(0).toString(2).padStart(8, '0')
    ).join(' ');
    ok(res, { result });
  } catch { err(res, 'Conversion failed'); }
};

exports.binaryToText = (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return err(res, 'Binary string is required');
    const result = text.trim().split(/\s+/).map(b =>
      String.fromCharCode(parseInt(b, 2))
    ).join('');
    ok(res, { result });
  } catch { err(res, 'Conversion failed'); }
};

exports.urlEncode = (req, res) => {
  try {
    const { text } = req.body;
    ok(res, { result: encodeURIComponent(text || '') });
  } catch { err(res, 'Encoding failed'); }
};

exports.urlDecode = (req, res) => {
  try {
    const { text } = req.body;
    ok(res, { result: decodeURIComponent(text || '') });
  } catch { err(res, 'Decoding failed - invalid encoded string'); }
};

exports.htmlEncode = (req, res) => {
  try {
    const { text } = req.body;
    const result = (text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    ok(res, { result });
  } catch { err(res, 'Encoding failed'); }
};

exports.htmlDecode = (req, res) => {
  try {
    const { text } = req.body;
    const result = (text || '').replace(/&amp;/g,'&').replace(/&lt;/g,'<')
      .replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#039;/g,"'");
    ok(res, { result });
  } catch { err(res, 'Decoding failed'); }
};

exports.rot13Encode = (req, res) => {
  const { text } = req.body;
  const result = (text||'').replace(/[a-zA-Z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
  ok(res, { result });
};

exports.rot13Decode = exports.rot13Encode; // ROT13 is symmetric

exports.quotedPrintableEncode = (req, res) => {
  try {
    const { text } = req.body;
    const result = (text||'').split('').map(c => {
      const code = c.charCodeAt(0);
      if ((code >= 33 && code <= 126 && code !== 61) || c === ' ' || c === '\t') return c;
      return '=' + code.toString(16).toUpperCase().padStart(2,'0');
    }).join('');
    ok(res, { result });
  } catch { err(res, 'Encoding failed'); }
};

exports.quotedPrintableDecode = (req, res) => {
  try {
    const { text } = req.body;
    const result = (text||'').replace(/=([0-9A-Fa-f]{2})/g,
      (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    ok(res, { result });
  } catch { err(res, 'Decoding failed'); }
};

exports.textToSlug = (req, res) => {
  const { text } = req.body;
  const result = (text||'').toLowerCase().trim()
    .replace(/[^\w\s-]/g,'').replace(/[\s_-]+/g,'-').replace(/^-+|-+$/g,'');
  ok(res, { result });
};

exports.caseConverter = (req, res) => {
  const { text, mode } = req.body;
  const t = text || '';
  let result;
  switch (mode) {
    case 'upper':      result = t.toUpperCase(); break;
    case 'lower':      result = t.toLowerCase(); break;
    case 'title':      result = t.replace(/\b\w/g, c => c.toUpperCase()); break;
    case 'sentence':   result = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); break;
    case 'camel':      result = t.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()); break;
    case 'pascal':     result = t.replace(/(^\w|[^a-zA-Z0-9]+\w)/g, c => c.replace(/[^a-zA-Z0-9]/g,'').toUpperCase()); break;
    case 'snake':      result = t.toLowerCase().replace(/\s+/g,'_'); break;
    case 'kebab':      result = t.toLowerCase().replace(/\s+/g,'-'); break;
    case 'alternate':  result = t.split('').map((c,i) => i%2===0 ? c.toLowerCase() : c.toUpperCase()).join(''); break;
    default:           result = t;
  }
  ok(res, { result });
};

exports.textReverser = (req, res) => {
  const { text } = req.body;
  ok(res, { result: (text||'').split('').reverse().join('') });
};

exports.textReplacer = (req, res) => {
  const { text, find, replace, caseSensitive } = req.body;
  if (!find) return err(res, 'Find string is required');
  const flags  = caseSensitive ? 'g' : 'gi';
  const result = (text||'').replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), flags), replace||'');
  ok(res, { result });
};

exports.textSeparator = (req, res) => {
  const { text, separator = '\n', every = 1 } = req.body;
  const chars  = (text||'').split('');
  const chunks = [];
  for (let i = 0; i < chars.length; i += Number(every)) chunks.push(chars.slice(i, i+Number(every)).join(''));
  ok(res, { result: chunks.join(separator) });
};

exports.duplicateLinesRemover = (req, res) => {
  const { text } = req.body;
  const lines  = (text||'').split('\n');
  const unique = [...new Set(lines)];
  ok(res, { result: unique.join('\n'), removed: lines.length - unique.length });
};

exports.lineBreakRemover = (req, res) => {
  const { text } = req.body;
  ok(res, { result: (text||'').replace(/\r?\n|\r/g,' ').trim() });
};

exports.wordCount = (req, res) => {
  const { text } = req.body;
  const t    = text || '';
  const words = t.trim() ? t.trim().split(/\s+/).length : 0;
  ok(res, {
    characters: t.length,
    charactersNoSpaces: t.replace(/\s/g,'').length,
    words,
    lines: t.split('\n').length,
    sentences: (t.match(/[.!?]+/g)||[]).length,
    paragraphs: t.split(/\n\s*\n/).filter(Boolean).length,
  });
};

exports.wordDensity = (req, res) => {
  const { text } = req.body;
  const words = (text||'').toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
  const map   = {};
  words.forEach(w => { map[w] = (map[w]||0) + 1; });
  const sorted = Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 30)
    .map(([word, count]) => ({ word, count, density: ((count/words.length)*100).toFixed(2) + '%' }));
  ok(res, { total: words.length, density: sorted });
};

exports.palindromeChecker = (req, res) => {
  const { text } = req.body;
  const clean   = (text||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  ok(res, { isPalindrome: clean === clean.split('').reverse().join(''), text });
};

exports.emailExtractor = (req, res) => {
  const { text } = req.body;
  const emails = (text||'').match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
  ok(res, { emails: [...new Set(emails)], count: [...new Set(emails)].length });
};

exports.urlExtractor = (req, res) => {
  const { text } = req.body;
  const urls = (text||'').match(/https?:\/\/[^\s"'<>(){}[\]]+/gi) || [];
  ok(res, { urls: [...new Set(urls)], count: [...new Set(urls)].length });
};

exports.urlParser = (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return err(res, 'URL is required');
    const u = new URL(url.startsWith('http') ? url : 'https://'+url);
    const params = {};
    u.searchParams.forEach((v,k) => { params[k] = v; });
    ok(res, {
      protocol: u.protocol, hostname: u.hostname, port: u.port || null,
      pathname: u.pathname, search: u.search, hash: u.hash,
      username: u.username || null, password: u.password || null,
      origin: u.origin, params,
    });
  } catch { err(res, 'Invalid URL'); }
};

exports.loremIpsum = (req, res) => {
  const { paragraphs = 1, words = 50, type = 'paragraphs' } = req.body;
  const LOREM = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' ');
  const rng  = () => LOREM[Math.floor(Math.random() * LOREM.length)];
  if (type === 'words') {
    ok(res, { result: Array.from({ length: Number(words) }, rng).join(' ') }); return;
  }
  const paras = Array.from({ length: Number(paragraphs) }, () => {
    const len = 40 + Math.floor(Math.random()*40);
    return Array.from({ length: len }, rng).join(' ') + '.';
  });
  ok(res, { result: paras.join('\n\n') });
};

exports.randomTextLine = (req, res) => {
  const { text } = req.body;
  const lines = (text||'').split('\n').filter(Boolean);
  if (!lines.length) return err(res, 'No lines provided');
  ok(res, { result: lines[Math.floor(Math.random()*lines.length)] });
};

// ══════════════════════════════════════════════
// HASH / CRYPTO
// ══════════════════════════════════════════════

exports.hashGenerator = (req, res) => {
  try {
    const { text, algorithm = 'md5' } = req.body;
    if (!text) return err(res, 'Text is required');
    const supported = ['md4','md5','sha1','sha256','sha384','sha512','sha224','sha3-256','sha3-512','ripemd160'];
    if (!supported.includes(algorithm)) return err(res, 'Unsupported algorithm');
    ok(res, { result: crypto.createHash(algorithm).update(text).digest('hex'), algorithm });
  } catch { err(res, 'Hash generation failed'); }
};

exports.md5Generator = (req, res) => {
  const { text } = req.body;
  if (!text) return err(res, 'Text is required');
  ok(res, { result: crypto.createHash('md5').update(text).digest('hex') });
};

exports.shaGenerator = (req, res) => {
  try {
    const { text, bits = '256' } = req.body;
    if (!text) return err(res, 'Text is required');
    const alg = `sha${bits}`;
    ok(res, { result: crypto.createHash(alg).update(text).digest('hex'), algorithm: alg });
  } catch { err(res, 'SHA generation failed'); }
};

exports.bcryptGenerate = async (req, res) => {
  try {
    const { text, rounds = 10 } = req.body;
    if (!text) return err(res, 'Text is required');
    const hash = await bcrypt.hash(text, Number(rounds));
    ok(res, { result: hash });
  } catch { err(res, 'Bcrypt generation failed'); }
};

exports.bcryptVerify = async (req, res) => {
  try {
    const { text, hash } = req.body;
    if (!text || !hash) return err(res, 'Text and hash are required');
    const match = await bcrypt.compare(text, hash);
    ok(res, { match });
  } catch { err(res, 'Bcrypt verification failed'); }
};

exports.passwordGenerator = (req, res) => {
  const { length = 16, uppercase = true, lowercase = true, numbers = true, symbols = true } = req.body;
  let chars = '';
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (numbers)   chars += '0123456789';
  if (symbols)   chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (!chars)    return err(res, 'At least one character set required');
  const result = Array.from({ length: Number(length) }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  ok(res, { result });
};

exports.passwordStrength = (req, res) => {
  const { password } = req.body;
  if (!password) return err(res, 'Password is required');
  let score = 0;
  const checks = {
    length:    password.length >= 8,
    longEnough: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers:   /\d/.test(password),
    symbols:   /[^A-Za-z0-9]/.test(password),
    noRepeats: !/(.)\1{2,}/.test(password),
  };
  Object.values(checks).forEach(v => { if(v) score++; });
  const levels = ['Very Weak','Weak','Fair','Good','Strong','Very Strong','Excellent'];
  ok(res, { score, level: levels[Math.min(score, levels.length-1)], checks });
};

exports.uuidGenerator = (req, res) => {
  const { count = 1 } = req.body;
  const uuids = Array.from({ length: Math.min(Number(count), 100) }, () => crypto.randomUUID());
  ok(res, { result: uuids.length === 1 ? uuids[0] : uuids });
};

exports.randomNumber = (req, res) => {
  const { min = 1, max = 100, count = 1 } = req.body;
  const nums = Array.from({ length: Math.min(Number(count), 1000) }, () =>
    Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min)
  );
  ok(res, { result: nums.length === 1 ? nums[0] : nums });
};

// ══════════════════════════════════════════════
// COLOR
// ══════════════════════════════════════════════

exports.hexToRgb = (req, res) => {
  try {
    let { hex } = req.body;
    hex = hex.replace('#','');
    if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) return err(res, 'Invalid hex color');
    if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    ok(res, { r, g, b, rgb: `rgb(${r}, ${g}, ${b})`, hex: '#'+hex });
  } catch { err(res, 'Conversion failed'); }
};

exports.rgbToHex = (req, res) => {
  try {
    const { r, g, b } = req.body;
    const toHex = n => Math.max(0,Math.min(255,Number(n))).toString(16).padStart(2,'0');
    ok(res, { result: '#'+toHex(r)+toHex(g)+toHex(b), rgb: `rgb(${r}, ${g}, ${b})` });
  } catch { err(res, 'Conversion failed'); }
};

exports.hexToText = (req, res) => {
  try {
    const { text } = req.body;
    const result = (text||'').replace(/\s/g,'').match(/.{1,2}/g)
      ?.map(h => String.fromCharCode(parseInt(h,16))).join('') || '';
    ok(res, { result });
  } catch { err(res, 'Conversion failed'); }
};

exports.textToHex = (req, res) => {
  const { text } = req.body;
  const result = (text||'').split('').map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join(' ');
  ok(res, { result });
};

// ══════════════════════════════════════════════
// CODE FORMATTERS / CONVERTERS
// ══════════════════════════════════════════════

exports.cssFormatter = (req, res) => {
  try {
    const { css } = req.body;
    if (!css) return err(res, 'CSS is required');
    // Expand minified CSS into readable format
    let result = css
      .replace(/\s*{\s*/g, ' {\n  ')
      .replace(/;\s*/g, ';\n  ')
      .replace(/\s*}\s*/g, '\n}\n')
      .replace(/,\s*/g, ',\n')
      .replace(/  \n}/g, '\n}')
      .trim();
    ok(res, { result });
  } catch { err(res, 'CSS formatting failed'); }
};

exports.cssMinifier = (req, res) => {
  try {
    const { css } = req.body;
    if (!css) return err(res, 'CSS is required');
    const result = css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*{\s*/g, '{')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*;\s*/g, ';')
      .replace(/\s*,\s*/g, ',')
      .trim();
    ok(res, { result, original: css.length, minified: result.length,
      savings: ((1 - result.length / css.length) * 100).toFixed(1) + '%' });
  } catch { err(res, 'CSS minification failed'); }
};

exports.jsFormatter = (req, res) => {
  try {
    const { js, indent = 2 } = req.body;
    if (!js) return err(res, 'JavaScript is required');
    // Basic JS beautifier - indent braces
    let level = 0, result = '', i = 0;
    const pad = () => ' '.repeat(level * Number(indent));
    while (i < js.length) {
      const c = js[i];
      if (c === '{' || c === '[') { result += c + '\n'; level++; result += pad(); }
      else if (c === '}' || c === ']') { result = result.trimEnd(); level--; result += '\n' + pad() + c; }
      else if (c === ';') { result += c + '\n' + pad(); }
      else if (c === ',') { result += c + '\n' + pad(); }
      else { result += c; }
      i++;
    }
    ok(res, { result: result.trim() });
  } catch { err(res, 'JS formatting failed'); }
};

exports.jsMinifier = (req, res) => {
  try {
    const { js } = req.body;
    if (!js) return err(res, 'JavaScript is required');
    const result = js
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}();,=+\-*/<>!&|?:])\s*/g, '$1')
      .trim();
    ok(res, { result, savings: ((1 - result.length / js.length) * 100).toFixed(1) + '%' });
  } catch { err(res, 'JS minification failed'); }
};

exports.htmlFormatter = (req, res) => {
  try {
    const { html, indent = 2 } = req.body;
    if (!html) return err(res, 'HTML is required');
    let level = 0;
    const result = html
      .replace(/>\s*</g, '>\n<')
      .split('\n')
      .map(line => {
        line = line.trim();
        if (!line) return '';
        if (line.match(/^<\/[^>]+>/)) level = Math.max(0, level - 1);
        const out = ' '.repeat(level * Number(indent)) + line;
        if (line.match(/^<[^/!][^>]*>$/) && !line.match(/^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)/i)) level++;
        return out;
      })
      .filter(Boolean)
      .join('\n');
    ok(res, { result });
  } catch { err(res, 'HTML formatting failed'); }
};

exports.htmlMinifier = (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return err(res, 'HTML is required');
    const result = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .trim();
    ok(res, { result, savings: ((1 - result.length / html.length) * 100).toFixed(1) + '%' });
  } catch { err(res, 'HTML minification failed'); }
};

exports.htmlStripTags = (req, res) => {
  const { html } = req.body;
  ok(res, { result: (html||'').replace(/<[^>]*>/g, '').replace(/\s+/g,' ').trim() });
};

exports.htmlToMarkdown = (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return err(res, 'HTML is required');
    let md = html
      .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (_, n, t) => '#'.repeat(n) + ' ' + t.replace(/<[^>]*>/g,'') + '\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '_$1_')
      .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img[^>]+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '\n')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```')
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    ok(res, { result: md });
  } catch { err(res, 'Conversion failed'); }
};

exports.markdownToHtml = (req, res) => {
  try {
    const { markdown } = req.body;
    if (!markdown) return err(res, 'Markdown is required');
    let html = markdown
      .replace(/^#{6}\s+(.*)/gm, '<h6>$1</h6>')
      .replace(/^#{5}\s+(.*)/gm, '<h5>$1</h5>')
      .replace(/^#{4}\s+(.*)/gm, '<h4>$1</h4>')
      .replace(/^#{3}\s+(.*)/gm, '<h3>$1</h3>')
      .replace(/^#{2}\s+(.*)/gm, '<h2>$1</h2>')
      .replace(/^#{1}\s+(.*)/gm, '<h1>$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|u|o|l|p])(.+)/gm, '$1');
    html = '<p>' + html + '</p>';
    ok(res, { result: html });
  } catch { err(res, 'Conversion failed'); }
};

exports.jsonValidator = (req, res) => {
  try {
    const { json } = req.body;
    if (!json) return err(res, 'JSON is required');
    const parsed = JSON.parse(json);
    ok(res, { valid: true, parsed, formatted: JSON.stringify(parsed, null, 2) });
  } catch (e) { ok(res, { valid: false, error: e.message }); }
};

exports.jsonBeautifier = (req, res) => {
  try {
    const { json, indent = 2 } = req.body;
    const parsed = JSON.parse(json);
    ok(res, { result: JSON.stringify(parsed, null, Number(indent)) });
  } catch (e) { err(res, 'Invalid JSON: ' + e.message); }
};

exports.jsonToXml = (req, res) => {
  try {
    const { json } = req.body;
    const obj = JSON.parse(json);
    const toXml = (data, tag = 'root') => {
      if (Array.isArray(data)) return data.map(i => toXml(i, 'item')).join('');
      if (typeof data === 'object' && data !== null) {
        const inner = Object.entries(data).map(([k,v]) => toXml(v,k)).join('');
        return `<${tag}>${inner}</${tag}>`;
      }
      return `<${tag}>${data}</${tag}>`;
    };
    ok(res, { result: '<?xml version="1.0"?>\n' + toXml(obj) });
  } catch (e) { err(res, 'Invalid JSON: ' + e.message); }
};

exports.xmlToJson = (req, res) => {
  try {
    const { xml } = req.body;
    if (!xml) return err(res, 'XML is required');
    // Simple XML → JSON using regex (for basic XML without attributes conflicts)
    const parseXml = (str) => {
      str = str.replace(/<\?xml[^>]*\?>/,'').trim();
      const tagRe = /<(\w+)>([\s\S]*?)<\/\1>/g;
      let m, obj = {};
      let found = false;
      while ((m = tagRe.exec(str)) !== null) {
        found = true;
        const inner = m[2].trim();
        obj[m[1]] = inner.includes('<') ? parseXml(inner) : inner;
      }
      return found ? obj : str;
    };
    ok(res, { result: JSON.stringify(parseXml(xml), null, 2) });
  } catch (e) { err(res, 'XML parsing failed: ' + e.message); }
};

exports.csvToJson = (req, res) => {
  try {
    const { csv, hasHeaders = true } = req.body;
    if (!csv) return err(res, 'CSV is required');
    const lines = csv.trim().split('\n').filter(Boolean);
    if (!lines.length) return err(res, 'Empty CSV');
    const parseRow = r => r.match(/("(?:[^"]|"")*"|[^,]*)/g)
      ?.map(f => f.replace(/^"|"$/g,'').replace(/""/g,'"')) || r.split(',');
    let result;
    if (hasHeaders) {
      const keys = parseRow(lines[0]);
      result = lines.slice(1).map(l => {
        const vals = parseRow(l);
        return Object.fromEntries(keys.map((k,i) => [k, vals[i]??'']));
      });
    } else {
      result = lines.map(l => parseRow(l));
    }
    ok(res, { result: JSON.stringify(result, null, 2), count: result.length });
  } catch (e) { err(res, 'CSV parsing failed: ' + e.message); }
};

exports.jsonToCsv = (req, res) => {
  try {
    const { json } = req.body;
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return err(res, 'JSON must be an array');
    const keys = Object.keys(arr[0] || {});
    const escape = v => typeof v === 'string' && (v.includes(',') || v.includes('"'))
      ? `"${v.replace(/"/g,'""')}"` : String(v??'');
    const rows = arr.map(o => keys.map(k => escape(o[k])).join(','));
    ok(res, { result: [keys.join(','), ...rows].join('\n') });
  } catch (e) { err(res, 'Conversion failed: ' + e.message); }
};

exports.sqlBeautifier = (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql) return err(res, 'SQL is required');
    const keywords = ['SELECT','FROM','WHERE','JOIN','LEFT JOIN','RIGHT JOIN','INNER JOIN',
      'ON','GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','INSERT INTO','VALUES',
      'UPDATE','SET','DELETE FROM','CREATE TABLE','ALTER TABLE','DROP TABLE'];
    let result = sql.replace(/\s+/g, ' ').trim();
    keywords.forEach(kw => {
      result = result.replace(new RegExp('\\b' + kw + '\\b', 'gi'), '\n' + kw);
    });
    ok(res, { result: result.trim() });
  } catch { err(res, 'SQL formatting failed'); }
};

exports.jsObfuscator = (req, res) => {
  try {
    const { js } = req.body;
    if (!js) return err(res, 'JavaScript is required');
    // Simple variable name obfuscation using hex encoding
    const encoded = Buffer.from(js).toString('base64');
    const result = `eval(atob("${encoded}"))`;
    ok(res, { result });
  } catch { err(res, 'Obfuscation failed'); }
};

// ══════════════════════════════════════════════
// NETWORK TOOLS (server-side)
// ══════════════════════════════════════════════

exports.dnsLookup = async (req, res) => {
  try {
    const { domain, type = 'A' } = req.body;
    if (!domain) return err(res, 'Domain is required');
    const clean = domain.replace(/^https?:\/\//,'').replace(/\/.*/,'').trim();
    const types = type === 'ALL' ? ['A','AAAA','MX','TXT','NS','CNAME','SOA'] : [type];
    const results = {};
    for (const t of types) {
      try {
        switch (t) {
          case 'A':     results.A     = await dns.resolve4(clean);  break;
          case 'AAAA':  results.AAAA  = await dns.resolve6(clean);  break;
          case 'MX':    results.MX    = await dns.resolveMx(clean); break;
          case 'TXT':   results.TXT   = await dns.resolveTxt(clean); break;
          case 'NS':    results.NS    = await dns.resolveNs(clean); break;
          case 'CNAME': results.CNAME = await dns.resolveCname(clean); break;
          case 'SOA':   results.SOA   = await dns.resolveSoa(clean); break;
        }
      } catch { results[t] = []; }
    }
    ok(res, { domain: clean, results });
  } catch (e) { err(res, 'DNS lookup failed: ' + e.message); }
};

exports.whoisLookup = async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return err(res, 'Domain is required');
    const clean = domain.replace(/^https?:\/\//,'').replace(/\/.*/,'').trim().toLowerCase();
    const tld   = clean.split('.').pop();
    const servers = { com:'whois.crsnic.net', org:'whois.pir.org', net:'whois.crsnic.net',
      info:'whois.afilias.info', app:'whois.nic.google', io:'whois.nic.io',
      xyz:'whois.nic.xyz', biz:'whois.nic.biz', dev:'whois.nic.google' };
    const server = servers[tld] || `whois.nic.${tld}`;

    const result = await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let data = '';
      socket.setTimeout(7000);
      socket.connect(43, server, () => socket.write(clean + '\r\n'));
      socket.on('data', chunk => { data += chunk.toString(); });
      socket.on('end',  () => resolve(data));
      socket.on('error', reject);
      socket.on('timeout', () => { socket.destroy(); reject(new Error('Timeout')); });
    });
    ok(res, { domain: clean, server, result });
  } catch (e) { err(res, 'WHOIS lookup failed: ' + e.message); }
};

exports.sslChecker = async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return err(res, 'URL is required');
    if (!url.startsWith('http')) url = 'https://' + url;
    const { hostname } = new URL(url);

    const cert = await new Promise((resolve, reject) => {
      const socket = tls.connect({ host: hostname, port: 443, servername: hostname, rejectUnauthorized: false }, () => {
        resolve(socket.getPeerCertificate(true));
        socket.end();
      });
      socket.on('error', reject);
      socket.setTimeout(8000, () => { socket.destroy(); reject(new Error('Timeout')); });
    });

    if (!cert || !cert.subject) return err(res, 'Could not retrieve certificate');
    const now     = Date.now();
    const validTo = new Date(cert.valid_to);
    const daysLeft = Math.floor((validTo - now) / 86400000);
    ok(res, {
      host: hostname,
      valid: daysLeft > 0,
      daysLeft,
      subject: cert.subject,
      issuer:  cert.issuer,
      validFrom: cert.valid_from,
      validTo: cert.valid_to,
      serialNumber: cert.serialNumber,
      fingerprint: cert.fingerprint,
    });
  } catch (e) { err(res, 'SSL check failed: ' + e.message); }
};

exports.pingUrl = async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return err(res, 'URL is required');
    if (!url.startsWith('http')) url = 'https://' + url;
    const start = Date.now();
    const response = await axios.get(url, { timeout: 10000, maxRedirects: 5 });
    const latency = Date.now() - start;
    ok(res, { status: 'online', code: response.status, latency, url });
  } catch (e) {
    if (e.response) {
      ok(res, { status: 'online', code: e.response.status, latency: null, url });
    } else {
      ok(res, { status: 'offline', code: 0, latency: null, url, error: e.message });
    }
  }
};

exports.httpStatus = async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return err(res, 'URL is required');
    if (!url.startsWith('http')) url = 'https://' + url;
    const response = await axios.get(url, { timeout: 10000, maxRedirects: 5, validateStatus: () => true });
    const code = response.status;
    let label = 'Unknown';
    if (code >= 200 && code < 300) label = 'Success';
    else if (code >= 300 && code < 400) label = 'Redirect';
    else if (code >= 400 && code < 500) label = 'Client Error';
    else if (code >= 500) label = 'Server Error';
    ok(res, { code, label, url });
  } catch (e) {
    ok(res, { code: 0, label: 'Unavailable', url, error: e.message });
  }
};

exports.redirectChecker = async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return err(res, 'URL is required');
    if (!url.startsWith('http')) url = 'https://' + url;
    const chain = [];
    let current = url;
    for (let i = 0; i < 10; i++) {
      const r = await axios.get(current, { maxRedirects: 0, validateStatus: () => true, timeout: 6000 });
      chain.push({ url: current, code: r.status });
      if (r.status >= 300 && r.status < 400 && r.headers.location) {
        current = r.headers.location.startsWith('http') ? r.headers.location : new URL(r.headers.location, current).href;
      } else break;
    }
    ok(res, { chain, final: current, redirects: chain.length - 1 });
  } catch (e) { err(res, 'Redirect check failed: ' + e.message); }
};

exports.urlUnshortener = async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return err(res, 'URL is required');
    if (!url.startsWith('http')) url = 'https://' + url;
    const r = await axios.get(url, { maxRedirects: 10, timeout: 10000, validateStatus: () => true });
    ok(res, { original: url, final: r.request?.res?.responseUrl || url, expanded: true });
  } catch (e) { err(res, 'URL expansion failed: ' + e.message); }
};

exports.hostnameToIp = async (req, res) => {
  try {
    let { hostname } = req.body;
    if (!hostname) return err(res, 'Hostname is required');
    hostname = hostname.replace(/^https?:\/\//,'').replace(/\/.*/,'').trim().toLowerCase();
    const addresses = await dns.resolve4(hostname);
    ok(res, { hostname, ip: addresses[0], allIps: addresses });
  } catch (e) { err(res, 'Could not resolve hostname: ' + e.message); }
};

exports.ipToHostname = async (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) return err(res, 'IP address is required');
    const hostnames = await dns.reverse(ip);
    ok(res, { ip, hostname: hostnames[0], all: hostnames });
  } catch (e) { err(res, 'Reverse DNS lookup failed: ' + e.message); }
};

exports.ipInformation = async (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) return err(res, 'IP address is required');
    const token = process.env.IPINFO_TOKEN || '';
    const url   = token ? `https://ipinfo.io/${ip}?token=${token}` : `https://ipinfo.io/${ip}/json`;
    const { data } = await axios.get(url, { timeout: 8000 });
    ok(res, data);
  } catch (e) { err(res, 'IP lookup failed: ' + e.message); }
};

exports.openPortChecker = async (req, res) => {
  try {
    const { host, port } = req.body;
    if (!host || !port) return err(res, 'Host and port are required');
    const isOpen = await new Promise(resolve => {
      const socket = new net.Socket();
      socket.setTimeout(5000);
      socket.connect(Number(port), host.replace(/^https?:\/\//,''), () => { socket.destroy(); resolve(true); });
      socket.on('error',   () => resolve(false));
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
    });
    ok(res, { host, port: Number(port), open: isOpen, status: isOpen ? 'Open' : 'Closed' });
  } catch (e) { err(res, 'Port check failed: ' + e.message); }
};

exports.websiteStatus = async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return err(res, 'URL is required');
    if (!url.startsWith('http')) url = 'https://' + url;
    const start = Date.now();
    const r = await axios.get(url, { timeout: 10000, validateStatus: () => true });
    ok(res, { url, online: r.status < 500, code: r.status, responseTime: Date.now() - start });
  } catch (e) {
    ok(res, { url, online: false, code: 0, error: e.message });
  }
};

exports.httpHeaders = async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return err(res, 'URL is required');
    if (!url.startsWith('http')) url = 'https://' + url;
    const r = await axios.head(url, { timeout: 8000, validateStatus: () => true, maxRedirects: 5 });
    ok(res, { url, code: r.status, headers: r.headers });
  } catch (e) { err(res, 'Request failed: ' + e.message); }
};

exports.gzipTest = async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return err(res, 'URL is required');
    if (!url.startsWith('http')) url = 'https://' + url;
    const r = await axios.get(url, {
      timeout: 8000, validateStatus: () => true,
      headers: { 'Accept-Encoding': 'gzip, deflate, br' },
      decompress: false,
    });
    const encoding = r.headers['content-encoding'] || 'none';
    const gzipped  = ['gzip','deflate','br'].includes(encoding.toLowerCase());
    ok(res, { url, gzipEnabled: gzipped, encoding, contentType: r.headers['content-type'] });
  } catch (e) { err(res, 'Request failed: ' + e.message); }
};

exports.sourceCodeDownloader = async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return err(res, 'URL is required');
    if (!url.startsWith('http')) url = 'https://' + url;
    const r = await axios.get(url, { timeout: 10000, validateStatus: () => true });
    ok(res, { url, source: r.data, contentType: r.headers['content-type'], code: r.status });
  } catch (e) { err(res, 'Download failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// MISC / GENERATOR TOOLS
// ══════════════════════════════════════════════

exports.timestampConverter = (req, res) => {
  const { timestamp, date, mode = 'toDate' } = req.body;
  if (mode === 'toDate' && timestamp !== undefined) {
    const d = new Date(Number(timestamp) * 1000);
    ok(res, { result: d.toUTCString(), iso: d.toISOString(), timestamp: Number(timestamp) });
  } else if (mode === 'toTimestamp' && date) {
    const ts = Math.floor(new Date(date).getTime() / 1000);
    ok(res, { result: ts, readable: new Date(date).toUTCString() });
  } else {
    const now = new Date();
    ok(res, { now: Math.floor(now.getTime() / 1000), formatted: now.toUTCString() });
  }
};

exports.bmiCalculator = (req, res) => {
  const { weight, height, unit = 'metric' } = req.body;
  if (!weight || !height) return err(res, 'Weight and height required');
  let bmi;
  if (unit === 'metric') {
    bmi = Number(weight) / (Number(height) / 100) ** 2;
  } else {
    bmi = (703 * Number(weight)) / Number(height) ** 2;
  }
  const bmiRound = Math.round(bmi * 10) / 10;
  let category;
  if (bmiRound < 18.5)  category = 'Underweight';
  else if (bmiRound < 25) category = 'Normal weight';
  else if (bmiRound < 30) category = 'Overweight';
  else                    category = 'Obese';
  ok(res, { bmi: bmiRound, category });
};

exports.memoryConverter = (req, res) => {
  const { value, from = 'bytes' } = req.body;
  if (value === undefined) return err(res, 'Value is required');
  const units = { bytes:1, kb:1024, mb:1048576, gb:1073741824, tb:1099511627776 };
  const base  = Number(value) * (units[from.toLowerCase()] || 1);
  const result = {};
  Object.entries(units).forEach(([u,mult]) => { result[u] = (base/mult).toFixed(6)*1; });
  ok(res, result);
};

exports.emailValidator = (req, res) => {
  const { email } = req.body;
  if (!email) return err(res, 'Email is required');
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  const valid = re.test(email);
  const parts = email.split('@');
  ok(res, { valid, email, local: parts[0], domain: parts[1] });
};

exports.creditCardValidator = (req, res) => {
  const { number } = req.body;
  if (!number) return err(res, 'Card number is required');
  const digits = number.replace(/\D/g,'');
  // Luhn algorithm
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  const valid = sum % 10 === 0 && digits.length >= 13;
  let type = 'Unknown';
  if (/^4/.test(digits)) type = 'Visa';
  else if (/^5[1-5]/.test(digits)) type = 'Mastercard';
  else if (/^3[47]/.test(digits)) type = 'American Express';
  else if (/^6(?:011|5)/.test(digits)) type = 'Discover';
  ok(res, { valid, type, length: digits.length });
};

exports.userAgent = (req, res) => {
  const ua = req.headers['user-agent'] || 'Unknown';
  const isMobile  = /mobile|android|iphone|ipad/i.test(ua);
  const isBot     = /bot|crawler|spider|slurp|archiver/i.test(ua);
  const browser   = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE)[\/\s]([\d.]+)/i);
  const os        = ua.match(/(Windows NT[\s\d.]+|Mac OS X[\s\d._]+|Linux|Android[\s\d.]+|iOS[\s\d._]+)/i);
  ok(res, { ua, browser: browser?.[0] || 'Unknown', os: os?.[0] || 'Unknown', mobile: isMobile, bot: isBot });
};

exports.whatsMyIp = (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'Unknown';
  ok(res, { ip: ip.replace('::ffff:','') });
};

exports.domainGenerator = (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return err(res, 'Keyword is required');
  const tlds = ['.com','.net','.org','.io','.co','.app','.dev','.ai','.info','.biz'];
  const prefixes = ['get','try','use','my','go','the','best','pro','super'];
  const suffixes = ['app','hq','hub','lab','cloud','pro','io','co'];
  const suggestions = [
    ...tlds.map(t => ({ domain: keyword+t, type: 'tld' })),
    ...prefixes.map(p => ({ domain: p+keyword+'.com', type: 'prefix' })),
    ...suffixes.map(s => ({ domain: keyword+s+'.com', type: 'suffix' })),
  ];
  ok(res, { keyword, suggestions });
};

exports.htaccessGenerator = (req, res) => {
  const { type, from, to, code = 301 } = req.body;
  if (!type) return err(res, 'Redirect type is required');
  let result = '';
  switch (type) {
    case 'single':
      result = `Redirect ${code} ${from} ${to}`;
      break;
    case 'www':
      result = `RewriteEngine On\nRewriteCond %{HTTP_HOST} !^www\\.\nRewriteRule ^ https://www.%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`;
      break;
    case 'non-www':
      result = `RewriteEngine On\nRewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]\nRewriteRule ^ https://%1%{REQUEST_URI} [L,R=301]`;
      break;
    case 'https':
      result = `RewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`;
      break;
    default:
      result = `RewriteEngine On\nRedirect ${code} ${from||'/'} ${to||'/'}`;
  }
  ok(res, { result });
};

exports.robotstxtGenerator = (req, res) => {
  const { userAgent = '*', disallow = [], allow = [], sitemap = '' } = req.body;
  const lines = [`User-agent: ${userAgent}`];
  (Array.isArray(allow)    ? allow    : [allow]).forEach(p   => p && lines.push(`Allow: ${p}`));
  (Array.isArray(disallow) ? disallow : [disallow]).forEach(p => p && lines.push(`Disallow: ${p}`));
  if (sitemap) lines.push('', `Sitemap: ${sitemap}`);
  ok(res, { result: lines.join('\n') });
};

exports.seoTagsGenerator = (req, res) => {
  const { title, description, url, image, keywords } = req.body;
  if (!title) return err(res, 'Title is required');
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description||''}">`,
    keywords ? `<meta name="keywords" content="${keywords}">` : '',
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description||''}">`,
    url   ? `<meta property="og:url" content="${url}">` : '',
    image ? `<meta property="og:image" content="${image}">` : '',
    `<meta property="og:type" content="website">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description||''}">`,
    image ? `<meta name="twitter:image" content="${image}">` : '',
  ].filter(Boolean).join('\n');
  ok(res, { result: tags });
};

exports.twitterCardGenerator = (req, res) => {
  const { card='summary_large_image', title, description, image, site } = req.body;
  if (!title) return err(res, 'Title is required');
  const tags = [
    `<meta name="twitter:card" content="${card}">`,
    `<meta name="twitter:title" content="${title}">`,
    description ? `<meta name="twitter:description" content="${description}">` : '',
    image ? `<meta name="twitter:image" content="${image}">` : '',
    site  ? `<meta name="twitter:site" content="${site}">` : '',
  ].filter(Boolean).join('\n');
  ok(res, { result: tags });
};

exports.privacyPolicyGenerator = (req, res) => {
  const { company, website, email, country = 'United States' } = req.body;
  if (!company) return err(res, 'Company name is required');
  const date = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  ok(res, { result: `Privacy Policy for ${company}\n\nLast updated: ${date}\n\nThis Privacy Policy describes how ${company} ("we", "us", or "our") collects, uses, and shares information about you when you visit ${website||'our website'}.\n\n1. INFORMATION WE COLLECT\nWe collect information you provide directly to us, such as when you create an account, contact us, or otherwise communicate with us. This may include your name, email address, and other contact information.\n\n2. HOW WE USE YOUR INFORMATION\nWe use the information we collect to provide, maintain, and improve our services, communicate with you, and comply with legal obligations.\n\n3. SHARING OF INFORMATION\nWe do not sell or rent your personal information to third parties. We may share your information with service providers who assist us in our operations.\n\n4. DATA SECURITY\nWe take reasonable measures to help protect your personal information from loss, theft, misuse, and unauthorized access.\n\n5. CONTACT US\nIf you have questions about this Privacy Policy, please contact us at ${email||'contact@'+((website||'').replace(/https?:\/\//,''))||'our website'}.` });
};

exports.termsOfServiceGenerator = (req, res) => {
  const { company, website, email } = req.body;
  if (!company) return err(res, 'Company name is required');
  const date = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  ok(res, { result: `Terms of Service for ${company}\n\nLast updated: ${date}\n\nPlease read these Terms of Service ("Terms") carefully before using ${website||'our service'} operated by ${company}.\n\n1. ACCEPTANCE OF TERMS\nBy accessing or using our service, you agree to be bound by these Terms. If you do not agree to these Terms, do not use our service.\n\n2. USE OF SERVICE\nYou may use our service only for lawful purposes and in accordance with these Terms. You agree not to use our service in any way that violates applicable laws or regulations.\n\n3. INTELLECTUAL PROPERTY\nThe service and its original content, features, and functionality are and will remain the exclusive property of ${company} and its licensors.\n\n4. LIMITATION OF LIABILITY\n${company} shall not be liable for any indirect, incidental, special, or consequential damages arising out of or relating to these Terms or your use of the service.\n\n5. CONTACT US\nFor questions about these Terms, contact us at ${email||'our website'}.` });
};

exports.punycodeToUnicode = (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return err(res, 'Domain is required');
    const result = punycode.toUnicode(domain);
    ok(res, { result, original: domain });
  } catch (e) { err(res, 'Conversion failed: ' + e.message); }
};

exports.unicodeToPunycode = (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return err(res, 'Domain is required');
    const result = punycode.toASCII(domain);
    ok(res, { result, original: domain });
  } catch (e) { err(res, 'Conversion failed: ' + e.message); }
};

exports.fakeNameGenerator = (req, res) => {
  const firstNames = ['Alice','Bob','Charlie','Diana','Edward','Fiona','George','Hannah','Ivan','Julia','Kevin','Laura','Michael','Nancy','Oscar','Patricia','Quinn','Rachel','Steven','Tina','Uma','Victor','Wendy','Xavier','Yvonne','Zachary'];
  const lastNames  = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Martinez','Anderson','Taylor','Thomas','Hernandez','Moore','Martin','Jackson','Thompson','White','Lopez'];
  const domains    = ['gmail.com','yahoo.com','outlook.com','hotmail.com','example.com'];
  const streets    = ['Main St','Oak Ave','Maple Dr','Cedar Ln','Elm St','Pine Rd','First Ave','Park Blvd'];
  const cities     = ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego'];
  const states     = ['NY','CA','IL','TX','AZ','PA','TX','CA'];
  const i = n => Math.floor(Math.random()*n);
  const first = firstNames[i(firstNames.length)];
  const last  = lastNames[i(lastNames.length)];
  const ci    = i(cities.length);
  ok(res, {
    name: `${first} ${last}`,
    firstName: first, lastName: last,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${i(99)}@${domains[i(domains.length)]}`,
    phone: `+1 (${100+i(900)}) ${100+i(900)}-${1000+i(9000)}`,
    address: `${100+i(9900)} ${streets[i(streets.length)]}, ${cities[ci]}, ${states[ci]} ${10000+i(90000)}`,
    username: `${first.toLowerCase()}${last.toLowerCase()}${i(999)}`,
  });
};

exports.youtubeThumbnail = (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'YouTube URL is required');
  let id = null;
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) { id = m[1]; break; }
  }
  if (!id) return err(res, 'Could not extract video ID');
  ok(res, {
    videoId: id,
    thumbnails: {
      maxres:  `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
      hq:      `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      mq:      `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      default: `https://img.youtube.com/vi/${id}/default.jpg`,
      sd:      `https://img.youtube.com/vi/${id}/sddefault.jpg`,
    },
  });
};
