/**
 * End-to-end smoke test: boots the real Express app against an in-memory
 * MongoDB and exercises the paths that the Section B refactor touched.
 *   node tests/smoke.test.js
 */
const assert = require('assert');
const { MongoMemoryServer } = require('mongodb-memory-server');

let failures = 0;
const results = [];
async function test(name, fn) {
  try { await fn(); results.push(`  PASS  ${name}`); }
  catch (e) { failures++; results.push(`  FAIL  ${name}\n        ${e.message}`); }
}

(async () => {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri('markpro_test');
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5098';
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);

  const request = require('supertest');
  const mongoose = require('mongoose');
  const { app, server } = require('../src/server');
  await new Promise(r => setTimeout(r, 2500));   // let mongoose connect

  // ── Section B.2 — credential encryption ─────────────────────────────
  await test('B.2 encryption round-trips and never stores plaintext', () => {
    const { encrypt, decrypt } = require('../src/utils/encryption');
    const secret = 'sk_live_super_secret_value';
    const blob = encrypt(secret);
    assert.ok(!blob.includes(secret), 'ciphertext must not contain plaintext');
    assert.strictEqual(decrypt(blob), secret);
    assert.notStrictEqual(encrypt(secret), encrypt(secret), 'IV must be random per call');
  });

  // ── Section B.5 — atomic wallet ─────────────────────────────────────
  await test('B.5 concurrent debits cannot overdraw the wallet', async () => {
    const User = require('../src/models/User.model');
    const { debitWithLedger } = require('../src/utils/wallet');
    const WalletLedger = require('../src/models/WalletLedger.model');

    const u = await User.create({ name: 'Race', email: `race${Date.now()}@t.io`, password: 'SuperSecret123!' });
    await User.updateOne({ _id: u._id }, { $set: { balance: 100 } });

    // 20 parallel debits of 10 against a balance of 100 → exactly 10 succeed.
    const attempts = await Promise.allSettled(
      Array.from({ length: 20 }, () => debitWithLedger(
        User, { _id: u._id },
        { amount: 10, userId: u._id, module: 'test', reason: 'race-test' },
      ))
    );
    const okCount = attempts.filter(a => a.status === 'fulfilled').length;
    const rejected = attempts.filter(a => a.status === 'rejected');
    const fresh = await User.findById(u._id);

    assert.strictEqual(okCount, 10, `exactly 10 debits should succeed, got ${okCount}`);
    assert.strictEqual(fresh.get('balance'), 0, `balance should be 0, got ${fresh.get('balance')}`);
    assert.ok(rejected.every(r => r.reason.code === 'INSUFFICIENT_FUNDS'),
      'over-draw attempts must fail with INSUFFICIENT_FUNDS');
    assert.strictEqual(await WalletLedger.countDocuments({ userId: u._id }), 10,
      'ledger must hold exactly one row per successful debit');
  });

  // ── Section B.7 — response envelope ─────────────────────────────────
  await test('B.7 unknown API route returns the standard error shape', async () => {
    const res = await request(app).get('/api/definitely-not-a-route');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message && res.body.error, 'message and error must both be set');
  });

  await test('B.7 successful responses always carry success + data', async () => {
    const res = await request(app).get('/api/seo/tools');
    assert.ok(res.status < 500, `unexpected ${res.status}`);
    assert.strictEqual(typeof res.body.success, 'boolean');
    if (res.body.success) assert.ok('data' in res.body, 'success replies must expose data');
  });

  // ── Section B.8 — no unhandled rejection escapes ────────────────────
  await test('B.8 a throwing handler yields 500 JSON, not a hang', async () => {
    const { wrapRouter } = require('../src/utils/wrapRouter');
    const express = require('express');
    const r = express.Router();
    r.get('/boom', async () => { throw new Error('kaboom'); });
    const probe = express();
    probe.use(require('../src/middleware/envelope.middleware'));
    probe.use('/api', wrapRouter(r));
    const { errorHandler } = require('../src/middleware/errorHandler.middleware');
    probe.use(errorHandler);
    const res = await request(probe).get('/api/boom');
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.success, false);
  });

  // ── Section B.3 — single Stripe webhook ─────────────────────────────
  await test('B.3 /api/webhooks/stripe rejects an unsigned payload', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send({ type: 'checkout.session.completed' });
    assert.strictEqual(res.status, 400, 'missing signature must be rejected');
  });

  await test('B.3 the retired per-module webhook endpoints are gone', async () => {
    for (const path of ['/api/plans/webhook', '/api/credits/webhook']) {
      const res = await request(app).post(path).send({});
      assert.notStrictEqual(res.status, 200, `${path} should no longer accept webhooks`);
    }
  });

  // ── Auth flow ───────────────────────────────────────────────────────
  await test('auth: register → login → authenticated request', async () => {
    const email = `user${Date.now()}@markpro.test`;
    const reg = await request(app).post('/api/auth/register')
      .send({ name: 'Test User', email, password: 'SuperSecret123!' });
    assert.ok([200, 201].includes(reg.status), `register returned ${reg.status}: ${JSON.stringify(reg.body)}`);

    const login = await request(app).post('/api/auth/login')
      .send({ email, password: 'SuperSecret123!' });
    assert.ok([200, 201].includes(login.status), `login returned ${login.status}`);
    const token = login.body.token || login.body.data?.token || login.body.data?.accessToken;
    assert.ok(token, `no token in login reply: ${JSON.stringify(login.body)}`);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.strictEqual(me.status, 200, `me returned ${me.status}`);
  });

  console.log('\nMarkPro smoke tests\n' + results.join('\n'));
  console.log(failures ? `\n${failures} FAILING` : '\nAll green');

  server.close();
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(failures ? 1 : 0);
})();
