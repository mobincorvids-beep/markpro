const Stripe = require('stripe');
const { Plan, Order, User } = require('../../models/SocialAI.models');
const { addCredits } = require('../../utils/credits');

const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ status: 1 }).sort({ sort_order: 1 });
    res.json({ status: 'success', data: plans });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

exports.createCheckout = async (req, res) => {
  try {
    const { plan_id, type = 'monthly' } = req.body;
    const plan = await Plan.findById(plan_id);
    if (!plan) return res.json({ status: 'error', message: 'Plan not found.' });

    const price = type === 'yearly' ? plan.data?.yearly_price || plan.price * 10 : plan.price;
    const stripePriceId = type === 'yearly' ? plan.stripe_yearly_price_id : plan.stripe_price_id;

    if (stripePriceId) {
      // Use pre-configured Stripe price
      const session = await stripe().checkout.sessions.create({
        payment_method_types: ['card'],
        mode: plan.type === 'lifetime' ? 'payment' : 'subscription',
        line_items: [{ price: stripePriceId, quantity: 1 }],
        customer_email: req.user.email,
        success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}&plan_id=${plan_id}`,
        cancel_url:  `${process.env.FRONTEND_URL}/billing`,
        metadata: { module: 'socialai', user_id: String(req.user._id), plan_id: String(plan._id), type },
      });
      return res.json({ status: 'success', data: { checkout_url: session.url, session_id: session.id } });
    }

    // Create dynamic price
    const session = await stripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: plan.name, description: plan.description || '' },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      customer_email: req.user.email,
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}&plan_id=${plan_id}`,
      cancel_url:  `${process.env.FRONTEND_URL}/billing`,
      metadata: { module: 'socialai', user_id: String(req.user._id), plan_id: String(plan._id), type },
    });

    res.json({ status: 'success', data: { checkout_url: session.url, session_id: session.id } });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Checkout creation failed.' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { session_id, plan_id } = req.query;
    const session = await stripe().checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid' && session.status !== 'complete')
      return res.json({ status: 'error', message: 'Payment not completed.' });

    const plan = await Plan.findById(plan_id);
    if (!plan) return res.json({ status: 'error', message: 'Plan not found.' });

    // Check if already processed
    const existing = await Order.findOne({ payment_id: session.id });
    if (existing) return res.json({ status: 'success', message: 'Already activated.', data: existing });

    let expiry = null;
    if (plan.type === 'monthly') {
      expiry = new Date(); expiry.setMonth(expiry.getMonth() + 1);
    } else if (plan.type === 'yearly') {
      expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry = new Date('2099-12-31');
    }

    // Create order
    const order = await Order.create({
      user_id: req.user._id, plan_id: plan._id,
      amount: (session.amount_total || 0) / 100,
      payment_method: 'stripe', payment_id: session.id,
      status: 'paid',
    });

    // Activate plan on user
    await User.findByIdAndUpdate(req.user._id, {
      plan_id: plan._id, plan_data: plan.data,
      plan_expired_at: expiry,
      $inc: { credits: plan.data?.credits || 0 },
    });

    await addCredits(req.user._id, plan.data?.credits || 0, `Plan: ${plan.name}`, order._id, 'Order');

    res.json({ status: 'success', message: 'Plan activated!', data: { order, plan } });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', message: 'Payment verification failed.' });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Order.find({ user_id: req.user._id }).skip(skip).limit(+limit).sort({ createdAt: -1 }).populate('plan_id', 'name price type'),
      Order.countDocuments({ user_id: req.user._id }),
    ]);
    res.json({ status: 'success', data, total });
  } catch (err) { res.json({ status: 'error', message: 'Server error.' }); }
};

// Section B.3: SocialAI no longer verifies its own signature. Its logic lives
// in controllers/webhooks/handlers/socialai.plans.js, dispatched from the
// single endpoint POST /api/webhooks/stripe. This stub stays so any legacy
// route reference keeps resolving.
exports.stripeWebhook = (req, res) => res.status(410).json({
  success: false,
  message: 'Deprecated - use POST /api/webhooks/stripe',
});
