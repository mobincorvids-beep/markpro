// ══════════════════════════════════════════════════════════════
//  Dev Tools Hub registry — maps every tool card to a runnable
//  implementation. `run` receives (input, ctx) and returns data.
//  kind: 'text' (textarea) | 'file' (image picker) | 'none'
// ══════════════════════════════════════════════════════════════
import { cyberAPI } from '../../services/api';
import * as L from './devToolsLib';

/* Call a server-side endpoint and normalise the envelope. */
const server = (slug, build) => async (input) => {
  const payload = { input, text: input, url: input, domain: input, ip: input, ...(build ? build(input) : {}) };
  let res;
  try {
    res = await cyberAPI.runTool(slug, payload);
  } catch (e) {
    const msg = e?.response?.data?.message || e?.response?.data?.error;
    if (e?.response?.status === 404) throw new Error('This server tool is not available on the API (endpoint missing).');
    throw new Error(msg || e.message || 'Request failed');
  }
  const d = res?.data || {};
  const { success, ...rest } = d;
  const keys = Object.keys(rest);
  if (keys.length === 1 && typeof rest[keys[0]] !== 'object') return rest[keys[0]];
  return rest;
};

/* Fetch page HTML through the backend, then parse it in the browser. */
const withHtml = (fn) => async (input) => {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('Enter a website URL');
  const url = raw.startsWith('http') ? raw : `https://${raw}`;
  const res = await cyberAPI.runTool('source-code-downloader', { url, input: url, text: url });
  const html = res?.data?.source;
  if (!html) throw new Error('Could not fetch the page source');
  return fn(typeof html === 'string' ? html : JSON.stringify(html), url);
};

const T = (run, opts = {}) => ({ kind: 'text', run, ...opts });
const F = (run, opts = {}) => ({ kind: 'file', run, ...opts });

export const TOOLS = {
  /* ── Text Tools ─────────────────────────────────────────── */
  'Word Counter':            T(L.wordCounter,          { placeholder: 'Paste your text…' }),
  'Character Counter':       T(L.characterCounter,     { placeholder: 'Paste your text…' }),
  'Case Converter':          T(L.caseConverter,        { placeholder: 'Some text to convert' }),
  'Text Reverser':           T(L.textReverser,         { placeholder: 'Text to reverse' }),
  'Lorem Ipsum Gen':         T(L.loremIpsum,           { placeholder: 'How many paragraphs? e.g. 3', defaultInput: '3', allowEmpty: true }),
  'Duplicate Line Remover':  T(L.duplicateLineRemover, { placeholder: 'One item per line' }),
  'Line Sorter':             T(L.lineSorter,           { placeholder: 'One item per line' }),
  'Text Compare':            T(L.textCompare,          { placeholder: 'First block\n---\nSecond block' }),
  'Whitespace Remover':      T(L.whitespaceRemover,    { placeholder: '  messy   text  ' }),
  'Sentence Counter':        T(L.sentenceCounter,      { placeholder: 'Paste a paragraph…' }),

  /* ── JSON & Data ────────────────────────────────────────── */
  'JSON Formatter':  T(L.jsonFormatter, { placeholder: '{"a":1,"b":[2,3]}' }),
  'JSON Validator':  T(L.jsonValidator, { placeholder: '{"a":1}' }),
  'JSON Minifier':   T(L.jsonMinifier,  { placeholder: '{\n  "a": 1\n}' }),
  'JSON to CSV':     T(L.jsonToCsv,     { placeholder: '[{"name":"Ann","age":30},{"name":"Bob","age":25}]' }),
  'CSV to JSON':     T(L.csvToJson,     { placeholder: 'name,age\nAnn,30\nBob,25' }),
  'JSON to YAML':    T(L.jsonToYaml,    { placeholder: '{"server":{"port":8080}}' }),
  'YAML to JSON':    T(L.yamlToJson,    { placeholder: 'server:\n  port: 8080' }),
  'XML Formatter':   T(L.xmlFormatter,  { placeholder: '<a><b>1</b></a>' }),
  'XML to JSON':     T(L.xmlToJson,     { placeholder: '<root><item>1</item></root>' }),
  'JSON Editor':     T(L.jsonEditor,    { placeholder: '{"a":{"b":[1,2]}}' }),

  /* ── Encode & Decode ────────────────────────────────────── */
  'Base64 Encode':   T(L.base64Encode, { placeholder: 'Hello world' }),
  'Base64 Decode':   T(L.base64Decode, { placeholder: 'SGVsbG8gd29ybGQ=' }),
  'URL Encode':      T(L.urlEncode,    { placeholder: 'https://a.com/?q=hello world' }),
  'URL Decode':      T(L.urlDecode,    { placeholder: 'https%3A%2F%2Fa.com' }),
  'HTML Encode':     T(L.htmlEncode,   { placeholder: '<div class="x">hi</div>' }),
  'HTML Decode':     T(L.htmlDecode,   { placeholder: '&lt;div&gt;hi&lt;/div&gt;' }),
  'MD5 Generator':   T(L.md5Generator, { placeholder: 'Text to hash' }),
  'SHA256 Hash':     T(L.sha256Hash,   { placeholder: 'Text to hash' }),
  'Bcrypt Generator': T(server('bcrypt-generate', (i) => ({ text: i, rounds: 10 })), { placeholder: 'Password to hash' }),
  'JWT Decoder':     T(L.jwtDecoder,   { placeholder: 'eyJhbGciOi…header.payload.signature' }),

  /* ── Security ───────────────────────────────────────────── */
  'Password Generator':  T(L.passwordGenerator, { placeholder: 'Length (default 16)', defaultInput: '16', allowEmpty: true }),
  'Password Strength':   T(L.passwordStrength,  { placeholder: 'Password to analyse' }),
  'SSL Checker':         T(server('ssl-checker'),   { placeholder: 'example.com' }),
  'WHOIS Lookup':        T(server('whois'),         { placeholder: 'example.com' }),
  'IP Lookup':           T(server('ip-information'),{ placeholder: '8.8.8.8 (blank = your IP)', allowEmpty: true }),
  'DNS Lookup':          T(server('dns-lookup', (i) => ({ domain: i.replace(/^https?:\/\//, '').split('/')[0], type: 'A' })), { placeholder: 'example.com' }),
  'Port Scanner':        T(server('open-port-checker', (i) => {
                            const [host, port] = String(i).split(/[\s:]+/);
                            if (!port) throw new Error('Enter "host:port", e.g. example.com:443');
                            return { host, port: Number(port) };
                          }), { placeholder: 'example.com:443' }),
  'HTTP Headers':        T(server('http-headers'),  { placeholder: 'https://example.com' }),
  'Safe Browsing Check': T(server('website-status'),{ placeholder: 'https://example.com' }),
  'Htpasswd Generator':  T(L.htpasswdGenerator,     { placeholder: 'username:password' }),

  /* ── Dev Utilities ──────────────────────────────────────── */
  'Regex Tester':     T(L.regexTester,     { placeholder: '\\d+\ng\nOrder 123 and 456' }),
  'Cron Generator':   T(L.cronGenerator,   { placeholder: '0 9 * * 1-5', defaultInput: '0 9 * * 1-5' }),
  'UUID Generator':   T(L.uuidGenerator,   { placeholder: 'How many? e.g. 5', defaultInput: '5', allowEmpty: true }),
  'Color Picker':     T(L.colorPicker,     { placeholder: '#3b82f6', defaultInput: '#3b82f6' }),
  'CSS Minifier':     T(L.cssMinifier,     { placeholder: '.a { color: red; }' }),
  'JS Minifier':      T(L.jsMinifier,      { placeholder: 'function a () { return 1; }' }),
  'HTML Minifier':    T(L.htmlMinifier,    { placeholder: '<div>  <p>hi</p>  </div>' }),
  'SQL Formatter':    T(L.sqlFormatter,    { placeholder: 'select a,b from t where a=1 order by b' }),
  'Markdown Preview': T(L.markdownPreview, { placeholder: '# Title\n\nSome **bold** text.' }),
  'Diff Checker':     T(L.diffChecker,     { placeholder: 'line one\nline two\n---\nline one\nline 2' }),

  /* ── Network Tools ──────────────────────────────────────── */
  'IP Geolocation':      T(server('ip-information'),   { placeholder: '8.8.8.8 (blank = your IP)', allowEmpty: true }),
  'Ping Test':           T(server('ping'),             { placeholder: 'https://example.com' }),
  'Traceroute':          T(server('ping'),             { placeholder: 'https://example.com', note: 'ICMP traceroute is blocked in hosted environments — this runs an HTTP reachability + latency probe instead.' }),
  'DNS Propagation':     T(server('dns-lookup', (i) => ({ domain: i.replace(/^https?:\/\//, '').split('/')[0], type: 'A' })), { placeholder: 'example.com' }),
  'HTTP Status Check':   T(server('http-status'),      { placeholder: 'https://example.com' }),
  'Redirect Chain':      T(server('redirect-checker'), { placeholder: 'http://example.com' }),
  'Meta Tag Extractor':  T(withHtml(L.extractMeta),    { placeholder: 'https://example.com' }),
  'Link Extractor':      T(withHtml(L.extractLinks),   { placeholder: 'https://example.com' }),
  'Tech Stack Detector': T(withHtml(L.detectTech),     { placeholder: 'https://example.com' }),
  'Uptime Checker':      T(server('website-status'),   { placeholder: 'https://example.com' }),

  /* ── Image Tools ────────────────────────────────────────── */
  'Image to Base64':   F(L.imageToBase64),
  'Base64 to Image':   T(L.base64ToImage,  { placeholder: 'data:image/png;base64,iVBORw0…' }),
  'Image Metadata':    F(L.imageMetadata),
  'Color Extractor':   F(L.colorExtractor),
  'Image Resize':      F(L.imageResize,    { placeholder: '800x600  or  800', defaultInput: '800' }),
  'Format Converter':  F(L.formatConverter,{ placeholder: 'png | jpeg | webp', defaultInput: 'webp' }),
  'EXIF Viewer':       F(L.exifViewer),
  'Image Compressor':  F(L.imageCompressor,{ placeholder: 'Quality 1-100', defaultInput: '60' }),
  'Favicon Extractor': T(L.faviconExtractor, { placeholder: 'example.com' }),
  'Screenshot Tool':   T(L.screenshotInfo,   { placeholder: 'https://example.com' }),

  /* ── Code Formatters ────────────────────────────────────── */
  'HTML Formatter':     T(L.htmlFormatter,   { placeholder: '<div><p>hi</p></div>' }),
  'CSS Formatter':      T(L.cssFormatter,    { placeholder: '.a{color:red;background:#fff}' }),
  'JS Formatter':       T(L.jsFormatter,     { placeholder: 'function a(){return 1}' }),
  'PHP Formatter':      T(L.phpFormatter,    { placeholder: '<?php function a(){return 1;}' }),
  'Python Formatter':   T(L.pythonFormatter, { placeholder: 'def a():\nreturn 1' }),
  'Go Formatter':       T(L.goFormatter,     { placeholder: 'func main(){fmt.Println("hi")}' }),
  'Code Minifier':      T(L.codeMinifier,    { placeholder: 'Any code to strip + collapse' }),
  'SVG Optimizer':      T(L.svgOptimizer,    { placeholder: '<svg>…</svg>' }),
  'HTML to Markdown':   T(L.htmlToMarkdown,  { placeholder: '<h1>Title</h1><p>Text</p>' }),
  'Markdown to HTML':   T(L.markdownToHtml,  { placeholder: '# Title\n\nSome text' }),
};

export const getTool = (name) => TOOLS[name] || null;
