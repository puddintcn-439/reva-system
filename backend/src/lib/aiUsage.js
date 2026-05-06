const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Atomically check and increment AI usage for a user, date, and endpoint.
 * Returns { allowed: true } on success, or { allowed: false, calls } if quota exceeded.
 */
async function checkAndIncrementUsage(userId, endpoint, quota) {
  if (!userId) return { allowed: true }; // Can't enforce for anonymous
  const client = await db.getClient();
  const today = new Date().toISOString().slice(0, 10);
  try {
    await client.query('BEGIN');
    const sel = await client.query(
      'SELECT calls FROM ai_usage WHERE user_id = $1 AND date = $2 AND endpoint = $3 FOR UPDATE',
      [userId, today, endpoint]
    );
    if (sel.rows.length) {
      const calls = Number(sel.rows[0].calls || 0);
      if (calls >= quota) {
        await client.query('ROLLBACK');
        return { allowed: false, calls };
      }
      await client.query('UPDATE ai_usage SET calls = calls + 1, updated_at = NOW() WHERE user_id = $1 AND date = $2 AND endpoint = $3', [userId, today, endpoint]);
    } else {
      await client.query('INSERT INTO ai_usage (user_id, date, endpoint, calls) VALUES ($1, $2, $3, 1)', [userId, today, endpoint]);
    }
    await client.query('COMMIT');
    return { allowed: true };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    logger.error({ err: err.message, userId, endpoint }, 'AI usage increment failed');
    // Fail open: if DB fails, allow the request to proceed so AI features don't break
    return { allowed: true };
  } finally {
    client.release();
  }
}

async function getUsageByDate(date) {
  const q = `SELECT au.user_id, u.username, au.endpoint, au.calls, au.created_at, au.updated_at
             FROM ai_usage au LEFT JOIN users u ON u.id = au.user_id
             WHERE au.date = $1 ORDER BY au.calls DESC`;
  const res = await db.query(q, [date]);
  return res.rows;
}

module.exports = { checkAndIncrementUsage, getUsageByDate };
