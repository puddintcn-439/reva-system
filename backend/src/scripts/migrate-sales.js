/**
 * Migration: tạo bảng sales và sale_items cho POS
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const { Pool } = require('pg')

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'hun_consignment',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
})

async function run() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        invoice_code     VARCHAR(20) UNIQUE NOT NULL,
        customer_name    VARCHAR(100),
        customer_phone   VARCHAR(20),
        total_amount     NUMERIC(12,0) NOT NULL DEFAULT 0,
        discount_amount  NUMERIC(12,0) NOT NULL DEFAULT 0,
        final_amount     NUMERIC(12,0) NOT NULL DEFAULT 0,
        payment_method   VARCHAR(20) NOT NULL DEFAULT 'cash'
                         CHECK (payment_method IN ('cash', 'transfer', 'mixed')),
        note             TEXT,
        location_id      UUID REFERENCES locations(id) ON DELETE SET NULL,
        created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_id           UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
        product_name      VARCHAR(255) NOT NULL,
        product_code      VARCHAR(30),
        sale_price        NUMERIC(12,0) NOT NULL,
        commission_amount NUMERIC(12,0) NOT NULL DEFAULT 0,
        consignor_amount  NUMERIC(12,0) NOT NULL DEFAULT 0,
        consignor_id      UUID REFERENCES consignors(id) ON DELETE SET NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_code)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)`)

    await client.query('COMMIT')
    console.log('✅ Tạo bảng sales và sale_items thành công')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('❌ Lỗi:', e.message)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
