/**
 * Run seed.sql to insert initial data.
 * Usage: node src/scripts/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function seed() {
  const seedPath = path.join(__dirname, '../../../database/seed.sql');
  const sql = fs.readFileSync(seedPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Seed data inserted successfully');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
