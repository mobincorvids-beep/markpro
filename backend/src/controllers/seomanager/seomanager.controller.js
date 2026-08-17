const { SeoPage } = require('../../models/SeoManager.model');

// ── Helpers ───────────────────────────────────────────────────
function buildMetaHtml(page) {
  const lines = [];

  // Charset & viewport
  if (page.charset)   lines.push(`<meta charset="${esc(page.charset)}">`);
  if (page.viewport)  lines.push(`<meta name="viewport" content="${esc(page.viewport)}">`);

  // Basic meta
  if (page.title)       lines.push(`<title>${esc(page.title)}</title>`);
  if (page.description) lines.push(`<meta name="description" content="${esc(page.description)}">`);
  if (page.keywords)    lines.push(`<meta name="keywords" content="${esc(page.keywords)}">`);
  if (page.robots)      lines.push(`<meta name="robots" content="${esc(page.robots)}">`);
  if (page.canonical)   lines.push(`<link rel="canonical" href="${esc(page.canonical)}">`);

  // Webmaster verification
  if (page.google_verify) lines.push(`<meta name="google-site-verification" content="${esc(page.google_verify)}">`);
  if (page.bing_verify)   lines.push(`<meta name="msvalidate.01" content="${esc(page.bing_verify)}">`);
  if (page.yandex_verify) lines.push(`<meta name="yandex-verification" content="${esc(page.yandex_verify)}">`);

  // Open Graph
  const og = page.og || {};
  if (og.title)       lines.push(`<meta property="og:title" content="${esc(og.title)}">`);
  if (og.description) lines.push(`<meta property="og:description" content="${esc(og.description)}">`);
  if (og.image)       lines.push(`<meta property="og:image" content="${esc(og.image)}">`);
  if (og.url)         lines.push(`<meta property="og:url" content="${esc(og.url)}">`);
  if (og.type)        lines.push(`<meta property="og:type" content="${esc(og.type)}">`);
  if (og.site_name)   lines.push(`<meta property="og:site_name" content="${esc(og.site_name)}">`);
  if (og.locale)      lines.push(`<meta property="og:locale" content="${esc(og.locale)}">`);
  // Article properties
  if (og.type === 'article') {
    if (og.article_author)         lines.push(`<meta property="article:author" content="${esc(og.article_author)}">`);
    if (og.article_section)        lines.push(`<meta property="article:section" content="${esc(og.article_section)}">`);
    if (og.article_published_time) lines.push(`<meta property="article:published_time" content="${esc(new Date(og.article_published_time).toISOString())}">`);
    if (og.article_modified_time)  lines.push(`<meta property="article:modified_time" content="${esc(new Date(og.article_modified_time).toISOString())}">`);
    (og.article_tags || []).forEach(t => lines.push(`<meta property="article:tag" content="${esc(t)}">`));
  }
  // Product properties
  if (og.type === 'product') {
    if (og.product_price)        lines.push(`<meta property="product:price:amount" content="${esc(og.product_price)}">`);
    if (og.product_currency)     lines.push(`<meta property="product:price:currency" content="${esc(og.product_currency)}">`);
    if (og.product_availability) lines.push(`<meta property="product:availability" content="${esc(og.product_availability)}">`);
  }

  // Twitter Card
  const tw = page.twitter || {};
  if (tw.card)        lines.push(`<meta name="twitter:card" content="${esc(tw.card)}">`);
  if (tw.title)       lines.push(`<meta name="twitter:title" content="${esc(tw.title)}">`);
  if (tw.description) lines.push(`<meta name="twitter:description" content="${esc(tw.description)}">`);
  if (tw.image)       lines.push(`<meta name="twitter:image" content="${esc(tw.image)}">`);
  if (tw.site)        lines.push(`<meta name="twitter:site" content="${esc(tw.site)}">`);
  if (tw.creator)     lines.push(`<meta name="twitter:creator" content="${esc(tw.creator)}">`);

  // hreflang
  (page.hreflang || []).forEach(h => {
    lines.push(`<link rel="alternate" hreflang="${esc(h.lang)}" href="${esc(h.url)}">`);
  });

  // Pagination prev/next
  if (page.prev_url) lines.push(`<link rel="prev" href="${esc(page.prev_url)}">`);
  if (page.next_url) lines.push(`<link rel="next" href="${esc(page.next_url)}">`);

  // AMP
  if (page.amp_url)  lines.push(`<link rel="amphtml" href="${esc(page.amp_url)}">`);

  // JSON-LD
  (page.jsonLd || []).forEach(schema => {
    const jsonLdObj = { '@context': 'https://schema.org', '@type': schema.type, ...(schema.data || {}) };
    lines.push(`<script type="application/ld+json">\n${JSON.stringify(jsonLdObj, null, 2)}\n</script>`);
  });

  // Custom head tags
  if (page.custom_head) lines.push(page.custom_head);

  return lines.join('\n');
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── CRUD ──────────────────────────────────────────────────────
exports.getPages = async (req, res) => {
  try {
    const { page = 1, limit = 30, search } = req.query;
    const q = { user: req.user._id, isActive: true };
    if (search) q.slug = { $regex: search, $options: 'i' };
    const [pages, total] = await Promise.all([
      SeoPage.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit).select('-og -twitter -jsonLd -hreflang -custom_head'),
      SeoPage.countDocuments(q),
    ]);
    res.json({ success: true, pages, total, page: +page, pages_count: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getPage = async (req, res) => {
  try {
    const p = await SeoPage.findOne({ _id: req.params.id, user: req.user._id });
    if (!p) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, page: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getPageBySlug = async (req, res) => {
  try {
    const p = await SeoPage.findOneAndUpdate(
      { slug: req.params.slug, user: req.user._id, isActive: true },
      { $inc: { viewCount: 1 } }, { new: true }
    );
    if (!p) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, page: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createPage = async (req, res) => {
  try {
    const existing = await SeoPage.findOne({ slug: req.body.slug, user: req.user._id });
    if (existing) return res.status(409).json({ success: false, message: `Slug "${req.body.slug}" already exists` });
    const p = await SeoPage.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, page: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updatePage = async (req, res) => {
  try {
    const p = await SeoPage.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true, runValidators: true });
    if (!p) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, page: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deletePage = async (req, res) => {
  try {
    await SeoPage.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isActive: false });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Preview - generate HTML tag output without saving ─────────
exports.preview = async (req, res) => {
  try {
    const html = buildMetaHtml(req.body);
    res.json({ success: true, html });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Generate - get tag HTML for existing slug ─────────────────
exports.generateTags = async (req, res) => {
  try {
    const p = await SeoPage.findOne({ slug: req.params.slug, user: req.user._id, isActive: true });
    if (!p) return res.status(404).json({ success: false, message: 'Not found' });
    const html = buildMetaHtml(p);
    res.json({ success: true, slug: p.slug, html, page: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Bulk Import (CSV / JSON) ───────────────────────────────────
exports.bulkImport = async (req, res) => {
  try {
    const { pages } = req.body;
    if (!Array.isArray(pages) || !pages.length)
      return res.status(400).json({ success: false, message: 'pages array required' });

    let created = 0, skipped = 0, errors = 0;
    for (const item of pages) {
      if (!item.slug) { skipped++; continue; }
      try {
        await SeoPage.findOneAndUpdate(
          { slug: item.slug, user: req.user._id },
          { ...item, user: req.user._id },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        created++;
      } catch { errors++; }
    }
    res.json({ success: true, message: `Imported ${created} pages, skipped ${skipped}, errors ${errors}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── CSV Import ────────────────────────────────────────────────
exports.csvImport = async (req, res) => {
  try {
    if (!req.files?.file) return res.status(400).json({ success: false, message: 'CSV file required' });
    const csvParse = require('csv-parse/sync');
    const rows     = csvParse.parse(req.files.file.data.toString(), { columns: true, skip_empty_lines: true });
    let created = 0, errors = 0;
    for (const row of rows) {
      if (!row.slug) continue;
      try {
        await SeoPage.findOneAndUpdate(
          { slug: row.slug.trim(), user: req.user._id },
          { ...row, user: req.user._id },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        created++;
      } catch { errors++; }
    }
    res.json({ success: true, message: `CSV import: ${created} pages processed, ${errors} errors` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── SEO Audit (quick score for a URL) ────────────────────────
exports.auditPage = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'url required' });
    const axios   = require('axios');
    const cheerio = require('cheerio');
    let score = 0, issues = [], suggestions = [];
    try {
      const { data: html } = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'MarkPro-SEO-Bot/1.0' } });
      const $ = cheerio.load(html);
      const title = $('title').text().trim();
      const desc  = $('meta[name="description"]').attr('content') || '';
      const h1s   = $('h1');
      const canonical = $('link[rel="canonical"]').attr('href') || '';
      const ogTitle   = $('meta[property="og:title"]').attr('content') || '';
      const twitterCard = $('meta[name="twitter:card"]').attr('content') || '';
      const jsonLd    = $('script[type="application/ld+json"]').length;

      if (title)            { score += 20; } else { issues.push('Missing <title> tag'); }
      if (title.length >= 10 && title.length <= 60) { score += 10; } else { suggestions.push('Title should be 10-60 characters'); }
      if (desc)             { score += 15; } else { issues.push('Missing meta description'); }
      if (desc.length >= 50 && desc.length <= 160) { score += 10; } else { suggestions.push('Description should be 50-160 characters'); }
      if (h1s.length === 1) { score += 15; } else if (h1s.length === 0) { issues.push('Missing H1 tag'); } else { suggestions.push('Multiple H1 tags detected'); }
      if (canonical)        { score += 10; } else { suggestions.push('Consider adding a canonical URL'); }
      if (ogTitle)          { score += 10; } else { suggestions.push('Add Open Graph tags for social sharing'); }
      if (twitterCard)      { score += 5; }  else { suggestions.push('Add Twitter Card meta tags'); }
      if (jsonLd)           { score += 5; }  else { suggestions.push('Add JSON-LD structured data'); }

      res.json({ success: true, url, score: Math.min(score, 100), issues, suggestions, details: { title, description: desc, h1Count: h1s.length, canonical, hasOg: !!ogTitle, hasTwitter: !!twitterCard, hasJsonLd: jsonLd > 0 } });
    } catch {
      res.json({ success: false, message: 'Could not fetch URL for audit' });
    }
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Admin ─────────────────────────────────────────────────────
exports.adminStats = async (req, res) => {
  try {
    const total = await SeoPage.countDocuments({ isActive: true });
    const withOg = await SeoPage.countDocuments({ isActive: true, 'og.title': { $ne: '' } });
    const withSchema = await SeoPage.countDocuments({ isActive: true, 'jsonLd.0': { $exists: true } });
    res.json({ success: true, stats: { total, withOgTags: withOg, withJsonLd: withSchema } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
