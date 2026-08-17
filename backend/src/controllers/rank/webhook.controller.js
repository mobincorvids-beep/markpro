/**
 * Section B.3: this module no longer owns a Stripe endpoint and no longer
 * reads STRIPE_WEBHOOK_SECRET. Its logic lives in
 * controllers/webhooks/handlers/core.plans.js and runs through the single
 * consolidated dispatcher at POST /api/webhooks/stripe.
 */
module.exports.handleEvent = require('../webhooks/handlers/core.plans');
