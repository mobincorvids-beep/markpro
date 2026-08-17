/**
 * A to Z SEO Tools - MERN Backend Controller
 * Implements all 50+ tools from the original PHP script
 */
const axios    = require('axios');
const cheerio  = require('cheerio');
const crypto   = require('crypto');
const dns      = require('dns').promises;
const net      = require('net');
const tls      = require('tls');
const { URL }  = require('url');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 }); // 5-min cache
const ok  = (res, data)       => res.json({ success: true, ...data });
const err = (res, msg, s=400) => res.status(s).json({ success: false, message: msg });

// ── Helpers ────────────────────────────────────
function normaliseUrl(input) {
  if (!input) return null;
  input = input.trim();
  if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
  try { new URL(input); return input; } catch { return null; }
}
function cleanDomain(input) {
  try {
    const u = new URL(normaliseUrl(input) || 'https://' + input);
    return u.hostname.replace(/^www\./i, '');
  } catch { return input.replace(/^https?:\/\//i,'').replace(/^www\./i,'').split('/')[0]; }
}
async function fetchPage(url, opts = {}) {
  const { data } = await axios.get(url, {
    timeout: 12000, maxRedirects: 5,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AtoZSEOBot/1.0)' },
    ...opts,
  });
  return data;
}

// ══════════════════════════════════════════════
// PR01 - Article Rewriter (synonym-based spin)
// ══════════════════════════════════════════════
exports.articleRewriter = (req, res) => {
  const { text } = req.body;
  if (!text) return err(res, 'Text is required');
  const synonyms = {
    'good':'great','great':'excellent','bad':'poor','large':'huge','small':'tiny',
    'important':'crucial','help':'assist','use':'utilize','show':'demonstrate',
    'make':'create','get':'obtain','give':'provide','need':'require','want':'desire',
    'know':'understand','think':'believe','say':'state','see':'observe','come':'arrive',
    'go':'proceed','find':'discover','take':'acquire','look':'examine','start':'begin',
    'work':'function','turn':'transform','ask':'inquire','seem':'appear','feel':'sense',
    'try':'attempt','leave':'depart','call':'contact','keep':'maintain','let':'allow',
    'begin':'commence','show':'reveal','run':'operate','move':'transfer','live':'exist',
    'believe':'consider','hold':'maintain','happen':'occur','write':'compose',
    'provide':'offer','sit':'remain','stand':'position','lose':'forfeit','pay':'compensate',
    'meet':'encounter','include':'incorporate','continue':'persist','set':'establish',
    'learn':'discover','change':'modify','lead':'guide','understand':'comprehend',
    'develop':'create','grow':'expand','open':'establish','walk':'proceed','win':'succeed',
    'offer':'propose','remember':'recall','love':'appreciate','consider':'regard',
    'appear':'seem','buy':'purchase','wait':'pause','serve':'assist','die':'cease',
    'send':'transmit','expect':'anticipate','build':'construct','stay':'remain',
    'fall':'decline','cut':'reduce','reach':'achieve','kill':'eliminate','raise':'increase',
    'pass':'achieve','sell':'market','require':'demand','report':'communicate',
    'decide':'determine','pull':'draw','speak':'communicate','simple':'straightforward',
    'quick':'rapid','fast':'swift','big':'substantial','new':'recent','old':'previous',
    'high':'elevated','low':'reduced','long':'extended','short':'brief',
  };
  const words   = text.split(/\b/);
  const rewritten = words.map(w => {
    const lower = w.toLowerCase();
    return synonyms[lower] ? (w[0] === w[0].toUpperCase() ? synonyms[lower][0].toUpperCase() + synonyms[lower].slice(1) : synonyms[lower]) : w;
  }).join('');
  ok(res, { result: rewritten, original: text });
};

// ══════════════════════════════════════════════
// PR04 - Meta Tag Generator
// ══════════════════════════════════════════════
exports.metaTagGenerator = (req, res) => {
  const { title='', description='', keywords='', author='', robots='index, follow', language='en', revisit='' } = req.body;
  const tags = [
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    title       ? `<title>${title}</title>` : '',
    title       ? `<meta name="title" content="${title}">` : '',
    description ? `<meta name="description" content="${description}">` : '',
    keywords    ? `<meta name="keywords" content="${keywords}">` : '',
    author      ? `<meta name="author" content="${author}">` : '',
    robots      ? `<meta name="robots" content="${robots}">` : '',
    language    ? `<meta http-equiv="Content-Language" content="${language}">` : '',
    revisit     ? `<meta name="revisit-after" content="${revisit} days">` : '',
    '',
    '<!-- Open Graph / Social Media -->',
    title       ? `<meta property="og:title" content="${title}">` : '',
    description ? `<meta property="og:description" content="${description}">` : '',
    `<meta property="og:type" content="website">`,
    '',
    '<!-- Twitter Card -->',
    `<meta name="twitter:card" content="summary_large_image">`,
    title       ? `<meta name="twitter:title" content="${title}">` : '',
    description ? `<meta name="twitter:description" content="${description}">` : '',
  ].filter(l => l !== undefined).join('\n');
  ok(res, { result: tags });
};

// ══════════════════════════════════════════════
// PR05 - Meta Tags Analyzer
// ══════════════════════════════════════════════
exports.metaTagsAnalyzer = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  const cacheKey = 'meta_' + full;
  if (cache.has(cacheKey)) return ok(res, cache.get(cacheKey));
  try {
    const html = await fetchPage(full);
    const $    = cheerio.load(html);
    const getMeta = name =>
      $(`meta[name="${name}"]`).attr('content') ||
      $(`meta[property="${name}"]`).attr('content') || '';
    const result = {
      url: full,
      title:           $('title').text(),
      description:     getMeta('description'),
      keywords:        getMeta('keywords'),
      robots:          getMeta('robots'),
      author:          getMeta('author'),
      ogTitle:         getMeta('og:title'),
      ogDescription:   getMeta('og:description'),
      ogImage:         getMeta('og:image'),
      ogType:          getMeta('og:type'),
      twitterCard:     getMeta('twitter:card'),
      twitterTitle:    getMeta('twitter:title'),
      canonical:       $('link[rel="canonical"]').attr('href') || '',
      h1Count:         $('h1').length,
      h2Count:         $('h2').length,
      imgCount:        $('img').length,
      imgNoAlt:        $('img:not([alt])').length + $('img[alt=""]').length,
      wordCount:       $('body').text().trim().split(/\s+/).filter(Boolean).length,
    };
    cache.set(cacheKey, result);
    ok(res, result);
  } catch (e) { err(res, 'Failed to fetch page: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR07 - Robots.txt Generator
// ══════════════════════════════════════════════
exports.robotsGenerator = (req, res) => {
  const { agents = [], sitemapUrl = '', crawlDelay = '' } = req.body;
  const lines = [];
  const rules = Array.isArray(agents) ? agents : [{ userAgent: '*', disallow: [], allow: [] }];
  rules.forEach(r => {
    lines.push(`User-agent: ${r.userAgent || '*'}`);
    if (crawlDelay) lines.push(`Crawl-delay: ${crawlDelay}`);
    (r.allow   || []).forEach(p => p && lines.push(`Allow: ${p}`));
    (r.disallow|| []).forEach(p => p && lines.push(`Disallow: ${p}`));
    lines.push('');
  });
  if (sitemapUrl) lines.push(`Sitemap: ${sitemapUrl}`);
  ok(res, { result: lines.join('\n').trim() });
};

// ══════════════════════════════════════════════
// PR08 - XML Sitemap Generator
// ══════════════════════════════════════════════
exports.xmlSitemapGenerator = async (req, res) => {
  const { url, changefreq = 'weekly', priority = '0.8', includeImages = false } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const html = await fetchPage(full);
    const $    = cheerio.load(html);
    const links = new Set([full]);
    const domain = new URL(full).origin;
    $('a[href]').each((_, el) => {
      try {
        const href = new URL($(el).attr('href'), full).href;
        if (href.startsWith(domain)) links.add(href.split('#')[0]);
      } catch {}
    });
    const now = new Date().toISOString().split('T')[0];
    const urls = [...links].slice(0, 500).map(u =>
      `  <url>\n    <loc>${u}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    ).join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    ok(res, { result: xml, count: links.size });
  } catch (e) { err(res, 'Failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR11 - Word Counter
// ══════════════════════════════════════════════
exports.wordCounter = (req, res) => {
  const { text = '' } = req.body;
  const words      = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const sentences  = (text.match(/[.!?]+/g) || []).length;
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean).length;
  const readTime   = Math.ceil(words / 200);
  ok(res, {
    words,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    sentences,
    paragraphs,
    lines: text.split('\n').length,
    readingTime: readTime + ' min',
  });
};

// ══════════════════════════════════════════════
// PR13 - Link Analyzer
// ══════════════════════════════════════════════
exports.linkAnalyzer = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  const cacheKey = 'links_' + full;
  if (cache.has(cacheKey)) return ok(res, cache.get(cacheKey));
  try {
    const html   = await fetchPage(full);
    const $      = cheerio.load(html);
    const domain = new URL(full).hostname;
    const links  = [];
    $('a[href]').each((_, el) => {
      const href   = $(el).attr('href') || '';
      const anchor = $(el).text().trim() || $(el).attr('title') || '';
      const rel    = $(el).attr('rel') || '';
      try {
        const abs  = new URL(href, full).href;
        const host = new URL(abs).hostname;
        links.push({
          url: abs,
          anchor: anchor.slice(0, 80),
          type: host === domain ? 'internal' : 'external',
          nofollow: rel.includes('nofollow'),
          rel,
        });
      } catch {}
    });
    const result = {
      url: full,
      total: links.length,
      internal: links.filter(l => l.type === 'internal').length,
      external: links.filter(l => l.type === 'external').length,
      nofollow: links.filter(l => l.nofollow).length,
      links: links.slice(0, 200),
    };
    cache.set(cacheKey, result);
    ok(res, result);
  } catch (e) { err(res, 'Failed to analyze: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR15 - My IP Address
// ══════════════════════════════════════════════
exports.myIpAddress = async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'Unknown';
  const cleanIp = ip.replace('::ffff:', '');
  try {
    const token = process.env.IPINFO_TOKEN || '';
    const url   = token ? `https://ipinfo.io/${cleanIp}?token=${token}` : `https://ipinfo.io/${cleanIp}/json`;
    const { data } = await axios.get(url, { timeout: 5000 });
    ok(res, { ip: cleanIp, ...data });
  } catch {
    ok(res, { ip: cleanIp });
  }
};

// ══════════════════════════════════════════════
// PR16 - Keyword Density Checker
// ══════════════════════════════════════════════
exports.keywordDensity = async (req, res) => {
  const { url, text } = req.body;
  let content = text || '';
  let pageUrl = url;
  if (!content && url) {
    const full = normaliseUrl(url);
    if (!full) return err(res, 'Invalid URL');
    try {
      const html = await fetchPage(full);
      const $    = cheerio.load(html);
      $('script, style, noscript').remove();
      content = $('body').text();
      pageUrl = full;
    } catch (e) { return err(res, 'Failed to fetch: ' + e.message); }
  }
  if (!content) return err(res, 'Text or URL required');
  const words  = content.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
  const stop   = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were','be','been','being','it','its','as','this','that','these','those','i','we','you','he','she','they','my','our','your','his','her','their','from','have','has','had','do','does','did','will','would','could','should','may','might','can','not','no','so','if','then','than','when','where','who','which','what','how','all','any','each','both','few','more','most','other','some','such','only','own','same','too','very']);
  const filtered = words.filter(w => !stop.has(w));
  const map    = {};
  filtered.forEach(w => { map[w] = (map[w] || 0) + 1; });
  const pairs  = {};
  for (let i = 0; i < filtered.length - 1; i++) {
    const k = filtered[i] + ' ' + filtered[i+1];
    pairs[k] = (pairs[k] || 0) + 1;
  }
  const density1 = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,30).map(([word,count])=>({ word, count, density: ((count/filtered.length)*100).toFixed(2)+'%' }));
  const density2 = Object.entries(pairs).filter(([,c])=>c>1).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([phrase,count])=>({ phrase, count, density: ((count/filtered.length)*100).toFixed(2)+'%' }));
  ok(res, { url: pageUrl, totalWords: words.length, uniqueWords: Object.keys(map).length, density: density1, twoWordPhrases: density2 });
};

// ══════════════════════════════════════════════
// PR18 - Domain Age Checker
// ══════════════════════════════════════════════
exports.domainAgeChecker = async (req, res) => {
  const { domain } = req.body;
  if (!domain) return err(res, 'Domain is required');
  const clean = cleanDomain(domain);
  const cacheKey = 'age_' + clean;
  if (cache.has(cacheKey)) return ok(res, cache.get(cacheKey));
  try {
    // WHOIS via TCP
    const tld    = clean.split('.').pop();
    const servers = { com:'whois.verisign-grs.com', net:'whois.verisign-grs.com', org:'whois.pir.org', io:'whois.nic.io', co:'whois.nic.co', info:'whois.afilias.info', app:'whois.nic.google', dev:'whois.nic.google' };
    const server  = servers[tld] || `whois.nic.${tld}`;
    const raw     = await new Promise((resolve, reject) => {
      const sock = new net.Socket(); let data = '';
      sock.setTimeout(7000);
      sock.connect(43, server, () => sock.write(clean + '\r\n'));
      sock.on('data', c => { data += c.toString(); });
      sock.on('end',  () => resolve(data));
      sock.on('error', reject);
      sock.on('timeout', () => { sock.destroy(); reject(new Error('timeout')); });
    });
    const createdMatch  = raw.match(/Creation Date:\s*([^\r\n]+)/i) || raw.match(/created:\s*([^\r\n]+)/i) || raw.match(/Registered on:\s*([^\r\n]+)/i);
    const expiresMatch  = raw.match(/Expir(y|ation) Date:\s*([^\r\n]+)/i) || raw.match(/expires:\s*([^\r\n]+)/i);
    const updatedMatch  = raw.match(/Updated Date:\s*([^\r\n]+)/i) || raw.match(/last-update:\s*([^\r\n]+)/i);
    const registrarMatch = raw.match(/Registrar:\s*([^\r\n]+)/i);
    let age = null;
    let createdDate = null;
    if (createdMatch) {
      const d = new Date(createdMatch[1].trim());
      if (!isNaN(d)) {
        createdDate = d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
        const diffMs = Date.now() - d.getTime();
        const years  = Math.floor(diffMs / (1000*60*60*24*365));
        const months = Math.floor((diffMs % (1000*60*60*24*365)) / (1000*60*60*24*30));
        age = `${years} year${years!==1?'s':''}, ${months} month${months!==1?'s':''}`;
      }
    }
    const result = {
      domain: clean,
      age,
      created:   createdDate,
      expires:   expiresMatch  ? new Date(expiresMatch[2]?.trim()||expiresMatch[1]?.trim()).toLocaleDateString() : null,
      updated:   updatedMatch  ? new Date(updatedMatch[1].trim()).toLocaleDateString() : null,
      registrar: registrarMatch ? registrarMatch[1].trim() : null,
    };
    cache.set(cacheKey, result, 3600);
    ok(res, result);
  } catch (e) { err(res, 'WHOIS lookup failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR19 - WHOIS Checker
// ══════════════════════════════════════════════
exports.whoisChecker = async (req, res) => {
  const { domain } = req.body;
  if (!domain) return err(res, 'Domain is required');
  const clean = cleanDomain(domain);
  const cacheKey = 'whois_' + clean;
  if (cache.has(cacheKey)) return ok(res, cache.get(cacheKey));
  try {
    const tld    = clean.split('.').pop();
    const servers = { com:'whois.verisign-grs.com', net:'whois.verisign-grs.com', org:'whois.pir.org', io:'whois.nic.io', co:'whois.nic.co', info:'whois.afilias.info', app:'whois.nic.google', dev:'whois.nic.google', uk:'whois.nic.uk', de:'whois.denic.de', fr:'whois.afnic.fr' };
    const server  = servers[tld] || `whois.nic.${tld}`;
    const raw = await new Promise((resolve, reject) => {
      const sock = new net.Socket(); let data = '';
      sock.setTimeout(8000);
      sock.connect(43, server, () => sock.write(clean + '\r\n'));
      sock.on('data', c => { data += c.toString(); });
      sock.on('end',  () => resolve(data));
      sock.on('error', reject);
      sock.on('timeout', () => { sock.destroy(); reject(new Error('WHOIS timeout')); });
    });
    cache.set(cacheKey, { domain: clean, server, raw }, 3600);
    ok(res, { domain: clean, server, raw });
  } catch (e) { err(res, 'WHOIS lookup failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR20 - Domain into IP
// ══════════════════════════════════════════════
exports.domainToIp = async (req, res) => {
  const { domain } = req.body;
  if (!domain) return err(res, 'Domain is required');
  const clean = cleanDomain(domain);
  try {
    const [ipv4, ipv6] = await Promise.allSettled([dns.resolve4(clean), dns.resolve6(clean)]);
    const ips = [
      ...(ipv4.status==='fulfilled' ? ipv4.value : []),
      ...(ipv6.status==='fulfilled' ? ipv6.value : []),
    ];
    if (!ips.length) return err(res, 'Domain not found');
    // Optionally get geo info
    let geo = {};
    try {
      const { data } = await axios.get(`https://ipinfo.io/${ips[0]}/json`, { timeout:4000 });
      geo = { country: data.country, city: data.city, org: data.org };
    } catch {}
    ok(res, { domain: clean, ip: ips[0], allIps: ips, ...geo });
  } catch (e) { err(res, 'DNS resolution failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR22 - URL Rewriting Tool
// ══════════════════════════════════════════════
exports.urlRewritingTool = (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  try {
    const u = new URL(normaliseUrl(url) || url);
    const params  = {};
    u.searchParams.forEach((v,k) => { params[k] = v; });
    // Generate .htaccess RewriteRule
    let htaccess = 'RewriteEngine On\n';
    if (u.search) {
      const keys   = [...u.searchParams.keys()];
      const pattern = keys.map((k,i) => `([^/]+)`).join('/');
      const qs     = keys.map((k,i) => `${k}=$${i+1}`).join('&');
      htaccess += `RewriteRule ^${u.pathname.replace(/^\//, '')}/${pattern}/?$ ${u.pathname}?${qs} [L,QSA]`;
    }
    // Nginx rewrite
    let nginx = `location ${u.pathname} {\n`;
    if (u.search) nginx += `  rewrite ^${u.pathname}/([^/]+)$ ${u.pathname}?id=$1 last;\n`;
    nginx += '}';
    ok(res, { original: url, path: u.pathname, queryString: u.search, params, htaccess, nginx });
  } catch (e) { err(res, 'Invalid URL: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR23 - www Redirect Checker
// ══════════════════════════════════════════════
exports.wwwRedirectChecker = async (req, res) => {
  const { domain } = req.body;
  if (!domain) return err(res, 'Domain is required');
  const clean = cleanDomain(domain);
  const results = [];
  for (const prefix of ['http://www.', 'http://', 'https://www.', 'https://']) {
    try {
      const r = await axios.get(prefix + clean, {
        maxRedirects: 5, timeout: 8000, validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      results.push({
        url: prefix + clean,
        status: r.status,
        finalUrl: r.request?.res?.responseUrl || prefix + clean,
        redirected: (r.request?.res?.responseUrl || prefix + clean) !== prefix + clean,
      });
    } catch (e) {
      results.push({ url: prefix + clean, status: 0, error: e.message });
    }
  }
  ok(res, { domain: clean, results });
};

// ══════════════════════════════════════════════
// PR25 - URL Encoder / Decoder
// ══════════════════════════════════════════════
exports.urlEncoderDecoder = (req, res) => {
  const { text, mode = 'encode' } = req.body;
  if (!text) return err(res, 'Text is required');
  try {
    const result = mode === 'encode' ? encodeURIComponent(text) : decodeURIComponent(text);
    ok(res, { result, mode });
  } catch (e) { err(res, 'Conversion failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR26 - Server Status Checker
// ══════════════════════════════════════════════
exports.serverStatusChecker = async (req, res) => {
  const urls = req.body.urls || (req.body.url ? [req.body.url] : []);
  if (!urls.length) return err(res, 'At least one URL is required');
  const results = await Promise.all(urls.slice(0,20).map(async u => {
    const full = normaliseUrl(u);
    if (!full) return { url: u, status: 'invalid' };
    const start = Date.now();
    try {
      const r = await axios.get(full, { timeout:10000, validateStatus:()=>true, maxRedirects:5 });
      return { url: full, code: r.status, status: r.status < 400 ? 'online' : 'error', responseTime: Date.now()-start };
    } catch (e) {
      return { url: full, code: 0, status: 'offline', error: e.message };
    }
  }));
  ok(res, { results });
};

// ══════════════════════════════════════════════
// PR28 - Page Size Checker
// ══════════════════════════════════════════════
exports.pageSizeChecker = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const start = Date.now();
    const r = await axios.get(full, { timeout:12000, responseType:'arraybuffer', validateStatus:()=>true });
    const size      = Buffer.byteLength(r.data);
    const loadTime  = Date.now() - start;
    const $ = cheerio.load(r.data.toString());
    ok(res, {
      url: full,
      pageSize:     formatBytes(size),
      pageSizeBytes: size,
      loadTime:     loadTime + 'ms',
      contentType:  r.headers['content-type'],
      httpCode:     r.status,
      htmlElements: $('*').length,
      links:        $('a').length,
      images:       $('img').length,
      scripts:      $('script').length,
      stylesheets:  $('link[rel="stylesheet"]').length,
    });
  } catch (e) { err(res, 'Failed: ' + e.message); }
};
function formatBytes(b) {
  if (b < 1024)       return b + ' B';
  if (b < 1048576)    return (b/1024).toFixed(2) + ' KB';
  return (b/1048576).toFixed(2) + ' MB';
}

// ══════════════════════════════════════════════
// PR35 - Get Source Code of Webpage
// ══════════════════════════════════════════════
exports.getSourceCode = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const r = await axios.get(full, { timeout:12000, validateStatus:()=>true, headers:{ 'User-Agent':'Mozilla/5.0' } });
    ok(res, { url: full, source: r.data, contentType: r.headers['content-type'], code: r.status });
  } catch (e) { err(res, 'Failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR37 - Website Links Count Checker
// ══════════════════════════════════════════════
exports.websiteLinksCount = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  const cacheKey = 'linkcnt_' + full;
  if (cache.has(cacheKey)) return ok(res, cache.get(cacheKey));
  try {
    const html   = await fetchPage(full);
    const $      = cheerio.load(html);
    const domain = new URL(full).hostname;
    let internal = 0, external = 0, nofollow = 0;
    $('a[href]').each((_, el) => {
      try {
        const abs  = new URL($(el).attr('href'), full).href;
        const host = new URL(abs).hostname;
        if (host === domain) internal++; else external++;
        if (($(el).attr('rel')||'').includes('nofollow')) nofollow++;
      } catch {}
    });
    const result = { url: full, total: internal+external, internal, external, nofollow };
    cache.set(cacheKey, result);
    ok(res, result);
  } catch (e) { err(res, 'Failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR39 - MD5 Generator
// ══════════════════════════════════════════════
exports.md5Generator = (req, res) => {
  const { text } = req.body;
  if (!text) return err(res, 'Text is required');
  ok(res, { result: crypto.createHash('md5').update(text).digest('hex'), algorithm: 'MD5' });
};

// ══════════════════════════════════════════════
// PR41 - Code to Text Ratio Checker
// ══════════════════════════════════════════════
exports.codeToTextRatio = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const html = await fetchPage(full);
    const codeSize = html.length;
    const $ = cheerio.load(html);
    $('script, style, noscript, iframe, head').remove();
    const text     = $('body').text().replace(/\s+/g,' ').trim();
    const textSize = text.length;
    const ratio    = ((textSize / codeSize) * 100).toFixed(2);
    ok(res, {
      url: full,
      codeSize: formatBytes(codeSize),
      textSize: formatBytes(textSize),
      ratio: ratio + '%',
      assessment: ratio < 10 ? 'Poor' : ratio < 25 ? 'Fair' : 'Good',
      wordCount: text.split(/\s+/).filter(Boolean).length,
    });
  } catch (e) { err(res, 'Failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR42 - Find DNS Records
// ══════════════════════════════════════════════
exports.findDnsRecords = async (req, res) => {
  const { domain } = req.body;
  if (!domain) return err(res, 'Domain is required');
  const clean = cleanDomain(domain);
  const cacheKey = 'dns_' + clean;
  if (cache.has(cacheKey)) return ok(res, cache.get(cacheKey));
  const records = {};
  const types = ['A','AAAA','MX','TXT','NS','CNAME','SOA','CAA'];
  await Promise.all(types.map(async t => {
    try {
      switch(t) {
        case 'A':    records.A    = await dns.resolve4(clean);  break;
        case 'AAAA': records.AAAA = await dns.resolve6(clean);  break;
        case 'MX':   records.MX   = await dns.resolveMx(clean); break;
        case 'TXT':  records.TXT  = await dns.resolveTxt(clean);break;
        case 'NS':   records.NS   = await dns.resolveNs(clean); break;
        case 'CNAME':records.CNAME= await dns.resolveCname(clean); break;
        case 'SOA':  records.SOA  = await dns.resolveSoa(clean);break;
        case 'CAA':  records.CAA  = await dns.resolveCaa(clean);break;
      }
    } catch {}
  }));
  const result = { domain: clean, records };
  cache.set(cacheKey, result);
  ok(res, result);
};

// ══════════════════════════════════════════════
// PR43 - What is my Browser
// ══════════════════════════════════════════════
exports.whatIsMyBrowser = (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const accept   = req.headers['accept'] || '';
  const lang     = req.headers['accept-language'] || '';
  const encoding = req.headers['accept-encoding'] || '';
  const ip       = (req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.socket.remoteAddress || '';
  // Parse browser
  let browser = 'Unknown', version = '';
  const browsers = [
    ['Edg/',   'Microsoft Edge'], ['OPR/',  'Opera'],
    ['Chrome/', 'Chrome'], ['Firefox/', 'Firefox'],
    ['Safari/', 'Safari'], ['MSIE ',   'IE'], ['Trident/','IE'],
  ];
  for (const [token, name] of browsers) {
    if (ua.includes(token)) {
      browser = name;
      const m = ua.match(new RegExp(token.replace('/','') + '([\\d.]+)'));
      if (m) version = m[1];
      break;
    }
  }
  // Parse OS
  let os = 'Unknown';
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Mac OS X'))  os = 'macOS';
  else if (ua.includes('Android'))   os = 'Android';
  else if (ua.includes('iPhone'))    os = 'iOS (iPhone)';
  else if (ua.includes('iPad'))      os = 'iOS (iPad)';
  else if (ua.includes('Linux'))     os = 'Linux';
  const mobile = /mobile|android|iphone|ipad/i.test(ua);
  ok(res, { browser, version, os, mobile, ip: ip.replace('::ffff:',''), ua, accept, language: lang, encoding });
};

// ══════════════════════════════════════════════
// PR45 - Google Cache Checker
// ══════════════════════════════════════════════
exports.googleCacheChecker = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${full}`;
    const r = await axios.get(cacheUrl, { timeout:8000, validateStatus:()=>true, headers:{ 'User-Agent':'Mozilla/5.0' } });
    ok(res, { url: full, cacheUrl, cached: r.status === 200, statusCode: r.status });
  } catch (e) {
    ok(res, { url: full, cached: false, error: e.message });
  }
};

// ══════════════════════════════════════════════
// PR46 - Broken Links Finder
// ══════════════════════════════════════════════
exports.brokenLinksFinder = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const html  = await fetchPage(full);
    const $     = cheerio.load(html);
    const hrefs = [];
    $('a[href]').each((_, el) => {
      try {
        const abs = new URL($(el).attr('href'), full).href;
        if (abs.startsWith('http')) hrefs.push({ url: abs, anchor: $(el).text().trim().slice(0,60) });
      } catch {}
    });
    // Check up to 30 links
    const checks = await Promise.all(hrefs.slice(0,30).map(async link => {
      try {
        const r = await axios.head(link.url, { timeout:6000, validateStatus:()=>true, maxRedirects:3 });
        return { ...link, status: r.status, broken: r.status >= 400 || r.status === 0 };
      } catch {
        return { ...link, status: 0, broken: true };
      }
    }));
    const broken = checks.filter(c => c.broken);
    ok(res, { url: full, checked: checks.length, totalLinks: hrefs.length, brokenCount: broken.length, broken, all: checks });
  } catch (e) { err(res, 'Failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR47 - Search Engine Spider Simulator
// ══════════════════════════════════════════════
exports.spiderSimulator = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const r = await axios.get(full, { timeout:10000, validateStatus:()=>true, headers:{ 'User-Agent':'Googlebot/2.1 (+http://www.google.com/bot.html)' } });
    const $ = cheerio.load(r.data);
    // Extract everything a spider would see
    const headings = { h1:[], h2:[], h3:[] };
    $('h1').each((_,el) => headings.h1.push($(el).text().trim()));
    $('h2').each((_,el) => headings.h2.push($(el).text().trim()));
    $('h3').each((_,el) => headings.h3.push($(el).text().trim()));
    const links = [];
    $('a[href]').each((_,el) => {
      try { links.push({ href: new URL($(el).attr('href'), full).href, text: $(el).text().trim().slice(0,60) }); } catch {}
    });
    const images = [];
    $('img').each((_,el) => { images.push({ src: $(el).attr('src')||'', alt: $(el).attr('alt')||'', missing: !$(el).attr('alt') }); });
    $('script,style').remove();
    ok(res, {
      url: full,
      statusCode:  r.status,
      title:       $('title').text(),
      description: $('meta[name="description"]').attr('content')||'',
      canonical:   $('link[rel="canonical"]').attr('href')||'',
      robots:      $('meta[name="robots"]').attr('content')||'',
      headings,
      links: links.slice(0,100),
      images: images.slice(0,50),
      bodyText: $('body').text().replace(/\s+/g,' ').trim().slice(0,2000),
      wordCount: $('body').text().trim().split(/\s+/).filter(Boolean).length,
    });
  } catch (e) { err(res, 'Failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// PR48 - Keywords Suggestion Tool
// ══════════════════════════════════════════════
exports.keywordsSuggestion = async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return err(res, 'Keyword is required');
  try {
    // Use Google Suggest API
    const { data } = await axios.get(`https://suggestqueries.google.com/complete/search`, {
      params: { client:'firefox', q: keyword },
      timeout: 6000,
    });
    const suggestions = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
    // Generate more from prefixes
    const prefixes = ['best', 'top', 'how to', 'what is', 'why', 'free', 'cheap', 'buy'];
    const extras   = prefixes.map(p => `${p} ${keyword}`);
    ok(res, { keyword, suggestions: [...new Set([...suggestions, ...extras])].slice(0,30) });
  } catch (e) {
    // Fallback
    const modifiers = ['free','best','top','cheap','online','near me','how to','what is','vs','alternative','tool','software','service','review','tutorial','example','template','guide','tips','tricks'];
    ok(res, { keyword, suggestions: modifiers.map(m => `${keyword} ${m}`).concat(modifiers.map(m => `${m} ${keyword}`)).slice(0,30) });
  }
};

// ══════════════════════════════════════════════
// SD51 - PageSpeed Insights Checker
// ══════════════════════════════════════════════
exports.pagespeedInsights = async (req, res) => {
  const { url, strategy = 'mobile' } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  const apiKey = process.env.PAGESPEED_API_KEY || '';
  try {
    const params = { url: full, strategy };
    if (apiKey) params.key = apiKey;
    const { data } = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', { params, timeout: 30000 });
    const cats  = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits || {};
    ok(res, {
      url: full,
      strategy,
      scores: {
        performance:  Math.round((cats.performance?.score||0)*100),
        seo:          Math.round((cats.seo?.score||0)*100),
        accessibility:Math.round((cats.accessibility?.score||0)*100),
        bestPractices:Math.round((cats['best-practices']?.score||0)*100),
      },
      metrics: {
        fcp:  audits['first-contentful-paint']?.displayValue,
        lcp:  audits['largest-contentful-paint']?.displayValue,
        cls:  audits['cumulative-layout-shift']?.displayValue,
        tbt:  audits['total-blocking-time']?.displayValue,
        tti:  audits['interactive']?.displayValue,
        si:   audits['speed-index']?.displayValue,
      },
      opportunities: Object.values(audits).filter(a=>a.details?.type==='opportunity'&&a.score<1).map(a=>({ id:a.id, title:a.title, description:a.description, savings:a.details?.overallSavingsMs })).slice(0,10),
    });
  } catch (e) { err(res, 'PageSpeed API failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// SSL Checker
// ══════════════════════════════════════════════
exports.sslChecker = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  const { hostname } = new URL(full);
  try {
    const cert = await new Promise((resolve, reject) => {
      const sock = tls.connect({ host: hostname, port: 443, servername: hostname, rejectUnauthorized: false }, () => {
        resolve(sock.getPeerCertificate(true));
        sock.end();
      });
      sock.on('error', reject);
      sock.setTimeout(8000, () => { sock.destroy(); reject(new Error('Timeout')); });
    });
    if (!cert?.subject) return err(res, 'Could not retrieve certificate');
    const validTo   = new Date(cert.valid_to);
    const daysLeft  = Math.floor((validTo - Date.now()) / 86400000);
    ok(res, { host: hostname, valid: daysLeft>0, daysLeft, subject: cert.subject, issuer: cert.issuer, validFrom: cert.valid_from, validTo: cert.valid_to, fingerprint: cert.fingerprint });
  } catch (e) { err(res, 'SSL check failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// HTTP Headers Checker
// ══════════════════════════════════════════════
exports.httpHeadersChecker = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const r = await axios.head(full, { timeout:8000, validateStatus:()=>true, maxRedirects:5 });
    ok(res, { url: full, code: r.status, headers: r.headers });
  } catch (e) { err(res, 'Request failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// Redirect Checker
// ══════════════════════════════════════════════
exports.redirectChecker = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  const chain = [];
  let current = full;
  try {
    for (let i = 0; i < 10; i++) {
      const r = await axios.get(current, { maxRedirects:0, validateStatus:()=>true, timeout:6000 });
      chain.push({ url: current, code: r.status, type: r.status>=300&&r.status<400 ? 'Redirect' : 'Final' });
      if (r.status>=300 && r.status<400 && r.headers.location) {
        current = r.headers.location.startsWith('http') ? r.headers.location : new URL(r.headers.location, current).href;
      } else break;
    }
    ok(res, { original: full, final: current, redirectCount: chain.length-1, chain });
  } catch (e) { err(res, 'Failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// Robots.txt Checker
// ══════════════════════════════════════════════
exports.robotsTxtChecker = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const u = new URL(full);
    const robotsUrl = `${u.protocol}//${u.hostname}/robots.txt`;
    const r = await axios.get(robotsUrl, { timeout:8000, validateStatus:()=>true });
    const exists = r.status === 200;
    let sitemaps = [];
    if (exists) sitemaps = (r.data.match(/Sitemap:\s*(.+)/gi)||[]).map(l=>l.replace(/Sitemap:\s*/i,'').trim());
    ok(res, { url: full, robotsUrl, exists, content: exists ? r.data : null, sitemaps });
  } catch (e) { err(res, 'Failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// Google Index Checker
// ══════════════════════════════════════════════
exports.googleIndexChecker = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const googleUrl = `https://www.google.com/search?q=site:${encodeURIComponent(full)}`;
    const r = await axios.get(googleUrl, { timeout:8000, validateStatus:()=>true, headers:{ 'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
    const $ = cheerio.load(r.data);
    const resultStats = $('#result-stats').text() || $('[class*="result-stats"]').text();
    const indexed = !r.data.includes('did not match any documents') && r.status === 200;
    const countMatch = resultStats.match(/[\d,]+/);
    ok(res, { url: full, indexed, resultStats, estimatedCount: countMatch ? parseInt(countMatch[0].replace(/,/g,'')) : null });
  } catch (e) { err(res, 'Failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// Domain Hosting Checker
// ══════════════════════════════════════════════
exports.domainHostingChecker = async (req, res) => {
  const { domain } = req.body;
  if (!domain) return err(res, 'Domain is required');
  const clean = cleanDomain(domain);
  try {
    const [ipRes, nsRes] = await Promise.allSettled([dns.resolve4(clean), dns.resolveNs(clean)]);
    const ip  = ipRes.status==='fulfilled'  ? ipRes.value[0]  : null;
    const ns  = nsRes.status==='fulfilled'  ? nsRes.value     : [];
    let hostInfo = {};
    if (ip) {
      try {
        const { data } = await axios.get(`https://ipinfo.io/${ip}/json`, { timeout:5000 });
        hostInfo = { isp: data.org, city: data.city, country: data.country, region: data.region };
      } catch {}
    }
    ok(res, { domain: clean, ip, nameservers: ns, ...hostInfo });
  } catch (e) { err(res, 'Failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// Safe Browsing Check (Google)
// ══════════════════════════════════════════════
exports.safeBrowsingCheck = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  const apiKey = process.env.SAFE_BROWSING_API_KEY || '';
  if (!apiKey) {
    // Fallback: basic heuristic check
    const suspicious = /phishing|malware|virus|hack|crack|warez|torrent|free-download/i.test(full);
    return ok(res, { url: full, safe: !suspicious, note: 'Heuristic check only. Add SAFE_BROWSING_KEY for Google Safe Browsing API.' });
  }
  try {
    const { data } = await axios.post(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
      client: { clientId:'atozseo', clientVersion:'1.0' },
      threatInfo: {
        threatTypes: ['MALWARE','SOCIAL_ENGINEERING','UNWANTED_SOFTWARE','POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url: full }],
      },
    });
    const threats = data.matches || [];
    ok(res, { url: full, safe: threats.length === 0, threats });
  } catch (e) { err(res, 'Safe Browsing check failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// Ping Tool
// ══════════════════════════════════════════════
exports.pingTool = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  const times = [];
  for (let i = 0; i < 4; i++) {
    const start = Date.now();
    try {
      await axios.head(full, { timeout:5000, validateStatus:()=>true });
      times.push(Date.now() - start);
    } catch { times.push(null); }
  }
  const valid = times.filter(t=>t!==null);
  ok(res, {
    url: full,
    pings: times.map((t,i)=>({ seq:i+1, time: t!==null?t+'ms':'timeout', success:t!==null })),
    min:  valid.length ? Math.min(...valid)+'ms' : null,
    max:  valid.length ? Math.max(...valid)+'ms' : null,
    avg:  valid.length ? Math.round(valid.reduce((a,b)=>a+b,0)/valid.length)+'ms' : null,
    loss: ((times.filter(t=>t===null).length/4)*100)+'%',
  });
};

// ══════════════════════════════════════════════
// Email Privacy Checker
// ══════════════════════════════════════════════
exports.emailPrivacyChecker = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const html   = await fetchPage(full);
    const emails = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
    const unique = [...new Set(emails)];
    ok(res, { url: full, emailsFound: unique.length, emails: unique, exposed: unique.length > 0, recommendation: unique.length > 0 ? 'Consider obfuscating email addresses to prevent spam' : 'No exposed email addresses found' });
  } catch (e) { err(res, 'Failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// Class C IP Checker
// ══════════════════════════════════════════════
exports.classCIpChecker = async (req, res) => {
  const domains = req.body.domains || (req.body.domain ? [req.body.domain] : []);
  if (!domains.length) return err(res, 'At least one domain is required');
  const results = await Promise.all(domains.slice(0,20).map(async d => {
    const clean = cleanDomain(d);
    try {
      const ips = await dns.resolve4(clean);
      const ip  = ips[0];
      const parts = ip.split('.');
      return { domain: clean, ip, classC: parts.slice(0,3).join('.') + '.x' };
    } catch { return { domain: clean, ip: null, error: 'Could not resolve' }; }
  }));
  // Group by Class C
  const grouped = {};
  results.filter(r=>r.classC).forEach(r => {
    if (!grouped[r.classC]) grouped[r.classC] = [];
    grouped[r.classC].push(r);
  });
  ok(res, { results, grouped });
};

// ══════════════════════════════════════════════
// Suspicious Domain Checker
// ══════════════════════════════════════════════
exports.suspiciousDomainChecker = async (req, res) => {
  const { domain } = req.body;
  if (!domain) return err(res, 'Domain is required');
  const clean = cleanDomain(domain);
  const flags = [];
  // Heuristic checks
  if (clean.length > 50) flags.push('Unusually long domain name');
  if ((clean.match(/-/g)||[]).length > 4) flags.push('Many hyphens in domain');
  if (/\d{4,}/.test(clean)) flags.push('Many consecutive digits');
  if (/paypal|amazon|google|apple|microsoft|facebook|instagram|netflix/i.test(clean) && !['paypal.com','amazon.com','google.com','apple.com','microsoft.com','facebook.com','instagram.com','netflix.com'].includes(clean))
    flags.push('Contains well-known brand name (possible typosquat)');
  const tld = clean.split('.').pop();
  if (['tk','ml','ga','cf','gq','xyz','top','click','loan','men','work','date','review'].includes(tld))
    flags.push(`TLD ".${tld}" commonly used in suspicious domains`);
  try {
    const raw = await new Promise((resolve, reject) => {
      const sock = new net.Socket(); let data = '';
      sock.setTimeout(5000);
      sock.connect(43, 'whois.verisign-grs.com', () => sock.write(clean + '\r\n'));
      sock.on('data', c => { data += c.toString(); });
      sock.on('end',  () => resolve(data));
      sock.on('error', () => resolve(''));
      sock.on('timeout', () => { sock.destroy(); resolve(''); });
    });
    if (raw.toLowerCase().includes('no match') || raw.toLowerCase().includes('not found')) {
      flags.push('Domain not registered');
    }
    const created = raw.match(/Creation Date:\s*([^\r\n]+)/i);
    if (created) {
      const age = (Date.now() - new Date(created[1].trim())) / (1000*60*60*24*365);
      if (age < 1) flags.push('Domain registered less than 1 year ago');
    }
  } catch {}
  ok(res, { domain: clean, suspicious: flags.length > 0, riskLevel: flags.length === 0 ? 'Low' : flags.length < 3 ? 'Medium' : 'High', flags });
};

// ══════════════════════════════════════════════
// Backlink Maker
// ══════════════════════════════════════════════
exports.backlinkMaker = (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const clean = cleanDomain(url);
  const directories = [
    { name:'DMOZ', url:`http://www.dmoz.org/search/search?q=${clean}` },
    { name:'Google Search', url:`https://www.google.com/search?q=site:${clean}` },
    { name:'Bing Search', url:`https://www.bing.com/search?q=site:${clean}` },
    { name:'Yahoo Search', url:`https://search.yahoo.com/search?p=site:${clean}` },
    { name:'W3C Validator', url:`https://validator.w3.org/check?uri=${encodeURIComponent('https://'+clean)}` },
    { name:'Alexa Rank', url:`https://www.alexa.com/siteinfo/${clean}` },
    { name:'SEMrush', url:`https://www.semrush.com/analytics/overview/?q=${clean}` },
    { name:'Ahrefs', url:`https://ahrefs.com/site-explorer/overview/v2/subdomains/live?target=${clean}` },
    { name:'Moz DA Checker', url:`https://moz.com/domain-analysis?site=${clean}` },
    { name:'Majestic', url:`https://majestic.com/reports/site-explorer?q=${clean}` },
    { name:'SimilarWeb', url:`https://www.similarweb.com/website/${clean}` },
    { name:'Whois', url:`https://who.is/whois/${clean}` },
    { name:'DNS Checker', url:`https://dnschecker.org/#A/${clean}` },
  ];
  ok(res, { url: 'https://'+clean, directories });
};

// ══════════════════════════════════════════════
// Open Graph Checker
// ══════════════════════════════════════════════
exports.openGraphChecker = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const html = await fetchPage(full);
    const $    = cheerio.load(html);
    const og   = {};
    $('meta[property^="og:"], meta[name^="twitter:"]').each((_,el) => {
      const key = $(el).attr('property') || $(el).attr('name');
      og[key]   = $(el).attr('content');
    });
    const required = ['og:title','og:description','og:image','og:url','og:type'];
    const missing  = required.filter(r => !og[r]);
    ok(res, { url: full, tags: og, missing, complete: missing.length === 0 });
  } catch (e) { err(res, 'Failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// Sitemap Finder
// ══════════════════════════════════════════════
exports.sitemapFinder = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  const u = new URL(full);
  const candidates = [
    `${u.protocol}//${u.hostname}/sitemap.xml`,
    `${u.protocol}//${u.hostname}/sitemap_index.xml`,
    `${u.protocol}//${u.hostname}/sitemap-index.xml`,
    `${u.protocol}//${u.hostname}/sitemaps/sitemap.xml`,
    `${u.protocol}//${u.hostname}/sitemap1.xml`,
  ];
  const found = [];
  await Promise.all(candidates.map(async c => {
    try {
      const r = await axios.head(c, { timeout:5000, validateStatus:()=>true });
      if (r.status === 200) found.push(c);
    } catch {}
  }));
  // Also check robots.txt
  try {
    const r = await axios.get(`${u.protocol}//${u.hostname}/robots.txt`, { timeout:5000, validateStatus:()=>true });
    const sms = (r.data.match(/Sitemap:\s*(.+)/gi)||[]).map(l=>l.replace(/Sitemap:\s*/i,'').trim());
    sms.forEach(s => { if (!found.includes(s)) found.push(s); });
  } catch {}
  ok(res, { url: full, sitemaps: found, found: found.length > 0 });
};

// ══════════════════════════════════════════════
// Keyword Position Checker
// ══════════════════════════════════════════════
exports.keywordPositionChecker = async (req, res) => {
  const { domain, keyword } = req.body;
  if (!domain || !keyword) return err(res, 'Domain and keyword are required');
  const clean = cleanDomain(domain);
  try {
    const { data } = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(keyword)}&num=100`, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36' },
    });
    const $ = cheerio.load(data);
    let position = null;
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href') || '';
      if (!position && href.includes(clean)) position = i + 1;
    });
    ok(res, { domain: clean, keyword, position, found: position !== null, note: position ? `Found at approximately position ${position}` : 'Not found in top 100 results' });
  } catch (e) { err(res, 'Search failed: ' + e.message); }
};

// ══════════════════════════════════════════════
// Composite Site Audit — combines several free, self-contained checks
// (used by the /seo/audit page; no paid APIs)
// ══════════════════════════════════════════════
exports.siteAudit = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');

  const cacheKey = 'audit_' + full;
  if (cache.has(cacheKey)) return ok(res, cache.get(cacheKey));

  const checks = {};
  const issues = [];
  const start = Date.now();

  try {
    const html = await fetchPage(full);
    const loadMs = Date.now() - start;
    const $ = cheerio.load(html);

    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    const h1Count = $('h1').length;
    const imgNoAlt = $('img:not([alt])').length + $('img[alt=""]').length;
    const wordCount = $('body').text().trim().split(/\s+/).filter(Boolean).length;
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    const viewport = $('meta[name="viewport"]').attr('content') || '';

    checks.title = { value: title, ok: title.length > 0 && title.length <= 60 };
    if (!checks.title.ok) issues.push(title ? 'Title tag is missing or longer than 60 characters' : 'Title tag is missing');

    checks.description = { value: description, ok: description.length > 0 && description.length <= 160 };
    if (!checks.description.ok) issues.push(description ? 'Meta description is longer than 160 characters' : 'Meta description is missing');

    checks.h1 = { count: h1Count, ok: h1Count === 1 };
    if (!checks.h1.ok) issues.push(h1Count === 0 ? 'No H1 tag found' : `Found ${h1Count} H1 tags (should be exactly 1)`);

    checks.images = { missingAlt: imgNoAlt, ok: imgNoAlt === 0 };
    if (!checks.images.ok) issues.push(`${imgNoAlt} image(s) missing alt text`);

    checks.canonical = { value: canonical, ok: !!canonical };
    if (!checks.canonical.ok) issues.push('No canonical URL set');

    checks.viewport = { value: viewport, ok: !!viewport };
    if (!checks.viewport.ok) issues.push('No responsive viewport meta tag');

    checks.wordCount = { count: wordCount, ok: wordCount >= 300 };
    if (!checks.wordCount.ok) issues.push('Page content is thin (under 300 words)');

    checks.https = { value: full.startsWith('https://'), ok: full.startsWith('https://') };
    if (!checks.https.ok) issues.push('Not served over HTTPS');

    checks.speed = { loadMs, ok: loadMs < 2000 };
    if (!checks.speed.ok) issues.push(`Page took ${loadMs}ms to load (aim for under 2000ms)`);

    // robots.txt + sitemap.xml presence (best-effort, don't fail the whole audit)
    const origin = new URL(full).origin;
    const [robotsRes, sitemapRes] = await Promise.allSettled([
      axios.get(`${origin}/robots.txt`, { timeout: 6000, validateStatus: () => true }),
      axios.get(`${origin}/sitemap.xml`, { timeout: 6000, validateStatus: () => true }),
    ]);
    checks.robotsTxt = { ok: robotsRes.status === 'fulfilled' && robotsRes.value.status === 200 };
    if (!checks.robotsTxt.ok) issues.push('robots.txt not found');
    checks.sitemapXml = { ok: sitemapRes.status === 'fulfilled' && sitemapRes.value.status === 200 };
    if (!checks.sitemapXml.ok) issues.push('sitemap.xml not found');

    const totalChecks = Object.keys(checks).length;
    const passed = Object.values(checks).filter(c => c.ok).length;
    const score = Math.round((passed / totalChecks) * 100);

    const result = { url: full, score, passed, totalChecks, checks, issues };
    cache.set(cacheKey, result);
    ok(res, result);
  } catch (e) {
    err(res, 'Failed to audit page: ' + e.message);
  }
};

// ══════════════════════════════════════════════
// Simple keyword suggestions wrapper (reuses PR48 logic under a shorter path)
// ══════════════════════════════════════════════
exports.keywordsQuick = async (req, res) => exports.keywordsSuggestion(req, res);

// ══════════════════════════════════════════════
// Backlinks — lightweight, free check: verifies whether known directory-style
// pages link back to the given domain. Not a full backlink index (that
// requires a paid crawler dataset); returns what can be checked for free.
// ══════════════════════════════════════════════
exports.backlinksQuick = async (req, res) => {
  const { url } = req.body;
  if (!url) return err(res, 'URL is required');
  const domain = cleanDomain(url);
  ok(res, {
    domain,
    note: 'Full backlink indexing requires a paid third-party crawler dataset, which this deployment does not use. Use the Broken Backlinks / Link Analyzer tools for page-level link checks instead.',
    suggestions: ['broken-links-finder', 'link-analyzer-tool', 'website-links-count-checker'],
  });
};
