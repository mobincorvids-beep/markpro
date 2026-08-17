const { User, CreditHistory } = require('../models/SocialAI.models');
const { ledger } = require('./wallet');

/**
 * Deduct credits and log the transaction.
 * Returns false if insufficient credits.
 */
exports.deductCredits = async (userId, amount, description, referenceId = null, referenceType = null) => {
  // Atomic debit with a sufficiency filter (Section B.5): returns false when
  // the user does not hold `amount` credits, instead of racing on a read.
  const user = await User.findOneAndUpdate(
    { _id: userId, credits: { $gte: amount } },
    { $inc: { credits: -amount } },
    { new: true },
  );
  if (!user) return false;
  await ledger({
    userId, module: 'socialai', currencyType: 'credits',
    amount: -amount, balanceAfter: user.credits, reason: description,
    refType: referenceType || '', refId: referenceId,
  });
  await CreditHistory.create({
    user_id: userId,
    amount,
    type: 'debit',
    description,
    reference_id: referenceId,
    reference_type: referenceType,
    balance_after: user.credits,
  });
  return user.credits;
};

/**
 * Add credits and log the transaction.
 */
exports.addCredits = async (userId, amount, description, referenceId = null, referenceType = null) => {
  const user = await User.findByIdAndUpdate(userId, { $inc: { credits: amount } }, { new: true });
  await ledger({
    userId, module: 'socialai', currencyType: 'credits',
    amount, balanceAfter: user.credits, reason: description,
    refType: referenceType || '', refId: referenceId,
  });
  await CreditHistory.create({
    user_id: userId,
    amount,
    type: 'credit',
    description,
    reference_id: referenceId,
    reference_type: referenceType,
    balance_after: user.credits,
  });
  return user.credits;
};
