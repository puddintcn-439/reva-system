// src/instrument.js — Sentry SDK initialisation for the React frontend
// Must be imported as the VERY FIRST import in src/main.jsx so that
// @sentry/react wraps ReactDOM before any component tree is rendered.
import * as Sentry from '@sentry/react'

Sentry.init({
  // dsn: undefined / empty string → SDK silently disabled (safe with no env var)
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,

  integrations: [
    // Automatic page-load + navigation spans + outgoing fetch tracing
    Sentry.browserTracingIntegration(),
    // Session Replay — record sessions around errors
    Sentry.replayIntegration({
      maskAllText: true,   // mask all text content in replays (privacy)
      blockAllMedia: true, // block images/video in replays (privacy)
    }),
  ],

  // 100 % sampling in dev, 10 % in production (free quota friendly)
  tracesSampleRate: import.meta.env.MODE === 'development' ? 1.0 : 0.1,

  // Capture 10 % of sessions normally, 100 % of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Strip PII — never send email addresses to Sentry
  beforeSend: (event) => {
    if (event.user) delete event.user.email
    return event
  },
})
