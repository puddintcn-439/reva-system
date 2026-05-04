const pino = require('pino')

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Centralised logger — pino
 *
 * Dev:        pretty-printed, human-readable
 * Production: JSON to stdout → captured by Vercel / any log aggregator
 *
 * Future scaling: swap the transport to pino-datadog-transport,
 * pino-loki, @logtail/pino etc. without touching any other file.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

  // Rename pino's "msg" → "message" so Vercel/Datadog recognise it
  messageKey: 'message',

  // Standard fields on every log line
  base: {
    service: 'reva-backend',
    env: process.env.NODE_ENV || 'development',
  },

  // ISO timestamp string (easier to read in Vercel logs)
  timestamp: pino.stdTimeFunctions.isoTime,

  // In dev, pretty-print; in prod, raw JSON
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname,service,env' } }
    : undefined,
})

module.exports = logger
