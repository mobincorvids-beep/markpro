#!/usr/bin/env node
/**
 * Creates backend/.env and frontend/.env from the committed .env.example files
 * and fills in the values that must never be left at a default:
 * JWT secrets, the session secret, and the AES-256-GCM credential key.
 *
 * Safe to re-run: existing .env files are left untouched.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GENERATED = {
  JWT_SECRET:            () => crypto.randomBytes(48).toString('hex'),
  JWT_REFRESH_SECRET:    () => crypto.randomBytes(48).toString('hex'),
  SESSION_SECRET:        () => crypto.randomBytes(32).toString('hex'),
  // AES-256-GCM needs exactly 32 bytes → 64 hex characters.
  TOKEN_ENCRYPTION_KEY:  () => crypto.randomBytes(32).toString('hex'),
};

function build(dir) {
  const example = path.join(dir, '.env.example');
  const target  = path.join(dir, '.env');

  if (!fs.existsSync(example)) return console.log(`skip   ${dir} (no .env.example)`);
  if (fs.existsSync(target))   return console.log(`keep   ${target} (already exists)`);

  const out = fs.readFileSync(example, 'utf8').split('\n').map((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) return line;
    const gen = GENERATED[m[1]];
    return gen ? `${m[1]}=${gen()}` : line;
  }).join('\n');

  fs.writeFileSync(target, out);
  console.log(`create ${target}`);
}

['backend', 'frontend'].forEach(d => build(path.join(__dirname, '..', d)));
console.log('\nSecrets generated. Open backend/.env and fill in MONGO_URI plus any');
console.log('third-party keys (Stripe, SMTP, OpenAI) for the modules you plan to use.');
