const User             = require('../models/User.model');
const CreditTransaction = require('../models/CreditTransaction.model');

// credit_type constants (matches original PHP mapping)
const CREDIT_TYPE = {
  text:              2,
  code:              4,
  translation:       7,
  'text-to-speech':  11,
  'speech-to-text':  5,
  image:             3,
  'image-animation': 8,
};

/**
 * Calculate credits to deduct based on generation type and output
 */
function calculateCredits(type, { responseText = '', wordCount = 0, charCount = 0, noOfImages = 1, imageSize = '512x512', audioDurationSeconds = 0 } = {}) {
  const PER_WORD        = Number(process.env.PER_WORD_PRICING)          || 1;
  const TTS_PRICING     = Number(process.env.TEXT_TO_SPEECH_PRICING)    || 2;
  const STT_PRICING     = Number(process.env.SPEECH_TO_TEXT_PRICING)    || 2;
  const IMG_256         = Number(process.env.IMAGE_PRICING_256)         || 5;
  const IMG_512         = Number(process.env.IMAGE_PRICING_512)         || 8;
  const IMG_1024        = Number(process.env.IMAGE_PRICING_1024)        || 10;
  const IMG_ANIM        = Number(process.env.IMAGE_ANIMATION_PRICING)   || 20;

  const wc = wordCount || (responseText ? responseText.trim().split(/\s+/).filter(Boolean).length : 0);

  switch (type) {
    case 'text':
    case 'code':
    case 'translation':
      return Math.max(1, wc * PER_WORD);

    case 'text-to-speech': {
      const queryWords = responseText.trim().split(/\s+/).filter(Boolean).length;
      return Math.max(1, queryWords * TTS_PRICING);
    }

    case 'speech-to-text':
      return Math.max(1, Math.ceil(audioDurationSeconds) * STT_PRICING);

    case 'image': {
      const pricingMap = { '256x256': IMG_256, '512x512': IMG_512, '1024x1024': IMG_1024 };
      const perImage   = pricingMap[imageSize] || IMG_512;
      return perImage * noOfImages;
    }

    case 'image-animation':
      return IMG_ANIM;

    default:
      return 1;
  }
}

/**
 * Check if user has enough credits
 */
async function hasEnoughCredits(userId, requiredCredits) {
  const user = await User.findById(userId).select('credits');
  return user && user.credits >= requiredCredits;
}

/**
 * Debit credits from user and record transaction
 */
async function debitCredits(userId, credits, { type, description, promptId } = {}) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.credits < credits) throw new Error('Insufficient credits');

  user.credits -= credits;
  await user.save();

  await CreditTransaction.create({
    user: userId,
    credits: -credits,
    type: type || 'text',
    description: description || `AI generation: ${type}`,
    promptId: promptId || null,
  });

  return user.credits; // remaining
}

/**
 * Credit (add) credits to user
 */
async function creditCredits(userId, credits, { type, description, packageId, paymentId, amount } = {}) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  user.credits += credits;
  await user.save();

  await CreditTransaction.create({
    user: userId,
    credits: +credits,
    type: type || 'purchase',
    description: description || `Credits added: ${credits}`,
    packageId: packageId || null,
    paymentId: paymentId || '',
    amount: amount || 0,
  });

  return user.credits;
}

module.exports = { CREDIT_TYPE, calculateCredits, hasEnoughCredits, debitCredits, creditCredits };
