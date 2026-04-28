/**
 * Add payment status columns to sales table.
 * Safe to run multiple times (uses IF NOT EXISTS / DO $$).
 * Usage: node src/scripts/migrate_sales_status.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE sales
        ADD COLUMN IF NOT EXISTS status              VARCHAR(20)   NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS paid_at             TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS payment_reference   VARCHAR(100);
    `);
    console.log('✅ sales: status, paid_at, payment_reference columns ensured');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => { console.error('Migration failed:', err.message); process.exit(1); });
