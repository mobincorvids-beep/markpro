/**
 * AES-256-GCM encryption for third-party credentials.
 *
 * Every OAuth token / API secret / provider key stored in MongoDB must go
 * through here. Key comes from TOKEN_ENCRYPTION_KEY (64 hex chars):
 *     openssl rand -hex 32
 *
 * Format on disk:  enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>
 * Values that are not in that format are returned untouched by decrypt(),
 * so pre-migration plaintext rows keep working until the backfill script runs.
 */
const crypto = require('crypto');

const PREFIX  = 'enc:v1:';
const ALGO    = 'aes-256-gcm';
const IV_LEN  = 12;

function getKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY is not set - generate one with `openssl rand -hex 32`');
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  return key;
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

function encrypt(plain) {
  if (plain === null || plain === undefined || plain === '') return plain;
  if (isEncrypted(plain)) return plain;                 // never double-encrypt
  const iv     = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct     = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return PREFIX + [iv.toString('hex'), tag.toString('hex'), ct.toString('hex')].join(':');
}

function decrypt(stored) {
  if (!isEncrypted(stored)) return stored;              // legacy plaintext passthrough
  const [, , ivHex, tagHex, ctHex] = stored.split(':');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]).toString('utf8');
}

/**
 * Mongoose field definition helper - drop-in replacement for `String` on any
 * credential field:   waAccessToken: encryptedField()
 */
function encryptedField(extra = {}) {
  return {
    type: String,
    set: encrypt,
    get: decrypt,
    ...extra,
  };
}

/** Call once per schema that uses encryptedField() so getters run on toJSON/toObject. */
function withGetters(schema) {
  schema.set('toJSON',   { getters: true, virtuals: true });
  schema.set('toObject', { getters: true, virtuals: true });
  return schema;
}

module.exports = { encrypt, decrypt, isEncrypted, encryptedField, withGetters };
