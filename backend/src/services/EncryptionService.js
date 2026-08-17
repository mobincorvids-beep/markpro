/**
 * EncryptionService
 *
 * OOP wrapper around utils/encryption.js. Every place that used to call the
 * loose encrypt()/decrypt() functions directly can instead go through one
 * instance of this class, which keeps the encryption key private to the
 * instance (never exposed on the object, never logged, never serialised by
 * JSON.stringify) instead of passing it around as a bare string.
 *
 * Usage:
 *   const { encryptionService } = require('../services/EncryptionService');
 *   const stored  = encryptionService.protect(apiKey);
 *   const apiKey2 = encryptionService.reveal(stored);
 */
const crypto = require('crypto');

const ALGO   = 'aes-256-gcm';
const PREFIX = 'enc:v1:';
const IV_LEN = 12;

class EncryptionService {
  // "#" makes this a true private class field - it cannot be read or
  // enumerated from outside the instance, not even via Object.keys()
  // or JSON.stringify(instance).
  #key;

  constructor(hexKey = process.env.TOKEN_ENCRYPTION_KEY) {
    if (!hexKey) {
      throw new Error('TOKEN_ENCRYPTION_KEY is not set - generate one with `openssl rand -hex 32`');
    }
    const key = Buffer.from(hexKey, 'hex');
    if (key.length !== 32) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
    }
    this.#key = key;
  }

  isProtected(value) {
    return typeof value === 'string' && value.startsWith(PREFIX);
  }

  /** Encrypts a plaintext secret (API key, OAuth token, etc.) for storage. */
  protect(plain) {
    if (plain === null || plain === undefined || plain === '') return plain;
    if (this.isProtected(plain)) return plain; // never double-encrypt

    const iv     = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, this.#key, iv);
    const ct     = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
    const tag    = cipher.getAuthTag();

    return PREFIX + [iv.toString('hex'), tag.toString('hex'), ct.toString('hex')].join(':');
  }

  /** Decrypts a value previously produced by protect(). Legacy plaintext passes through untouched. */
  reveal(stored) {
    if (!this.isProtected(stored)) return stored;
    const [, , ivHex, tagHex, ctHex] = stored.split(':');
    const decipher = crypto.createDecipheriv(ALGO, this.#key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]).toString('utf8');
  }

  /**
   * Redacts a secret for safe display in logs/UI, e.g. "sk_live_A1B2...9F3k"
   * -> "sk_live_A1B2...9F3k" becomes "sk_l***3k". Never log a raw secret.
   */
  redact(plain) {
    if (!plain || typeof plain !== 'string') return '';
    if (plain.length <= 8) return '*'.repeat(plain.length);
    return `${plain.slice(0, 4)}***${plain.slice(-2)}`;
  }

  /** Mongoose field definition helper - drop-in type for any credential field. */
  field(extra = {}) {
    return { type: String, set: (v) => this.protect(v), get: (v) => this.reveal(v), ...extra };
  }
}

// Singleton instance - one key, one service, shared across the app.
// (Still exports the class itself so tests can construct isolated instances
// with a throwaway key instead of touching process.env.)
const encryptionService = new EncryptionService();

module.exports = { EncryptionService, encryptionService };
