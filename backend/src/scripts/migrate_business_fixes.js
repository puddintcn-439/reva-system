/**
 * Migration: business logic improvements
 * 1. Add cancel_reason, cancelled_at to sales
 * 2. Add payment_notes to settlements
 *
 * Usage: node src/scripts/migrate_business_fixes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. sales: cancel support
    await client.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled'))`);
    await client.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancel_reason TEXT`);
    await client.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`);

    // Backfill: sales with paid_at already set → mark as paid
    await client.query(`UPDATE sales SET status = 'paid' WHERE paid_at IS NOT NULL AND status = 'pending'`);

    console.log('✅ sales: status, cancel_reason, cancelled_at columns ensured');

    // 2. settlements: payment_notes
    await client.query(`ALTER TABLE settlements ADD COLUMN IF NOT EXISTS payment_notes TEXT`);
    console.log('✅ settlements: payment_notes column ensured');

    await client.query('COMMIT');
    console.log('\n🎉 Business fixes migration done.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

run();
