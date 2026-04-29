/**
 * One-off Supabase diagnostics script.
 * Usage: set `DATABASE_URL` env var then run: `node src/scripts/supabase_diagnostics.js`
 * The script prints connectivity, active queries, table scan stats and top pg_stat_statements (if enabled).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');

async function run() {
  const client = await pool.connect();
  try {
    console.log('Connected to DB. Running diagnostics...');

    const info = await client.query(`SELECT current_database() AS db, current_timestamp AS now, version() AS version`);
    console.log('DB info:', info.rows[0]);

    const size = await client.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size`);
    console.log('Database size:', size.rows[0].db_size);

    const conn = await client.query(`SELECT count(*)::int AS total_connections FROM pg_stat_activity`);
    console.log('Total connections:', conn.rows[0].total_connections);

    const active = await client.query(
      `SELECT pid, now() - query_start AS duration, state, usename, query
       FROM pg_stat_activity
       WHERE state <> 'idle' AND query_start IS NOT NULL
       ORDER BY duration DESC
       LIMIT 20`
    );
    console.log('Active (longest) queries count:', active.rows.length);
    active.rows.forEach((r) => console.log(r));

    const tableStats = await client.query(
      `SELECT relname, seq_scan, idx_scan, n_live_tup
       FROM pg_stat_user_tables
       ORDER BY seq_scan DESC
       LIMIT 20`
    );
    console.log('Top tables by seq_scan (may indicate missing indexes):');
    tableStats.rows.forEach((r) => console.log(r));

    // Check pg_stat_statements availability
    const ext = await client.query(`SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements' LIMIT 1`).catch(() => ({ rows: [] }));
    if (ext && ext.rows && ext.rows.length) {
      const top = await client.query(
        `SELECT query, calls, total_time, mean_time
         FROM pg_stat_statements
         ORDER BY total_time DESC
         LIMIT 10`
      ).catch(() => ({ rows: [] }));
      console.log('Top queries by total_time from pg_stat_statements:');
      (top.rows || []).forEach((r) => console.log({ calls: r.calls, total_time: r.total_time, mean_time: r.mean_time, query: r.query && r.query.slice(0,200) }));
    } else {
      console.log('pg_stat_statements not enabled on this DB (or permission denied).');
    }

    const maxCon = await client.query(`SHOW max_connections`).catch(() => ({ rows: [] }));
    if (maxCon && maxCon.rows && maxCon.rows[0]) console.log('max_connections:', maxCon.rows[0].max_connections);

    // simple ping timing
    const t0 = Date.now();
    await client.query('SELECT 1');
    const t1 = Date.now();
    console.log('Ping (roundtrip) ms:', t1 - t0);

    console.log('Diagnostics complete.');
  } catch (err) {
    console.error('Diagnostics error:', err.message || err);
    process.exitCode = 1;
  } finally {
    try { client.release(); } catch (e) {}
    try { await pool.end(); } catch (e) {}
  }
}

run();
