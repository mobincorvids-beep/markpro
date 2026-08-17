/**
 * Core / Rank Tracker subscription events.
 * Extracted verbatim from controllers/rank/webhook.controller.js - the only
 * change is that signature verification now happens once, in the shared
 * dispatcher (Section B.3). Business logic is unchanged.
 */
const stripeLib = require('stripe');
const User      = require('../../../models/User.model');
const Plan      = require('../../../models/Plan.model');
const { Payment } = require('../../../models/PHPRank.models');
const logger    = require('../../../utils/logger');

const stripe = () => stripeLib(process.env.STRIPE_SECRET_KEY);

module.exports = async function handleCorePlans(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode !== 'subscription') break;
      const { userId, planId, billingInterval } = session.metadata || {};
      if (!userId || !planId) break;
      const [user, plan, sub] = await Promise.all([
        User.findById(userId),
        Plan.findById(planId),
        stripe().subscriptions.retrieve(session.subscription),
      ]);
      if (!user || !plan) break;
      user.planId = plan._id;
      user.subscriptionStatus = 'active';
      user.stripeSubscriptionId = session.subscription;
      user.planExpiresAt = new Date(sub.current_period_end * 1000);
      await user.save();
      await Payment.create({
        user: userId, plan: planId, processor: 'stripe',
        processorPaymentId: session.subscription,
        billingInterval: billingInterval || 'monthly',
        amount: (session.amount_total || 0) / 100,
        currency: (session.currency || 'usd').toUpperCase(),
        status: 'paid',
        periodStart: new Date(sub.current_period_start * 1000),
        periodEnd: new Date(sub.current_period_end * 1000),
      });
      logger.info(`Subscription activated: ${userId} → ${plan.name}`);
      break;
    }
    case 'invoice.payment_succeeded': {
      const inv = event.data.object;
      if (inv.billing_reason === 'subscription_create') break;
      const sub = await stripe().subscriptions.retrieve(inv.subscription);
      const user = await User.findOne({ stripeSubscriptionId: inv.subscription });
      if (user) { user.subscriptionStatus = 'active'; user.planExpiresAt = new Date(sub.current_period_end * 1000); await user.save(); }
      break;
    }
    case 'invoice.payment_failed': {
      const user = await User.findOne({ stripeSubscriptionId: event.data.object.subscription });
      if (user) { user.subscriptionStatus = 'past_due'; await user.save(); }
      break;
    }
    case 'customer.subscription.deleted': {
      const user = await User.findOne({ stripeSubscriptionId: event.data.object.id });
      if (user) { user.subscriptionStatus = 'inactive'; user.stripeSubscriptionId = null; await user.save(); }
      break;
    }
    default: break;
  }
};
