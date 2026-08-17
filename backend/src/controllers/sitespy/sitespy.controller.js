const { SSPWebsite, SSPVisitor, SSPUrl, SSPWhois, SSPKeyword, SSPPlan } = require('../../models/ToolsAI_SiteSpy.models');
const User       = require('../../models/User.model');
const crypto     = require('crypto');
const axios      = require('axios');
const dns        = require('dns').promises;
const useragent  = require('useragent');

// ── Plans ─────────────────────────────────────────────────────
exports.getPlans = async (req, res) => {
  try { res.json({ success: true, plans: await SSPPlan.find({ isActive: true }).sort({ price: 1 }) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Websites (tracked sites) ──────────────────────────────────
exports.getWebsites = async (req, res) => {
  try {
    const sites = await SSPWebsite.find({ userId: req.user._id, isActive: true });
    // Append visitor counts
    const withStats = await Promise.all(sites.map(async s => {
      const [total, today] = await Promise.all([
        SSPVisitor.countDocuments({ websiteId: s._id }),
        SSPVisitor.countDocuments({ websiteId: s._id, dateTime: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      ]);
      return { ...s.toObject(), stats: { totalVisitors: total, todayVisitors: today } };
    }));
    res.json({ success: true, websites: withStats });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createWebsite = async (req, res) => {
  try {
    const trackingCode = 'SSP-' + crypto.randomBytes(8).toString('hex').toUpperCase();
    const site = await SSPWebsite.create({ ...req.body, userId: req.user._id, trackingCode });
    res.status(201).json({ success: true, website: site });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteWebsite = async (req, res) => {
  try {
    await SSPWebsite.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isActive: false });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getWebsiteAnalytics = async (req, res) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;
    const site = await SSPWebsite.findOne({ _id: req.params.id, userId: req.user._id });
    if (!site) return res.status(404).json({ success: false, message: 'Not found' });
    const q = { websiteId: site._id };
    if (from || to) { q.dateTime = {}; if (from) q.dateTime.$gte = new Date(from); if (to) q.dateTime.$lte = new Date(to); }
    const [total, unique, newVisitors, sources, devices, browsers, topPages] = await Promise.all([
      SSPVisitor.countDocuments(q),
      SSPVisitor.distinct('cookieValue', q).then(r => r.length),
      SSPVisitor.countDocuments({ ...q, isNewVisitor: true }),
      SSPVisitor.aggregate([{ $match: q }, { $group: { _id: '$trafficSource', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      SSPVisitor.aggregate([{ $match: q }, { $group: { _id: '$device', count: { $sum: 1 } } }]),
      SSPVisitor.aggregate([{ $match: q }, { $group: { _id: '$browser', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      SSPVisitor.aggregate([{ $match: q }, { $group: { _id: '$visitUrl', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    ]);
    res.json({ success: true, stats: { total, unique, newVisitors, sources, devices, browsers, topPages } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Public tracker endpoint (called by tracker.js pixel) ──────
exports.trackVisit = async (req, res) => {
  try {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    const { tc, url, ref, title, cookie, session, isNew } = req.query;
    if (!tc) return;
    const site = await SSPWebsite.findOne({ trackingCode: tc, isActive: true });
    if (!site) return;
    const ip = req.ip || req.connection.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    const agent = useragent.parse(ua);
    let country = '', city = '', countryCode = '';
    if (process.env.IPINFO_TOKEN && ip && ip !== '::1') {
      try {
        const { data } = await axios.get(`https://ipinfo.io/${ip}?token=${process.env.IPINFO_TOKEN}`);
        country = data.country || ''; city = data.city || ''; countryCode = data.country || '';
      } catch {}
    }
    const referer = ref || req.headers.referer || '';
    let trafficSource = 'direct';
    if (referer) {
      if (/google|bing|yahoo|duckduckgo/i.test(referer)) trafficSource = 'organic';
      else if (/facebook|twitter|instagram|linkedin|tiktok/i.test(referer)) trafficSource = 'social';
      else trafficSource = 'referral';
    }
    await SSPVisitor.create({
      websiteId: site._id, userId: site.userId,
      cookieValue: cookie || '', sessionValue: session || '',
      isNewVisitor: isNew === '1',
      visitUrl: url || '', referrer: referer, pageTitle: title || '',
      ip, country, countryCode, city,
      browser: agent.family, browserVersion: agent.major,
      os: agent.os.family,
      device: /mobile/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop',
      userAgent: ua, trafficSource, dateTime: new Date(),
    });
  } catch {}
};

// ── Tracker JS snippet ─────────────────────────────────────────
exports.getTrackerJs = (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
  const js = `
(function(){
  var tc='${req.params.code}';
  var c=document.cookie.match(/ssp_vid=([^;]+)/);
  var vid=c?c[1]:(Math.random().toString(36).slice(2)+Date.now());
  if(!c)document.cookie='ssp_vid='+vid+';path=/;max-age=31536000';
  var s=sessionStorage.getItem('ssp_sid')||Math.random().toString(36).slice(2);
  sessionStorage.setItem('ssp_sid',s);
  var n=!c?'1':'0';
  var img=new Image();
  img.src='${baseUrl}/api/sitespy/track?tc='+tc+'&url='+encodeURIComponent(location.href)+'&ref='+encodeURIComponent(document.referrer)+'&title='+encodeURIComponent(document.title)+'&cookie='+vid+'&session='+s+'&isNew='+n;
})();`.trim();
  res.setHeader('Content-Type', 'application/javascript');
  res.send(js);
};

// ── URL Shortener ─────────────────────────────────────────────
exports.getUrls = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [urls, total] = await Promise.all([
      SSPUrl.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit).select('-clickData'),
      SSPUrl.countDocuments({ userId: req.user._id }),
    ]);
    res.json({ success: true, urls, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createShortUrl = async (req, res) => {
  try {
    const { originalUrl, customSlug, provider = 'internal' } = req.body;
    let shortCode = customSlug || crypto.randomBytes(4).toString('hex');
    let shortUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/s/${shortCode}`;
    if (provider === 'bitly') {
      const key = req.user.settings?.sitespy?.bitlyKey || process.env.BITLY_API_KEY;
      if (key) {
        try {
          const { data } = await axios.post('https://api-ssl.bitly.com/v4/shorten', { long_url: originalUrl }, { headers: { Authorization: `Bearer ${key}` } });
          shortUrl = data.link; shortCode = data.id;
        } catch {}
      }
    } else if (provider === 'rebrandly') {
      const key = req.user.settings?.sitespy?.rebrandlyKey || process.env.REBRANDLY_API_KEY;
      if (key) {
        try {
          const { data } = await axios.post('https://api.rebrandly.com/v1/links', { destination: originalUrl }, { headers: { apikey: key } });
          shortUrl = `https://${data.fullUrl}`; shortCode = data.slashtag;
        } catch {}
      }
    }
    const url = await SSPUrl.create({ userId: req.user._id, originalUrl, shortCode, provider, shortUrl, isActive: true });
    res.status(201).json({ success: true, url });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.redirectShortUrl = async (req, res) => {
  try {
    const url = await SSPUrl.findOneAndUpdate({ shortCode: req.params.code, isActive: true }, {
      $inc: { clicks: 1 },
      $push: { clickData: { ip: req.ip, country: '', browser: '', referrer: req.headers.referer || '', clickedAt: new Date() } },
    }, { new: true });
    if (!url) return res.status(404).send('Link not found');
    res.redirect(301, url.originalUrl);
  } catch (err) { res.status(500).send('Error'); }
};

exports.deleteUrl = async (req, res) => {
  try {
    await SSPUrl.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── WHOIS ──────────────────────────────────────────────────────
exports.whoisLookup = async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ success: false, message: 'Domain required' });
    let result;
    try {
      const whois = require('whois');
      await new Promise((resolve, reject) => {
        whois.lookup(domain, (err, data) => {
          if (err) reject(err);
          else {
            result = { domainName: domain, rawData: data, isRegistered: !data.includes('No match for') };
            resolve();
          }
        });
      });
    } catch {
      result = { domainName: domain, rawData: '', isRegistered: false, error: 'whois lookup failed' };
    }
    const saved = await SSPWhois.create({ userId: req.user._id, ...result });
    res.json({ success: true, whois: saved });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── DNS Lookup ────────────────────────────────────────────────
exports.dnsLookup = async (req, res) => {
  try {
    const { domain, type = 'A' } = req.body;
    let records = [];
    try {
      if (type === 'A')     records = await dns.resolve4(domain);
      else if (type === 'AAAA') records = await dns.resolve6(domain);
      else if (type === 'MX')   records = await dns.resolveMx(domain);
      else if (type === 'TXT')  records = await dns.resolveTxt(domain);
      else if (type === 'NS')   records = await dns.resolveNs(domain);
      else if (type === 'CNAME')records = await dns.resolveCname(domain);
      else if (type === 'ALL')  records = await dns.resolveAny(domain);
    } catch (e) { records = []; }
    res.json({ success: true, domain, type, records });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Keyword Position ──────────────────────────────────────────
exports.getKeywords = async (req, res) => {
  try {
    res.json({ success: true, keywords: await SSPKeyword.find({ userId: req.user._id }).sort({ createdAt: -1 }) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.addKeyword = async (req, res) => {
  try {
    const kw = await SSPKeyword.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, keyword: kw });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteKeyword = async (req, res) => {
  try {
    await SSPKeyword.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Security Scan ──────────────────────────────────────────────
exports.securityScan = async (req, res) => {
  try {
    const { url } = req.body;
    const results = { url, safe: true, threats: [], checkedAt: new Date() };
    const vtKey  = process.env.VIRUSTOTAL_API_KEY;
    const sbKey  = process.env.SAFE_BROWSING_API_KEY;
    if (vtKey) {
      try {
        const encoded = Buffer.from(url).toString('base64').replace(/=/g,'');
        const { data } = await axios.get(`https://www.virustotal.com/api/v3/urls/${encoded}`, { headers: { 'x-apikey': vtKey } });
        const stats = data.data?.attributes?.last_analysis_stats;
        if (stats?.malicious > 0) { results.safe = false; results.threats.push(`VirusTotal: ${stats.malicious} malicious detections`); }
      } catch {}
    }
    if (sbKey) {
      try {
        const { data } = await axios.post(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${sbKey}`, {
          client: { clientId: 'markpro', clientVersion: '5.0' },
          threatInfo: { threatTypes: ['MALWARE','SOCIAL_ENGINEERING','UNWANTED_SOFTWARE'], platformTypes: ['ANY_PLATFORM'], threatEntryTypes: ['URL'], threatEntries: [{ url }] },
        });
        if (data.matches?.length) { results.safe = false; results.threats.push(`Google Safe Browsing: ${data.matches[0].threatType}`); }
      } catch {}
    }
    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Admin ─────────────────────────────────────────────────────
exports.adminStats = async (req, res) => {
  try {
    const [sites, visitors, urls, keywords] = await Promise.all([
      SSPWebsite.countDocuments({ isActive: true }),
      SSPVisitor.countDocuments(),
      SSPUrl.countDocuments(),
      SSPKeyword.countDocuments(),
    ]);
    res.json({ success: true, stats: { sites, totalVisitors: visitors, shortUrls: urls, keywords } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
