const express = require('express');
const router  = express.Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const wa = require('../utils/whatsapp');

const {
  WhatsappTemplate, MessageBot, TemplateBot, CannedReply,
  AiPrompt, Setting, User, ApiToken, ActivityLog, Chat, Contact, Campaign,
} = require('../models/WhatsApp.models');

const contactsCtrl  = require('../controllers/whatsapp/contacts.controller');
const campaignsCtrl = require('../controllers/whatsapp/campaigns.controller');
const chatCtrl      = require('../controllers/whatsapp/chat.controller');


// ── Webhook (public - WhatsApp callback) ───────────────────────────
// Webhook handled by dedicated router below
router.use('/webhook', require('../controllers/whatsapp/webhook.controller'));

// ── Dashboard ──────────────────────────────────────────────────────
router.get('/dashboard', protect, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [totalContacts, totalChats, totalCampaigns, activeBots, totalLeads, totalCustomers,
           todayContacts, todayChats, unreadChats, activeCampaigns] = await Promise.all([
      Contact.countDocuments(), Chat.countDocuments(), Campaign.countDocuments(),
      MessageBot.countDocuments({ isBotActive: true }),
      Contact.countDocuments({ type: 'lead' }), Contact.countDocuments({ type: 'customer' }),
      Contact.countDocuments({ createdAt:{ $gte: today } }),
      Chat.countDocuments({ createdAt:{ $gte: today } }),
      Chat.countDocuments({ unreadCount:{ $gt: 0 } }),
      Campaign.countDocuments({ isSent: false, pauseCampaign: false }),
    ]);
    res.json({ totalContacts, totalChats, totalCampaigns, activeBots, totalLeads,
               totalCustomers, todayContacts, todayChats, unreadChats, activeCampaigns });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Contacts ───────────────────────────────────────────────────────
router.use('/contacts',  protect, contactsCtrl);

// ── Campaigns ──────────────────────────────────────────────────────
router.use('/campaigns', protect, campaignsCtrl);

// ── Chat ───────────────────────────────────────────────────────────
router.use('/chat',      protect, chatCtrl);

// ── Templates ─────────────────────────────────────────────────────
router.get('/templates', protect, async (req, res) => {
  try { res.json(await WhatsappTemplate.find().sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/templates/sync', protect, async (req, res) => {
  try {
    const metaTemplates = await wa.fetchTemplates();
    let synced = 0;
    for (const t of metaTemplates) {
      const body = t.components?.find(c => c.type === 'BODY');
      await WhatsappTemplate.findOneAndUpdate(
        { templateId: t.id },
        { templateName: t.name, language: t.language, status: t.status,
          category: t.category, bodyData: body?.text || '', updatedAt: new Date() },
        { upsert: true, new: true }
      );
      synced++;
    }
    res.json({ message: `Synced ${synced} templates`, synced });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.delete('/templates/:id', protect, async (req, res) => {
  try { await WhatsappTemplate.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Bots ───────────────────────────────────────────────────────────
router.get('/bots', protect, async (req, res) => {
  try {
    const [messageBots, templateBots] = await Promise.all([
      MessageBot.find().sort({ createdAt: -1 }),
      TemplateBot.find().sort({ createdAt: -1 }),
    ]);
    res.json({ messageBots, templateBots });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/bots/message',         protect, async (req,res) => { try { res.status(201).json(await MessageBot.create({...req.body, addedFrom: req.user._id})); } catch(e){ res.status(400).json({error:e.message}); }});
router.put('/bots/message/:id',      protect, async (req,res) => { try { res.json(await MessageBot.findByIdAndUpdate(req.params.id,{...req.body,updatedAt:Date.now()},{new:true})); } catch(e){ res.status(400).json({error:e.message}); }});
router.delete('/bots/message/:id',   protect, async (req,res) => { try { await MessageBot.findByIdAndDelete(req.params.id); res.json({message:'Deleted'}); } catch(e){ res.status(500).json({error:e.message}); }});
router.patch('/bots/message/:id/toggle', protect, async (req,res) => { try { const b=await MessageBot.findById(req.params.id); b.isBotActive=!b.isBotActive; await b.save(); res.json({isBotActive:b.isBotActive}); } catch(e){ res.status(500).json({error:e.message}); }});
router.post('/bots/template',        protect, async (req,res) => { try { res.status(201).json(await TemplateBot.create(req.body)); } catch(e){ res.status(400).json({error:e.message}); }});
router.put('/bots/template/:id',     protect, async (req,res) => { try { res.json(await TemplateBot.findByIdAndUpdate(req.params.id,{...req.body,updatedAt:Date.now()},{new:true})); } catch(e){ res.status(400).json({error:e.message}); }});
router.delete('/bots/template/:id',  protect, async (req,res) => { try { await TemplateBot.findByIdAndDelete(req.params.id); res.json({message:'Deleted'}); } catch(e){ res.status(500).json({error:e.message}); }});
router.patch('/bots/template/:id/toggle', protect, async (req,res) => { try { const b=await TemplateBot.findById(req.params.id); b.isBotActive=!b.isBotActive; await b.save(); res.json({isBotActive:b.isBotActive}); } catch(e){ res.status(500).json({error:e.message}); }});

// ── Canned Replies ─────────────────────────────────────────────────
router.get('/canned',      protect, async (req,res) => { const f={$or:[{isPublic:true},{addedFrom:req.user._id}]}; if(req.query.search) f.$and=[{$or:[{title:{$regex:req.query.search,$options:'i'}},{description:{$regex:req.query.search,$options:'i'}}]}]; try{res.json(await CannedReply.find(f).sort('title'));}catch(e){res.status(500).json({error:e.message});} });
router.post('/canned',     protect, async (req,res) => { try{res.status(201).json(await CannedReply.create({...req.body,addedFrom:req.user._id}));}catch(e){res.status(400).json({error:e.message});} });
router.put('/canned/:id',  protect, async (req,res) => { try{res.json(await CannedReply.findByIdAndUpdate(req.params.id,{...req.body,updatedAt:Date.now()},{new:true}));}catch(e){res.status(400).json({error:e.message});} });
router.delete('/canned/:id',protect,async (req,res) => { try{await CannedReply.findByIdAndDelete(req.params.id);res.json({message:'Deleted'});}catch(e){res.status(500).json({error:e.message});} });

// ── AI Prompts ─────────────────────────────────────────────────────
router.get('/ai-prompts',     protect, async (req,res) => { try{res.json(await AiPrompt.find({$or:[{isPublic:true},{addedFrom:req.user._id}]}).sort('name'));}catch(e){res.status(500).json({error:e.message});} });
router.post('/ai-prompts',    protect, async (req,res) => { try{res.status(201).json(await AiPrompt.create({...req.body,addedFrom:req.user._id}));}catch(e){res.status(400).json({error:e.message});} });
router.put('/ai-prompts/:id', protect, async (req,res) => { try{res.json(await AiPrompt.findByIdAndUpdate(req.params.id,{...req.body,updatedAt:Date.now()},{new:true}));}catch(e){res.status(400).json({error:e.message});} });
router.delete('/ai-prompts/:id',protect,async (req,res) => { try{await AiPrompt.findByIdAndDelete(req.params.id);res.json({message:'Deleted'});}catch(e){res.status(500).json({error:e.message});} });

// ── Settings (admin) ───────────────────────────────────────────────
router.get('/settings',  protect, requireAdmin, async (_,res) => { const docs=await Setting.find(); const r={}; docs.forEach(d=>r[d.key]=d.value); res.json(r); });
router.put('/settings',  protect, requireAdmin, async (req,res) => { try{await Promise.all(Object.entries(req.body).map(([k,v])=>Setting.set(k,v))); res.json({message:'Saved'});}catch(e){res.status(500).json({error:e.message});} });

// ── Send Message (via API) ─────────────────────────────────────────
router.post('/send', protect, async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'to and message required' });
    const result = await wa.sendText(to, message);
    res.json({ success: true, messageId: result?.messages?.[0]?.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
