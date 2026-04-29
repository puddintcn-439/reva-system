/**
 * Run EXPLAIN ANALYZE on queries used by the admin dashboard to find slow plans.
 * Usage: set `DATABASE_URL` env var then run: `node src/scripts/explain_dashboard_queries.js`
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');

const queries = [
  {
    name: 'products_agg',
    sql: `SELECT 
      COUNT(*) FILTER (WHERE status='active') AS active_count,
      COUNT(*) FILTER (WHERE status='sold') AS sold_count,
      COUNT(*) FILTER (WHERE status='pending') AS pending_count,
      SUM(sale_price) FILTER (WHERE status='sold') AS total_revenue,
      SUM(commission_amount) FILTER (WHERE status='sold') AS total_commission,
      SUM(consignor_amount) FILTER (WHERE status='sold') AS total_payout_all
      FROM products`
  },
  { name: 'consignors_count', sql: 'SELECT COUNT(*) FROM consignors' },
  {
    name: 'settlements_agg',
    sql: `SELECT 
      COUNT(*) FILTER (WHERE status='pending') AS pending_count,
      SUM(total_payout) FILTER (WHERE status='pending') AS pending_payout
      FROM settlements`
  },
  { name: 'consignment_requests', sql: "SELECT COUNT(*) FILTER (WHERE status='pending') AS pending FROM consignment_requests" }
];

async function run() {
  const client = await pool.connect();
  try {
    for (const q of queries) {
      console.log('\n===== EXPLAIN for', q.name, '=====');
      const explain = await client.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + q.sql);
      // explain.rows[0]['QUERY PLAN'] is JSON
      const plan = explain.rows[0]['QUERY PLAN'] || explain.rows[0]['QUERY_PLAN'] || explain.rows[0]['QUERYPLAN'];
      console.log(JSON.stringify(plan, null, 2));
    }
  } catch (err) {
    console.error('Explain error:', err.message || err);
    process.exitCode = 1;
  } finally {
    try { client.release(); } catch (e) {}
    try { await pool.end(); } catch (e) {}
  }
}

run();
