const Plan = require('../../models/Plan.model');
exports.getPlans = async (_, res) => { const data = await Plan.find({isActive:true}); res.json({success:true,data}); };
exports.createCheckout = async (req, res) => { res.json({success:true,message:'Stripe checkout - configure STRIPE_SECRET_KEY'}); };
exports.getPortal     = async (req, res) => { res.json({success:true,message:'Billing portal - configure STRIPE_SECRET_KEY'}); };
