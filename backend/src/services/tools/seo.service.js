/**
 * Tool registry used by the Rank module (/api/rank/tools/:tool).
 *
 * Every entry is an async function that takes the request body and resolves to
 * a plain result object. Controllers only need `runTool(slug, input)`; the
 * `TOOLS` map is exported so the controller can 404 unknown slugs.
 */
const axios   = require('axios');
const cheerio = require('cheerio');
const dns     = require('dns').promises;
const tls     = require('tls');
const net     = require('net');

const {
  normaliseUrl, cleanDomain, fetchHtml, extractPage, fetchSerp, findPosition, googleSuggest, withVolumes,
} = require('../seo/seoCore');

const requireUrl = (input) => {
  const full = normaliseUrl(input?.url || input?.domain || input?.query);
  if (!full) throw new Error('A valid URL is required');
  return full;
};

/**
 * Human-readable metadata for each seoAudit check, used to turn the raw
 * checks{} object into the issues[]/summary{} shape the Reports UI (and the
 * runReport controller, which already looks for results.issues/summary)
 * expect. Without this, real computed check results never reached the
 * screen — the report showed a score but an empty issue list and blank
 * Passed/Warning/Critical counts, which read as "showing false data" even
 * though every check itself was genuinely computed from the live page.
 * `severity` here is what a FAILED check becomes; passed checks always
 * render as 'passed' regardless of this map.
 */
const CHECK_META = {
  httpsEnabled:    { title: 'HTTPS enabled',            category: 'Security',    severity: 'critical', recommendation: 'Serve the site over HTTPS with a valid SSL certificate.' },
  titleTag:        { title: 'Title tag length',         category: 'On-page',     severity: 'critical', recommendation: 'Keep the title tag between 20 and 65 characters.' },
  metaDescription: { title: 'Meta description length',  category: 'On-page',     severity: 'warning',  recommendation: 'Write a meta description between 70 and 165 characters.' },
  singleH1:        { title: 'Single H1 tag',             category: 'On-page',     severity: 'warning',  recommendation: 'Use exactly one H1 tag per page.' },
  headingStructure:{ title: 'Heading structure',          category: 'On-page',     severity: 'warning',  recommendation: 'Add H2 subheadings to structure the content.' },
  imageAltText:    { title: 'Image alt text',             category: 'Accessibility', severity: 'warning', recommendation: 'Add descriptive alt text to every image.' },
  canonicalTag:    { title: 'Canonical tag',              category: 'Technical',   severity: 'warning',  recommendation: 'Add a <link rel="canonical"> tag to avoid duplicate-content issues.' },
  viewportMeta:    { title: 'Mobile viewport tag',        category: 'Mobile',      severity: 'critical', recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' },
  openGraph:       { title: 'Open Graph tags',            category: 'Social',      severity: 'info',     recommendation: 'Add og:title, og:description, and og:image tags for better social sharing.' },
  structuredData:  { title: 'Structured data (JSON-LD)',  category: 'Technical',   severity: 'info',     recommendation: 'Add JSON-LD structured data to help search engines understand the page.' },
  contentLength:   { title: 'Content length',             category: 'On-page',     severity: 'warning',  recommendation: 'Aim for at least 300 words of unique content.' },
  compression:     { title: 'Compression enabled',        category: 'Performance', severity: 'warning',  recommendation: 'Enable gzip or brotli compression on the server.' },
  statusOk:        { title: 'Page returns a 2xx status',  category: 'Technical',   severity: 'critical', recommendation: 'Fix the server so the page returns a successful HTTP status.' },
};

/** Turns a seoAudit() checks{} object into issues[] + summary{} for the UI. */
function buildIssuesAndSummary(checks) {
  const issues = Object.entries(checks).map(([key, check]) => {
    const meta = CHECK_META[key] || { title: key, category: 'General', severity: 'warning', recommendation: '' };
    return {
      key,
      severity: check.ok ? 'passed' : meta.severity,
      title: meta.title,
      description: String(check.value),
      recommendation: check.ok ? '' : meta.recommendation,
      category: meta.category,
      value: check.value,
    };
  });
  const summary = {
    passed:   issues.filter((i) => i.severity === 'passed').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    failed:   issues.filter((i) => i.severity === 'critical').length,
  };
  return { issues, summary };
}

/* ─────────────────────────── individual tools ─────────────────── */

async function seoAudit(input) {
  const url = requireUrl(input);
  const { html, headers, status } = await fetchHtml(url);
  const $ = cheerio.load(html);
  const page = extractPage(html, url);

  const title = page.title;
  const description = page.description;
  const images = $('img');
  const imagesNoAlt = $('img:not([alt]), img[alt=""]').length;
  const wordCount = page.text.split(/\s+/).filter(Boolean).length;

  const checks = {
    httpsEnabled:      { ok: url.startsWith('https://'), value: url.startsWith('https://') ? 'HTTPS' : 'HTTP only' },
    titleTag:          { ok: title.length >= 20 && title.length <= 65, value: title ? `${title} (${title.length} chars)` : 'Missing' },
    metaDescription:   { ok: description.length >= 70 && description.length <= 165, value: description ? `${description.length} chars` : 'Missing' },
    singleH1:          { ok: page.h1.length === 1, value: `${page.h1.length} H1 tag(s)` },
    headingStructure:  { ok: page.h2.length > 0, value: `${page.h2.length} H2 tag(s)` },
    imageAltText:      { ok: imagesNoAlt === 0, value: `${imagesNoAlt} of ${images.length} images missing alt` },
    canonicalTag:      { ok: Boolean($('link[rel="canonical"]').attr('href')), value: $('link[rel="canonical"]').attr('href') || 'Missing' },
    viewportMeta:      { ok: /width=device-width/.test($('meta[name="viewport"]').attr('content') || ''), value: $('meta[name="viewport"]').attr('content') || 'Missing' },
    openGraph:         { ok: Boolean($('meta[property="og:title"]').attr('content')), value: $('meta[property^="og:"]').length + ' OG tags' },
    structuredData:    { ok: $('script[type="application/ld+json"]').length > 0, value: `${$('script[type="application/ld+json"]').length} JSON-LD block(s)` },
    contentLength:     { ok: wordCount >= 300, value: `${wordCount} words` },
    compression:       { ok: /gzip|br|deflate/i.test(headers['content-encoding'] || ''), value: headers['content-encoding'] || 'none' },
    statusOk:          { ok: status >= 200 && status < 300, value: `HTTP ${status}` },
  };

  const entries = Object.values(checks);
  const passed = entries.filter((c) => c.ok).length;
  const { issues, summary } = buildIssuesAndSummary(checks);

  return {
    url,
    score: Math.round((passed / entries.length) * 100),
    passed,
    totalChecks: entries.length,
    checks,
    issues,
    summary,
    title,
    description,
    h1: page.h1,
    wordCount,
    internalLinks: page.links.filter((l) => l.startsWith(new URL(url).origin)).length,
    externalLinks: page.links.filter((l) => !l.startsWith(new URL(url).origin)).length,
  };
}

async function metaTags(input) {
  const url = requireUrl(input);
  const { html } = await fetchHtml(url);
  const $ = cheerio.load(html);
  const grab = (sel, attr) => { const v = $(sel).attr(attr || 'content'); return v || ''; };
  const openGraph = {};
  $('meta[property^="og:"]').each((_, el) => { openGraph[$(el).attr('property')] = $(el).attr('content'); });
  const twitter = {};
  $('meta[name^="twitter:"]').each((_, el) => { twitter[$(el).attr('name')] = $(el).attr('content'); });
  return {
    url,
    title: $('title').first().text().trim(),
    description: grab('meta[name="description"]'),
    keywords: grab('meta[name="keywords"]'),
    robots: grab('meta[name="robots"]'),
    canonical: grab('link[rel="canonical"]', 'href'),
    language: $('html').attr('lang') || '',
    charset: $('meta[charset]').attr('charset') || '',
    viewport: grab('meta[name="viewport"]'),
    openGraph,
    twitter,
  };
}

async function pageSpeed(input) {
  const url = requireUrl(input);
  const strategy = input?.strategy === 'desktop' ? 'desktop' : 'mobile';
  const params = { url, strategy, category: ['performance', 'seo', 'accessibility', 'best-practices'] };
  if (process.env.PAGESPEED_API_KEY) params.key = process.env.PAGESPEED_API_KEY;
  const { data } = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', {
    params, timeout: 60000,
    paramsSerializer: (p) => Object.entries(p).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => `${k}=${encodeURIComponent(x)}`) : [`${k}=${encodeURIComponent(v)}`])).join('&'),
  });
  const cats = data.lighthouseResult?.categories || {};
  const audits = data.lighthouseResult?.audits || {};
  return {
    url, strategy,
    scores: {
      performance: Math.round((cats.performance?.score || 0) * 100),
      seo: Math.round((cats.seo?.score || 0) * 100),
      accessibility: Math.round((cats.accessibility?.score || 0) * 100),
      bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
    },
    metrics: {
      lcp: audits['largest-contentful-paint']?.displayValue,
      fcp: audits['first-contentful-paint']?.displayValue,
      cls: audits['cumulative-layout-shift']?.displayValue,
      tbt: audits['total-blocking-time']?.displayValue,
      si: audits['speed-index']?.displayValue,
      tti: audits.interactive?.displayValue,
    },
  };
}

async function keywordDensity(input) {
  const url = requireUrl(input);
  const { html } = await fetchHtml(url);
  const page = extractPage(html, url);
  const words = page.text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
  const freq = new Map();
  words.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
    .map(([keyword, count]) => ({ keyword, count, density: `${((count / words.length) * 100).toFixed(2)}%` }));
  const target = input?.keyword ? String(input.keyword).toLowerCase() : null;
  return {
    url, totalWords: words.length, keywords: top,
    targetKeyword: target ? { keyword: target, count: freq.get(target) || 0, density: `${(((freq.get(target) || 0) / words.length) * 100).toFixed(2)}%` } : undefined,
  };
}

async function brokenLinks(input) {
  const url = requireUrl(input);
  const { html } = await fetchHtml(url);
  const page = extractPage(html, url);
  const unique = [...new Set(page.links)].slice(0, 60);
  const checked = await Promise.all(unique.map(async (link) => {
    try {
      const r = await axios.head(link, { timeout: 8000, maxRedirects: 4, validateStatus: () => true });
      const status = r.status === 405 ? (await axios.get(link, { timeout: 8000, validateStatus: () => true })).status : r.status;
      return { url: link, status, ok: status < 400 };
    } catch (e) { return { url: link, status: 0, ok: false, error: e.code || e.message }; }
  }));
  return { url, totalChecked: checked.length, broken: checked.filter((c) => !c.ok), workingCount: checked.filter((c) => c.ok).length };
}

async function sslCheck(input) {
  const host = cleanDomain(input?.url || input?.domain);
  const cert = await new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 10000, rejectUnauthorized: false }, () => {
      const c = socket.getPeerCertificate();
      resolve({ cert: c, authorized: socket.authorized, protocol: socket.getProtocol() });
      socket.end();
    });
    socket.on('error', reject);
    socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timed out')); });
  });
  const validTo = new Date(cert.cert.valid_to);
  return {
    host,
    valid: cert.authorized && validTo > new Date(),
    daysLeft: Math.floor((validTo - Date.now()) / 86400000),
    protocol: cert.protocol,
    issuer: cert.cert.issuer,
    subject: cert.cert.subject,
    validFrom: cert.cert.valid_from,
    validTo: cert.cert.valid_to,
    altNames: cert.cert.subjectaltname,
  };
}

async function dnsLookup(input) {
  const domain = cleanDomain(input?.domain || input?.url);
  const records = {};
  const jobs = [
    ['A', () => dns.resolve4(domain)], ['AAAA', () => dns.resolve6(domain)],
    ['MX', () => dns.resolveMx(domain)], ['TXT', () => dns.resolveTxt(domain)],
    ['NS', () => dns.resolveNs(domain)], ['CNAME', () => dns.resolveCname(domain)],
    ['SOA', () => dns.resolveSoa(domain)], ['CAA', () => dns.resolveCaa(domain)],
  ];
  await Promise.all(jobs.map(async ([type, fn]) => { try { records[type] = await fn(); } catch { /* record type absent */ } }));
  return { domain, records };
}

async function whois(input) {
  const domain = cleanDomain(input?.domain || input?.url);
  const tld = domain.split('.').pop();
  const servers = { com: 'whois.verisign-grs.com', net: 'whois.verisign-grs.com', org: 'whois.pir.org', io: 'whois.nic.io', co: 'whois.nic.co', pk: 'whois.pknic.net.pk' };
  const server = servers[tld] || `whois.nic.${tld}`;
  const raw = await new Promise((resolve, reject) => {
    const sock = new net.Socket(); let buf = '';
    sock.setTimeout(10000);
    sock.connect(43, server, () => sock.write(domain + '\r\n'));
    sock.on('data', (c) => { buf += c.toString(); });
    sock.on('end', () => resolve(buf));
    sock.on('error', reject);
    sock.on('timeout', () => { sock.destroy(); reject(new Error('WHOIS timeout')); });
  });
  const field = (re) => { const m = raw.match(re); return m ? m[1].trim() : ''; };
  return {
    domain, whoisServer: server,
    registrar: field(/Registrar:\s*([^\r\n]+)/i),
    createdDate: field(/(?:Creation Date|Created On|Domain Registration Date):\s*([^\r\n]+)/i),
    expiryDate: field(/(?:Registry Expiry Date|Expiration Date|Expiry Date):\s*([^\r\n]+)/i),
    updatedDate: field(/Updated Date:\s*([^\r\n]+)/i),
    nameServers: [...raw.matchAll(/Name Server:\s*([^\r\n]+)/gi)].map((m) => m[1].trim()),
    status: [...raw.matchAll(/Domain Status:\s*([^\r\n]+)/gi)].map((m) => m[1].trim()),
    raw,
  };
}

async function sitemapCheck(input) {
  const url = requireUrl(input);
  const origin = new URL(url).origin;
  const candidates = [origin + '/sitemap.xml', origin + '/sitemap_index.xml', origin + '/sitemap-index.xml'];
  for (const candidate of candidates) {
    try {
      const { data, status } = await axios.get(candidate, { timeout: 12000, validateStatus: () => true, responseType: 'text' });
      if (status >= 400) continue;
      const locs = [...String(data).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
      return { found: true, sitemapUrl: candidate, urlCount: locs.length, isIndex: /<sitemapindex/i.test(String(data)), urls: locs.slice(0, 100) };
    } catch { /* try the next candidate */ }
  }
  return { found: false, checked: candidates, message: 'No sitemap found at the standard locations.' };
}

async function robotsCheck(input) {
  const url = requireUrl(input);
  const robotsUrl = new URL(url).origin + '/robots.txt';
  const { data, status } = await axios.get(robotsUrl, { timeout: 10000, validateStatus: () => true, responseType: 'text' });
  if (status >= 400) return { found: false, robotsUrl, status, message: 'No robots.txt served at this domain.' };
  const content = String(data);
  return {
    found: true, robotsUrl, status,
    blocksEverything: /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*(\n|$)/i.test(content),
    sitemaps: [...content.matchAll(/Sitemap:\s*(\S+)/gi)].map((m) => m[1]),
    disallowRules: [...content.matchAll(/Disallow:\s*(\S*)/gi)].map((m) => m[1]).filter(Boolean),
    allowRules: [...content.matchAll(/Allow:\s*(\S*)/gi)].map((m) => m[1]).filter(Boolean),
    content,
  };
}

async function redirectCheck(input) {
  let current = requireUrl(input);
  const chain = [];
  for (let i = 0; i < 10; i++) {
    const r = await axios.get(current, { timeout: 10000, maxRedirects: 0, validateStatus: () => true });
    chain.push({ step: i + 1, url: current, status: r.status });
    const next = r.headers.location;
    if (!next || r.status < 300 || r.status >= 400) break;
    current = new URL(next, current).href;
  }
  return { start: chain[0]?.url, finalUrl: current, hops: chain.length - 1, chain };
}

async function socialPreview(input) {
  const url = requireUrl(input);
  const { html } = await fetchHtml(url);
  const $ = cheerio.load(html);
  const m = (sel, attr = 'content') => $(sel).attr(attr) || '';
  return {
    url,
    openGraph: {
      title: m('meta[property="og:title"]') || $('title').text().trim(),
      description: m('meta[property="og:description"]') || m('meta[name="description"]'),
      image: m('meta[property="og:image"]'),
      siteName: m('meta[property="og:site_name"]'),
      type: m('meta[property="og:type"]'),
    },
    twitter: {
      card: m('meta[name="twitter:card"]'),
      title: m('meta[name="twitter:title"]'),
      description: m('meta[name="twitter:description"]'),
      image: m('meta[name="twitter:image"]'),
    },
  };
}

async function ipLookup(input) {
  const raw = String(input?.url || input?.domain || '').trim();
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(raw);
  const ip = isIp ? raw : (await dns.resolve4(cleanDomain(raw)))[0];
  const { data } = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 8000 });
  return { query: raw, ip, city: data.city, region: data.region, country: data.country_name, org: data.org, asn: data.asn, timezone: data.timezone, latitude: data.latitude, longitude: data.longitude };
}

async function readability(input) {
  let text = input?.text;
  if (!text || /^https?:\/\//i.test(String(text).trim()) || input?.url) {
    const url = requireUrl(input);
    const { html } = await fetchHtml(url);
    text = extractPage(html, url).text;
  }
  const sentences = Math.max(1, (String(text).match(/[.!?]+(\s|$)/g) || []).length);
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);
  const syllables = words.reduce((sum, w) => {
    const clean = w.toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return sum;
    const groups = clean.replace(/e$/, '').match(/[aeiouy]+/g);
    return sum + Math.max(1, groups ? groups.length : 1);
  }, 0);
  const flesch = 206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syllables / wordCount);
  const score = Math.round(Math.max(0, Math.min(100, flesch)));
  const grade = score >= 90 ? 'Very Easy (5th grade)' : score >= 70 ? 'Easy (7th grade)'
    : score >= 60 ? 'Standard (8-9th grade)' : score >= 50 ? 'Fairly Difficult (High School)'
    : score >= 30 ? 'Difficult (College)' : 'Very Difficult (College Graduate)';
  return { score, grade, sentences, words: wordCount, syllables, avgWordsPerSentence: Math.round((wordCount / sentences) * 10) / 10 };
}

async function rankCheck(input) {
  const keyword = String(input?.keyword || input?.query || '').trim();
  const domain = cleanDomain(input?.domain || input?.url);
  if (!keyword || !domain) throw new Error('Both a keyword and a domain are required');
  const serp = await fetchSerp(keyword, { num: 30 });
  const hit = findPosition(serp.results, domain);
  const [volume] = await withVolumes([keyword], { country: process.env.KEYWORDS_EVERYWHERE_COUNTRY || 'us' });
  return {
    keyword, domain, engine: serp.engine,
    position: hit?.position ?? null,
    rankingUrl: hit?.url ?? null,
    found: Boolean(hit),
    searchVolume: volume?.volume ?? null,
    cpc: volume?.cpc ?? null,
    topResults: serp.results.slice(0, 10),
  };
}

async function keywordIdeas(input) {
  const keyword = String(input?.keyword || input?.query || '').trim();
  if (!keyword) throw new Error('A seed keyword is required');
  const alphabet = 'abcdefghijklmnopqrst'.split('');
  const batches = await Promise.all([
    googleSuggest(keyword),
    ...alphabet.slice(0, 10).map((l) => googleSuggest(`${keyword} ${l}`)),
    ...['how', 'why', 'what', 'best', 'cheap'].map((p) => googleSuggest(`${p} ${keyword}`)),
  ]);
  const ideas = [...new Set(batches.flat())].slice(0, 80);
  const rows = await withVolumes(ideas, { country: process.env.KEYWORDS_EVERYWHERE_COUNTRY || 'us' });
  rows.sort((a, b) => (b.volume || 0) - (a.volume || 0));
  return { seed: keyword, count: rows.length, keywords: rows };
}

/* ─────────────────────────── registry ─────────────────────────── */

const TOOLS = {
  seo_audit: seoAudit,
  meta_tags: metaTags,
  page_speed: pageSpeed,
  keyword_density: keywordDensity,
  keyword_ideas: keywordIdeas,
  broken_links: brokenLinks,
  ssl_check: sslCheck,
  dns_lookup: dnsLookup,
  whois,
  sitemap: sitemapCheck,
  robots_txt: robotsCheck,
  redirect_check: redirectCheck,
  social_preview: socialPreview,
  ip_lookup: ipLookup,
  readability,
  rank_check: rankCheck,
};

async function runTool(slug, input = {}) {
  const fn = TOOLS[slug];
  if (!fn) throw new Error(`Unknown tool: ${slug}`);
  const started = Date.now();
  const results = await fn(input);
  return { results, duration: Date.now() - started };
}

module.exports = {
  TOOLS,
  runTool,
  // Kept for older callers that imported these directly.
  runAudit: (url) => seoAudit({ url }),
  rankKeyword: (keyword, url) => rankCheck({ keyword, domain: url }),
};
