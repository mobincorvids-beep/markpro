/**
 * A-to-Z SEO Tools — Part 2
 *
 * Every tool here returns real, measured data:
 *   - keyword metrics come from the Keywords Everywhere API (real monthly
 *     volume, CPC, competition) whenever KEYWORDS_EVERYWHERE_API_KEY is set;
 *   - SERP data comes from live scraping with Google -> Bing -> DuckDuckGo
 *     fallback, so a block on one engine does not blank the tool;
 *   - page data comes from real fetches and multi-page crawls.
 *
 * Shared plumbing lives in services/seo/seoCore.js.
 */
const axios   = require('axios');
const cheerio = require('cheerio');
const dns     = require('dns').promises;
const net     = require('net');
const gemini  = require('../../services/gemini.service');

const {
  normaliseUrl, cleanDomain, fetchHtml, extractPage, crawlSite, extractPhrases,
  keConfigured, keywordVolumes, withVolumes, fetchSerp, findPosition, googleSuggest,
} = require('../../services/seo/seoCore');

const ok  = (res, data)       => res.json({ success: true, ...data });
const err = (res, msg, s = 400) => res.status(s).json({ success: false, message: msg });

const KE_COUNTRY  = () => process.env.KEYWORDS_EVERYWHERE_COUNTRY  || 'us';
const KE_CURRENCY = () => process.env.KEYWORDS_EVERYWHERE_CURRENCY || 'usd';
const keOpts = () => ({ country: KE_COUNTRY(), currency: KE_CURRENCY() });

const fetchPage = async (url) => (await fetchHtml(url)).html;

/** Body value that may arrive under several field names (the hub posts all). */
function pick(body, ...keys) {
  for (const k of keys) {
    const v = body?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
}

/** Resolve a "URL or keyword" input into page text when it looks like a URL. */
async function resolveText(body) {
  const raw = pick(body, 'text', 'content', 'url', 'query');
  if (!raw) return { text: '', source: null };
  const looksLikeUrl = /^https?:\/\//i.test(raw) || (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(raw) && !raw.includes(' '));
  if (!looksLikeUrl) return { text: raw, source: null };
  const full = normaliseUrl(raw);
  const { html } = await fetchHtml(full);
  const page = extractPage(html, full);
  return { text: page.text, source: full, page };
}

// ════════════════════════════════════════════════════════════
// KEYWORD RESEARCH GROUP
// ════════════════════════════════════════════════════════════

// Keyword Difficulty — real volume/competition from Keywords Everywhere,
// blended with live SERP composition (how many strong domains hold the top 10).
exports.keywordDifficulty = async (req, res) => {
  const keyword = pick(req.body, 'keyword', 'query', 'text');
  if (!keyword) return err(res, 'Keyword is required');
  try {
    const [serp, volumes] = await Promise.all([
      fetchSerp(keyword, { num: 10 }),
      keywordVolumes([keyword], keOpts()),
    ]);
    const metrics = volumes.get(keyword.toLowerCase()) || {};
    const bigBrands = /wikipedia|amazon|youtube|facebook|linkedin|reddit|forbes|nytimes|gov|edu|yelp|tripadvisor/i;
    const strongResults = serp.results.filter((r) => bigBrands.test(r.domain)).length;
    const words = keyword.split(/\s+/).length;

    let score = 30;
    if (metrics.competition != null) score += metrics.competition * 30;
    if (metrics.volume) score += Math.min(Math.log10(metrics.volume + 1) * 8, 25);
    score += strongResults * 3;
    score += words <= 2 ? 10 : words >= 5 ? -12 : 0;
    score = Math.round(Math.max(1, Math.min(100, score)));

    ok(res, {
      keyword,
      difficulty: score,
      label: score < 30 ? 'Easy' : score < 55 ? 'Medium' : score < 75 ? 'Hard' : 'Very Hard',
      searchVolume: metrics.volume ?? null,
      cpc: metrics.cpc ?? null,
      paidCompetition: metrics.competition ?? null,
      engine: serp.engine,
      authorityDomainsInTop10: strongResults,
      wordCount: words,
      topResults: serp.results.slice(0, 10),
      dataSource: keConfigured() ? 'Keywords Everywhere + live SERP' : 'Live SERP only (add KEYWORDS_EVERYWHERE_API_KEY for volume data)',
    });
  } catch (e) { err(res, 'Difficulty check failed: ' + e.message); }
};

// Long-tail Keywords — autocomplete expansion with real volumes attached.
exports.longTailKeywords = async (req, res) => {
  const keyword = pick(req.body, 'keyword', 'query', 'text');
  if (!keyword) return err(res, 'Keyword is required');
  const prefixes = ['how to', 'what is', 'why does', 'when to', 'where to', 'best way to', 'can you', 'should i'];
  const suffixes = ['for beginners', 'vs', 'near me', 'step by step', 'cost', 'checklist', 'examples', 'services'];
  const seeds = [...prefixes.map((p) => `${p} ${keyword}`), ...suffixes.map((s) => `${keyword} ${s}`)];
  const batches = await Promise.all(seeds.map((s) => googleSuggest(s)));
  const phrases = [...new Set([...batches.flat(), ...seeds])].filter((s) => s.split(' ').length >= 3).slice(0, 80);
  const rows = (await withVolumes(phrases, keOpts())).sort((a, b) => (b.volume || 0) - (a.volume || 0));
  ok(res, { keyword, count: rows.length, longTailKeywords: rows });
};

// Related Keywords — autocomplete alphabet soup + real volumes.
exports.relatedKeywords = async (req, res) => {
  const keyword = pick(req.body, 'keyword', 'query', 'text');
  if (!keyword) return err(res, 'Keyword is required');
  const letters = 'abcdefghijklmnopqrst'.split('');
  const batches = await Promise.all([googleSuggest(keyword), ...letters.map((l) => googleSuggest(`${keyword} ${l}`))]);
  const list = [...new Set(batches.flat())].filter((s) => s.toLowerCase() !== keyword.toLowerCase()).slice(0, 90);
  const rows = (await withVolumes(list, keOpts())).sort((a, b) => (b.volume || 0) - (a.volume || 0));
  ok(res, { keyword, count: rows.length, related: rows });
};

// LSI Keywords — co-occurring phrases mined from the pages actually ranking.
exports.lsiKeywords = async (req, res) => {
  const keyword = pick(req.body, 'keyword', 'query', 'text');
  if (!keyword) return err(res, 'Keyword is required');
  try {
    const serp = await fetchSerp(keyword, { num: 8 });
    const pages = await Promise.allSettled(serp.results.slice(0, 5).map(async (r) => {
      const { html } = await fetchHtml(r.url, 10000);
      return extractPage(html, r.url).text;
    }));
    const corpus = pages.filter((p) => p.status === 'fulfilled').map((p) => p.value).join(' ');
    const phrases = extractPhrases(corpus, { min: 1, max: 3, limit: 40 })
      .filter((p) => p.phrase !== keyword.toLowerCase());
    const rows = await withVolumes(phrases.slice(0, 40).map((p) => p.phrase), keOpts());
    const merged = rows.map((r, i) => ({ ...r, occurrences: phrases[i].count }));
    ok(res, {
      keyword, engine: serp.engine,
      pagesAnalysed: pages.filter((p) => p.status === 'fulfilled').length,
      lsiKeywords: merged,
    });
  } catch (e) { err(res, 'LSI extraction failed: ' + e.message); }
};

/**
 * Keyword Gap — crawls BOTH sites properly (sitemap + link discovery, up to
 * 25 pages each), extracts 1-3 word phrases from every page, then reports the
 * phrases the competitor covers that you do not, ranked by real monthly search
 * volume from Keywords Everywhere.
 */
exports.keywordGap = async (req, res) => {
  const domain1 = pick(req.body, 'domain1', 'domain', 'url');
  const domain2 = pick(req.body, 'domain2', 'competitorDomain', 'competitor');
  if (!domain1 || !domain2) return err(res, 'Both your domain and a competitor domain are required');

  const maxPages = Math.min(Number(req.body.maxPages) || 25, 50);

  try {
    const [pages1, pages2] = await Promise.all([
      crawlSite(domain1, { maxPages }),
      crawlSite(domain2, { maxPages }),
    ]);
    if (!pages1.length && !pages2.length) return err(res, 'Neither site could be crawled — check the domains are reachable.');

    const corpusOf = (pages) => pages.map((p) => [p.title, p.description, p.h1.join(' '), p.h2.join(' '), p.text].join(' ')).join(' ');
    const mine = new Map(extractPhrases(corpusOf(pages1), { min: 1, max: 3, limit: 400 }).map((p) => [p.phrase, p.count]));
    const theirs = new Map(extractPhrases(corpusOf(pages2), { min: 2, max: 3, limit: 400 }).map((p) => [p.phrase, p.count]));

    const gapCandidates = [...theirs.entries()].filter(([phrase]) => !mine.has(phrase)).slice(0, 100).map(([phrase, count]) => ({ phrase, count }));
    const sharedCandidates = [...theirs.entries()].filter(([phrase]) => mine.has(phrase)).slice(0, 60).map(([phrase, count]) => ({ phrase, theirCount: count, yourCount: mine.get(phrase) }));
    const yoursOnly = [...mine.entries()].filter(([phrase]) => !theirs.has(phrase) && phrase.includes(' ')).slice(0, 60).map(([phrase, count]) => ({ phrase, count }));

    const volumeMap = await keywordVolumes([...gapCandidates.map((g) => g.phrase), ...yoursOnly.map((y) => y.phrase)], keOpts());
    const decorate = (rows, countKey = 'count') => rows.map((r) => {
      const m = volumeMap.get(r.phrase) || {};
      return {
        keyword: r.phrase,
        volume: m.volume ?? null,
        cpc: m.cpc != null ? Number(m.cpc.toFixed(2)) : null,
        competition: m.competition != null ? Number(m.competition.toFixed(2)) : null,
        mentions: r[countKey] ?? r.count ?? null,
      };
    }).sort((a, b) => (b.volume || 0) - (a.volume || 0) || (b.mentions || 0) - (a.mentions || 0));

    const gapKeywords = decorate(gapCandidates);

    ok(res, {
      yourDomain: cleanDomain(domain1),
      competitorDomain: cleanDomain(domain2),
      yourPagesCrawled: pages1.length,
      competitorPagesCrawled: pages2.length,
      opportunityCount: gapKeywords.length,
      totalGapVolume: gapKeywords.reduce((s, k) => s + (k.volume || 0), 0),
      gapKeywords,
      yourUniqueKeywords: decorate(yoursOnly),
      sharedKeywords: sharedCandidates.slice(0, 40),
      yourPages: pages1.map((p) => ({ url: p.url, title: p.title })),
      competitorPages: pages2.map((p) => ({ url: p.url, title: p.title })),
      dataSource: keConfigured() ? 'Full-site crawl + Keywords Everywhere volumes' : 'Full-site crawl (volumes need KEYWORDS_EVERYWHERE_API_KEY)',
    });
  } catch (e) { err(res, 'Keyword gap analysis failed: ' + e.message); }
};

// Keywords Everywhere — real volume, CPC, competition and 12-month trend.
exports.keywordsEverywhere = async (req, res) => {
  const raw = pick(req.body, 'keyword', 'keywords', 'query', 'text');
  if (!raw) return err(res, 'Enter one keyword, or several separated by commas or new lines');
  if (!keConfigured()) return err(res, 'Keywords Everywhere is not configured — set KEYWORDS_EVERYWHERE_API_KEY.', 503);

  const seeds = raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
  try {
    // Expand a single seed with autocomplete so the tool is useful from one input.
    let list = seeds;
    if (seeds.length === 1) {
      const suggestions = await googleSuggest(seeds[0]);
      list = [...new Set([seeds[0], ...suggestions])].slice(0, 60);
    }
    const map = await keywordVolumes(list, keOpts());
    if (!map.size) return err(res, 'Keywords Everywhere returned no data — the API key may be out of credits.', 502);

    const rows = list.map((k) => {
      const m = map.get(k.toLowerCase());
      return m ? { keyword: k, volume: m.volume, cpc: Number(m.cpc.toFixed(2)), competition: Number(m.competition.toFixed(2)) } : null;
    }).filter(Boolean).sort((a, b) => b.volume - a.volume);

    const trend = map.get(seeds[0].toLowerCase())?.trend || [];
    ok(res, {
      seed: seeds[0],
      country: KE_COUNTRY().toUpperCase(),
      currency: KE_CURRENCY().toUpperCase(),
      totalVolume: rows.reduce((s, r) => s + r.volume, 0),
      keywords: rows,
      monthlyTrend: trend,
    });
  } catch (e) { err(res, 'Keywords Everywhere lookup failed: ' + e.message); }
};

exports.youtubeKeywords = async (req, res) => {
  const keyword = pick(req.body, 'keyword', 'query', 'text');
  if (!keyword) return err(res, 'Keyword is required');
  const base = await googleSuggest(keyword, { ds: 'yt' });
  const letters = 'abcdefghij'.split('');
  const more = await Promise.all(letters.map((l) => googleSuggest(`${keyword} ${l}`, { ds: 'yt' })));
  const list = [...new Set([...base, ...more.flat()])].slice(0, 60);
  const rows = (await withVolumes(list, keOpts())).sort((a, b) => (b.volume || 0) - (a.volume || 0));
  ok(res, { keyword, count: rows.length, youtubeSuggestions: rows });
};

exports.amazonKeywords = async (req, res) => {
  const keyword = pick(req.body, 'keyword', 'query', 'text');
  if (!keyword) return err(res, 'Keyword is required');
  let list = [];
  try {
    const { data } = await axios.get('https://completion.amazon.com/api/2017/suggestions', {
      params: { 'session-id': '000-0000000-0000000', mid: 'ATVPDKIKX0DER', alias: 'aps', prefix: keyword },
      timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    list = (data?.suggestions || []).map((s) => s.value).filter(Boolean);
  } catch { /* fall back below */ }
  if (!list.length) {
    const modifiers = ['bundle', 'set', 'for men', 'for women', 'pack', 'with case', 'refurbished', 'best', 'cheap'];
    list = modifiers.map((m) => `${keyword} ${m}`);
  }
  const rows = (await withVolumes(list.slice(0, 50), keOpts())).sort((a, b) => (b.volume || 0) - (a.volume || 0));
  ok(res, { keyword, amazonSuggestions: rows });
};

// ════════════════════════════════════════════════════════════
// ON-PAGE SEO GROUP
// ════════════════════════════════════════════════════════════

/**
 * Schema (JSON-LD) Generator.
 * Given a URL it reads the live page and builds schema from what is actually
 * there (title, description, images, author, business details, breadcrumbs),
 * and reports whichever JSON-LD the page already ships.
 */
exports.schemaGenerator = async (req, res) => {
  const target = pick(req.body, 'url', 'query', 'text');
  const type = pick(req.body, 'type') || null;

  // Manual mode: caller supplied the fields directly.
  if (!target && pick(req.body, 'name')) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': type || 'Article',
      name: pick(req.body, 'name'),
      description: pick(req.body, 'description'),
      url: pick(req.body, 'pageUrl'),
      ...(pick(req.body, 'image') ? { image: pick(req.body, 'image') } : {}),
      ...(pick(req.body, 'author') ? { author: { '@type': 'Person', name: pick(req.body, 'author') } } : {}),
      ...(pick(req.body, 'datePublished') ? { datePublished: pick(req.body, 'datePublished') } : {}),
    };
    return ok(res, { mode: 'manual', schema, jsonLd: `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>` });
  }

  if (!target) return err(res, 'Enter a page URL (or provide name/description fields for manual mode)');
  const full = normaliseUrl(target);
  if (!full) return err(res, 'Invalid URL');

  try {
    const { html } = await fetchHtml(full);
    const $ = cheerio.load(html);
    const origin = new URL(full).origin;

    const existing = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try { existing.push(JSON.parse($(el).html())); } catch { existing.push({ error: 'Invalid JSON-LD on page' }); }
    });
    const existingTypes = existing.flatMap((b) => (Array.isArray(b) ? b : [b]))
      .flatMap((b) => (b?.['@graph'] ? b['@graph'] : [b]))
      .map((b) => b?.['@type']).filter(Boolean);

    const title = $('meta[property="og:title"]').attr('content') || $('title').first().text().trim();
    const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || $('img[src]').first().attr('src') || '';
    const siteName = $('meta[property="og:site_name"]').attr('content') || new URL(full).hostname.replace(/^www\./, '');
    const logo = $('link[rel*="icon"]').attr('href') || '';
    const bodyText = $('body').text().replace(/\s+/g, ' ');
    const phone = (bodyText.match(/(\+?\d[\d\s().-]{8,}\d)/) || [])[0] || '';
    const abs = (u) => { try { return new URL(u, full).href; } catch { return u; } };

    const detected = type
      || (/article|blog|news|post/i.test($('meta[property="og:type"]').attr('content') || '') ? 'Article'
        : /\/blog\/|\/news\/|\/article/i.test(full) ? 'Article'
          : phone ? 'LocalBusiness' : 'WebPage');

    const graph = [];
    graph.push({
      '@type': 'WebSite', '@id': `${origin}/#website`, url: origin, name: siteName,
      potentialAction: { '@type': 'SearchAction', target: `${origin}/?s={search_term_string}`, 'query-input': 'required name=search_term_string' },
    });
    graph.push({
      '@type': 'Organization', '@id': `${origin}/#organization`, name: siteName, url: origin,
      ...(logo ? { logo: { '@type': 'ImageObject', url: abs(logo) } } : {}),
      ...(phone ? { telephone: phone.trim() } : {}),
    });
    graph.push({
      '@type': 'WebPage', '@id': `${full}#webpage`, url: full, name: title, description,
      isPartOf: { '@id': `${origin}/#website` },
      ...(image ? { primaryImageOfPage: { '@type': 'ImageObject', url: abs(image) } } : {}),
    });
    if (detected === 'Article') {
      graph.push({
        '@type': 'Article', '@id': `${full}#article`, headline: title.slice(0, 110), description,
        mainEntityOfPage: { '@id': `${full}#webpage` },
        publisher: { '@id': `${origin}/#organization` },
        ...(image ? { image: abs(image) } : {}),
        datePublished: $('meta[property="article:published_time"]').attr('content') || new Date().toISOString().slice(0, 10),
      });
    }
    if (detected === 'LocalBusiness') {
      graph.push({
        '@type': 'LocalBusiness', '@id': `${origin}/#localbusiness`, name: siteName, url: origin, description,
        ...(phone ? { telephone: phone.trim() } : {}),
        ...(image ? { image: abs(image) } : {}),
      });
    }
    const faqs = [];
    $('h2,h3').each((_, el) => {
      const q = $(el).text().trim();
      if (!/\?$/.test(q)) return;
      const a = $(el).nextAll('p').first().text().trim();
      if (a) faqs.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.slice(0, 500) } });
    });
    if (faqs.length >= 2) graph.push({ '@type': 'FAQPage', '@id': `${full}#faq`, mainEntity: faqs.slice(0, 10) });

    const schema = { '@context': 'https://schema.org', '@graph': graph };
    ok(res, {
      url: full,
      detectedPageType: detected,
      existingSchemaTypes: [...new Set(existingTypes)],
      existingSchemaCount: existing.length,
      generatedTypes: graph.map((g) => g['@type']),
      faqBlocksFound: faqs.length,
      jsonLd: `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`,
      validatorUrl: `https://search.google.com/test/rich-results?url=${encodeURIComponent(full)}`,
    });
  } catch (e) { err(res, 'Schema generation failed: ' + e.message); }
};

exports.hreflangGenerator = (req, res) => {
  let { pages = [] } = req.body;
  if (!Array.isArray(pages) || !pages.length) {
    const url = pick(req.body, 'url', 'query', 'text');
    const langs = (pick(req.body, 'languages') || 'en,ur,ar,fr,es').split(',').map((s) => s.trim()).filter(Boolean);
    const full = normaliseUrl(url);
    if (!full) return err(res, 'Provide a URL (and optionally a comma-separated language list)');
    pages = langs.map((lang) => ({ lang, url: `${new URL(full).origin}/${lang}${new URL(full).pathname}`.replace(/\/+$/, '/') }));
  }
  const tags = pages.map((p) => `<link rel="alternate" hreflang="${p.lang}" href="${p.url}" />`);
  tags.push(`<link rel="alternate" hreflang="x-default" href="${pages[0].url}" />`);
  ok(res, { pages, result: tags.join('\n') });
};

// ════════════════════════════════════════════════════════════
// TECHNICAL SEO GROUP
// ════════════════════════════════════════════════════════════

// Mobile Friendly — real rendered-page checks returned as a score + checks
// map so the UI shows a scored report rather than a bag of fields.
exports.mobileFriendlyCheck = async (req, res) => {
  const url = pick(req.body, 'url', 'query', 'text');
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const { html, headers } = await fetchHtml(full);
    const $ = cheerio.load(html);

    const viewport = $('meta[name="viewport"]').attr('content') || '';
    const fixedWidth = [];
    $('[width]').each((_, el) => { const w = parseInt($(el).attr('width'), 10); if (w > 480) fixedWidth.push($(el).prop('tagName')); });
    $('[style]').each((_, el) => { const m = ($(el).attr('style') || '').match(/width:\s*(\d{3,})px/); if (m && Number(m[1]) > 480) fixedWidth.push($(el).prop('tagName')); });
    const tinyFonts = $('[style]').filter((_, el) => /font-size:\s*(\d|1[0-1])px/.test($(el).attr('style') || '')).length;
    const responsiveImages = $('img[srcset], picture source').length;
    const totalImages = $('img').length;
    const hasMediaQueries = /@media[^{]*\((max|min)-width/i.test(html) || $('link[media*="max-width"], link[media*="min-width"]').length > 0;
    const deprecated = /<frameset|<embed[^>]*flash|<object[^>]*flash|<marquee|<blink|<applet/i.test(html);
    const bytes = Buffer.byteLength(html, 'utf8');

    const checks = {
      viewportMetaTag:      { ok: Boolean(viewport), value: viewport || 'Missing' },
      responsiveViewport:   { ok: /width=device-width/i.test(viewport), value: /width=device-width/i.test(viewport) ? 'width=device-width set' : 'Not set to device width' },
      zoomNotBlocked:       { ok: !/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(viewport), value: /user-scalable\s*=\s*(no|0)/i.test(viewport) ? 'Pinch zoom disabled' : 'Zoom allowed' },
      responsiveCss:        { ok: hasMediaQueries, value: hasMediaQueries ? 'Media queries detected' : 'No responsive media queries found' },
      noFixedWidthElements: { ok: fixedWidth.length === 0, value: fixedWidth.length ? `${fixedWidth.length} element(s) wider than 480px` : 'None' },
      legibleFontSizes:     { ok: tinyFonts === 0, value: tinyFonts ? `${tinyFonts} element(s) under 12px` : 'No tiny inline font sizes' },
      responsiveImages:     { ok: totalImages === 0 || responsiveImages > 0, value: `${responsiveImages} of ${totalImages} images use srcset/picture` },
      noDeprecatedTech:     { ok: !deprecated, value: deprecated ? 'Flash / frameset / marquee found' : 'None' },
      pageWeight:           { ok: bytes < 500000, value: `${Math.round(bytes / 1024)} KB of HTML` },
      compression:          { ok: /gzip|br|deflate/i.test(headers['content-encoding'] || ''), value: headers['content-encoding'] || 'none' },
    };

    const list = Object.values(checks);
    const passed = list.filter((c) => c.ok).length;
    const issues = Object.entries(checks).filter(([, c]) => !c.ok).map(([k, c]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}: ${c.value}`);

    ok(res, {
      url: full,
      score: Math.round((passed / list.length) * 100),
      passed,
      totalChecks: list.length,
      mobileFriendly: checks.viewportMetaTag.ok && checks.responsiveViewport.ok && !deprecated,
      checks,
      issues,
    });
  } catch (e) { err(res, 'Mobile-friendly check failed: ' + e.message); }
};

exports.structuredDataTester = async (req, res) => {
  const url = pick(req.body, 'url', 'query', 'text');
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const html = await fetchPage(full);
    const $ = cheerio.load(html);
    const blocks = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try { blocks.push({ valid: true, data: JSON.parse($(el).html()) }); }
      catch (e) { blocks.push({ valid: false, error: e.message }); }
    });
    const types = blocks.filter((b) => b.valid).flatMap((b) => {
      const d = Array.isArray(b.data) ? b.data : [b.data];
      return d.flatMap((x) => (x?.['@graph'] ? x['@graph'] : [x])).map((x) => x?.['@type']).filter(Boolean);
    });
    const microdata = [];
    $('[itemtype]').each((_, el) => microdata.push($(el).attr('itemtype')));
    ok(res, {
      url: full,
      hasStructuredData: blocks.length > 0 || microdata.length > 0,
      jsonLdBlocks: blocks.length,
      invalidBlocks: blocks.filter((b) => !b.valid).length,
      schemaTypes: [...new Set(types.flat())],
      microdataTypes: [...new Set(microdata)],
      blocks,
      validatorUrl: `https://validator.schema.org/#url=${encodeURIComponent(full)}`,
    });
  } catch (e) { err(res, 'Structured data test failed: ' + e.message); }
};

exports.ampValidator = async (req, res) => {
  const url = pick(req.body, 'url', 'query', 'text');
  if (!url) return err(res, 'URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  try {
    const html = await fetchPage(full);
    const $ = cheerio.load(html);
    const htmlTag = $('html').first();
    const isAmp = htmlTag.attr('amp') !== undefined || htmlTag.attr('⚡') !== undefined;
    const ampLink = $('link[rel="amphtml"]').attr('href') || '';
    const issues = [];
    if (isAmp) {
      if (!$('script[src*="cdn.ampproject.org/v0.js"]').length) issues.push('Missing the AMP runtime script');
      if (!$('link[rel="canonical"]').attr('href')) issues.push('AMP page has no canonical link');
      if ($('style[amp-custom]').length > 1) issues.push('More than one <style amp-custom> block');
      $('img').each((_, el) => { if ($(el).prop('tagName') === 'IMG') issues.push('Uses <img> instead of <amp-img>'); });
    }
    ok(res, { url: full, isAmpPage: isAmp, hasAmpVersion: Boolean(ampLink) || isAmp, ampVersionUrl: ampLink || null, issues: [...new Set(issues)] });
  } catch (e) { err(res, 'AMP validation failed: ' + e.message); }
};

// ════════════════════════════════════════════════════════════
// LINK BUILDING GROUP
// ════════════════════════════════════════════════════════════

exports.authorityChecker = async (req, res) => {
  const domain = pick(req.body, 'domain', 'url', 'query', 'text');
  if (!domain) return err(res, 'Domain is required');
  const clean = cleanDomain(domain);
  let ageYears = 0, hasMx = false, hasHttps = false, indexedPages = null, referringMentions = 0;

  try {
    const raw = await new Promise((resolve) => {
      const sock = new net.Socket(); let data = '';
      sock.setTimeout(7000);
      sock.connect(43, 'whois.verisign-grs.com', () => sock.write(clean + '\r\n'));
      sock.on('data', (c) => { data += c.toString(); });
      sock.on('end', () => resolve(data));
      sock.on('error', () => resolve(''));
      sock.on('timeout', () => { sock.destroy(); resolve(''); });
    });
    const created = raw.match(/Creation Date:\s*([^\r\n]+)/i);
    if (created) ageYears = (Date.now() - new Date(created[1].trim())) / (1000 * 60 * 60 * 24 * 365);
  } catch { /* whois unavailable */ }

  try { hasMx = (await dns.resolveMx(clean)).length > 0; } catch { /* no MX */ }
  try { hasHttps = (await axios.get('https://' + clean, { timeout: 7000, validateStatus: () => true })).status < 400; } catch { /* no https */ }

  const [siteSerp, linkSerp] = await Promise.all([
    fetchSerp(`site:${clean}`, { num: 30 }),
    fetchSerp(`"${clean}" -site:${clean}`, { num: 30 }),
  ]);
  indexedPages = siteSerp.results.length;
  referringMentions = new Set(linkSerp.results.map((r) => r.domain)).size;

  let score = 8;
  score += Math.min(ageYears * 3.5, 32);
  score += hasMx ? 6 : 0;
  score += hasHttps ? 12 : 0;
  score += Math.min(indexedPages * 0.8, 22);
  score += Math.min(referringMentions * 1.5, 20);
  score = Math.round(Math.max(1, Math.min(100, score)));

  ok(res, {
    domain: clean, authorityScore: score,
    domainAgeYears: Math.round(ageYears * 10) / 10,
    httpsWorking: hasHttps, hasMailRecords: hasMx,
    indexedPagesSampled: indexedPages,
    referringDomainsSampled: referringMentions,
    referringDomains: [...new Set(linkSerp.results.map((r) => r.domain))].slice(0, 25),
    note: 'Composite score from domain age, HTTPS, mail records and live index/mention sampling. Not the same proprietary metric as a paid DA/DR score.',
  });
};

exports.disavowGenerator = (req, res) => {
  let { domains = [], urls = [] } = req.body;
  if (!domains.length && !urls.length) {
    const raw = pick(req.body, 'text', 'query', 'url', 'domain');
    if (!raw) return err(res, 'Paste the domains or URLs to disavow, one per line');
    raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).forEach((line) => {
      if (line.includes('/') && /^https?:/i.test(line)) urls.push(line); else domains.push(line);
    });
  }
  const lines = [
    '# Disavow file generated by MarkPro',
    `# Created ${new Date().toISOString().slice(0, 10)}`,
    ...domains.map((d) => `domain:${cleanDomain(d)}`),
    ...urls.map((u) => normaliseUrl(u) || u),
  ];
  ok(res, { count: domains.length + urls.length, result: lines.join('\n') });
};

// ════════════════════════════════════════════════════════════
// CONTENT & AI GROUP
// ════════════════════════════════════════════════════════════

// Readability — accepts pasted text OR a URL (fetches and extracts the article).
exports.readabilityAnalyser = async (req, res) => {
  try {
    const { text, source, page } = await resolveText(req.body);
    if (!text || text.split(/\s+/).length < 5) {
      return err(res, 'Enter at least a few sentences of text, or a reachable page URL.');
    }
    const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) || []).length);
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = Math.max(1, words.length);
    const countSyllables = (w) => {
      const c = w.toLowerCase().replace(/[^a-z]/g, '');
      if (!c) return 0;
      if (c.length <= 3) return 1;
      const groups = c.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
      return Math.max(1, groups ? groups.length : 1);
    };
    const syllables = words.reduce((s, w) => s + countSyllables(w), 0);
    const complexWords = words.filter((w) => countSyllables(w) >= 3).length;

    const flesch = 206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syllables / wordCount);
    const score = Math.round(Math.max(0, Math.min(100, flesch)));
    const fkGrade = 0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;
    const gunningFog = 0.4 * ((wordCount / sentences) + 100 * (complexWords / wordCount));

    const grade = score >= 90 ? 'Very Easy (5th grade)' : score >= 70 ? 'Easy (7th grade)'
      : score >= 60 ? 'Standard (8-9th grade)' : score >= 50 ? 'Fairly Difficult (High School)'
        : score >= 30 ? 'Difficult (College)' : 'Very Difficult (College Graduate)';

    const suggestions = [];
    if (wordCount / sentences > 22) suggestions.push('Sentences average over 22 words — break the longest ones up.');
    if (complexWords / wordCount > 0.15) suggestions.push('More than 15% of words are 3+ syllables — swap in simpler alternatives.');
    if (wordCount < 300) suggestions.push('Under 300 words — thin for a page you want to rank.');
    if (!suggestions.length) suggestions.push('Readability is in a healthy range for a general audience.');

    ok(res, {
      source: source || 'pasted text',
      ...(page ? { pageTitle: page.title } : {}),
      score,
      grade,
      fleschKincaidGrade: Math.round(fkGrade * 10) / 10,
      gunningFogIndex: Math.round(gunningFog * 10) / 10,
      words: wordCount,
      sentences,
      syllables,
      complexWords,
      avgWordsPerSentence: Math.round((wordCount / sentences) * 10) / 10,
      readingTimeMinutes: Math.max(1, Math.round(wordCount / 220)),
      suggestions,
    });
  } catch (e) { err(res, 'Readability analysis failed: ' + e.message); }
};

// Plagiarism — exact-phrase web matching across live search results.
exports.plagiarismChecker = async (req, res) => {
  try {
    const { text, source } = await resolveText(req.body);
    if (!text || text.split(/\s+/).length < 20) return err(res, 'Provide at least ~20 words of text, or a page URL.');

    const sentences = (text.match(/[^.!?]+[.!?]/g) || [text])
      .map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 8).slice(0, 6);
    if (!sentences.length) return err(res, 'No sentences long enough to check for duplication.');

    const results = [];
    for (const sentence of sentences) {
      const serp = await fetchSerp(`"${sentence.slice(0, 180)}"`, { num: 5 });
      const matches = serp.results.filter((r) => !source || r.domain !== cleanDomain(source));
      results.push({
        sentence: sentence.slice(0, 160),
        matchesFound: matches.length,
        flagged: matches.length > 0,
        matchedUrls: matches.slice(0, 3).map((m) => m.url),
      });
    }
    const flagged = results.filter((r) => r.flagged).length;
    ok(res, {
      source: source || 'pasted text',
      checkedSentences: results.length,
      flaggedCount: flagged,
      originalityScore: Math.round(((results.length - flagged) / results.length) * 100),
      results,
    });
  } catch (e) { err(res, 'Plagiarism check failed: ' + e.message); }
};

exports.aiContentDetector = async (req, res) => {
  try {
    const { text, source } = await resolveText(req.body);
    if (!text || text.split(/\s+/).length < 30) return err(res, 'Provide at least ~30 words of text, or a page URL.');

    const sentences = (text.match(/[^.!?]+[.!?]/g) || []).map((s) => s.trim()).filter(Boolean);
    const lengths = sentences.map((s) => s.split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
    const stdDev = Math.sqrt(lengths.reduce((s, l) => s + (l - avg) ** 2, 0) / (lengths.length || 1));
    const uniformity = avg ? Math.max(0, 100 - (stdDev / avg) * 100) : 50;

    const words = text.toLowerCase().match(/[a-z']+/g) || [];
    const lexicalDiversity = new Set(words).size / (words.length || 1);
    const stockPhrases = ['it is important to note', "in today's world", 'in conclusion', 'furthermore', 'moreover', 'delve into', 'plays a crucial role', 'navigate the complexities', 'a testament to', 'when it comes to', 'in the realm of'];
    const phraseHits = stockPhrases.filter((p) => text.toLowerCase().includes(p)).length;
    const contractions = (text.match(/\b\w+'(t|s|re|ve|ll|d|m)\b/g) || []).length;

    let likelihood = uniformity * 0.45 + phraseHits * 7;
    likelihood += lexicalDiversity < 0.35 ? 10 : 0;
    likelihood -= Math.min(contractions * 1.5, 15);
    likelihood = Math.max(0, Math.min(100, Math.round(likelihood)));

    ok(res, {
      source: source || 'pasted text',
      confidenceScore: likelihood,
      verdict: likelihood > 70 ? 'Likely AI-generated' : likelihood > 45 ? 'Mixed / uncertain' : 'Likely human-written',
      likelyAiGenerated: likelihood > 70,
      signals: {
        sentenceLengthUniformity: Math.round(uniformity),
        lexicalDiversity: Math.round(lexicalDiversity * 100) / 100,
        stockAiPhrases: phraseHits,
        contractionsUsed: contractions,
        sentencesAnalysed: sentences.length,
      },
      note: 'Heuristic signal based on burstiness, vocabulary diversity and stock phrasing. Treat as an indicator, not a verdict.',
    });
  } catch (e) { err(res, 'AI detection failed: ' + e.message); }
};

/** Runs a Gemini prompt, falling back to a local result when AI is unavailable. */
async function aiOrFallback(opts, fallback) {
  if (!gemini.isConfigured()) return { data: fallback(), aiPowered: false, reason: 'AI key not configured — showing a rule-based result.' };
  try {
    const result = await gemini.generateText(opts);
    return { data: result, aiPowered: true };
  } catch (e) {
    return { data: fallback(), aiPowered: false, reason: 'AI request failed (' + e.message + ') — showing a rule-based result.' };
  }
}

exports.grammarChecker = async (req, res) => {
  try {
    const { text, source } = await resolveText(req.body);
    if (!text) return err(res, 'Text or a page URL is required');

    const localIssues = () => {
      const issues = [];
      const patterns = [
        [/\bteh\b/gi, 'the', 'spelling'], [/\brecieve\b/gi, 'receive', 'spelling'],
        [/\boccured\b/gi, 'occurred', 'spelling'], [/\bseperate\b/gi, 'separate', 'spelling'],
        [/\bdefinately\b/gi, 'definitely', 'spelling'], [/\balot\b/gi, 'a lot', 'spelling'],
        [/\bits'\b/g, "its", 'punctuation'], [/\s{2,}/g, ' ', 'punctuation'],
        [/\s+([,.!?;:])/g, '$1', 'punctuation'], [/\bshould of\b/gi, 'should have', 'grammar'],
        [/\bcould of\b/gi, 'could have', 'grammar'], [/\bwould of\b/gi, 'would have', 'grammar'],
      ];
      let corrected = text;
      patterns.forEach(([re, fix, type]) => {
        const found = text.match(re);
        if (found) issues.push({ original: found[0], suggestion: typeof fix === 'string' ? fix : '', type, occurrences: found.length });
        corrected = corrected.replace(re, fix);
      });
      (text.match(/[^.!?]+[.!?]/g) || []).forEach((s) => {
        const t = s.trim();
        if (t && /^[a-z]/.test(t)) issues.push({ original: t.slice(0, 40), suggestion: 'Start the sentence with a capital letter', type: 'grammar' });
        if (t.split(/\s+/).length > 40) issues.push({ original: t.slice(0, 40) + '…', suggestion: 'Very long sentence — consider splitting it', type: 'style' });
      });
      return { corrected, issues };
    };

    const { data, aiPowered, reason } = await aiOrFallback({
      system: 'You are a strict grammar and spelling checker. Return ONLY valid JSON: {"corrected":"...","issues":[{"original":"...","suggestion":"...","type":"grammar|spelling|punctuation|style"}]}.',
      prompt: text.slice(0, 8000), json: true, temperature: 0.2,
    }, localIssues);

    const payload = (data && typeof data === 'object' && !Array.isArray(data)) ? data : localIssues();
    ok(res, {
      source: source || 'pasted text',
      aiPowered,
      ...(reason ? { note: reason } : {}),
      issueCount: (payload.issues || []).length,
      issues: payload.issues || [],
      corrected: payload.corrected || text,
    });
  } catch (e) { err(res, 'Grammar check failed: ' + e.message); }
};

exports.contentSummariser = async (req, res) => {
  try {
    const { text, source, page } = await resolveText(req.body);
    if (!text) return err(res, 'Text or a page URL is required');
    const length = pick(req.body, 'length') || 'medium';

    const extractive = () => {
      const sentences = (text.match(/[^.!?]+[.!?]/g) || [text]).map((s) => s.trim());
      const words = text.toLowerCase().match(/[a-z']{4,}/g) || [];
      const freq = new Map();
      words.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
      const scored = sentences.map((s, i) => ({
        s, i, score: (s.toLowerCase().match(/[a-z']{4,}/g) || []).reduce((a, w) => a + (freq.get(w) || 0), 0) / Math.max(6, s.split(/\s+/).length),
      }));
      const take = length === 'short' ? 2 : length === 'long' ? 8 : 4;
      return scored.sort((a, b) => b.score - a.score).slice(0, take).sort((a, b) => a.i - b.i).map((x) => x.s).join(' ');
    };

    const target = length === 'short' ? '2-3 sentences' : length === 'long' ? '2 paragraphs' : '1 paragraph';
    const { data, aiPowered, reason } = await aiOrFallback({
      system: `Summarise the given text in ${target}. Plain text only, no preamble.`,
      prompt: text.slice(0, 12000), temperature: 0.3,
    }, extractive);

    ok(res, {
      source: source || 'pasted text',
      ...(page?.title ? { pageTitle: page.title } : {}),
      aiPowered,
      ...(reason ? { note: reason } : {}),
      originalWords: text.split(/\s+/).length,
      summary: typeof data === 'string' ? data.trim() : extractive(),
    });
  } catch (e) { err(res, 'Summarisation failed: ' + e.message); }
};

exports.contentIdeaGenerator = async (req, res) => {
  const topic = pick(req.body, 'topic', 'keyword', 'query', 'text', 'url');
  if (!topic) return err(res, 'Enter a topic or seed keyword');
  try {
    const suggestions = await googleSuggest(topic);
    const questions = await Promise.all(['how', 'why', 'what', 'when', 'which', 'can'].map((q) => googleSuggest(`${q} ${topic}`)));
    const realQueries = [...new Set([...suggestions, ...questions.flat()])].slice(0, 40);
    const withVol = (await withVolumes(realQueries, keOpts())).sort((a, b) => (b.volume || 0) - (a.volume || 0));

    const templates = () => [
      `The complete guide to ${topic}`,
      `${topic}: 10 mistakes that cost you money`,
      `How much does ${topic} cost in 2026?`,
      `${topic} vs the alternatives — an honest comparison`,
      `A beginner's checklist for ${topic}`,
      `Case study: what happened when we tried ${topic}`,
      `${topic} FAQs answered by an expert`,
      `The best tools for ${topic}`,
      `How to choose a ${topic} provider`,
      `${topic} trends worth watching`,
    ];

    const { data, aiPowered, reason } = await aiOrFallback({
      system: 'Generate 10 compelling blog post title ideas for the given topic, informed by these real search queries. Return ONLY a JSON array of strings.',
      prompt: `Topic: ${topic}\nReal search queries: ${withVol.slice(0, 20).map((r) => r.keyword).join(', ')}`,
      json: true, temperature: 0.8,
    }, templates);

    ok(res, {
      topic, aiPowered, ...(reason ? { note: reason } : {}),
      ideas: Array.isArray(data) && data.length ? data : templates(),
      searchQueriesPeopleUse: withVol.slice(0, 25),
    });
  } catch (e) { err(res, 'Content idea generation failed: ' + e.message); }
};

exports.faqGenerator = async (req, res) => {
  const topic = pick(req.body, 'topic', 'keyword', 'query', 'text', 'url');
  if (!topic) return err(res, 'Enter a topic or page URL');
  try {
    const starters = ['how', 'what', 'why', 'when', 'is', 'does', 'can', 'do'];
    const batches = await Promise.all(starters.map((s) => googleSuggest(`${s} ${topic}`)));
    const realQuestions = [...new Set(batches.flat())].filter((q) => starters.some((s) => q.toLowerCase().startsWith(s))).slice(0, 12);

    const fallback = () => realQuestions.slice(0, 8).map((q) => ({
      question: q.charAt(0).toUpperCase() + q.slice(1) + '?',
      answer: `Add your own answer about "${q}" here — this question comes from real Google autocomplete data for ${topic}.`,
    }));

    const { data, aiPowered, reason } = await aiOrFallback({
      system: 'Write concise, factual answers for these real user questions. Return ONLY valid JSON: [{"question":"...","answer":"..."}].',
      prompt: `Topic: ${topic}\nQuestions people actually search: ${realQuestions.join(' | ')}`,
      json: true, temperature: 0.5,
    }, fallback);

    const faqs = Array.isArray(data) && data.length ? data : fallback();
    const schema = {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    };
    ok(res, {
      topic, aiPowered, ...(reason ? { note: reason } : {}),
      faqs,
      sourcedFromRealSearches: realQuestions,
      jsonLd: `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`,
    });
  } catch (e) { err(res, 'FAQ generation failed: ' + e.message); }
};

// ════════════════════════════════════════════════════════════
// SERP & RANK TRACKING GROUP
// ════════════════════════════════════════════════════════════

exports.rankTracker = async (req, res) => {
  const domain = pick(req.body, 'domain', 'url');
  const keyword = pick(req.body, 'keyword', 'query', 'text');
  if (!domain || !keyword) return err(res, 'Domain and keyword are both required');
  try {
    const [serp, volumes] = await Promise.all([
      fetchSerp(keyword, { num: 30 }),
      keywordVolumes([keyword], keOpts()),
    ]);
    if (!serp.results.length) return err(res, 'Every search engine blocked or timed out this lookup. Try again in a minute.', 502);

    const hit = findPosition(serp.results, domain);
    const metrics = volumes.get(keyword.toLowerCase()) || {};
    ok(res, {
      domain: cleanDomain(domain),
      keyword,
      engine: serp.engine,
      position: hit?.position ?? null,
      found: Boolean(hit),
      rankingUrl: hit?.url ?? null,
      rankingTitle: hit?.title ?? null,
      searchVolume: metrics.volume ?? null,
      cpc: metrics.cpc ?? null,
      resultsScanned: serp.results.length,
      topResults: serp.results.slice(0, 20),
    });
  } catch (e) { err(res, 'Rank check failed: ' + e.message); }
};

exports.serpChecker = async (req, res) => {
  const keyword = pick(req.body, 'keyword', 'query', 'text', 'url');
  if (!keyword) return err(res, 'Keyword is required');
  try {
    const [serp, volumes] = await Promise.all([
      fetchSerp(keyword, { num: 20 }),
      keywordVolumes([keyword], keOpts()),
    ]);
    if (!serp.results.length) return err(res, 'Every search engine blocked or timed out this lookup. Try again in a minute.', 502);
    const metrics = volumes.get(keyword.toLowerCase()) || {};
    const domains = {};
    serp.results.forEach((r) => { domains[r.domain] = (domains[r.domain] || 0) + 1; });
    ok(res, {
      keyword,
      engine: serp.engine,
      searchVolume: metrics.volume ?? null,
      cpc: metrics.cpc ?? null,
      competition: metrics.competition ?? null,
      resultCount: serp.results.length,
      uniqueDomains: Object.keys(domains).length,
      results: serp.results,
    });
  } catch (e) { err(res, 'SERP check failed: ' + e.message); }
};

exports.competitorRank = async (req, res) => {
  const domain = pick(req.body, 'domain', 'url');
  const competitorDomain = pick(req.body, 'competitorDomain', 'domain2', 'competitor');
  const keyword = pick(req.body, 'keyword', 'query', 'text');
  if (!domain || !competitorDomain || !keyword) return err(res, 'Your domain, the competitor domain and a keyword are all required');
  try {
    const serp = await fetchSerp(keyword, { num: 30 });
    if (!serp.results.length) return err(res, 'Every search engine blocked or timed out this lookup. Try again in a minute.', 502);
    const you = findPosition(serp.results, domain);
    const them = findPosition(serp.results, competitorDomain);
    ok(res, {
      keyword, engine: serp.engine,
      you: { domain: cleanDomain(domain), position: you?.position ?? null, url: you?.url ?? null },
      competitor: { domain: cleanDomain(competitorDomain), position: them?.position ?? null, url: them?.url ?? null },
      verdict: you && (!them || you.position < them.position) ? 'You rank ahead' : them ? 'Competitor ranks ahead' : 'Neither site is in the top 30',
      gap: you && them ? them.position - you.position : null,
      topResults: serp.results.slice(0, 15),
    });
  } catch (e) { err(res, 'Competitor comparison failed: ' + e.message); }
};

exports.serpPreview = (req, res) => {
  const title = pick(req.body, 'title', 'text');
  const description = pick(req.body, 'description');
  const url = pick(req.body, 'url', 'query');
  if (!title && !url) return err(res, 'At least a title or URL is required');
  const pxTitle = title.length * 8.2;
  ok(res, {
    desktopTitle: title.slice(0, 60) + (title.length > 60 ? '…' : ''),
    mobileTitle: title.slice(0, 78) + (title.length > 78 ? '…' : ''),
    displayUrl: url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/\//g, ' › ') : '',
    metaDescription: description.slice(0, 160) + (description.length > 160 ? '…' : ''),
    titleLength: title.length,
    titleTruncated: title.length > 60,
    approxTitlePixels: Math.round(pxTitle),
    descriptionLength: description.length,
    descriptionTruncated: description.length > 160,
    recommendations: [
      title.length > 60 ? 'Title is over 60 characters and will be cut off on desktop.' : 'Title length is fine.',
      description.length > 160 ? 'Meta description is over 160 characters and will be truncated.'
        : description.length < 70 ? 'Meta description is short — aim for 120-160 characters.' : 'Description length is fine.',
    ],
  });
};

// ════════════════════════════════════════════════════════════
// LOCAL SEO GROUP
// ════════════════════════════════════════════════════════════

exports.googleBusinessOptimiser = async (req, res) => {
  const businessName = pick(req.body, 'businessName', 'text', 'query');
  if (!businessName) return err(res, 'Business name is required');
  const category = pick(req.body, 'category');
  const description = pick(req.body, 'description');
  const city = pick(req.body, 'city');
  const reviewCount = Number(pick(req.body, 'reviewCount')) || 0;

  // Real signal: is the business findable, and who else ranks for its category?
  const [presence, categorySerp] = await Promise.all([
    fetchSerp(`"${businessName}"${city ? ` ${city}` : ''}`, { num: 10 }),
    category ? fetchSerp(`${category}${city ? ` in ${city}` : ''}`, { num: 10 }) : Promise.resolve({ results: [] }),
  ]);
  const onGoogleMaps = presence.results.some((r) => /google\.com\/maps|maps\.google/i.test(r.url));
  const hasOwnSite = presence.results.some((r) => !/facebook|yelp|instagram|linkedin|google/i.test(r.domain));

  const checks = {
    businessNameProvided: { ok: Boolean(businessName), value: businessName },
    primaryCategorySet:   { ok: Boolean(category), value: category || 'Not provided' },
    descriptionWritten:   { ok: description.length > 100, value: `${description.length} of 750 characters used` },
    findableInSearch:     { ok: presence.results.length > 0, value: `${presence.results.length} result(s) for the business name` },
    mapsPresence:         { ok: onGoogleMaps, value: onGoogleMaps ? 'Maps listing found in search' : 'No Maps listing surfaced' },
    ownWebsiteRanking:    { ok: hasOwnSite, value: hasOwnSite ? 'Own website appears in results' : 'Only third-party profiles found' },
    reviewVolume:         { ok: reviewCount >= 10, value: `${reviewCount} reviews (aim for 10+)` },
  };
  const list = Object.values(checks);
  const passed = list.filter((c) => c.ok).length;

  ok(res, {
    businessName,
    score: Math.round((passed / list.length) * 100),
    passed,
    totalChecks: list.length,
    checks,
    whereYouAppear: presence.results.slice(0, 8),
    competitorsForYourCategory: categorySerp.results.slice(0, 8),
    actionPlan: [
      !category && 'Set a precise primary category — it drives which searches you appear in.',
      description.length <= 100 && 'Write a 500-750 character description that names your services and city.',
      !onGoogleMaps && 'Claim and verify your Google Business Profile so a Maps listing exists.',
      reviewCount < 10 && 'Ask recent customers for reviews — 10+ is the point where the profile starts converting.',
      'Post a Google Update weekly and add fresh photos monthly.',
    ].filter(Boolean),
  });
};

exports.napConsistencyChecker = async (req, res) => {
  const url = pick(req.body, 'url', 'query', 'text');
  if (!url) return err(res, 'Page URL is required');
  const full = normaliseUrl(url);
  if (!full) return err(res, 'Invalid URL');
  const expectedName = pick(req.body, 'expectedName');
  const expectedPhone = pick(req.body, 'expectedPhone');
  const expectedAddress = pick(req.body, 'expectedAddress');

  try {
    // Check the key pages, not just one, so this is a real site-wide audit.
    const pages = await crawlSite(full, { maxPages: 8 });
    const targets = pages.length ? pages : [extractPage((await fetchHtml(full)).html, full)];

    const digits = (s) => String(s || '').replace(/\D/g, '');
    const perPage = targets.map((p) => {
      const text = p.text;
      const phones = [...new Set((text.match(/(\+?\d[\d\s().-]{7,}\d)/g) || []).map((s) => s.trim()))].slice(0, 6);
      return {
        url: p.url,
        phonesFound: phones,
        nameMatches: expectedName ? text.toLowerCase().includes(expectedName.toLowerCase()) : null,
        phoneMatches: expectedPhone ? phones.some((ph) => digits(ph).endsWith(digits(expectedPhone).slice(-9))) : null,
        addressMatches: expectedAddress ? text.toLowerCase().includes(expectedAddress.toLowerCase().slice(0, 20)) : null,
      };
    });

    const allPhones = [...new Set(perPage.flatMap((p) => p.phonesFound.map((x) => digits(x))))].filter((d) => d.length >= 9);
    const inconsistentPhones = allPhones.length > 1;

    ok(res, {
      siteChecked: cleanDomain(full),
      pagesChecked: perPage.length,
      distinctPhoneNumbers: allPhones.length,
      phoneNumbersConsistent: !inconsistentPhones,
      nameConsistentEverywhere: expectedName ? perPage.every((p) => p.nameMatches) : null,
      addressConsistentEverywhere: expectedAddress ? perPage.every((p) => p.addressMatches) : null,
      issues: [
        inconsistentPhones && `Found ${allPhones.length} different phone numbers across the site — citations should use one.`,
        expectedName && !perPage.every((p) => p.nameMatches) && 'Business name is missing from some pages.',
        expectedAddress && !perPage.every((p) => p.addressMatches) && 'Address is missing from some pages.',
      ].filter(Boolean),
      perPage,
    });
  } catch (e) { err(res, 'NAP check failed: ' + e.message); }
};

exports.localCitationFinder = async (req, res) => {
  const businessName = pick(req.body, 'businessName', 'text', 'query');
  if (!businessName) return err(res, 'Business name is required');
  const city = pick(req.body, 'city');

  const directories = ['yelp.com', 'yellowpages.com', 'foursquare.com', 'bbb.org', 'manta.com', 'trustpilot.com', 'facebook.com', 'linkedin.com', 'mapquest.com', 'apple.com'];
  const results = [];
  for (const dir of directories) {
    const serp = await fetchSerp(`site:${dir} "${businessName}"${city ? ` ${city}` : ''}`, { num: 3 });
    const hit = serp.results.find((r) => r.domain.endsWith(dir));
    results.push({ directory: dir, listed: Boolean(hit), url: hit?.url || null });
  }
  const listed = results.filter((r) => r.listed).length;
  ok(res, {
    businessName, city: city || null,
    score: Math.round((listed / results.length) * 100),
    listedCount: listed,
    totalChecked: results.length,
    directories: results,
    missingFrom: results.filter((r) => !r.listed).map((r) => r.directory),
  });
};

exports.localRankTracker = async (req, res) => {
  const businessName = pick(req.body, 'businessName', 'text');
  const keyword = pick(req.body, 'keyword', 'query');
  if (!businessName || !keyword) return err(res, 'Business name and keyword are both required');
  const city = pick(req.body, 'city');
  const website = pick(req.body, 'website', 'domain', 'url');

  try {
    const query = city ? `${keyword} in ${city}` : keyword;
    const serp = await fetchSerp(query, { num: 30 });
    if (!serp.results.length) return err(res, 'Every search engine blocked or timed out this lookup. Try again in a minute.', 502);

    const nameLc = businessName.toLowerCase();
    const byName = serp.results.find((r) => `${r.title} ${r.snippet} ${r.url}`.toLowerCase().includes(nameLc));
    const byDomain = website ? findPosition(serp.results, website) : null;
    const found = byDomain || (byName ? { position: byName.position, url: byName.url, title: byName.title } : null);

    ok(res, {
      businessName, keyword, city: city || null, engine: serp.engine, query,
      position: found?.position ?? null,
      found: Boolean(found),
      rankingUrl: found?.url ?? null,
      matchedBy: byDomain ? 'website domain' : byName ? 'business name' : null,
      competitorsAboveYou: found ? serp.results.slice(0, found.position - 1).map((r) => ({ position: r.position, domain: r.domain, title: r.title })) : serp.results.slice(0, 10),
      note: 'Position is measured from a non-geolocated search. A searcher standing in your city may see a different local pack.',
    });
  } catch (e) { err(res, 'Local rank check failed: ' + e.message); }
};

exports.reviewGenerator = async (req, res) => {
  const businessName = pick(req.body, 'businessName', 'text', 'query');
  if (!businessName) return err(res, 'Business name is required');
  const businessType = pick(req.body, 'businessType') || 'local';
  const tone = pick(req.body, 'tone') || 'friendly';
  const purpose = pick(req.body, 'purpose') || 'request';

  const fallback = () => (purpose === 'response' ? [
    `Thank you so much for the kind words about ${businessName}! We're really glad the team got it right for you — see you next time.`,
    `We appreciate you taking the time to review ${businessName}. Your feedback helps us keep improving, and we're grateful for your support.`,
    `Thanks for the honest feedback. We're sorry this visit to ${businessName} fell short — please reach out directly so we can put it right.`,
  ] : [
    `Hi! Thanks for choosing ${businessName}. If we did a good job today, a quick Google review would mean a lot to our small ${businessType} team: [review link]`,
    `Hope you're happy with the work! Reviews are how people find ${businessName} — would you mind leaving one here? [review link]`,
    `Thanks again for your business. A one-line Google review helps other customers find ${businessName}: [review link]`,
  ]);

  const task = purpose === 'response'
    ? `Write 3 short, ${tone} draft replies a business owner could post to customer reviews (positive, neutral and critical) for a ${businessType} business called "${businessName}".`
    : `Write 3 short, ${tone} draft messages asking happy customers to leave a Google review for a ${businessType} business called "${businessName}".`;

  const { data, aiPowered, reason } = await aiOrFallback(
    { system: task + ' Return ONLY a JSON array of 3 strings.', prompt: businessName, json: true, temperature: 0.7 },
    fallback,
  );
  ok(res, {
    businessName, purpose, tone, aiPowered, ...(reason ? { note: reason } : {}),
    drafts: Array.isArray(data) && data.length ? data : fallback(),
    reminder: 'These are drafts to personalise and send yourself — never auto-posted, and never fake reviews.',
  });
};

// ════════════════════════════════════════════════════════════
// TRAFFIC
// ════════════════════════════════════════════════════════════

exports.trafficEstimator = async (req, res) => {
  const domain = pick(req.body, 'domain', 'url', 'query', 'text');
  if (!domain) return err(res, 'Domain is required');
  const clean = cleanDomain(domain);
  try {
    const [pages, indexSerp] = await Promise.all([
      crawlSite(domain, { maxPages: 15 }),
      fetchSerp(`site:${clean}`, { num: 30 }),
    ]);
    if (!pages.length) return err(res, 'Could not reach that site.');

    // Estimate: rank the site's own strongest phrases and price them with real
    // volumes, then model traffic from position-based CTR.
    const corpus = pages.map((p) => `${p.title} ${p.description} ${p.h1.join(' ')}`).join(' ');
    const phrases = extractPhrases(corpus, { min: 2, max: 3, limit: 25 }).map((p) => p.phrase);
    const volumeMap = await keywordVolumes(phrases, keOpts());

    const CTR = [0.28, 0.15, 0.11, 0.08, 0.07, 0.05, 0.04, 0.03, 0.025, 0.02];
    let estimatedVisits = 0;
    const rankings = [];
    for (const phrase of phrases.slice(0, 8)) {
      const serp = await fetchSerp(phrase, { num: 10 });
      const hit = findPosition(serp.results, clean);
      const vol = volumeMap.get(phrase)?.volume || 0;
      if (hit) estimatedVisits += vol * (CTR[hit.position - 1] || 0.01);
      rankings.push({ keyword: phrase, volume: vol || null, position: hit?.position ?? null });
    }

    ok(res, {
      domain: clean,
      pagesCrawled: pages.length,
      indexedPagesSampled: indexSerp.results.length,
      keywordsChecked: rankings.length,
      estimatedMonthlyVisitsFromSampledKeywords: Math.round(estimatedVisits),
      rankings: rankings.sort((a, b) => (b.volume || 0) - (a.volume || 0)),
      note: 'Modelled from real search volumes and this site\'s measured positions for a sample of its own top phrases, using standard position CTR curves. It is a lower bound, not total site traffic.',
    });
  } catch (e) { err(res, 'Traffic estimate failed: ' + e.message); }
};

module.exports = exports;
