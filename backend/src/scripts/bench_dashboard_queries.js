/**
 * Benchmark: compare original multi-query approach vs new single-query approach.
 * Usage: set `DATABASE_URL` env var then run: `node src/scripts/bench_dashboard_queries.js`
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');

async function multiQuery(client) {
  const t0 = Date.now();
  await Promise.all([
    client.query(`SELECT 
      COUNT(*) FILTER (WHERE status='active') AS active_count,
      COUNT(*) FILTER (WHERE status='sold') AS sold_count,
      COUNT(*) FILTER (WHERE status='pending') AS pending_count,
      SUM(sale_price) FILTER (WHERE status='sold') AS total_revenue,
      SUM(commission_amount) FILTER (WHERE status='sold') AS total_commission,
      SUM(consignor_amount) FILTER (WHERE status='sold') AS total_payout_all
      FROM products`),
    client.query('SELECT COUNT(*) FROM consignors'),
    client.query(`SELECT 
      COUNT(*) FILTER (WHERE status='pending') AS pending_count,
      SUM(total_payout) FILTER (WHERE status='pending') AS pending_payout
      FROM settlements`),
    client.query("SELECT COUNT(*) FILTER (WHERE status='pending') AS pending FROM consignment_requests"),
  ]);
  return Date.now() - t0;
}

async function singleQuery(client) {
  const t0 = Date.now();
  await client.query(`
    SELECT
      (SELECT json_build_object(
        'active_count', COUNT(*) FILTER (WHERE status='active'),
        'sold_count', COUNT(*) FILTER (WHERE status='sold'),
        'pending_count', COUNT(*) FILTER (WHERE status='pending'),
        'total_revenue', SUM(sale_price) FILTER (WHERE status='sold'),
        'total_commission', SUM(commission_amount) FILTER (WHERE status='sold'),
        'total_payout_all', SUM(consignor_amount) FILTER (WHERE status='sold')
      ) FROM products) AS products,
      (SELECT COUNT(*) FROM consignors) AS consignors_total,
      (SELECT json_build_object(
        'pending_count', COUNT(*) FILTER (WHERE status='pending'),
        'pending_payout', SUM(total_payout) FILTER (WHERE status='pending')
      ) FROM settlements) AS settlements,
      (SELECT json_build_object('pending', COUNT(*) FILTER (WHERE status='pending')) FROM consignment_requests) AS consignment_requests
  `);
  return Date.now() - t0;
}

async function run() {
  const client = await pool.connect();
  try {
    // warm-up
    await client.query('SELECT 1');

    const multi = await multiQuery(client);
    const single = await singleQuery(client);
    console.log('multi (ms):', multi, 'single (ms):', single);
  } catch (err) {
    console.error('bench error:', err.message || err);
  } finally {
    try { client.release(); } catch (e) {}
    try { await pool.end(); } catch (e) {}
  }
}

run();
