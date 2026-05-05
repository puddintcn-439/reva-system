// instrument.js — Sentry SDK initialisation
// Must be required as the VERY FIRST module in server.js so that @sentry/node
// can instrument all subsequently-loaded modules (http, pg, etc.).
//
// On Vercel/CI environment variables are injected by the platform.
// For local development we load .env first so SENTRY_DSN is available.
require('dotenv').config();

const Sentry = require('@sentry/node');

Sentry.init({
  // dsn: undefined / empty → SDK disabled silently (safe with no env var)
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',

  // 100 % sampling in dev, 10 % in production to stay within free quota
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Capture local variable values in stack frames for easier debugging
  includeLocalVariables: true,
});
