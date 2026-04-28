/**
 * Run schema.sql and seed.sql against the configured database.
 * Usage: node src/scripts/migrate.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function migrate() {
  const schemaPath = path.join(__dirname, '../../../database/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Schema applied successfully');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => { console.error('Migration failed:', err); process.exit(1); });
