/**
 * Migration: tạo bảng customers và liên kết với sales
 * Chạy: node src/scripts/migrate-customers.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const db = require('../config/database')

async function run () {
  const client = await db.getClient()
  try {
    await client.query('BEGIN')

    // 1. Tạo bảng customers
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

    // 2. Thêm cột customer_id vào sales (nếu chưa có)
    await client.query(`
      ALTER TABLE sales
        ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL
    `)

    // 3. Backfill: tạo customer từ dữ liệu sales hiện có
    await client.query(`
      INSERT INTO customers (name, phone)
      SELECT DISTINCT ON (customer_phone) customer_name, customer_phone
      FROM sales
      WHERE customer_phone IS NOT NULL
        AND customer_name  IS NOT NULL
        AND customer_phone != ''
        AND customer_name  != ''
      ORDER BY customer_phone, created_at DESC
      ON CONFLICT (phone) DO NOTHING
    `)

    // 4. Liên kết sales.customer_id với customers đã tạo
    await client.query(`
      UPDATE sales s
      SET customer_id = c.id
      FROM customers c
      WHERE s.customer_phone = c.phone
        AND s.customer_id IS NULL
    `)

    await client.query('COMMIT')
    console.log('✅ Migration hoàn thành: bảng customers đã tạo, backfill xong')
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
