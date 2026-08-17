const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/cyber/cyberTools.controller');

// ── Text / Encoding tools ──────────────────────
router.post('/base64-encode',         ctrl.base64Encode);
router.post('/base64-decode',         ctrl.base64Decode);
router.post('/binary-to-text',        ctrl.binaryToText);
router.post('/text-to-binary',        ctrl.textToBinary);
router.post('/url-encode',            ctrl.urlEncode);
router.post('/url-decode',            ctrl.urlDecode);
router.post('/html-encode',           ctrl.htmlEncode);
router.post('/html-decode',           ctrl.htmlDecode);
router.post('/rot13-encode',          ctrl.rot13Encode);
router.post('/rot13-decode',          ctrl.rot13Decode);
router.post('/quoted-printable-encode', ctrl.quotedPrintableEncode);
router.post('/quoted-printable-decode', ctrl.quotedPrintableDecode);
router.post('/text-to-slug',          ctrl.textToSlug);
router.post('/case-converter',        ctrl.caseConverter);
router.post('/text-reverser',         ctrl.textReverser);
router.post('/text-replacer',         ctrl.textReplacer);
router.post('/text-separator',        ctrl.textSeparator);
router.post('/duplicate-lines-remover', ctrl.duplicateLinesRemover);
router.post('/line-break-remover',    ctrl.lineBreakRemover);
router.post('/word-count',            ctrl.wordCount);
router.post('/word-density',          ctrl.wordDensity);
router.post('/lorem-ipsum',           ctrl.loremIpsum);
router.post('/palindrome-checker',    ctrl.palindromeChecker);
router.post('/random-text-line',      ctrl.randomTextLine);
router.post('/email-extractor',       ctrl.emailExtractor);
router.post('/url-extractor',         ctrl.urlExtractor);
router.post('/url-parser',            ctrl.urlParser);

// ── Hash / Crypto tools ─────────────────────────
router.post('/hash-generator',        ctrl.hashGenerator);
router.post('/md5',                   ctrl.md5Generator);
router.post('/sha-generator',         ctrl.shaGenerator);
router.post('/bcrypt-generate',       ctrl.bcryptGenerate);
router.post('/bcrypt-verify',         ctrl.bcryptVerify);
router.post('/password-generator',    ctrl.passwordGenerator);
router.post('/password-strength',     ctrl.passwordStrength);
router.post('/uuid-generator',        ctrl.uuidGenerator);
router.post('/random-number',         ctrl.randomNumber);

// ── Color / Format tools ────────────────────────
router.post('/hex-to-rgb',            ctrl.hexToRgb);
router.post('/rgb-to-hex',            ctrl.rgbToHex);

// ── Code / Format tools ─────────────────────────
router.post('/css-formatter',         ctrl.cssFormatter);
router.post('/css-minifier',          ctrl.cssMinifier);
router.post('/js-formatter',          ctrl.jsFormatter);
router.post('/js-minifier',           ctrl.jsMinifier);
router.post('/html-formatter',        ctrl.htmlFormatter);
router.post('/html-minifier',         ctrl.htmlMinifier);
router.post('/html-strip-tags',       ctrl.htmlStripTags);
router.post('/html-to-markdown',      ctrl.htmlToMarkdown);
router.post('/markdown-to-html',      ctrl.markdownToHtml);
router.post('/json-validator',        ctrl.jsonValidator);
router.post('/json-beautifier',       ctrl.jsonBeautifier);
router.post('/json-to-xml',           ctrl.jsonToXml);
router.post('/xml-to-json',           ctrl.xmlToJson);
router.post('/csv-to-json',           ctrl.csvToJson);
router.post('/json-to-csv',           ctrl.jsonToCsv);
router.post('/sql-beautifier',        ctrl.sqlBeautifier);
router.post('/js-obfuscator',         ctrl.jsObfuscator);

// ── Network tools (server-side) ─────────────────
router.post('/dns-lookup',            ctrl.dnsLookup);
router.post('/whois',                 ctrl.whoisLookup);
router.post('/ssl-checker',           ctrl.sslChecker);
router.post('/ping',                  ctrl.pingUrl);
router.post('/http-status',           ctrl.httpStatus);
router.post('/redirect-checker',      ctrl.redirectChecker);
router.post('/url-unshortener',       ctrl.urlUnshortener);
router.post('/hostname-to-ip',        ctrl.hostnameToIp);
router.post('/ip-to-hostname',        ctrl.ipToHostname);
router.post('/ip-information',        ctrl.ipInformation);
router.post('/open-port-checker',     ctrl.openPortChecker);
router.post('/website-status',        ctrl.websiteStatus);
router.post('/http-headers',          ctrl.httpHeaders);
router.post('/gzip-test',             ctrl.gzipTest);
router.post('/source-code-downloader', ctrl.sourceCodeDownloader);

// ── Misc / Generator tools ──────────────────────
router.post('/timestamp-converter',   ctrl.timestampConverter);
router.post('/bmi-calculator',        ctrl.bmiCalculator);
router.post('/memory-converter',      ctrl.memoryConverter);
router.post('/number-generator',      ctrl.randomNumber);
router.post('/email-validator',       ctrl.emailValidator);
router.post('/credit-card-validator', ctrl.creditCardValidator);
router.post('/user-agent',            ctrl.userAgent);
router.post('/whats-my-ip',           ctrl.whatsMyIp);
router.post('/domain-generator',      ctrl.domainGenerator);
router.post('/htaccess-generator',    ctrl.htaccessGenerator);
router.post('/robotstxt-generator',   ctrl.robotstxtGenerator);
router.post('/seo-tags-generator',    ctrl.seoTagsGenerator);
router.post('/twitter-card-generator', ctrl.twitterCardGenerator);
router.post('/privacy-policy',        ctrl.privacyPolicyGenerator);
router.post('/terms-of-service',      ctrl.termsOfServiceGenerator);
router.post('/punycode-to-unicode',   ctrl.punycodeToUnicode);
router.post('/unicode-to-punycode',   ctrl.unicodeToPunycode);
router.post('/hex-to-text',           ctrl.hexToText);
router.post('/text-to-hex',           ctrl.textToHex);
router.post('/fake-name-generator',   ctrl.fakeNameGenerator);
router.post('/youtube-thumbnail',     ctrl.youtubeThumbnail);


// GET /api/cyber/tools - list of all supported tools
router.get('/', (req, res) => {
  const slugs = [];
  const routerStack = router.stack.filter(l => l.route && l.route.path && l.route.path !== '/');
  routerStack.forEach(l => slugs.push(l.route.path.replace(/^\//,'')));
  const data = slugs.map(slug => ({ slug, name: slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), category: 'Cyber/Dev' }));
  res.json({ success: true, data });
});

module.exports = router;
