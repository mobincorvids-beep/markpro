/**
 * THE single Stripe webhook endpoint:  POST /api/webhooks/stripe
 *
 * Section B.3 fix: four separate endpoints (rank, publish billing, aigen
 * credits, socialai billing) each verified against the same
 * STRIPE_WEBHOOK_SECRET, so only whichever one was registered in the Stripe
 * Dashboard could ever verify - the rest silently 400'd in production.
 *
 * Now: one registered endpoint, one signature verification, then an internal
 * dispatch to each module's business logic. Routing key, in priority order:
 *   1. metadata.module   - 'core' | 'rank' | 'publish' | 'aigen' | 'socialai'
 *   2. metadata shape    - inferred for sessions created before `module` was set
 *   3. subscription events - fanned out to every subscription-aware handler
 *
 * Always set metadata.module on new checkout sessions.
 */
const stripeLib = require('stripe');
const logger    = require('../../utils/logger');

const HANDLERS = {
  core:     require('./handlers/core.plans'),
  rank:     require('./handlers/core.plans'),
  publish:  require('./handlers/publish.plans'),
  aigen:    require('./handlers/aigen.credits'),
  socialai: require('./handlers/socialai.plans'),
};

/** Infer the owning module for events created before metadata.module existed. */
function inferModule(event) {
  const md = event.data?.object?.metadata || {};
  if (md.module && HANDLERS[md.module]) return md.module;
  if (md.packageId && md.credits)        return 'aigen';
  if (md.user_id && md.plan_id)          return 'socialai';
  if (md.userId && md.planId && md.interval)        return 'publish';
  if (md.userId && md.planId)                       return 'core';
  return null;
}

/** Subscription lifecycle events carry no metadata - fan them out. */
const LIFECYCLE = new Set([
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.deleted',
  'customer.subscription.updated',
]);

exports.handleStripeWebhook = async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    logger.error('Stripe webhook received but STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ received: false });
  }

  const stripe = stripeLib(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,                                   // raw Buffer - express.raw() is mounted on this route
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (e) {
    logger.error(`Stripe signature verification failed: ${e.message}`);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  // Acknowledge fast; Stripe retries on timeout, and every handler is idempotent
  // on its own keys (subscription id / payment intent).
  res.json({ received: true });

  try {
    const mod = inferModule(event);
    if (mod) {
      await HANDLERS[mod](event);
      logger.info(`Stripe ${event.type} → module "${mod}" handled`);
      return;
    }
    if (LIFECYCLE.has(event.type)) {
      await Promise.allSettled([
        HANDLERS.core(event),
        HANDLERS.publish(event),
      ]);
      logger.info(`Stripe ${event.type} → fanned out to subscription handlers`);
      return;
    }
    logger.info(`Stripe ${event.type} ignored - no module could be resolved`);
  } catch (e) {
    logger.error(`Stripe webhook handler error (${event.type}): ${e.message}`);
  }
};
