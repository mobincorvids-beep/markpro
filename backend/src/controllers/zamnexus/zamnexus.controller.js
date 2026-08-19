const { ZAMContact, ZAMNote, ZAMLead, ZAMLeadSearch, ZAMSeoRun, ZAMAsset } = require('../../models/ZAMNexus.models');
const axios   = require('axios');
const path    = require('path');
const fs      = require('fs');

// ── Gemini helper ─────────────────────────────────────────────
async function callGemini(prompt, model = 'gemini-flash-latest') {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const t0 = Date.now();

  // Gemini returns 503 ("model overloaded") or 429 (rate limited) fairly
  // often under load, and this call previously had zero retry — any
  // transient overload became a hard failure straight to the user. Retry
  // a few times with backoff before giving up, which is what actually
  // fixes most of these without needing any account/key change.
  const MAX_ATTEMPTS = 3;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { data } = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }, { timeout: 30000 });
      const text   = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const tokens = data.usageMetadata?.totalTokenCount || 0;
      return { text, tokens, duration: Date.now() - t0 };
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      const retryable = status === 503 || status === 429;
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await new Promise(r => setTimeout(r, 800 * attempt)); // 800ms, 1600ms
    }
  }
  const status = lastErr.response?.status;
  if (status === 503) throw new Error('The AI service is temporarily overloaded — please try again in a moment.');
  if (status === 429) throw new Error('The AI service rate limit was hit — please wait a moment and try again.');
  throw lastErr;
}

// Parse JSON from Gemini response safely
function parseJsonResult(text) {
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch { return { result: text }; }
}

// ── SEO Tool catalog (180+ tools grouped by category) ─────────
const SEO_TOOLS = {
  keyword: [
    { slug: 'keyword-generator',       name: 'Keyword Generator',         prompt: (i) => `Generate 20 SEO keyword ideas for: "${i.topic}". Include long-tail and short-tail. Return JSON array of {keyword, monthlyVolume, difficulty, intent}.` },
    { slug: 'keyword-difficulty',      name: 'Keyword Difficulty Checker', prompt: (i) => `Analyze SEO difficulty for keyword: "${i.keyword}". Return JSON: {keyword, difficulty(0-100), competition, searchVolume, cpc, recommendation}.` },
    { slug: 'youtube-keywords',        name: 'YouTube Keywords',           prompt: (i) => `Generate 15 YouTube keyword ideas for: "${i.topic}". Return JSON array of {keyword, viewPotential, competitionLevel}.` },
    { slug: 'amazon-keywords',         name: 'Amazon Keywords',            prompt: (i) => `Generate 15 Amazon product keyword ideas for: "${i.product}". Return JSON array of {keyword, buyerIntent, competitionLevel}.` },
    { slug: 'bing-keywords',           name: 'Bing Keywords',              prompt: (i) => `Generate 15 Bing search keyword ideas for: "${i.topic}". Return JSON array of {keyword, estimatedVolume, difficulty}.` },
    { slug: 'long-tail-keywords',      name: 'Long-Tail Keyword Finder',   prompt: (i) => `Generate 20 long-tail keyword variations for: "${i.keyword}". Return JSON array of {keyword, wordCount, intent, difficulty}.` },
    { slug: 'semantic-keywords',       name: 'Semantic Keyword Finder',    prompt: (i) => `Generate 20 semantically related keywords for: "${i.keyword}". Return JSON array of {keyword, relationship, relevanceScore}.` },
    { slug: 'keyword-gap',             name: 'Keyword Gap Analyzer',       prompt: (i) => `Identify keyword gaps between "${i.myDomain}" and "${i.competitorDomain}". Return JSON: {gaps: [{keyword, opportunity, difficulty}], suggestions}.` },
  ],
  content: [
    { slug: 'ai-content-writer',       name: 'AI Content Writer',          prompt: (i) => `Write a ${i.wordCount || 500}-word SEO blog post about: "${i.topic}". Target keyword: "${i.keyword}". Include H2/H3 headings. Return the full article.` },
    { slug: 'ai-rewriter',             name: 'AI Content Rewriter',         prompt: (i) => `Rewrite the following content to be 100% unique, SEO-optimized, and human-readable:\n\n${i.content}` },
    { slug: 'ai-detector',             name: 'AI Content Detector',         prompt: (i) => `Analyze this text and estimate probability it was AI-generated. Return JSON: {aiProbability(0-100), humanProbability(0-100), analysis, signals}.\n\nText:\n${i.text}` },
    { slug: 'plagiarism-checker',      name: 'Plagiarism Checker',          prompt: (i) => `Check this text for originality. Identify any potentially copied phrases and suggest unique rewrites. Return JSON: {originalityScore(0-100), flaggedPhrases, suggestions}.\n\nText:\n${i.text}` },
    { slug: 'grammar-checker',         name: 'Grammar Checker',             prompt: (i) => `Check grammar, spelling, and style. Return JSON: {score(0-100), errors:[{original, correction, type, explanation}], improvedText}.` },
    { slug: 'readability-checker',     name: 'Readability Checker',         prompt: (i) => `Analyze readability. Return JSON: {fleschScore, gradeLevel, avgSentenceLength, avgWordLength, suggestions, improvedText}.\n\nText:\n${i.text}` },
    { slug: 'meta-description',        name: 'Meta Description Generator',  prompt: (i) => `Write 5 compelling meta descriptions for a page about: "${i.topic}". Each 120-160 chars. Return JSON array of {description, charCount}.` },
    { slug: 'title-generator',         name: 'SEO Title Generator',         prompt: (i) => `Generate 10 SEO-optimized title tags for: "${i.topic}". Each 50-60 chars. Return JSON array of {title, charCount, clickworthiness}.` },
    { slug: 'faq-generator',           name: 'FAQ Generator',               prompt: (i) => `Generate 10 FAQs with answers for: "${i.topic}". Suitable for FAQ schema. Return JSON array of {question, answer}.` },
    { slug: 'blog-outline',            name: 'Blog Post Outline Generator', prompt: (i) => `Create a detailed blog post outline for: "${i.topic}". Include H2, H3 headings and key points. Return JSON: {title, outline:[{heading, level, points:[]}]}.` },
  ],
  technical: [
    { slug: 'seo-audit',               name: 'SEO Audit',                   prompt: (i) => `Perform a technical SEO audit analysis for a website about: "${i.domain}". Cover: meta tags, structured data, mobile, speed, crawlability. Return JSON: {score, issues:[{category, severity, description, fix}]}.` },
    { slug: 'robots-txt-analyzer',     name: 'Robots.txt Analyzer',         prompt: (i) => `Analyze this robots.txt content and identify issues:\n\n${i.content}\n\nReturn JSON: {issues, warnings, suggestions, isValid}.` },
    { slug: 'schema-generator',        name: 'Schema Markup Generator',     prompt: (i) => `Generate JSON-LD schema markup for a ${i.type} with these details: ${JSON.stringify(i.data || {})}. Return the complete JSON-LD object.` },
    { slug: 'hreflang-generator',      name: 'Hreflang Tag Generator',      prompt: (i) => `Generate hreflang tags for these page variants: ${JSON.stringify(i.pages || [])}. Return HTML link tags and a JSON array.` },
    { slug: 'xml-sitemap-analyzer',    name: 'XML Sitemap Analyzer',        prompt: (i) => `Analyze this sitemap and identify issues:\n${i.content}\n\nReturn JSON: {urlCount, issues, warnings, suggestions}.` },
    { slug: 'canonical-checker',       name: 'Canonical URL Checker',       prompt: (i) => `Explain canonical URL best practices for: "${i.url}". Return JSON: {recommendation, canonicalSuggestion, issues, explanation}.` },
    { slug: 'page-speed-advisor',      name: 'Page Speed Advisor',          prompt: (i) => `Provide page speed optimization recommendations for a website about: "${i.topic}". Return JSON: {recommendations:[{category, priority, action, impact}]}.` },
  ],
  link_building: [
    { slug: 'backlink-analyzer',       name: 'Backlink Analyzer',           prompt: (i) => `Analyze backlink profile strategy for: "${i.domain}". Return JSON: {domainAuthority, recommendedStrategies:[{name, difficulty, estimatedLinks}], insights}.` },
    { slug: 'broken-link-finder',      name: 'Broken Link Finder',          prompt: (i) => `Identify common places where broken links occur for a website in the "${i.niche}" niche. Return JSON: {commonSources, outreachTemplates:[{type, template}]}.` },
    { slug: 'link-building-ideas',     name: 'Link Building Ideas',         prompt: (i) => `Generate 15 creative link building strategies for: "${i.niche}". Return JSON array of {strategy, difficulty, potentialLinks, description}.` },
    { slug: 'anchor-text-generator',   name: 'Anchor Text Generator',       prompt: (i) => `Generate 20 diverse anchor text variations for linking to a page about: "${i.topic}". Include branded, exact, partial, generic. Return JSON array of {text, type, useCase}.` },
    { slug: 'guest-post-pitch',        name: 'Guest Post Pitch Generator',  prompt: (i) => `Write a professional guest post pitch email for the niche: "${i.niche}". Target site: "${i.targetSite}". Return JSON: {subject, body}.` },
  ],
  serp: [
    { slug: 'serp-snippet-preview',    name: 'SERP Snippet Preview',        prompt: (i) => `Create optimal SERP snippet for: title="${i.title}", description="${i.description}", url="${i.url}". Return JSON: {displayTitle, displayUrl, displayDescription, charCounts, improvements}.` },
    { slug: 'featured-snippet',        name: 'Featured Snippet Optimizer',  prompt: (i) => `Optimize content for featured snippet for keyword: "${i.keyword}". Return JSON: {snippetType, optimizedContent, structureRecommendation, tips}.` },
    { slug: 'people-also-ask',         name: 'People Also Ask Generator',   prompt: (i) => `Generate 10 "People Also Ask" questions for: "${i.keyword}". Return JSON array of {question, shortAnswer, longAnswer}.` },
    { slug: 'serp-competitor-analysis',name: 'SERP Competitor Analysis',    prompt: (i) => `Analyze SERP competition for keyword: "${i.keyword}". Return JSON: {competitionLevel, topOpportunities, contentGaps, recommendedWordCount}.` },
  ],
  local: [
    { slug: 'local-seo-audit',         name: 'Local SEO Audit',             prompt: (i) => `Audit local SEO for business: "${i.businessName}" in "${i.location}". Return JSON: {score, issues, recommendations, citations}.` },
    { slug: 'gmb-description',         name: 'Google My Business Description', prompt: (i) => `Write 3 Google My Business descriptions for: "${i.businessName}" (${i.category}) in "${i.location}". Each 750 chars max. Return JSON array of {description, charCount}.` },
    { slug: 'local-keywords',          name: 'Local Keyword Generator',     prompt: (i) => `Generate 20 local SEO keywords for: "${i.businessType}" in "${i.location}". Return JSON array of {keyword, localIntent, estimatedVolume}.` },
    { slug: 'nap-checker',             name: 'NAP Consistency Checker',     prompt: (i) => `Analyze NAP (Name, Address, Phone) consistency for: ${JSON.stringify(i.nap)}. Return JSON: {issues, recommendations, score}.` },
  ],
  image: [
    { slug: 'alt-text-generator',      name: 'Alt Text Generator',          prompt: (i) => `Generate SEO-optimized alt text for an image of: "${i.description}". Return JSON array of 5 {altText, charCount, keywordRichness}.` },
    { slug: 'image-filename',          name: 'Image Filename Generator',    prompt: (i) => `Generate 5 SEO-friendly filenames for an image of: "${i.description}". Return JSON array of {filename, reasoning}.` },
  ],
};

// ── SEO Tool Runner ───────────────────────────────────────────
exports.getSeoTools = (req, res) => {
  const catalog = {};
  for (const [cat, tools] of Object.entries(SEO_TOOLS)) {
    catalog[cat] = tools.map(({ slug, name }) => ({ slug, name, category: cat }));
  }
  res.json({ success: true, categories: Object.keys(SEO_TOOLS), tools: catalog });
};

exports.runSeoTool = async (req, res) => {
  try {
    const { toolSlug, inputs = {} } = req.body;
    if (!toolSlug) return res.status(400).json({ success: false, message: 'toolSlug required' });

    let toolDef = null;
    for (const tools of Object.values(SEO_TOOLS)) {
      const found = tools.find(t => t.slug === toolSlug);
      if (found) { toolDef = found; break; }
    }
    if (!toolDef) return res.status(404).json({ success: false, message: `Tool "${toolSlug}" not found` });

    const prompt = toolDef.prompt(inputs);
    const { text, tokens, duration } = await callGemini(prompt);

    let result;
    // Try to parse JSON - many tools return structured JSON
    try {
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(clean);
    } catch {
      result = { text };
    }

    const run = await ZAMSeoRun.create({ user: req.user._id, toolSlug, inputs, result, tokensUsed: tokens, duration });
    res.json({ success: true, result, runId: run._id, tokensUsed: tokens, duration });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSeoHistory = async (req, res) => {
  try {
    const { toolSlug, page = 1, limit = 20 } = req.query;
    const q = { user: req.user._id };
    if (toolSlug) q.toolSlug = toolSlug;
    const [runs, total] = await Promise.all([
      ZAMSeoRun.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
      ZAMSeoRun.countDocuments(q),
    ]);
    res.json({ success: true, runs, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── CRM Contacts ──────────────────────────────────────────────
exports.getContacts = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status, tag, country, city } = req.query;
    const q = { user: req.user._id, isDuplicate: false };
    if (status)  q.status  = status;
    if (tag)     q.tags    = tag;
    if (country) q.country = { $regex: country, $options: 'i' };
    if (city)    q.city    = { $regex: city, $options: 'i' };
    if (search) {
      q.$or = [
        { firstName:  { $regex: search, $options: 'i' } },
        { lastName:   { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } },
        { company:    { $regex: search, $options: 'i' } },
        { jobTitle:   { $regex: search, $options: 'i' } },
      ];
    }
    const [contacts, total] = await Promise.all([
      ZAMContact.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
      ZAMContact.countDocuments(q),
    ]);
    res.json({ success: true, contacts, total, page: +page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getContact = async (req, res) => {
  try {
    const c = await ZAMContact.findOne({ _id: req.params.id, user: req.user._id });
    if (!c) return res.status(404).json({ success: false, message: 'Not found' });
    const notes = await ZAMNote.find({ contact: c._id }).sort({ createdAt: -1 });
    res.json({ success: true, contact: c, notes });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createContact = async (req, res) => {
  try {
    const c = await ZAMContact.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, contact: c });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateContact = async (req, res) => {
  try {
    const c = await ZAMContact.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    if (!c) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, contact: c });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteContact = async (req, res) => {
  try {
    await ZAMContact.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.bulkDeleteContacts = async (req, res) => {
  try {
    const { ids } = req.body;
    await ZAMContact.deleteMany({ _id: { $in: ids }, user: req.user._id });
    res.json({ success: true, message: `${ids.length} contacts deleted` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.importContacts = async (req, res) => {
  try {
    if (!req.files?.file) return res.status(400).json({ success: false, message: 'CSV file required' });
    const csvParse = require('csv-parse/sync');
    const rows = csvParse.parse(req.files.file.data.toString(), { columns: true, skip_empty_lines: true });
    let imported = 0, skipped = 0;
    for (const row of rows) {
      if (!row.firstName && !row.first_name && !row.name) { skipped++; continue; }
      const firstName = row.firstName || row.first_name || (row.name || '').split(' ')[0] || '';
      const lastName  = row.lastName  || row.last_name  || (row.name || '').split(' ').slice(1).join(' ') || '';
      const email     = (row.email || '').toLowerCase().trim();
      if (email) {
        const exists = await ZAMContact.findOne({ user: req.user._id, email });
        if (exists) { skipped++; continue; }
      }
      await ZAMContact.create({ user: req.user._id, firstName, lastName, email, phone: row.phone || '', company: row.company || '', jobTitle: row.jobTitle || row.job_title || '', source: 'import' });
      imported++;
    }
    res.json({ success: true, message: `Imported ${imported}, skipped ${skipped}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.exportContacts = async (req, res) => {
  try {
    const { ids } = req.body;
    const q = { user: req.user._id };
    if (ids?.length) q._id = { $in: ids };
    const contacts = await ZAMContact.find(q).lean();
    const headers = ['firstName','lastName','email','phone','company','jobTitle','website','city','state','country','tags','status'];
    const rows = [headers, ...contacts.map(c => headers.map(h => h === 'tags' ? (c.tags || []).join(';') : c[h] || ''))];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="contacts_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Smart Merge & Deduplication ───────────────────────────────
exports.findDuplicates = async (req, res) => {
  try {
    const duplicates = [];
    // Find contacts with same email
    const emailGroups = await ZAMContact.aggregate([
      { $match: { user: req.user._id, email: { $ne: '' } } },
      { $group: { _id: '$email', count: { $sum: 1 }, contacts: { $push: '$$ROOT' } } },
      { $match: { count: { $gt: 1 } } },
    ]);
    for (const group of emailGroups) {
      duplicates.push({ type: 'email', value: group._id, contacts: group.contacts, count: group.count });
    }
    // Find contacts with same name + company
    const nameGroups = await ZAMContact.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: { fn: '$firstName', ln: '$lastName', co: '$company' }, count: { $sum: 1 }, contacts: { $push: '$$ROOT' } } },
      { $match: { count: { $gt: 1 } } },
    ]);
    for (const group of nameGroups) {
      duplicates.push({ type: 'name+company', value: `${group._id.fn} ${group._id.ln} @ ${group._id.co}`, contacts: group.contacts, count: group.count });
    }
    res.json({ success: true, duplicates, total: duplicates.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.mergeContacts = async (req, res) => {
  try {
    const { keepId, mergeIds } = req.body;
    if (!keepId || !mergeIds?.length) return res.status(400).json({ success: false, message: 'keepId and mergeIds required' });
    const keep = await ZAMContact.findOne({ _id: keepId, user: req.user._id });
    if (!keep) return res.status(404).json({ success: false, message: 'Primary contact not found' });
    const duplicates = await ZAMContact.find({ _id: { $in: mergeIds }, user: req.user._id });
    // Merge fields: fill empty fields from duplicates
    for (const dup of duplicates) {
      const fields = ['email','phone','company','jobTitle','website','linkedin','twitter','address','city','state','country'];
      for (const field of fields) {
        if (!keep[field] && dup[field]) keep[field] = dup[field];
      }
      // Merge tags
      keep.tags = [...new Set([...(keep.tags || []), ...(dup.tags || [])])];
      // Move notes
      await ZAMNote.updateMany({ contact: dup._id }, { contact: keep._id });
      // Mark as merged
      await ZAMContact.findByIdAndUpdate(dup._id, { mergedInto: keep._id, isDuplicate: true });
    }
    await keep.save();
    res.json({ success: true, contact: keep, mergedCount: duplicates.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── AI Contact Enrichment ─────────────────────────────────────
exports.enrichContact = async (req, res) => {
  try {
    const contact = await ZAMContact.findOne({ _id: req.params.id, user: req.user._id });
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    const prompt = `Enrich contact information for: ${contact.firstName} ${contact.lastName}, ${contact.jobTitle || ''} at ${contact.company || ''}. Return JSON: {bio, skills:[], industryInsights, companySize, estimatedRevenue, linkedinProfile, twitterProfile, website}.`;
    const { text } = await callGemini(prompt);
    const enrichment = parseJsonResult(text);
    await ZAMContact.findByIdAndUpdate(contact._id, { customFields: { ...(contact.customFields || {}), enrichment }, enrichedAt: new Date() });
    res.json({ success: true, enrichment, contactId: contact._id });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Notes ─────────────────────────────────────────────────────
exports.getNotes = async (req, res) => {
  try {
    const notes = await ZAMNote.find({ contact: req.params.contactId, user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, notes });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createNote = async (req, res) => {
  try {
    const note = await ZAMNote.create({ ...req.body, contact: req.params.contactId, user: req.user._id });
    res.status(201).json({ success: true, note });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteNote = async (req, res) => {
  try {
    await ZAMNote.findOneAndDelete({ _id: req.params.noteId, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Lead Generation ───────────────────────────────────────────
// IMPORTANT: this used to ask Gemini to "generate realistic business leads",
// which fabricated fictitious names/emails/phone numbers and presented them
// as real leads. That's not acceptable for a production tool. This now
// queries OpenStreetMap (Nominatim for geocoding + Overpass for POI data) —
// both free, keyless, and returning real, currently-existing businesses.
// Trade-off: OSM has thinner coverage than Google Maps and rarely has email
// addresses or star ratings, so those fields are left blank rather than
// invented.
const OSM_HEADERS = { 'User-Agent': 'MarkProLeadGen/1.0 (contact: support@markpro.app)' };

async function geocodeArea(city, state, country) {
  const q = [city, state, country].filter(Boolean).join(', ');
  if (!q) return null;
  const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q, format: 'json', limit: 1 }, headers: OSM_HEADERS, timeout: 10000,
  });
  if (!data?.length) return null;
  const { boundingbox } = data[0]; // [south, north, west, east] as strings
  return { south: +boundingbox[0], north: +boundingbox[1], west: +boundingbox[2], east: +boundingbox[3] };
}

async function overpassSearch(keyword, bbox) {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const kw = keyword.replace(/["\\]/g, '');
  const query = `
    [out:json][timeout:25];
    (
      node["name"~"${kw}",i](${bboxStr});
      way["name"~"${kw}",i](${bboxStr});
      node["shop"]["name"](${bboxStr});
      node["amenity"]["name"](${bboxStr});
    );
    out center 60;
  `;
  const { data } = await axios.post('https://overpass-api.de/api/interpreter', query, {
    headers: { ...OSM_HEADERS, 'Content-Type': 'text/plain' }, timeout: 25000,
  });
  return data.elements || [];
}

function osmElementToLead(el, keyword) {
  const t = el.tags || {};
  const lat = el.lat ?? el.center?.lat ?? null;
  const lon = el.lon ?? el.center?.lon ?? null;
  return {
    name: t.name || '',
    company: t.name || '',
    jobTitle: '',
    email: t.email || t['contact:email'] || '',
    phone: t.phone || t['contact:phone'] || t['phone:mobile'] || '',
    website: t.website || t['contact:website'] || '',
    address: [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '),
    city: t['addr:city'] || '',
    state: t['addr:state'] || '',
    country: t['addr:country'] || '',
    postalCode: t['addr:postcode'] || '',
    latitude: lat, longitude: lon,
    rating: null, reviewCount: 0,
    category: t.shop || t.amenity || t.office || keyword,
    placeId: `osm:${el.type}/${el.id}`,
  };
}

exports.getLeadSearches = async (req, res) => {
  try {
    const searches = await ZAMLeadSearch.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, searches });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createLeadSearch = async (req, res) => {
  try {
    const job = await ZAMLeadSearch.create({ ...req.body, user: req.user._id, source: 'openstreetmap', status: 'queued' });
    res.status(201).json({ success: true, job, message: 'Lead search queued. Results appear as they are found.' });
    // Real business lookup in the background (OpenStreetMap — free, no API key)
    setImmediate(async () => {
      try {
        job.status = 'running';
        await job.save();
        const bbox = await geocodeArea(job.city, job.state, job.country);
        if (!bbox) throw new Error('Could not locate that city/state/country on the map. Try a more specific location.');
        const elements = await overpassSearch(job.keyword, bbox);
        const seen = new Set();
        let count = 0;
        for (const el of elements) {
          if (!el.tags?.name) continue;
          const key = el.tags.name + '|' + (el.lat ?? el.center?.lat);
          if (seen.has(key)) continue;
          seen.add(key);
          await ZAMLead.create({ ...osmElementToLead(el, job.keyword), user: job.user, searchId: job._id, source: 'openstreetmap' });
          count++;
        }
        job.status = 'completed';
        job.resultsCount = count;
        await job.save();
      } catch (e) { job.status = 'failed'; job.errorMessage = e.message; await job.save(); }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getLeads = async (req, res) => {
  try {
    const { searchId, page = 1, limit = 50 } = req.query;
    const q = { user: req.user._id };
    if (searchId) q.searchId = searchId;
    const [leads, total] = await Promise.all([
      ZAMLead.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
      ZAMLead.countDocuments(q),
    ]);
    res.json({ success: true, leads, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.importLeadsToContacts = async (req, res) => {
  try {
    const { ids } = req.body;
    const leads = await ZAMLead.find({ _id: { $in: ids }, user: req.user._id, importedToContacts: false });
    let imported = 0, skipped = 0;
    for (const lead of leads) {
      if (lead.email) {
        const exists = await ZAMContact.findOne({ user: req.user._id, email: lead.email });
        if (exists) { skipped++; continue; }
      }
      const [firstName, ...rest] = (lead.name || 'Unknown').split(' ');
      await ZAMContact.create({ user: req.user._id, firstName, lastName: rest.join(' '), email: lead.email || '', phone: lead.phone || '', company: lead.company || '', jobTitle: lead.jobTitle || '', website: lead.website || '', address: lead.address || '', city: lead.city || '', state: lead.state || '', country: lead.country || '', source: 'scrape', rating: lead.rating });
      lead.importedToContacts = true;
      await lead.save();
      imported++;
    }
    res.json({ success: true, message: `Imported ${imported} leads to contacts, skipped ${skipped}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.exportLeads = async (req, res) => {
  try {
    const { ids, searchId } = req.body;
    const q = { user: req.user._id };
    if (ids?.length) q._id = { $in: ids };
    else if (searchId) q.searchId = searchId;
    const leads = await ZAMLead.find(q).lean();
    const headers = ['name','company','jobTitle','email','phone','website','address','city','state','country','rating','category'];
    const rows = [headers, ...leads.map(l => headers.map(h => l[h] || ''))];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${Date.now()}.csv"`);
    res.send(csv);
    // Mark as exported
    await ZAMLead.updateMany({ _id: { $in: leads.map(l => l._id) } }, { exported: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Asset Library ─────────────────────────────────────────────
exports.getAssets = async (req, res) => {
  try {
    const { type, page = 1, limit = 30 } = req.query;
    const q = { user: req.user._id };
    if (type) q.type = type;
    const [assets, total] = await Promise.all([
      ZAMAsset.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
      ZAMAsset.countDocuments(q),
    ]);
    res.json({ success: true, assets, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.uploadAsset = async (req, res) => {
  try {
    if (!req.files?.file) return res.status(400).json({ success: false, message: 'File required' });
    const file = req.files.file;
const dir  = process.env.VERCEL ? path.join('/tmp', 'zam-assets') : path.join(__dirname, '../../../uploads/zam-assets');    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const fname = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.name)}`;
    await file.mv(path.join(dir, fname));
    const type = file.mimetype.startsWith('image') ? 'image' : file.mimetype.startsWith('video') ? 'video' : file.mimetype.startsWith('audio') ? 'audio' : 'document';
    const asset = await ZAMAsset.create({ user: req.user._id, name: file.name, type, url: `/uploads/zam-assets/${fname}`, filename: fname, mimeType: file.mimetype, size: file.size });
    res.status(201).json({ success: true, asset });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteAsset = async (req, res) => {
  try {
    const a = await ZAMAsset.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (a?.filename) { const fp = path.join(__dirname, '../../../uploads/zam-assets', a.filename); if (fs.existsSync(fp)) fs.unlinkSync(fp); }
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Admin ─────────────────────────────────────────────────────
exports.adminStats = async (req, res) => {
  try {
    const [contacts, leads, seoRuns, assets] = await Promise.all([
      ZAMContact.countDocuments(),
      ZAMLead.countDocuments(),
      ZAMSeoRun.countDocuments(),
      ZAMAsset.countDocuments(),
    ]);
    res.json({ success: true, stats: { contacts, leads, seoToolRuns: seoRuns, assets } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Exported so other routers (e.g. the SEO tools router) can reuse the
// prompt catalog instead of duplicating it.
module.exports.SEO_TOOLS = SEO_TOOLS;
