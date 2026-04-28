/**
 * System settings service — cached key-value store backed by DB.
 *
 * Priority (highest → lowest):
 *   1. DB value (if non-empty)
 *   2. process.env fallback
 *
 * Cache TTL: 60 seconds. Call invalidate() after a write.
 */
const db = require('./database');

const CACHE_TTL_MS = 60_000;

let _cache = null;
let _cacheAt = 0;

/** Load all settings from DB into an object { key: value } */
async function loadAll() {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL_MS) return _cache;

  try {
    const result = await db.query('SELECT key, value FROM system_settings');
    _cache = {};
    for (const row of result.rows) {
      _cache[row.key] = row.value ?? '';
    }
    _cacheAt = now;
  } catch {
    // Table may not exist yet (migration not run). Return empty — callers will use env fallbacks.
    _cache = {};
    _cacheAt = now;
  }
  return _cache;
}

/** Invalidate the in-memory cache (call after any write). */
function invalidate() {
  _cache = null;
  _cacheAt = 0;
}

/**
 * Get a single setting.
 * @param {string} key
 * @param {string} [envFallback] - process.env key to fall back to
 * @returns {Promise<string>}
 */
async function get(key, envFallback) {
  const all = await loadAll();
  const dbVal = all[key];
  if (dbVal !== undefined && dbVal !== '') return dbVal;
  if (envFallback) return process.env[envFallback] ?? '';
  return '';
}

/**
 * Get SMTP config (merges DB + env fallbacks).
 * @returns {Promise<{host,port,secure,user,pass,from}>}
 */
async function getSmtpConfig() {
  const all = await loadAll();
  const v = (k, envKey) => (all[k] && all[k] !== '') ? all[k] : (process.env[envKey] ?? '');
  return {
    host:   v('smtp_host',   'SMTP_HOST'),
    port:   parseInt(v('smtp_port',   'SMTP_PORT') || '587'),
    secure: v('smtp_secure', 'SMTP_SECURE') === 'true',
    user:   v('smtp_user',   'SMTP_USER'),
    pass:   v('smtp_pass',   'SMTP_PASS'),
    from:   v('smtp_from',   'SMTP_FROM') || 'REVA <noreply@reva.vn>',
  };
}

/**
 * Get allowed CORS origins as an array.
 * @returns {Promise<string[]>}
 */
async function getAllowedOrigins() {
  const all = await loadAll();
  const raw = (all['client_urls'] && all['client_urls'] !== '')
    ? all['client_urls']
    : (process.env.CLIENT_URL || 'http://localhost:5173');
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

/**
 * Upsert a setting value.
 * @param {string} key
 * @param {string} value
 */
async function set(key, value) {
  await db.query(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
  invalidate();
}

/**
 * Upsert multiple settings at once (in a transaction).
 * @param {Record<string, string>} map  { key: value }
 */
async function setMany(map) {
  const entries = Object.entries(map);
  if (!entries.length) return;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    for (const [key, value] of entries) {
      await client.query(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  invalidate();
}

/**
 * Get the JWT signing secret.
 * Priority: DB (if non-empty) → process.env.JWT_SECRET
 * @returns {Promise<string>}
 */
async function getJwtSecret() {
  return get('jwt_secret', 'JWT_SECRET');
}

module.exports = { get, getSmtpConfig, getAllowedOrigins, getJwtSecret, set, setMany, invalidate };
