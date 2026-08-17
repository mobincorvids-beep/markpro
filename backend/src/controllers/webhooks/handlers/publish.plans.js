/**
 * Publish (BeePost) plan purchases - extracted from
 * routes/publish.billing.routes.js POST /api/plans/webhook (Section B.3).
 * Token counters now live on PublishProfile (Section B.1).
 */
const User = require('../../../models/User.model');
const Plan = require('../../../models/BPPlan.model');
const { Subscription } = require('../../../models/BPOther.model');
const { PublishProfile, getProfile } = require('../../../models/profiles');

module.exports = async function handlePublishPlans(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, planId, interval } = session.metadata || {};
    if (!userId || !planId) return;
    const [plan, user] = await Promise.all([Plan.findById(planId), User.findById(userId)]);
    if (!user || !plan) return;

    const now = new Date();
    const planExpiry = interval === 'yearly'
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : interval === 'monthly'
        ? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
        : null; // unlimited = no expiry

    user.planId = plan._id;
    user.stripeCustomerId     = session.customer || '';
    user.stripeSubscriptionId = session.subscription || '';
    user.subscriptionStatus   = 'active';
    user.planExpiresAt        = planExpiry;
    await user.save();

    await getProfile(PublishProfile, user._id);
    await PublishProfile.updateOne({ userId: user._id }, {
      $set: { planInterval: interval, planExpiry, wordTokensUsed: 0, imageTokensUsed: 0 },
    });

    await Subscription.create({
      user: userId, plan: planId, interval,
      stripeSubscriptionId: session.subscription || '',
      stripePaymentIntentId: session.payment_intent || '',
      status: 'active', amount: (session.amount_total || 0) / 100,
      startDate: now, endDate: planExpiry,
    });
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub  = event.data.object;
    const user = await User.findOne({ stripeSubscriptionId: sub.id });
    if (user) {
      const freePlan = await Plan.findOne({ price: 0 });
      user.planId = freePlan?._id || null;
      user.stripeSubscriptionId = '';
      user.subscriptionStatus = 'inactive';
      await user.save();
    }
  }
};
