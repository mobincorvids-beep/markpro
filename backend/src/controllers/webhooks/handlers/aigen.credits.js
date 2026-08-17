/**
 * AIGen credit-package purchases - extracted from
 * routes/aigen.credits.routes.js POST /api/credits/webhook (Section B.3).
 */
const CreditPackage = require('../../../models/CreditPackage.model');
const { creditCredits } = require('../../../services/creditEngine.service');

module.exports = async function handleAigenCredits(event) {
  if (event.type !== 'checkout.session.completed') return;
  const session = event.data.object;
  const { userId, packageId, credits } = session.metadata || {};
  if (!userId || !credits) return;
  const pkg = packageId ? await CreditPackage.findById(packageId) : null;
  await creditCredits(userId, Number(credits), {
    type: 'purchase',
    description: `Purchased: ${pkg?.title || 'Credit Package'}`,
    packageId,
    paymentId: session.payment_intent,
    amount: (session.amount_total || 0) / 100,
  });
};
