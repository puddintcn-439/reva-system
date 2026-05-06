/**
 * migrate-all.js — Consolidated idempotent migration runner.
 *
 * Safe to run on every server startup. Applies all schema additions
 * (ALTER TABLE, CREATE TABLE IF NOT EXISTS) that existing databases
 * may be missing. All operations are wrapped in a single transaction.
 *
 * Usage (manual):  node src/scripts/migrate-all.js
 * Usage (startup): called automatically from server.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const db = require('../config/database')

async function migrateAll () {
  const client = await db.getClient()
  try {
    await client.query('BEGIN')

    // ── schema_migrations tracking table ──────────────────────────────────
    // Records which migration versions have been applied and when.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     VARCHAR(50) PRIMARY KEY,
        description TEXT,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // ── Extension ──────────────────────────────────────────────────────────
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)

    // ── customers table ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name       VARCHAR(100) NOT NULL,
        phone      VARCHAR(20) UNIQUE NOT NULL,
        notes      TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`)

    // ── sales: additive columns for older DBs ──────────────────────────────
    await client.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL`)
    await client.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancel_reason TEXT`)
    await client.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`)

    // ── sale_returns ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_returns (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_id        UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        refund_amount  NUMERIC(12,0) NOT NULL DEFAULT 0,
        reason         TEXT,
        created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sale_returns_sale ON sale_returns(sale_id)`)

    // ── sale_return_items ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_return_items (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        return_id     UUID NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
        sale_item_id  UUID REFERENCES sale_items(id)    ON DELETE SET NULL,
        product_id    UUID REFERENCES products(id)      ON DELETE SET NULL,
        product_name  VARCHAR(255) NOT NULL,
        product_code  VARCHAR(30),
        sale_price    NUMERIC(12,0) NOT NULL
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sale_return_items_return ON sale_return_items(return_id)`)

    // ── refresh_tokens ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  CHAR(64) NOT NULL UNIQUE,
        expires_at  TIMESTAMPTZ NOT NULL,
        revoked     BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)`)

    // ── commission_tiers seed (idempotent) ─────────────────────────────────
    await client.query(`
      INSERT INTO system_settings (key, value, label, description, is_secret) VALUES
        ('commission_tiers',
         '[{"max":60000,"type":"fixed","amount":20000,"label":"Dưới 60k"},{"max":130000,"type":"fixed","amount":30000,"label":"60k – 130k"},{"max":null,"type":"percent","amount":25,"label":"Trên 130k"}]',
         'Phí ký gửi', 'Công thức tính phí ký gửi theo khoảng giá (JSON)', FALSE)
      ON CONFLICT (key) DO NOTHING
    `)

    await client.query('COMMIT')

    // Record current migration version outside the transaction (best-effort)
    try {
      const db2 = require('../config/database')
      await db2.query(
        `INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING`,
        ['20260506_001', 'migrate-all: full idempotent schema consolidation']
      )
    } catch { /* non-fatal */ }

    console.log('✅ migrate-all: hoàn thành')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ migrate-all thất bại:', err.message)
    throw err
  } finally {
    client.release()
  }
}

module.exports = migrateAll

// Allow running directly: node src/scripts/migrate-all.js
if (require.main === module) {
  migrateAll()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
