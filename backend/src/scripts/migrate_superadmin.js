/**
 * Migration: Add superadmin role + settings:system permission
 *
 * - Adds 'superadmin' to users.role CHECK constraint
 * - Adds 'settings:system' permission (system-level config: SMTP, CORS, JWT)
 * - Grants superadmin all existing permissions + settings:system
 * - Optionally promotes an existing admin user to superadmin (first arg)
 *
 * Usage:
 *   node src/scripts/migrate_superadmin.js
 *   node src/scripts/migrate_superadmin.js admin    ← promotes user 'admin' to superadmin
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update role CHECK constraint to include superadmin
    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await client.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('superadmin','admin','manager','staff','cashier','accountant','inventory','viewer'))
    `);
    console.log("✅ role constraint updated: added 'superadmin'");

    // 2. Add settings:system permission
    await client.query(`
      INSERT INTO permissions (name, description)
      VALUES ('settings:system', 'Quản lý cài đặt hệ thống cấp cao (SMTP, CORS, JWT Secret)')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log("✅ permission 'settings:system' added");

    // 3. Grant superadmin all permissions (everything admin has + settings:system)
    const { rows: adminPerms } = await client.query(
      `SELECT permission FROM role_permissions WHERE role = 'admin'`
    );
    for (const { permission } of adminPerms) {
      await client.query(
        `INSERT INTO role_permissions (role, permission) VALUES ('superadmin', $1) ON CONFLICT DO NOTHING`,
        [permission]
      );
    }
    // Also grant settings:system (admin doesn't have it)
    await client.query(
      `INSERT INTO role_permissions (role, permission) VALUES ('superadmin', 'settings:system') ON CONFLICT DO NOTHING`
    );
    console.log('✅ superadmin permissions seeded (all admin perms + settings:system)');

    // 4. Optionally promote a user to superadmin
    const targetUser = process.argv[2];
    if (targetUser) {
      const { rowCount } = await client.query(
        `UPDATE users SET role = 'superadmin' WHERE username = $1`,
        [targetUser]
      );
      if (rowCount) console.log(`✅ User '${targetUser}' promoted to superadmin`);
      else console.warn(`⚠ User '${targetUser}' not found`);
    }

    await client.query('COMMIT');
    console.log('✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
