/**
 * Atomic balance / credit mutations + audit ledger.
 *
 * Section B.5 fix: every module used to read a balance into JS, subtract in
 * JS, then write the computed value back (read-then-write). Under concurrent
 * requests that silently loses debits. Everything now goes through a single
 * atomic findOneAndUpdate with a sufficiency filter and an $inc, and every
 * change writes a WalletLedger row.
 */
const WalletLedger = require('../models/WalletLedger.model');

/**
 * Debit `amount` from `field` on a document, only if it holds at least
 * `amount`. Returns the updated document, or null when funds are insufficient
 * (the caller answers 400 - no partial state is ever written).
 */
async function debit(Model, filter, { field = 'balance', amount, session = null } = {}) {
  if (!(amount > 0)) throw new Error('debit amount must be positive');
  return Model.findOneAndUpdate(
    { ...filter, [field]: { $gte: amount } },
    { $inc: { [field]: -amount } },
    { new: true, session },
  );
}

async function credit(Model, filter, { field = 'balance', amount, session = null } = {}) {
  if (!(amount > 0)) throw new Error('credit amount must be positive');
  return Model.findOneAndUpdate(filter, { $inc: { [field]: amount } }, { new: true, session });
}

/** Append-only audit row. Never mutate a balance without calling this. */
async function ledger({ userId, module, currencyType = 'balance', amount, balanceAfter, reason = '', refType = '', refId = null, session = null }) {
  const docs = await WalletLedger.create([{
    userId, module, currencyType, amount, balanceAfter, reason, refType, refId,
  }], session ? { session } : {});
  return docs[0];
}

/** debit + ledger in one call. Throws InsufficientFunds when the filter misses. */
async function debitWithLedger(Model, filter, opts) {
  const { field = 'balance', amount, session = null, userId, module, currencyType, reason, refType, refId } = opts;
  const doc = await debit(Model, filter, { field, amount, session });
  if (!doc) {
    const e = new Error('Insufficient balance');
    e.code = 'INSUFFICIENT_FUNDS';
    e.statusCode = 400;
    throw e;
  }
  await ledger({
    userId, module, currencyType: currencyType || field,
    amount: -amount, balanceAfter: doc[field],
    reason, refType, refId, session,
  });
  return doc;
}

async function creditWithLedger(Model, filter, opts) {
  const { field = 'balance', amount, session = null, userId, module, currencyType, reason, refType, refId } = opts;
  const doc = await credit(Model, filter, { field, amount, session });
  if (!doc) throw new Error('Wallet not found');
  await ledger({
    userId, module, currencyType: currencyType || field,
    amount, balanceAfter: doc[field],
    reason, refType, refId, session,
  });
  return doc;
}

module.exports = { debit, credit, ledger, debitWithLedger, creditWithLedger };
