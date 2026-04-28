/**
 * Migration: extend users.role constraint to include 'others' role,
 * and insert 3 test accounts (admin / staff / others).
 * Usage: node src/scripts/migrate_roles.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Drop old CHECK constraint on role column
    await client.query(`
      ALTER TABLE users
        DROP CONSTRAINT IF EXISTS users_role_check
    `);

    // 2. Re-add constraint with 'others' included
    await client.query(`
      ALTER TABLE users
        ADD CONSTRAINT users_role_check
        CHECK (role IN ('admin', 'staff', 'others'))
    `);
    console.log('✅ role constraint updated: admin | staff | others');

    // 3. Upsert the three demo accounts (password: HUN@2026)
    const hash = await bcrypt.hash('HUN@2026', 10);

    const accounts = [
      { username: 'admin',   full_name: 'Chủ cửa hàng (Admin)',  email: 'admin@hun.vn',   role: 'admin'  },
      { username: 'nhanvien', full_name: 'Nhân Viên Demo',         email: 'staff@hun.vn',   role: 'staff'  },
      { username: 'ctvien',   full_name: 'Cộng Tác Viên Demo',     email: 'others@hun.vn',  role: 'others' },
    ];

    for (const acc of accounts) {
      await client.query(`
        INSERT INTO users (username, password, full_name, email, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username) DO UPDATE
          SET role      = EXCLUDED.role,
              full_name = EXCLUDED.full_name,
              email     = EXCLUDED.email
      `, [acc.username, hash, acc.full_name, acc.email, acc.role]);
      console.log(`  ✔ upserted [${acc.role}] ${acc.username}`);
    }

    await client.query('COMMIT');
    console.log('\n🎉 Done. Credentials — username / password: HUN@2026');
    console.log('  admin    → chủ, toàn quyền');
    console.log('  nhanvien → nhân viên, không có quyết toán & cài đặt');
    console.log('  ctvien   → cộng tác viên, chỉ POS / lịch sử / sản phẩm');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => { console.error('Migration failed:', err); process.exit(1); });
