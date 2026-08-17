/**
 * SocialAI plan purchases - extracted from
 * controllers/publish/saBilling.controller.js stripeWebhook (Section B.3).
 */
const { User, Plan } = require('../../../models/SocialAI.models');
const { addCredits } = require('../../../utils/credits');

module.exports = async function handleSocialAiPlans(event) {
  if (event.type !== 'checkout.session.completed') return;
  const session = event.data.object;
  const userId  = session.metadata?.user_id;
  const planId  = session.metadata?.plan_id;
  if (!userId || !planId) return;
  const plan = await Plan.findById(planId);
  if (!plan) return;
  await User.findByIdAndUpdate(userId, { plan_id: planId, plan_data: plan.data });
  const bonus = plan.data?.credits || 0;
  if (bonus > 0) await addCredits(userId, bonus, `Plan purchase: ${plan.name || planId}`, planId, 'Plan');
};
