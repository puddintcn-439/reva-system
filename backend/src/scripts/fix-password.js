require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hun_consignment',
  user: 'postgres',
  password: 'postgres',
});

async function run() {
  const hash = await bcrypt.hash('Admin@123', 10);
  await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hash, 'admin']);
  await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hash, 'staff1']);
  console.log('Password updated successfully for admin and staff1');
  console.log('New password: Admin@123');
  pool.end();
}

run().catch(e => { console.error(e.message); pool.end(); });
