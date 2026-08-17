/**
 * SMM Panel wallet access.
 *
 * Balance now lives on SmmProfile (Section B.1) but a number of
 * not-yet-migrated SMM screens/controllers still read `user.balance`, so every
 * mutation also mirrors the same $inc onto the User document. Both writes are
 * atomic $inc - no read-then-write anywhere. Remove the mirror once the whole
 * SMM module has been through the migration loop.
 */
const User = require('../models/User.model');
const { SmmProfile, getProfile } = require('../models/profiles');
const { debitWithLedger, creditWithLedger } = require('./wallet');

async function getBalance(userId, session = null) {
  const profile = await getProfile(SmmProfile, userId, session);
  return profile.balance;
}

/** @returns {number} new balance. Throws INSUFFICIENT_FUNDS (statusCode 400). */
async function chargeUser(userId, amount, { reason, refType, refId, session = null } = {}) {
  await getProfile(SmmProfile, userId, session);
  const profile = await debitWithLedger(SmmProfile, { userId }, {
    field: 'balance', amount, session,
    userId, module: 'smm', reason, refType, refId,
  });
  await User.updateOne({ _id: userId }, { $inc: { balance: -amount } }, { session });
  return profile.balance;
}

async function refundUser(userId, amount, { reason, refType, refId, session = null } = {}) {
  await getProfile(SmmProfile, userId, session);
  const profile = await creditWithLedger(SmmProfile, { userId }, {
    field: 'balance', amount, session,
    userId, module: 'smm', reason, refType, refId,
  });
  await User.updateOne({ _id: userId }, { $inc: { balance: amount } }, { session });
  return profile.balance;
}

module.exports = { getBalance, chargeUser, refundUser };
