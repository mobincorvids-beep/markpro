require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

/**
 * Seed initial data (admin, demo user, plans, settings).
 *
 * @param {object} opts
 * @param {boolean} opts.standalone  true when run via `npm run seed` (disconnects
 *         and exits). false when called from server.js boot (leaves the
 *         connection open so the server keeps running).
 */
async function runSeed(opts = {}) {
  const { standalone = true } = opts;

  if (standalone) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
  }

  const User = require('../models/User.model');

  // Create admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@markpro.app';
  const adminPass  = process.env.ADMIN_PASSWORD || 'Admin@123456';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Admin', email: adminEmail,
      password: await bcrypt.hash(adminPass, 12),
      role: 'admin', isVerified: true,
      affiliateCode: 'ADMIN001',
    });
    console.log('Admin created:', adminEmail, '/ password:', adminPass);
  } else {
    // Always resync the admin's password/role from .env so re-running
    // `npm run seed` reliably fixes admin login instead of silently no-op'ing
    // on a stale password hash from an earlier seed/version.
    admin.password = await bcrypt.hash(adminPass, 12);
    admin.role = 'admin';
    admin.isVerified = true;
    await admin.save();
    console.log('Admin already existed — password reset to match .env:', adminEmail, '/ password:', adminPass);
  }

  // Create demo user
  const demoEmail = 'demo@markpro.app';
  let demo = await User.findOne({ email: demoEmail });
  if (!demo) {
    demo = await User.create({
      name: 'Demo User', email: demoEmail,
      password: await bcrypt.hash('Demo@123456', 12),
      role: 'user', isVerified: true,
      affiliateCode: 'DEMO001',
      balance: 100,
    });
    console.log('Demo user created:', demoEmail, '/ password: Demo@123456');
  }

  // Seed SMM categories and a sample service
  try {
    const { SMM_Category, SMM_Service } = require('../models/SMM_Service.model');
    const catCount = await SMM_Category.countDocuments();
    if (catCount === 0) {
      const cats = await SMM_Category.insertMany([
        { name:'Instagram', status:1 },
        { name:'YouTube',   status:1 },
        { name:'TikTok',    status:1 },
        { name:'Facebook',  status:1 },
        { name:'Twitter/X', status:1 },
        { name:'Telegram',  status:1 },
      ]);
      await SMM_Service.create({
        name:'Instagram Followers - High Quality',
        category: cats[0]._id,
        rate: 1.50, min: 100, max: 10000,
        description: 'High quality Instagram followers. Lifetime guarantee.',
        status: 1,
      });
      console.log('SMM categories and sample service seeded');
    }
  } catch(e) { console.log('SMM seed skipped:', e.message); }

  // Seed Social Proof plans (uses the shared Plan model, not a dedicated SPlan model)
  try {
    const Plan = require('../models/Plan.model');
    const planCount = await Plan.countDocuments();
    if (planCount === 0) {
      await Plan.insertMany([
        { name:'Free', slug:'free', price:{ monthly:0, yearly:0 }, isDefault:true,
          limits:{ campaigns:1, notifications:5, domains:1, trackNotifications:1000 } },
        { name:'Starter', slug:'starter', price:{ monthly:19, yearly:190 },
          limits:{ campaigns:5, notifications:20, domains:3, trackNotifications:10000 } },
        { name:'Pro', slug:'pro', price:{ monthly:49, yearly:490 }, isFeatured:true,
          limits:{ campaigns:20, notifications:100, domains:10, trackNotifications:50000 } },
        { name:'Agency', slug:'agency', price:{ monthly:99, yearly:990 },
          limits:{ campaigns:-1, notifications:-1, domains:-1, trackNotifications:-1 } },
      ]);
      console.log('Social Proof plans seeded');
    }
  } catch(e) { console.log('SP plans seed skipped:', e.message); }

  // Note: PHPRank (rank/*) reads plans from the same shared Plan model seeded
  // above — there is no separate RankPlan model in this codebase, so no
  // additional seeding is needed here.

  // Seed AI reply plans
  try {
    const AIPlan = require('../models/secondary.models').AIPlan || null;
    if (AIPlan) {
      const aiCount = await AIPlan.countDocuments();
      if (aiCount === 0) {
        await AIPlan.insertMany([
          { name:'Free',    price:0,  repliesPerMonth:10,  stripePriceId:'' },
          { name:'Starter', price:9,  repliesPerMonth:100, stripePriceId:'' },
          { name:'Pro',     price:29, repliesPerMonth:-1,  stripePriceId:'' },
        ]);
        console.log('AI Reply plans seeded');
      }
    }
  } catch(e) { /* skip */ }

  // Seed BioLinks settings
  try {
    const { Settings } = require('../models/BioLinks.models');
    const sCount = await Settings.countDocuments();
    if (sCount === 0) {
      await Settings.create({
        main: { title:'MarkPro BioLinks', description:'Create stunning bio link pages' },
        smtp: {}, payment: { stripe_enabled: false },
        registration_enabled: true, email_verification: false,
      });
      console.log('BioLinks settings seeded');
    }
  } catch(e) { console.log('BioLinks settings seed skipped:', e.message); }

  console.log('\nSeeding complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:     ' + adminEmail + ' / ' + adminPass);
  console.log('Demo:      demo@markpro.app / Demo@123456');
  console.log('Dashboard: http://localhost:3000');
  console.log('API:       http://localhost:5000/api');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (standalone) {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Auto-run when invoked directly via `npm run seed`.
if (require.main === module) {
  runSeed({ standalone: true }).catch(e => { console.error('Seed error:', e); process.exit(1); });
}

module.exports = { runSeed };
