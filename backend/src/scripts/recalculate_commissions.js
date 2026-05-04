#!/usr/bin/env node
/**
 * Recalculate commission_amount and consignor_amount for existing products
 * using the current `commission_tiers` from system settings.
 * By default this script updates only products with status = 'active'
 * to avoid touching settled/returned items. To change behavior edit the
 * WHERE clause below.
 * Usage:
 *   DATABASE_URL=... node recalculate_commissions.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const db = require('../config/database')
const settings = require('../config/systemSettings')

function calcCommissionFromTiers(price, tiers) {
  price = Number(price)
  if (!price || !Array.isArray(tiers) || !tiers.length) return { commission: 0, consignorAmount: 0 }
  const sorted = [...tiers].sort((a, b) => (a.max === null ? 1 : b.max === null ? -1 : a.max - b.max))
  for (const tier of sorted) {
    if (tier.max === null || price <= tier.max) {
      const commission = tier.type === 'percent' ? Math.round(price * tier.amount / 100) : Number(tier.amount)
      return { commission, consignorAmount: Math.max(0, price - commission) }
    }
  }
  return { commission: 0, consignorAmount: price }
}

async function run() {
  try {
    console.log('Loading commission tiers...')
    const tiers = await settings.getCommissionTiers()
    console.log('Tiers:', JSON.stringify(tiers))

    console.log('Fetching active products...')
    // Only update products currently on sale to avoid affecting settlements/settled items
    const res = await db.query("SELECT id, sale_price FROM products WHERE status = 'active' AND sale_price IS NOT NULL")
    const rows = res.rows || []
    console.log(`Found ${rows.length} products (sale_price != NULL)`)
    if (!rows.length) return process.exit(0)

    const client = await db.getClient()
    let updated = 0
    try {
      await client.query('BEGIN')
      for (const r of rows) {
        const price = Number(r.sale_price)
        if (!price || Number.isNaN(price)) continue
        const { commission, consignorAmount } = calcCommissionFromTiers(price, tiers)
        await client.query(
          'UPDATE products SET commission_amount = $1, consignor_amount = $2 WHERE id = $3',
          [commission, consignorAmount, r.id]
        )
        updated++
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    console.log(`Updated ${updated} products`)
    process.exit(0)
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err)
    process.exit(1)
  }
}

run()
