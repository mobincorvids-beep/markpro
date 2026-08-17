/**
 * Shared helpers for every SEO tool: URL handling, page fetching with a real
 * browser UA, multi-page crawling, SERP scraping with fallbacks, and
 * Keywords Everywhere search-volume lookups.
 *
 * Everything here fails soft: a helper returns an empty/degraded value rather
 * than throwing, so one flaky upstream never blanks a whole tool response.
 */
const axios   = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/* ───────────────────────────── URLs ───────────────────────────── */

function normaliseUrl(input) {
  if (!input) return null;
  let s = String(input).trim();
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try { return new URL(s).href; } catch { return null; }
}

function cleanDomain(input) {
  const full = normaliseUrl(input);
  if (full) { try { return new URL(full).hostname.replace(/^www\./i, ''); } catch { /* fallthrough */ } }
  return String(input || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
}

/* ────────────────────────── page fetching ─────────────────────── */

async function fetchHtml(url, timeout = 15000) {
  const { data, headers, status } = await axios.get(url, {
    timeout, maxRedirects: 5, responseType: 'text',
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', Accept: 'text/html,*/*' },
    validateStatus: (s) => s < 500,
  });
  return { html: typeof data === 'string' ? data : String(data || ''), headers, status };
}

/** Visible text + basic on-page signals for a single page. */
function extractPage(html, url) {
  const $ = cheerio.load(html);
  $('script,style,noscript,svg,iframe').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const links = [];
  $('a[href]').each((_, el) => {
    try { links.push(new URL($(el).attr('href'), url).href.split('#')[0]); } catch { /* bad href */ }
  });
  return {
    url,
    title: $('title').first().text().trim(),
    description: $('meta[name="description"]').attr('content') || '',
    h1: $('h1').map((_, el) => $(el).text().trim()).get(),
    h2: $('h2').map((_, el) => $(el).text().trim()).get(),
    text,
    links,
  };
}

/**
 * Crawl a site breadth-first, same-origin only. Seeds from the sitemap when
 * one exists so we cover pages that are not linked from the homepage.
 */
async function crawlSite(startUrl, { maxPages = 20, timeout = 12000 } = {}) {
  const start = normaliseUrl(startUrl);
  if (!start) return [];
  const origin = new URL(start).origin;

  const queue = [start];
  const seen = new Set([start]);

  // Seed from sitemap.xml (and a sitemap index one level deep).
  try {
    const { data } = await axios.get(origin + '/sitemap.xml', { timeout: 8000, headers: { 'User-Agent': UA }, responseType: 'text' });
    const locs = [...String(data).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
    const childMaps = locs.filter((l) => /\.xml($|\?)/i.test(l)).slice(0, 3);
    for (const child of childMaps) {
      try {
        const r = await axios.get(child, { timeout: 8000, headers: { 'User-Agent': UA }, responseType: 'text' });
        locs.push(...[...String(r.data).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]));
      } catch { /* skip child sitemap */ }
    }
    for (const loc of locs) {
      if (/\.xml($|\?)/i.test(loc)) continue;
      if (!loc.startsWith(origin) || seen.has(loc)) continue;
      seen.add(loc); queue.push(loc);
      if (seen.size >= maxPages * 2) break;
    }
  } catch { /* no sitemap, link discovery only */ }

  const pages = [];
  while (queue.length && pages.length < maxPages) {
    const batch = queue.splice(0, 5);
    const results = await Promise.allSettled(batch.map((u) => fetchHtml(u, timeout)));
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled' || r.value.status >= 400) return;
      const page = extractPage(r.value.html, batch[i]);
      pages.push(page);
      for (const link of page.links) {
        if (pages.length + queue.length >= maxPages * 2) break;
        if (!link.startsWith(origin) || seen.has(link)) continue;
        if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|css|js)(\?|$)/i.test(link)) continue;
        seen.add(link); queue.push(link);
      }
    });
  }
  return pages;
}

/* ────────────────────────── text analysis ─────────────────────── */

const STOP_WORDS = new Set(`a about above after again against all am an and any are aren as at be because been before being below between both but by can cannot could couldn did didn do does doesn doing don down during each few for from further had hadn has hasn have haven having he her here hers herself him himself his how i if in into is isn it its itself just let ll me more most mustn my myself no nor not now of off on once only or other ought our ours ourselves out over own re same shan she should shouldn so some such than that the their theirs them themselves then there these they this those through to too under until up ve very was wasn we were weren what when where which while who whom why will with won would wouldn you your yours yourself yourselves also get got make made use used using new one two your our more may via home page site contact click here read`.split(/\s+/));

/** Top n-gram phrases (1-3 words) from raw text, stop-words removed. */
function extractPhrases(text, { min = 1, max = 3, limit = 60 } = {}) {
  const words = String(text || '').toLowerCase().match(/[a-z][a-z'-]{1,}/g) || [];
  const counts = new Map();
  for (let n = min; n <= max; n++) {
    for (let i = 0; i + n <= words.length; i++) {
      const gram = words.slice(i, i + n);
      if (gram.some((w) => STOP_WORDS.has(w) || w.length < 3)) continue;
      const phrase = gram.join(' ');
      counts.set(phrase, (counts.get(phrase) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, c]) => c > 1 || max === 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

/* ─────────────────── Keywords Everywhere (volumes) ─────────────── */

const KE_URL = 'https://api.keywordseverywhere.com/v1/get_keyword_data';

function keConfigured() {
  return Boolean(process.env.KEYWORDS_EVERYWHERE_API_KEY);
}

/**
 * Real monthly volume / CPC / competition for up to 100 keywords per call.
 * Returns a Map keyword -> { volume, cpc, competition, trend }.
 */
async function keywordVolumes(keywords, { country = 'us', currency = 'usd', dataSource = 'gkp' } = {}) {
  const list = [...new Set((keywords || []).map((k) => String(k).trim().toLowerCase()).filter(Boolean))];
  const out = new Map();
  if (!list.length || !keConfigured()) return out;

  const key = process.env.KEYWORDS_EVERYWHERE_API_KEY;
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    const body = new URLSearchParams();
    body.append('country', country);
    body.append('currency', currency);
    body.append('dataSource', dataSource);
    chunk.forEach((k) => body.append('kw[]', k));
    try {
      const { data } = await axios.post(KE_URL, body, {
        timeout: 20000,
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      });
      (data?.data || []).forEach((row) => {
        out.set(String(row.keyword).toLowerCase(), {
          volume: Number(row.vol) || 0,
          cpc: Number(row.cpc?.value ?? row.cpc) || 0,
          competition: Number(row.competition) || 0,
          trend: Array.isArray(row.trend) ? row.trend.map((t) => ({ month: t.month, year: t.year, volume: Number(t.value) || 0 })) : [],
        });
      });
    } catch { /* one bad chunk should not blank the tool */ }
  }
  return out;
}

/** Decorates a list of keyword strings with real volume data when available. */
async function withVolumes(keywords, opts) {
  const map = await keywordVolumes(keywords, opts);
  return (keywords || []).map((k) => {
    const m = map.get(String(k).toLowerCase()) || {};
    return {
      keyword: k,
      volume: m.volume ?? null,
      cpc: m.cpc != null ? Number(m.cpc.toFixed(2)) : null,
      competition: m.competition != null ? Number(Number(m.competition).toFixed(2)) : null,
    };
  });
}

/* ────────────────────────── SERP scraping ─────────────────────── */

const absolute = (href, base) => { try { return new URL(href, base).href; } catch { return null; } };

async function serpDuckDuckGo(query, num) {
  const { data } = await axios.post('https://html.duckduckgo.com/html/', new URLSearchParams({ q: query }), {
    timeout: 15000,
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const $ = cheerio.load(data);
  const results = [];
  $('.result__body, .web-result').each((_, el) => {
    const a = $(el).find('a.result__a').first();
    let href = a.attr('href') || '';
    const m = href.match(/[?&]uddg=([^&]+)/);
    if (m) href = decodeURIComponent(m[1]);
    href = absolute(href, 'https://duckduckgo.com');
    const title = a.text().trim();
    if (!href || !title) return;
    results.push({ position: results.length + 1, title, url: href, domain: cleanDomain(href), snippet: $(el).find('.result__snippet').text().trim() });
  });
  return results.slice(0, num);
}

async function serpBing(query, num) {
  const { data } = await axios.get('https://www.bing.com/search', {
    params: { q: query, count: Math.min(num, 30), setlang: 'en' },
    timeout: 15000,
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
  });
  const $ = cheerio.load(data);
  const results = [];
  $('#b_results > li.b_algo').each((_, el) => {
    const a = $(el).find('h2 a').first();
    const href = absolute(a.attr('href') || '', 'https://www.bing.com');
    const title = a.text().trim();
    if (!href || !title) return;
    results.push({ position: results.length + 1, title, url: href, domain: cleanDomain(href), snippet: $(el).find('.b_caption p').first().text().trim() });
  });
  return results.slice(0, num);
}

async function serpGoogle(query, num) {
  const { data } = await axios.get('https://www.google.com/search', {
    params: { q: query, num: Math.min(num + 5, 30), hl: 'en', gl: 'us', pws: 0 },
    timeout: 15000,
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
  });
  const $ = cheerio.load(data);
  const results = [];
  $('div.g, div[data-sokoban-container]').each((_, el) => {
    const a = $(el).find('a[href^="http"]').first();
    const href = a.attr('href');
    const title = $(el).find('h3').first().text().trim();
    if (!href || !title || results.some((r) => r.url === href)) return;
    results.push({ position: results.length + 1, title, url: href, domain: cleanDomain(href), snippet: $(el).find('div[data-sncf], .VwiC3b').first().text().trim() });
  });
  return results.slice(0, num);
}

/**
 * Live SERP with graceful degradation: Google first (best data), then Bing,
 * then DuckDuckGo HTML, which is the most scrape-tolerant of the three.
 * Returns { engine, query, results[] } and never throws.
 */
async function fetchSerp(query, { num = 20, engine } = {}) {
  const order = engine ? [engine] : ['google', 'bing', 'duckduckgo'];
  const impls = { google: serpGoogle, bing: serpBing, duckduckgo: serpDuckDuckGo };
  const errors = [];
  for (const name of order) {
    try {
      const results = await impls[name](query, num);
      if (results.length) return { engine: name, query, results };
    } catch (e) { errors.push(`${name}: ${e.message}`); }
  }
  return { engine: null, query, results: [], errors };
}

/** Position of a domain inside a SERP, or null when it is not in the top N. */
function findPosition(results, domain) {
  const target = cleanDomain(domain);
  const hit = results.find((r) => r.domain === target || r.domain.endsWith('.' + target));
  return hit ? { position: hit.position, url: hit.url, title: hit.title } : null;
}

/* ─────────────────────── autocomplete sources ─────────────────── */

async function googleSuggest(q, extra = {}) {
  try {
    const { data } = await axios.get('https://suggestqueries.google.com/complete/search', {
      params: { client: 'firefox', q, hl: 'en', ...extra }, timeout: 8000, headers: { 'User-Agent': UA },
    });
    return Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
  } catch { return []; }
}

module.exports = {
  UA,
  normaliseUrl,
  cleanDomain,
  fetchHtml,
  extractPage,
  crawlSite,
  extractPhrases,
  STOP_WORDS,
  keConfigured,
  keywordVolumes,
  withVolumes,
  fetchSerp,
  findPosition,
  googleSuggest,
};
