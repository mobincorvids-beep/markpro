/**
 * Social sign-in (Google + Apple).
 *
 * Both providers hand the BROWSER a signed identity token (an OpenID Connect
 * "id_token"). The browser posts it here and the server verifies the signature
 * against the provider's public keys before trusting a single field in it.
 * Nothing is trusted client-side, so no provider secret ever reaches the SPA.
 *
 * Env needed:
 *   GOOGLE_CLIENT_ID  - OAuth "Web application" client id from Google Cloud
 *   APPLE_CLIENT_ID   - the Services ID from the Apple Developer portal
 * The matching public values must also be set on the frontend as
 * REACT_APP_GOOGLE_CLIENT_ID / REACT_APP_APPLE_CLIENT_ID.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Plan = require('../models/Plan.model');
const { generateTokenPair } = require('../utils/jwt');
const logger = require('../utils/logger');

const GOOGLE_TOKENINFO = 'https://oauth2.googleapis.com/tokeninfo?id_token=';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

/* --------------------------------------------------------------- Google */
async function verifyGoogleToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Google sign-in is not configured on the server');

  const res = await fetch(GOOGLE_TOKENINFO + encodeURIComponent(idToken));
  if (!res.ok) throw new Error('Google rejected this sign-in token');
  const p = await res.json();

  if (p.aud !== clientId) throw new Error('Google token was issued for a different app');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(p.iss))
    throw new Error('Google token has an unexpected issuer');
  if (Number(p.exp) * 1000 < Date.now()) throw new Error('Google token has expired');
  if (!p.email) throw new Error('Google token carries no email address');

  return {
    provider: 'google',
    providerId: p.sub,
    email: String(p.email).toLowerCase(),
    emailVerified: p.email_verified === true || p.email_verified === 'true',
    name: p.name || '',
    avatar: p.picture || '',
  };
}

/* ---------------------------------------------------------------- Apple */
let appleKeyCache = { keys: null, at: 0 };

async function getAppleKeys() {
  if (appleKeyCache.keys && Date.now() - appleKeyCache.at < 60 * 60 * 1000) return appleKeyCache.keys;
  const res = await fetch(APPLE_KEYS_URL);
  if (!res.ok) throw new Error('Could not fetch Apple public keys');
  const { keys } = await res.json();
  appleKeyCache = { keys, at: Date.now() };
  return keys;
}

async function verifyAppleToken(idToken, fallbackName) {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) throw new Error('Apple sign-in is not configured on the server');

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header?.kid) throw new Error('Malformed Apple token');

  const jwk = (await getAppleKeys()).find(k => k.kid === decoded.header.kid);
  if (!jwk) throw new Error('Apple signing key not found');

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const p = jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    audience: clientId,
    issuer: 'https://appleid.apple.com',
  });

  if (!p.email) throw new Error('Apple token carries no email address (re-authorize the app)');

  return {
    provider: 'apple',
    providerId: p.sub,
    email: String(p.email).toLowerCase(),
    emailVerified: p.email_verified === true || p.email_verified === 'true',
    // Apple only sends the name on the very FIRST authorization, in the form
    // body rather than the token — so accept it from the request as a fallback.
    name: fallbackName || '',
    avatar: '',
  };
}

/* -------------------------------------------------------- shared helper */
const sanitize = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  isEmailVerified: user.isEmailVerified,
  balance: user.balance,
  apiKey: user.apiKey,
  currency: user.currency,
  status: user.status,
  plan: user.plan,
  subscriptionStatus: user.subscriptionStatus,
  usage: user.usage,
  preferences: user.preferences,
  createdAt: user.createdAt,
  user_id: user._id,
  short_nm: user.name?.slice(0, 2).toUpperCase() || '?',
  profile_img: user.profilePicture?.url || user.avatar || '',
  parentId: user.parentId,
  access_level: user.accessLevel,
  bioRole: user.bioRole || 2,
});

async function findOrCreateSocialUser(profile, req) {
  let user = await User.findOne({ email: profile.email }).populate('plan');

  if (!user) {
    const defaultPlan = await Plan.findOne({ isDefault: true });
    user = await User.create({
      name: profile.name || profile.email.split('@')[0],
      username: profile.email.split('@')[0] + '_' + Date.now().toString(36),
      email: profile.email,
      // Social accounts never use this password; it exists because the schema
      // requires one. Password sign-in stays impossible until the user sets a
      // real password from Settings (the value here is unguessable).
      password: crypto.randomBytes(32).toString('hex'),
      isEmailVerified: profile.emailVerified,
      avatar: profile.avatar || undefined,
      authProvider: profile.provider,
      [`${profile.provider}Id`]: profile.providerId,
      plan: defaultPlan?._id || null,
      ipAddress: req.ip,
    });

    try {
      const AccountNotification = require('../models/AccountNotification.model');
      await AccountNotification.create({
        user: user._id,
        title: 'Welcome to MarkPro',
        body: 'Your workspace is ready. Connect your first module to get started.',
        type: 'system',
      });
    } catch (e) {
      logger.warn(`Welcome notification failed: ${e.message}`);
    }
  } else {
    // Existing email/password account signing in with the same verified email:
    // link the provider instead of creating a duplicate user.
    user[`${profile.provider}Id`] = profile.providerId;
    if (profile.emailVerified) user.isEmailVerified = true;
    if (!user.avatar && profile.avatar) user.avatar = profile.avatar;
  }

  if (!user.isActive || user.status === 0) {
    const err = new Error('Your account has been suspended');
    err.statusCode = 403;
    throw err;
  }

  return user;
}

/* ------------------------------------------------------------- endpoint */
exports.socialLogin = async (req, res) => {
  try {
    const provider = String(req.params.provider || '').toLowerCase();
    const { credential, name } = req.body || {};
    if (!credential) return res.status(400).json({ success: false, error: 'Missing identity token' });

    let profile;
    if (provider === 'google') profile = await verifyGoogleToken(credential);
    else if (provider === 'apple') profile = await verifyAppleToken(credential, name);
    else return res.status(400).json({ success: false, error: 'Unsupported provider' });

    const user = await findOrCreateSocialUser(profile, req);

    const { accessToken, refreshToken } = generateTokenPair(user._id);
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      success: true,
      data: { accessToken, refreshToken, user: sanitize(user) },
      token: accessToken,
      user: sanitize(user),
    });
  } catch (err) {
    logger.error('Social login error:', err);
    res.status(err.statusCode || 401).json({ success: false, error: err.message || 'Social sign-in failed' });
  }
};

/** Lets the SPA know which providers are actually configured. */
exports.socialConfig = (_req, res) => {
  res.json({
    success: true,
    data: {
      google: Boolean(process.env.GOOGLE_CLIENT_ID),
      apple: Boolean(process.env.APPLE_CLIENT_ID),
    },
  });
};
