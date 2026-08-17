const { runTool, TOOLS } = require('../../services/tools/seo.service');
const { Project, Report, ToolRun, Payment } = require('../../models/PHPRank.models');
const User = require('../../models/User.model');
const Plan = require('../../models/Plan.model');
const logger = require('../../utils/logger');

/* ═══════════════ TOOLS ═══════════════════════════ */
exports.runTool = async (req, res) => {
  const { tool } = req.params;
  const input = req.body;
  const user = req.user || null;

  if (!TOOLS[tool])
    return res.status(404).json({ success: false, message: `Unknown tool: ${tool}` });

  // Guest rate limit: 3 runs/day by IP (simple in-memory, use Redis in prod)
  const start = Date.now();
  try {
    const { results, duration } = await runTool(tool, input);

    // Log run
    await ToolRun.create({
      user: user?._id || null,
      tool,
      input,
      results,
      status: 'completed',
      ip: req.ip,
      duration,
    });

    // Increment usage
    if (user) await User.findByIdAndUpdate(user._id, { $inc: { 'usage.toolRuns': 1 } });

    res.json({ success: true, data: { tool, input, results, duration } });
  } catch (err) {
    logger.error(`Tool ${tool} failed: ${err.message}`);

    await ToolRun.create({
      user: user?._id || null, tool, input, results: null, status: 'failed', ip: req.ip,
    }).catch(() => {});

    res.status(500).json({ success: false, message: err.message || 'Tool execution failed' });
  }
};

exports.getToolList = (req, res) => {
  const tools = [
    { slug: 'seo_audit', name: 'SEO Audit', description: 'Complete on-page SEO analysis', icon: 'Search', category: 'SEO', fields: [{ key: 'url', label: 'Website URL', type: 'url', placeholder: 'https://example.com', required: true }] },
    { slug: 'meta_tags', name: 'Meta Tags Analyzer', description: 'Analyze all meta tags, Open Graph & Twitter Card', icon: 'Tag', category: 'SEO', fields: [{ key: 'url', label: 'Website URL', type: 'url', placeholder: 'https://example.com', required: true }] },
    { slug: 'page_speed', name: 'Page Speed Test', description: 'Performance metrics & Core Web Vitals', icon: 'Zap', category: 'Performance', fields: [{ key: 'url', label: 'Website URL', type: 'url', placeholder: 'https://example.com', required: true }] },
    { slug: 'keyword_density', name: 'Keyword Density', description: 'Analyze keyword usage and density', icon: 'BarChart2', category: 'Content', fields: [{ key: 'url', label: 'Website URL', type: 'url', placeholder: 'https://example.com', required: true }, { key: 'keyword', label: 'Target Keyword (optional)', type: 'text', placeholder: 'seo tools', required: false }] },
    { slug: 'broken_links', name: 'Broken Link Checker', description: 'Find all broken links on a page', icon: 'LinkOff', category: 'SEO', fields: [{ key: 'url', label: 'Website URL', type: 'url', placeholder: 'https://example.com', required: true }] },
    { slug: 'ssl_check', name: 'SSL Certificate Checker', description: 'Verify SSL validity and expiry', icon: 'Shield', category: 'Security', fields: [{ key: 'url', label: 'Website URL or Domain', type: 'url', placeholder: 'https://example.com', required: true }] },
    { slug: 'dns_lookup', name: 'DNS Lookup', description: 'Query A, MX, NS, TXT and CNAME records', icon: 'Globe', category: 'Network', fields: [{ key: 'url', label: 'Domain Name', type: 'text', placeholder: 'example.com', required: true }] },
    { slug: 'whois', name: 'WHOIS Lookup', description: 'Domain registration & ownership info', icon: 'Info', category: 'Network', fields: [{ key: 'url', label: 'Domain Name', type: 'text', placeholder: 'example.com', required: true }] },
    { slug: 'sitemap', name: 'Sitemap Checker', description: 'Validate XML sitemap and list URLs', icon: 'Map', category: 'SEO', fields: [{ key: 'url', label: 'Website URL', type: 'url', placeholder: 'https://example.com', required: true }] },
    { slug: 'robots_txt', name: 'Robots.txt Checker', description: 'Analyze robots.txt file rules', icon: 'Bot', category: 'SEO', fields: [{ key: 'url', label: 'Website URL', type: 'url', placeholder: 'https://example.com', required: true }] },
    { slug: 'redirect_check', name: 'Redirect Checker', description: 'Trace URL redirect chains', icon: 'ArrowRight', category: 'Network', fields: [{ key: 'url', label: 'URL to Check', type: 'url', placeholder: 'https://example.com', required: true }] },
    { slug: 'social_preview', name: 'Social Media Preview', description: 'Preview how your link looks on social networks', icon: 'Share2', category: 'Social', fields: [{ key: 'url', label: 'Website URL', type: 'url', placeholder: 'https://example.com', required: true }] },
    { slug: 'ip_lookup', name: 'IP Lookup', description: 'Geolocate an IP address or domain', icon: 'MapPin', category: 'Network', fields: [{ key: 'url', label: 'IP Address or Domain', type: 'text', placeholder: '8.8.8.8 or example.com', required: true }] },
    { slug: 'readability', name: 'Readability Checker', description: 'Flesch reading ease & content stats', icon: 'BookOpen', category: 'Content', fields: [{ key: 'url', label: 'Website URL', type: 'url', placeholder: 'https://example.com', required: true }] },
  ];
  res.json({ success: true, data: tools });
};

/* ═══════════════ PROJECTS ════════════════════════ */
exports.listProjects = async (req, res) => {
  try {
    const projects = await Project.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch projects' }); }
};

exports.createProject = async (req, res) => {
  try {
    const plan = req.user.plan;
    const limit = plan?.limits?.projects ?? 1;
    if (limit !== -1) {
      const count = await Project.countDocuments({ user: req.user._id });
      if (count >= limit)
        return res.status(403).json({ success: false, message: `Project limit (${limit}) reached. Upgrade to add more.` });
    }
    const project = await Project.create({ user: req.user._id, ...req.body });
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'usage.projects': 1 } });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    const p = await Project.findOne({ _id: req.params.id, user: req.user._id });
    if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: p });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch project' }); }
};

exports.updateProject = async (req, res) => {
  try {
    const p = await Project.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteProject = async (req, res) => {
  try {
    const p = await Project.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
    await Report.deleteMany({ project: p._id });
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'usage.projects': -1 } });
    res.json({ success: true, message: 'Project deleted' });
  } catch { res.status(500).json({ success: false, message: 'Failed to delete project' }); }
};

/* ═══════════════ REPORTS ═════════════════════════ */
exports.listReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, projectId } = req.query;
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (projectId) filter.project = projectId;
    const total = await Report.countDocuments(filter);
    const reports = await Report.find(filter).populate('project', 'name domain').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit);
    res.json({ success: true, data: { reports, pagination: { total, page: +page, pages: Math.ceil(total / limit) } } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch reports' }); }
};

exports.runReport = async (req, res) => {
  try {
    const { url, type, projectId } = req.body;
    const plan = req.user.plan;
    const monthLimit = plan?.limits?.reportsPerMonth ?? 10;
    if (monthLimit !== -1 && req.user.usage.reports >= monthLimit)
      return res.status(403).json({ success: false, message: `Monthly report limit (${monthLimit}) reached. Upgrade to continue.` });

    const report = await Report.create({ user: req.user._id, project: projectId || null, type, url, status: 'running' });
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'usage.reports': 1 } });

    // Run async
    runTool(type, { url }).then(async ({ results, duration }) => {
      const update = { status: 'completed', results, duration };
      if (results.score !== undefined) update.score = results.score;
      if (results.summary) update.summary = results.summary;
      if (results.issues) update.issues = results.issues;
      await Report.findByIdAndUpdate(report._id, update);
      // Update project latest score
      if (projectId && results.score !== undefined) {
        await Project.findByIdAndUpdate(projectId, { latestScore: results.score, latestAuditAt: new Date() });
      }
    }).catch(async (err) => {
      await Report.findByIdAndUpdate(report._id, { status: 'failed', errorMessage: err.message });
    });

    res.status(202).json({ success: true, message: 'Report started', data: { reportId: report._id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getReport = async (req, res) => {
  try {
    const r = await Report.findOne({ _id: req.params.id, user: req.user._id }).populate('project', 'name domain');
    if (!r) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: r });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch report' }); }
};

exports.deleteReport = async (req, res) => {
  try {
    const r = await Report.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!r) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, message: 'Report deleted' });
  } catch { res.status(500).json({ success: false, message: 'Failed to delete report' }); }
};

/* ═══════════════ USER ════════════════════════════ */
exports.updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, avatar }, { new: true }).populate('plan');
    res.json({ success: true, data: user });
  } catch { res.status(500).json({ success: false, message: 'Failed to update profile' }); }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword)))
      return res.status(401).json({ success: false, message: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed' });
  } catch { res.status(500).json({ success: false, message: 'Failed to change password' }); }
};

exports.updatePreferences = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { preferences: req.body }, { new: true });
    res.json({ success: true, data: user.preferences });
  } catch { res.status(500).json({ success: false, message: 'Failed to update preferences' }); }
};

exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    res.json({ success: true, message: 'Account deactivated' });
  } catch { res.status(500).json({ success: false, message: 'Failed to delete' }); }
};

/* ═══════════════ BILLING ═════════════════════════ */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.getPlans = async (req, res) => {
  const plans = await Plan.find({ isActive: true }).sort('sortOrder');
  res.json({ success: true, data: plans });
};

exports.createCheckout = async (req, res) => {
  try {
    const { planId, billingInterval = 'monthly' } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    const priceId = billingInterval === 'yearly' ? plan.stripePriceId?.yearly : plan.stripePriceId?.monthly;
    if (!priceId) return res.status(400).json({ success: false, message: 'Price ID not configured' });

    let customerId = req.user.stripeCustomerId;
    if (!customerId) {
      const cust = await stripe.customers.create({ email: req.user.email, name: req.user.name });
      customerId = cust.id;
      await User.findByIdAndUpdate(req.user._id, { stripeCustomerId: customerId });
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId, mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?payment=canceled`,
      metadata: { module: 'core', userId: req.user._id.toString(), planId: planId.toString(), billingInterval },
    });
    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBillingPortal = async (req, res) => {
  try {
    if (!req.user.stripeCustomerId)
      return res.status(400).json({ success: false, message: 'No billing account' });
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard/billing`,
    });
    res.json({ success: true, data: { url: session.url } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.listPayments = async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).populate('plan', 'name').sort({ createdAt: -1 });
  res.json({ success: true, data: payments });
};
