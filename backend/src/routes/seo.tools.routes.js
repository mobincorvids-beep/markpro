const express = require('express');
const router  = express.Router();
const c       = require('../controllers/seo/seoTools.controller');
const cx      = require('../controllers/seo/seoToolsExtra.controller');
const cimg     = require('../controllers/seo/seoImageTools.controller');
const { memoryUpload } = require('../middleware/bp.upload');
const ToolUsage = require('../models/ToolUsage.model');

// Usage logger middleware
const log = (toolId, toolName) => async (req, res, next) => {
  try {
    const ip    = (req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.socket.remoteAddress || '';
    const input = req.body.url || req.body.domain || req.body.text || req.body.keyword || '';
    await ToolUsage.create({ toolId, toolName, input: String(input).slice(0,200), ip: ip.replace('::ffff:',''), user: req.user?._id||null });
  } catch {}
  next();
};

// ── PR01  Article Rewriter ──────────────────────
router.post('/article-rewriter',        log('PR01','Article Rewriter'),             c.articleRewriter);
// ── PR04  Meta Tag Generator ───────────────────
router.post('/meta-tag-generator',      log('PR04','Meta Tag Generator'),           c.metaTagGenerator);
// ── PR05  Meta Tags Analyzer ───────────────────
router.post('/meta-tags-analyzer',      log('PR05','Meta Tags Analyzer'),           c.metaTagsAnalyzer);
// ── PR06  Keyword Position ─────────────────────
router.post('/keyword-position-checker',log('PR06','Keyword Position Checker'),     c.keywordPositionChecker);
// ── PR07  Robots.txt Generator ─────────────────
router.post('/robots-txt-generator',    log('PR07','Robots.txt Generator'),         c.robotsGenerator);
// ── PR08  XML Sitemap Generator ────────────────
router.post('/xml-sitemap-generator',   log('PR08','XML Sitemap Generator'),        c.xmlSitemapGenerator);
// ── PR11  Word Counter ─────────────────────────
router.post('/word-counter',            log('PR11','Word Counter'),                 c.wordCounter);
// ── PR13  Link Analyzer ────────────────────────
router.post('/link-analyzer-tool',      log('PR13','Link Analyzer'),                c.linkAnalyzer);
// ── PR15  My IP Address ────────────────────────
router.post('/my-ip-address',           log('PR15','My IP Address'),                c.myIpAddress);
router.get ('/my-ip-address',                                                       c.myIpAddress);
// ── PR16  Keyword Density ──────────────────────
router.post('/keyword-density-checker', log('PR16','Keyword Density Checker'),      c.keywordDensity);
// ── PR17  Safe Browsing ────────────────────────
router.post('/google-malware-checker',  log('PR17','Google Malware Checker'),       c.safeBrowsingCheck);
// ── PR18  Domain Age ───────────────────────────
router.post('/domain-age-checker',      log('PR18','Domain Age Checker'),           c.domainAgeChecker);
// ── PR19  WHOIS ────────────────────────────────
router.post('/whois-checker',           log('PR19','Whois Checker'),                c.whoisChecker);
// ── PR20  Domain to IP ─────────────────────────
router.post('/domain-into-ip',          log('PR20','Domain into IP'),               c.domainToIp);
// ── PR22  URL Rewriting ────────────────────────
router.post('/url-rewriting-tool',      log('PR22','URL Rewriting Tool'),           c.urlRewritingTool);
// ── PR23  www Redirect ─────────────────────────
router.post('/www-redirect-checker',    log('PR23','www Redirect Checker'),         c.wwwRedirectChecker);
// ── PR25  URL Encoder/Decoder ──────────────────
router.post('/url-encoder-decoder',     log('PR25','URL Encoder / Decoder'),        c.urlEncoderDecoder);
// ── PR26  Server Status ────────────────────────
router.post('/server-status-checker',   log('PR26','Server Status Checker'),        c.serverStatusChecker);
// ── PR28  Page Size ────────────────────────────
router.post('/page-size-checker',       log('PR28','Page Size Checker'),            c.pageSizeChecker);
// ── PR35  Source Code ──────────────────────────
router.post('/get-source-code-of-webpage', log('PR35','Get Source Code'),           c.getSourceCode);
// ── PR36  Google Index ─────────────────────────
router.post('/google-index-checker',    log('PR36','Google Index Checker'),         c.googleIndexChecker);
// ── PR37  Links Count ──────────────────────────
router.post('/website-links-count-checker', log('PR37','Website Links Count'),      c.websiteLinksCount);
// ── PR38  Class C IP ───────────────────────────
router.post('/class-c-ip-checker',      log('PR38','Class C Ip Checker'),           c.classCIpChecker);
// ── PR39  MD5 Generator ────────────────────────
router.post('/online-md5-generator',    log('PR39','Online Md5 Generator'),         c.md5Generator);
// ── PR41  Code to Text ─────────────────────────
router.post('/code-to-text-ratio-checker', log('PR41','Code to Text Ratio'),        c.codeToTextRatio);
// ── PR42  DNS Records ──────────────────────────
router.post('/find-dns-records',        log('PR42','Find DNS records'),             c.findDnsRecords);
// ── PR43  What is my Browser ───────────────────
router.post('/what-is-my-browser',      log('PR43','What is my Browser'),           c.whatIsMyBrowser);
router.get ('/what-is-my-browser',                                                  c.whatIsMyBrowser);
// ── PR44  Email Privacy ────────────────────────
router.post('/email-privacy',           log('PR44','Email Privacy'),                c.emailPrivacyChecker);
// ── PR45  Google Cache ─────────────────────────
router.post('/google-cache-checker',    log('PR45','Google Cache Checker'),         c.googleCacheChecker);
// ── PR46  Broken Links ─────────────────────────
router.post('/broken-links-finder',     log('PR46','Broken Links Finder'),          c.brokenLinksFinder);
// ── PR47  Spider Simulator ─────────────────────
router.post('/spider-simulator',        log('PR47','Spider Simulator'),             c.spiderSimulator);
// ── PR48  Keywords Suggestion ──────────────────
router.post('/keywords-suggestion-tool',log('PR48','Keywords Suggestion'),          c.keywordsSuggestion);
// ── SD51  PageSpeed Insights ───────────────────
router.post('/pagespeed-insights-checker', log('SD51','PageSpeed Insights'),        c.pagespeedInsights);

// ── Extra tools ────────────────────────────────
router.post('/ssl-checker',             log('EX01','SSL Checker'),                  c.sslChecker);
router.post('/http-headers-checker',    log('EX02','HTTP Headers Checker'),         c.httpHeadersChecker);
router.post('/redirect-checker',        log('EX03','Redirect Checker'),             c.redirectChecker);
router.post('/robots-txt-checker',      log('EX04','Robots.txt Checker'),           c.robotsTxtChecker);
router.post('/backlink-maker',          log('PR03','Backlink Maker'),               c.backlinkMaker);
router.post('/domain-hosting-checker',  log('PR34','Domain Hosting Checker'),       c.domainHostingChecker);
router.post('/suspicious-domain-checker', log('PR31','Suspicious Domain Checker'), c.suspiciousDomainChecker);
router.post('/open-graph-checker',      log('EX05','Open Graph Checker'),           c.openGraphChecker);
router.post('/sitemap-finder',          log('EX06','Sitemap Finder'),               c.sitemapFinder);
router.post('/ping',                    log('EX07','Ping Tool'),                    c.pingTool);


router.post('/audit',                   log('EX08','Site Audit'),                   c.siteAudit);
router.post('/keywords',                log('EX09','Keywords Quick'),               c.keywordsQuick);
router.post('/backlinks',               log('EX10','Backlinks Quick'),              c.backlinksQuick);

// ── Newly wired tools (previously "roadmap" placeholders in the UI) ──
router.post('/keyword-difficulty',      log('KX01','Keyword Difficulty'),           cx.keywordDifficulty);
router.post('/long-tail-keywords',      log('KX02','Long-tail Keywords'),           cx.longTailKeywords);
router.post('/related-keywords',        log('KX03','Related Keywords'),             cx.relatedKeywords);
router.post('/lsi-keywords',            log('KX04','LSI Keywords'),                 cx.lsiKeywords);
router.post('/keyword-gap',             log('KX05','Keyword Gap'),                  cx.keywordGap);
router.post('/keywords-everywhere',     log('KX06','Keywords Everywhere'),          cx.keywordsEverywhere);
router.post('/youtube-keywords',        log('KX07','YouTube Keywords'),             cx.youtubeKeywords);
router.post('/amazon-keywords',         log('KX08','Amazon Keywords'),              cx.amazonKeywords);
router.post('/schema-generator',        log('KX09','Schema Generator'),             cx.schemaGenerator);
router.post('/hreflang-generator',      log('KX10','Hreflang Generator'),           cx.hreflangGenerator);
router.post('/mobile-friendly-check',   log('KX11','Mobile Friendly Check'),        cx.mobileFriendlyCheck);
router.post('/structured-data-tester',  log('KX12','Structured Data Tester'),       cx.structuredDataTester);
router.post('/amp-validator',           log('KX13','AMP Validator'),                cx.ampValidator);
router.post('/authority-checker',       log('KX14','Authority Checker'),            cx.authorityChecker);
router.post('/disavow-generator',       log('KX15','Disavow Generator'),            cx.disavowGenerator);
router.post('/readability-analyser',    log('KX16','Readability Analyser'),         cx.readabilityAnalyser);
router.post('/plagiarism-checker',      log('KX17','Plagiarism Checker'),           cx.plagiarismChecker);
router.post('/ai-content-detector',     log('KX18','AI Content Detector'),          cx.aiContentDetector);
router.post('/grammar-checker',         log('KX19','Grammar Checker'),              cx.grammarChecker);
router.post('/content-summariser',      log('KX20','Content Summariser'),           cx.contentSummariser);
router.post('/content-idea-generator',  log('KX21','Content Idea Generator'),       cx.contentIdeaGenerator);
router.post('/faq-generator',           log('KX22','FAQ Generator'),                cx.faqGenerator);
router.post('/rank-tracker',            log('KX23','Rank Tracker'),                 cx.rankTracker);
router.post('/serp-checker',            log('KX24','SERP Checker'),                 cx.serpChecker);
router.post('/competitor-rank',         log('KX25','Competitor Rank'),              cx.competitorRank);
router.post('/serp-preview',            log('KX26','SERP Preview'),                 cx.serpPreview);
router.post('/image-compressor',        log('KX27','Image Compressor'),             memoryUpload.single('image'), cimg.imageCompressor);
router.post('/alt-text-generator',      log('KX28','Alt Text Generator'),           memoryUpload.single('image'), cimg.altTextGenerator);
router.post('/image-rename-tool',       log('KX29','Image Rename Tool'),            cimg.imageRenameTool);
router.post('/favicon-generator',       log('KX30','Favicon Generator'),            memoryUpload.single('image'), cimg.faviconGenerator);
router.post('/google-business-optimiser', log('KX31','Google Business Optimiser'),  cx.googleBusinessOptimiser);
router.post('/nap-consistency-checker', log('KX32','NAP Consistency Checker'),      cx.napConsistencyChecker);
router.post('/local-citation-finder',   log('KX33','Local Citation Finder'),        cx.localCitationFinder);
router.post('/local-rank-tracker',      log('KX34','Local Rank Tracker'),           cx.localRankTracker);
router.post('/review-generator',        log('KX35','Review Generator'),             cx.reviewGenerator);
router.post('/traffic-estimator',       log('KX36','Traffic Estimator'),            cx.trafficEstimator);

// GET /api/seo/tools/history - current user's tool usage history
router.get('/history', require('../middleware/auth.middleware').protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = { user: req.user._id };
    const [items, total] = await Promise.all([
      ToolUsage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      ToolUsage.countDocuments(filter),
    ]);
    res.json({ success: true, items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/seo/tools/list - list of supported tools
router.get('/list', (req, res) => {
  const tools = [
    'article-rewriter','meta-tag-generator','meta-tags-analyzer','keyword-position-checker','robots-txt-generator',
    'xml-sitemap-generator','word-counter','link-analyzer-tool','my-ip-address','keyword-density-checker',
    'google-malware-checker','domain-age-checker','whois-checker','domain-into-ip','url-rewriting-tool',
    'www-redirect-checker','url-encoder-decoder','server-status-checker','page-size-checker','get-source-code-of-webpage',
    'google-index-checker','website-links-count-checker','class-c-ip-checker','online-md5-generator','code-to-text-ratio-checker',
    'find-dns-records','what-is-my-browser','email-privacy','google-cache-checker','broken-links-finder',
    'spider-simulator','keywords-suggestion-tool','pagespeed-insights-checker','ssl-checker','http-headers-checker',
    'redirect-checker','robots-txt-checker','backlink-maker','domain-hosting-checker','suspicious-domain-checker',
    'open-graph-checker','sitemap-finder','ping',
  ].map(slug => ({ slug, name: slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), category: 'SEO' }));
  res.json({ success: true, data: tools });
});


// ════════════════════════════════════════════════════════════════════
//  AI FALLBACK  —  POST /api/seo/tools/:slug
//  Dozens of tools in the SEO hub (Keyword Generator, Keyword Difficulty,
//  Long-Tail Finder, Competitor Analysis …) had no matching Express route,
//  so the UI surfaced a bare "Request failed with status code 404".
//  Any slug that is not handled by an explicit route above is resolved
//  against the ZAMNexus prompt catalog and answered by Gemini. Unknown
//  slugs still get a structured answer from a generic prompt, so no tool
//  in the hub can 404 any more.
// ════════════════════════════════════════════════════════════════════
const gemini = require('../services/gemini.service');
const { SEO_TOOLS } = require('../controllers/zamnexus/zamnexus.controller');

const findToolDef = (slug) => {
  for (const group of Object.values(SEO_TOOLS || {})) {
    const hit = (group || []).find(t => t.slug === slug);
    if (hit) return hit;
  }
  return null;
};

const titleize = (slug) => slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

router.post('/:slug', async (req, res) => {
  const slug = req.params.slug;
  const inputs = req.body || {};

  if (!gemini.isConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'This tool needs AI analysis, but GEMINI_API_KEY is not configured on the server.',
    });
  }

  // The generic payload the hub sends duplicates the same value across keys;
  // collapse it so prompts read naturally.
  const primary = inputs.keyword || inputs.topic || inputs.query || inputs.url || inputs.domain || inputs.text || '';
  if (!String(primary).trim()) {
    return res.status(400).json({ success: false, message: 'Enter a keyword, topic, or URL to analyse.' });
  }

  const def = findToolDef(slug);
  let prompt;
  try {
    prompt = def
      ? def.prompt({ ...inputs, topic: inputs.topic || primary, keyword: inputs.keyword || primary })
      : null;
  } catch (_) { prompt = null; }

  if (!prompt) {
    prompt =
      `You are an expert SEO analyst. Run the "${titleize(slug)}" analysis for the following input: "${primary}".\n` +
      `Return ONLY a JSON object with concrete, realistic values — never null, never placeholder text. ` +
      `Include the metrics a professional SEO tool of this type would report.`;
  }

  try {
    const raw = await gemini.generateText({
      prompt: `${prompt}\n\nRespond with valid JSON only. Every field must contain a real estimated value — never null, "N/A", or an empty string.`,
      json: true,
      temperature: 0.4,
      maxTokens: 4096,
    });

    const result = typeof raw === 'string'
      ? (() => { try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch { return { text: raw }; } })()
      : raw;

    try {
      await ToolUsage.create({
        toolId: slug, toolName: def?.name || titleize(slug),
        input: String(primary).slice(0, 200),
        ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '',
        user: req.user?._id || null,
      });
    } catch (_) {}

    res.json({ success: true, tool: def?.name || titleize(slug), data: result, result });
  } catch (e) {
    const quota = e.status === 429;
    res.status(quota ? 429 : 500).json({
      success: false,
      message: quota
        ? 'The AI provider is rate-limited right now. Please try again in a moment.'
        : `AI analysis failed: ${e.message}`,
    });
  }
});

module.exports = router;
