/**
 * Migration: tạo bảng sale_returns và sale_return_items
 * Chạy: node src/scripts/migrate-sale-returns.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const db = require('../config/database')

async function run () {
  const client = await db.getClient()
  try {
    await client.query('BEGIN')

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_return_items (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        return_id     UUID NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
        sale_item_id  UUID REFERENCES sale_items(id) ON DELETE SET NULL,
        product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
        product_name  VARCHAR(255) NOT NULL,
        product_code  VARCHAR(30),
        sale_price    NUMERIC(12,0) NOT NULL
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sale_return_items_return ON sale_return_items(return_id)`)

    await client.query('COMMIT')
    console.log('✅ Migration hoàn thành: bảng sale_returns và sale_return_items đã tạo')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Migration thất bại:', err.message)
    process.exit(1)
  } finally {
    client.release()
    process.exit(0)
  }
}

run()
