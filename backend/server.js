// instrument.js MUST be the first require so Sentry can patch Node's built-ins
// (http, pg, etc.) before they are imported by app.js and its dependencies.
require('./instrument');

require('dotenv').config();
const app = require('./src/app');
const migrateAll = require('./src/scripts/migrate-all');

const PORT = process.env.PORT || 5000;

// Run incremental migrations before accepting traffic
migrateAll()
  .catch((err) => console.error('⚠️  migrate-all error (server will still start):', err.message))
  .finally(async () => {
    try {
      const sysSettings = require('./src/config/systemSettings');
      const secret = await sysSettings.getJwtSecret();
      if (process.env.NODE_ENV === 'production') {
        if (!secret || typeof secret !== 'string' || secret.length < 32) {
          console.error('❌ JWT_SECRET is missing or too weak for production. Set JWT_SECRET and redeploy.');
          process.exit(1);
        }
      }
    } catch (err) {
      console.error('❌ Failed checking JWT secret during startup:', err.message);
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`✅ R.E.V.A Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  });

// ── Graceful shutdown ─────────────────────────────────────────
// Gives in-flight requests time to complete before the process exits.
// Required for zero-downtime deploys and container orchestration.
const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  // Allow up to 10 s for in-flight requests; then force-exit
  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out — forcing exit.');
    process.exit(1);
  }, 10_000);
  forceExit.unref(); // Don't keep the event loop alive just for this timer
  // Close DB pool
  try {
    const db = require('./src/config/database');
    db.pool.end(() => {
      console.log('DB pool closed.');
      process.exit(0);
    });
  } catch {
    process.exit(0);
  }
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled rejection / exception guards ────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
  // In production let the process manager (Docker/PM2) restart the process
  if (process.env.NODE_ENV === 'production') process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
