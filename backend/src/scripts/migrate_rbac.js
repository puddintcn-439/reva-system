/**
 * Migration: Full RBAC
 *  1. Extend users.role constraint (add manager, cashier, accountant, inventory, viewer)
 *  2. Rename role 'others' → 'cashier'
 *  3. Create permissions table
 *  4. Create role_permissions table
 *  5. Create audit_logs table
 *  6. Seed role-permission mappings
 *  7. Upsert demo accounts for every role
 *
 * Usage: node src/scripts/migrate_rbac.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

// ─────────────────────────────────────────────
// Role ↔ Permission matrix
// ─────────────────────────────────────────────
const ALL_PERMISSIONS = [
  'dashboard:view',
  'pos:sale',
  'pos:history',        // view sales history
  'consignments:view',
  'consignments:manage',
  'products:view',
  'products:manage',
  'consignors:view',
  'consignors:manage',
  'settlements:view',
  'settlements:manage',
  'purchases:view',
  'purchases:manage',
  'settings:manage',
  'settings:system',    // system-level config: SMTP, CORS, JWT — superadmin only
  'users:manage',
  'reports:view',
  'inbox:view',
  'inbox:manage',
];

const ROLE_PERMISSIONS = {
  superadmin: ALL_PERMISSIONS,  // all permissions including settings:system
  admin: ALL_PERMISSIONS.filter(p => p !== 'settings:system'),
  manager: [
    'dashboard:view',
    'pos:sale', 'pos:history',
    'consignments:view', 'consignments:manage',
    'products:view', 'products:manage',
    'consignors:view', 'consignors:manage',
    'settlements:view',
    'purchases:view', 'purchases:manage',
    'reports:view',
    'inbox:view', 'inbox:manage',
  ],
  staff: [
    'dashboard:view',
    'pos:sale', 'pos:history',
    'consignments:view', 'consignments:manage',
    'products:view', 'products:manage',
    'consignors:view', 'consignors:manage',
    'purchases:view', 'purchases:manage',
    'inbox:view',
  ],
  cashier: [
    'pos:sale', 'pos:history',
    'products:view',
    'inbox:view',
  ],
  accountant: [
    'dashboard:view',
    'pos:history',
    'settlements:view', 'settlements:manage',
    'reports:view',
    'inbox:view',
  ],
  inventory: [
    'products:view', 'products:manage',
    'settings:manage',   // locations/categories only — enforced by business logic
    'inbox:view',
  ],
  viewer: [
    'dashboard:view',
    'pos:history',
    'products:view',
    'settlements:view',
    'reports:view',
    'inbox:view',
  ],
};

// Demo accounts, one per role (password: HUN@2026)
const DEMO_ACCOUNTS = [
  { username: 'admin',       full_name: 'Chủ cửa hàng',      email: 'admin@hun.vn',       role: 'admin'      },
  { username: 'manager1',    full_name: 'Quản Lý Demo',       email: 'manager@hun.vn',     role: 'manager'    },
  { username: 'nhanvien',    full_name: 'Nhân Viên Demo',     email: 'staff@hun.vn',       role: 'staff'      },
  { username: 'cashier1',    full_name: 'Thu Ngân Demo',      email: 'cashier@hun.vn',     role: 'cashier'    },
  { username: 'ketoan1',     full_name: 'Kế Toán Demo',       email: 'accountant@hun.vn',  role: 'accountant' },
  { username: 'kho1',        full_name: 'Quản Lý Kho Demo',   email: 'inventory@hun.vn',   role: 'inventory'  },
  { username: 'viewer1',     full_name: 'Chỉ Xem Demo',       email: 'viewer@hun.vn',      role: 'viewer'     },
];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Drop old role constraint FIRST (so we can rename freely)
    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    console.log('✅ dropped old role constraint');

    // 2. Rename old roles → new roles
    // others → cashier (backwards compat)
    const renamedOthers = await client.query(
      `UPDATE users SET role = 'cashier' WHERE role = 'others' RETURNING username`
    );
    if (renamedOthers.rowCount) console.log(`✅ renamed 'others' → 'cashier': ${renamedOthers.rows.map(r => r.username).join(', ')}`);

    // ctvien → cashier (old Vietnamese name used in some installs)
    const renamedCtv = await client.query(
      `UPDATE users SET role = 'cashier' WHERE role = 'ctvien' RETURNING username`
    );
    if (renamedCtv.rowCount) console.log(`✅ renamed 'ctvien' → 'cashier': ${renamedCtv.rows.map(r => r.username).join(', ')}`);

    // Any remaining unknown roles → viewer as safe fallback
    const renamedUnknown = await client.query(
      `UPDATE users SET role = 'viewer' WHERE role NOT IN ('superadmin','admin','manager','staff','cashier','accountant','inventory','viewer') RETURNING username, role`
    );
    if (renamedUnknown.rowCount) console.log(`✅ unknown roles → 'viewer': ${renamedUnknown.rows.map(r => r.username + '(' + r.role + ')').join(', ')}`);

    // 1b. Now safe to update the role constraint
    await client.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('superadmin','admin','manager','staff','cashier','accountant','inventory','viewer'))
    `);
    console.log('✅ role constraint: superadmin|admin|manager|staff|cashier|accountant|inventory|viewer');

    // 3. Create permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        name        VARCHAR(60) PRIMARY KEY,
        description VARCHAR(200)
      )
    `);

    // 4. Create role_permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role        VARCHAR(20) NOT NULL,
        permission  VARCHAR(60) NOT NULL REFERENCES permissions(name) ON DELETE CASCADE,
        PRIMARY KEY (role, permission)
      )
    `);

    // 5. Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
        username    VARCHAR(50),
        action      VARCHAR(50)  NOT NULL,  -- e.g. 'create', 'update', 'delete', 'mark_paid'
        resource    VARCHAR(50)  NOT NULL,  -- e.g. 'settlement', 'product'
        resource_id VARCHAR(100),
        details     JSONB,
        ip_address  VARCHAR(45),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_logs(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, resource)`);
    console.log('✅ permissions, role_permissions, audit_logs tables created');

    // 6. Seed permissions
    const DESCRIPTIONS = {
      'dashboard:view':       'Xem tổng quan',
      'pos:sale':             'Tạo / xử lý đơn bán hàng (POS)',
      'pos:history':          'Xem lịch sử bán hàng',
      'consignments:view':    'Xem yêu cầu ký gửi',
      'consignments:manage':  'Duyệt / sửa yêu cầu ký gửi',
      'products:view':        'Xem sản phẩm',
      'products:manage':      'Thêm / sửa / xóa sản phẩm',
      'consignors:view':      'Xem thông tin khách hàng',
      'consignors:manage':    'Sửa thông tin khách hàng',
      'settlements:view':     'Xem quyết toán',
      'settlements:manage':   'Tạo / duyệt / thanh toán quyết toán',
      'purchases:view':       'Xem yêu cầu thu mua',
      'purchases:manage':     'Cập nhật trạng thái thu mua',
      'settings:manage':      'Quản lý cài đặt hệ thống (cơ sở, thông báo, ngân hàng, email)',
      'users:manage':         'Quản lý tài khoản người dùng',
      'reports:view':         'Xem báo cáo / thống kê',
    };

    for (const perm of ALL_PERMISSIONS) {
      await client.query(`
        INSERT INTO permissions (name, description) VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
      `, [perm, DESCRIPTIONS[perm] || perm]);
    }

    // 7. Seed role_permissions (clear then re-insert)
    await client.query(`DELETE FROM role_permissions`);
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      for (const perm of perms) {
        await client.query(
          `INSERT INTO role_permissions (role, permission) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [role, perm]
        );
      }
    }
    console.log('✅ role_permissions seeded');

    // 8. Upsert demo accounts
    const hash = await bcrypt.hash('HUN@2026', 10);
    for (const acc of DEMO_ACCOUNTS) {
      await client.query(`
        INSERT INTO users (username, password, full_name, email, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username) DO UPDATE
          SET role = EXCLUDED.role, full_name = EXCLUDED.full_name, email = EXCLUDED.email
      `, [acc.username, hash, acc.full_name, acc.email, acc.role]);
      console.log(`  ✔ [${acc.role}] ${acc.username}`);
    }

    await client.query('COMMIT');
    console.log('\n🎉 RBAC migration done. Password for all demo accounts: HUN@2026');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => { console.error('Migration failed:', err.message); process.exit(1); });
