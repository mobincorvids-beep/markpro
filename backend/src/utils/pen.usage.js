const { User, UsageLog } = require('../models/AI2Pen.models');

/**
 * Deduct tokens/images/audio from user quota and log usage.
 */
exports.deductUsage = async (userId, type, amount, description, refId = null) => {
  const fieldUsed  = { token: 'penTokenUsed', image: 'penImageUsed', audio: 'penAudioUsed' }[type];
  if (!fieldUsed) return;

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { [fieldUsed]: amount } },
    { new: true }
  );

  await UsageLog.create({
    user_id:      userId,
    parent_user_id: user?.parentId || null,
    usage_type:   type,
    amount,
    description,
    reference_id: refId,
    balance_after: type === 'token'
      ? (user?.penTokenLimit || 0) - (user?.penTokenUsed || 0)
      : type === 'image'
        ? (user?.penImageLimit || 0) - (user?.penImageUsed || 0)
        : (user?.penAudioLimit || 0) - (user?.penAudioUsed || 0),
  });
};
