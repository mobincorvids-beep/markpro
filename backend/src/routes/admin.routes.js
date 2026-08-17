const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const { protect, requireAdmin } = require('../middleware/auth.middleware');
const spCtrl  = require('../controllers/admin/admin.controller');

const User     = require('../models/User.model');
const Order    = require('../models/SMM_Order.model');
const { Category, Service } = require('../models/SMM_Service.model');
const { Provider, Ticket, Transaction, Option, PaymentMethod, FAQ, Coupon } = require('../models/SMM_Supporting.model');
const Plan     = require('../models/Plan.model');
const Campaign = require('../models/Campaign.model');

router.use(protect, requireAdmin);

// ── SP Admin ────────────────────────────────────────────────────
router.get('/dashboard',    spCtrl.getDashboard);
router.get('/campaigns',    spCtrl.listCampaigns);
router.get('/payments',     spCtrl.listPayments);
router.get('/plans',        spCtrl.listPlans);
router.post('/plans',       spCtrl.createPlan);
router.put('/plans/:id',    spCtrl.updatePlan);
router.delete('/plans/:id', spCtrl.deletePlan);

// ── Unified Stats ───────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalOrders, pendingOrders, totalRevenue, openTickets, totalCampaigns] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'awaiting' }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$charge' } } }]),
      Ticket.countDocuments({ status: { $in: ['open','pending'] } }),
      Campaign.countDocuments(),
    ]);
    res.json({ totalUsers, totalOrders, pendingOrders, totalRevenue: totalRevenue[0]?.total || 0, openTickets, totalCampaigns });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Users ───────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ];
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').populate('plan','name slug')
        .sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
      User.countDocuments(filter),
    ]);
    res.json({ users, total, page: +page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.put('/users/:id', async (req, res) => {
  try { res.json({ success: true, data: await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password').populate('plan') }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.delete('/users/:id', async (req, res) => {
  try { await User.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.patch('/users/:id/balance', async (req, res) => {
  try {
    const { amount, type = 'adjustment', note = '' } = req.body;
    const user = await User.findById(req.params.id);
    const prev = user.balance;
    user.balance = parseFloat((prev + parseFloat(amount)).toFixed(2));
    await user.save();
    await Transaction.create({ userId: user._id, type, amount, balanceBefore: prev, balanceAfter: user.balance, note, status: 'completed' });
    res.json({ newBalance: user.balance });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.patch('/users/:id/status', async (req, res) => {
  try {
    const upd = {};
    if (req.body.status !== undefined) upd.status = req.body.status;
    if (req.body.isActive !== undefined) upd.isActive = req.body.isActive;
    res.json({ success: true, data: await User.findByIdAndUpdate(req.params.id, upd, { new: true }).select('-password') });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Categories ──────────────────────────────────────────────────
router.get('/categories',        async (req,res) => res.json(await Category.find().sort('sort')));
router.post('/categories',       async (req,res) => { try { res.status(201).json(await Category.create(req.body)); } catch(e){ res.status(500).json({error:e.message}); }});
router.put('/categories/:id',    async (req,res) => { try { res.json(await Category.findByIdAndUpdate(req.params.id,req.body,{new:true})); } catch(e){ res.status(500).json({error:e.message}); }});
router.delete('/categories/:id', async (req,res) => { try { await Category.findByIdAndDelete(req.params.id); res.json({message:'Deleted'}); } catch(e){ res.status(500).json({error:e.message}); }});

// ── Services ────────────────────────────────────────────────────
router.get('/services', async (req, res) => {
  try {
    const { page=1, limit=50, search } = req.query;
    const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
    const [services, total] = await Promise.all([
      Service.find(filter).populate('categoryId','name').populate('apiProviderId','name').sort('sort').skip((page-1)*limit).limit(+limit),
      Service.countDocuments(filter),
    ]);
    res.json({ services, total, page: +page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/services',       async (req,res) => { try { res.status(201).json(await Service.create(req.body)); } catch(e){ res.status(500).json({error:e.message}); }});
router.put('/services/:id',    async (req,res) => { try { res.json(await Service.findByIdAndUpdate(req.params.id,{...req.body,updatedAt:Date.now()},{new:true})); } catch(e){ res.status(500).json({error:e.message}); }});
router.delete('/services/:id', async (req,res) => { try { await Service.findByIdAndDelete(req.params.id); res.json({message:'Deleted'}); } catch(e){ res.status(500).json({error:e.message}); }});
router.post('/services/sync-provider', async (req, res) => {
  try {
    const p = await Provider.findById(req.body.providerId);
    if (!p) return res.status(404).json({ error: 'Provider not found' });
    const { data } = await axios.post(p.url, { key: p.apiKey, action: 'services' });
    res.json({ fetched: data?.length || 0, data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Orders ──────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const { page=1, limit=50, status, userId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    const [orders, total] = await Promise.all([
      Order.find(filter).populate('userId','username email name').populate('serviceId','name').sort({createdAt:-1}).skip((page-1)*limit).limit(+limit),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, total, page: +page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.patch('/orders/:id/status', async (req,res) => {
  try { res.json(await Order.findByIdAndUpdate(req.params.id,{status:req.body.status,updatedAt:Date.now()},{new:true})); }
  catch(e){ res.status(500).json({error:e.message}); }
});

// ── Providers ───────────────────────────────────────────────────
router.get('/providers',        async (req,res) => res.json(await Provider.find().sort({createdAt:-1})));
router.post('/providers',       async (req,res) => { try { res.status(201).json(await Provider.create(req.body)); } catch(e){ res.status(500).json({error:e.message}); }});
router.put('/providers/:id',    async (req,res) => { try { res.json(await Provider.findByIdAndUpdate(req.params.id,req.body,{new:true})); } catch(e){ res.status(500).json({error:e.message}); }});
router.delete('/providers/:id', async (req,res) => { try { await Provider.findByIdAndDelete(req.params.id); res.json({message:'Deleted'}); } catch(e){ res.status(500).json({error:e.message}); }});
router.post('/providers/:id/check-balance', async (req,res) => {
  try { const p = await Provider.findById(req.params.id); const {data} = await axios.post(p.url,{key:p.apiKey,action:'balance'}); res.json(data); }
  catch(e){ res.status(500).json({error:e.message}); }
});

// ── Tickets ─────────────────────────────────────────────────────
router.get('/tickets', async (req,res) => {
  try { res.json(await Ticket.find(req.query.status?{status:req.query.status}:{}).populate('userId','username email name').sort({updatedAt:-1})); }
  catch(e){ res.status(500).json({error:e.message}); }
});
router.post('/tickets/:id/reply', async (req,res) => {
  try {
    const t = await Ticket.findById(req.params.id);
    t.messages.push({ senderId: req.user._id, senderRole: 'admin', message: req.body.message });
    t.status = 'answered'; t.updatedAt = Date.now();
    await t.save(); res.json(t);
  } catch(e){ res.status(500).json({error:e.message}); }
});
router.patch('/tickets/:id/status', async (req,res) => {
  try { res.json(await Ticket.findByIdAndUpdate(req.params.id,{status:req.body.status,updatedAt:Date.now()},{new:true})); }
  catch(e){ res.status(500).json({error:e.message}); }
});

// ── Settings / Payment Methods / FAQs / Coupons ─────────────────
router.get('/settings',  async (_,res) => { const docs=await Option.find(); const r={}; docs.forEach(d=>r[d.key]=d.value); res.json(r); });
router.put('/settings',  async (req,res) => { try { await Promise.all(Object.entries(req.body).map(([k,v])=>Option.set(k,v))); res.json({message:'Saved'}); } catch(e){ res.status(500).json({error:e.message}); }});
router.get('/payment-methods',     async (_,res) => res.json(await PaymentMethod.find().sort('sort')));
router.post('/payment-methods',    async (req,res) => { try { res.status(201).json(await PaymentMethod.create(req.body)); } catch(e){ res.status(500).json({error:e.message}); }});
router.put('/payment-methods/:id', async (req,res) => { try { res.json(await PaymentMethod.findByIdAndUpdate(req.params.id,req.body,{new:true})); } catch(e){ res.status(500).json({error:e.message}); }});
router.get('/faqs',           async (_,res) => res.json(await FAQ.find().sort('sort')));
router.post('/faqs',          async (req,res) => { try { res.status(201).json(await FAQ.create(req.body)); } catch(e){ res.status(500).json({error:e.message}); }});
router.put('/faqs/:id',       async (req,res) => { try { res.json(await FAQ.findByIdAndUpdate(req.params.id,req.body,{new:true})); } catch(e){ res.status(500).json({error:e.message}); }});
router.delete('/faqs/:id',    async (req,res) => { try { await FAQ.findByIdAndDelete(req.params.id); res.json({message:'Deleted'}); } catch(e){ res.status(500).json({error:e.message}); }});
router.get('/coupons',        async (_,res) => res.json(await Coupon.find().sort({createdAt:-1})));
router.post('/coupons',       async (req,res) => { try { res.status(201).json(await Coupon.create(req.body)); } catch(e){ res.status(500).json({error:e.message}); }});
router.put('/coupons/:id',    async (req,res) => { try { res.json(await Coupon.findByIdAndUpdate(req.params.id,req.body,{new:true})); } catch(e){ res.status(500).json({error:e.message}); }});


router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role = 'user', plan } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'A user with that email already exists' });
    const user = await User.create({ name, email, password, role, plan: plan || null, isVerified: true, isEmailVerified: true });
    res.status(201).json({ success: true, data: (await User.findById(user._id)).toObject ? await User.findById(user._id).select('-password').populate('plan') : user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, data: await User.findById(user._id).select('-password') });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
