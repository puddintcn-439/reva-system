/**
 * Migration: Internal Inbox / Chat
 *  1. Create inbox_threads table
 *  2. Create inbox_messages table
 *  3. Add inbox:view + inbox:manage permissions
 *  4. Assign inbox:view to all roles; inbox:manage to superadmin, admin, manager
 *
 * Usage: node src/scripts/migrate_inbox.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create inbox_threads
    await client.query(`
      CREATE TABLE IF NOT EXISTS inbox_threads (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title       VARCHAR(200) NOT NULL,
        created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
        status      VARCHAR(10) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed')),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ inbox_threads table ready');

    // 2. Create inbox_messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS inbox_messages (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        thread_id   UUID NOT NULL REFERENCES inbox_threads(id) ON DELETE CASCADE,
        sender_id   UUID REFERENCES users(id) ON DELETE SET NULL,
        body        TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_inbox_messages_thread ON inbox_messages(thread_id, created_at)`);
    console.log('✅ inbox_messages table ready');

    // 3. Insert permissions (idempotent)
    await client.query(`
      INSERT INTO permissions (name, description) VALUES
        ('inbox:view',   'Xem và tham gia hội thoại nội bộ'),
        ('inbox:manage', 'Đóng / xóa hội thoại nội bộ')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ inbox permissions inserted');

    // 4. Assign inbox:view to every role
    const viewRoles = ['superadmin', 'admin', 'manager', 'staff', 'cashier', 'accountant', 'inventory', 'viewer'];
    for (const role of viewRoles) {
      await client.query(
        `INSERT INTO role_permissions (role, permission) VALUES ($1, 'inbox:view') ON CONFLICT DO NOTHING`,
        [role]
      );
    }
    console.log('✅ inbox:view assigned to all roles');

    // 5. Assign inbox:manage to admin-tier roles
    const manageRoles = ['superadmin', 'admin', 'manager'];
    for (const role of manageRoles) {
      await client.query(
        `INSERT INTO role_permissions (role, permission) VALUES ($1, 'inbox:manage') ON CONFLICT DO NOTHING`,
        [role]
      );
    }
    console.log('✅ inbox:manage assigned to superadmin, admin, manager');

    await client.query('COMMIT');
    console.log('\n🎉 Inbox migration complete!');
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
