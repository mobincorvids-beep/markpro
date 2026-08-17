// Vercel serverless entry point. Vercel calls this file for every request
// matched by vercel.json below; it just hands the request to the same
// Express app used for normal hosting (server.js skips app.listen() and
// socket.io/cron setup automatically when process.env.VERCEL is set).
module.exports = require('../src/server');