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

/**
 * Recalculate commission_amount and consignor_amount for products.
 * scope: 'active' (default) or 'all'
 * Returns number of updated rows.
 */
async function recalculateCommissionAmounts({ scope = 'active' } = {}) {
  const tiers = await settings.getCommissionTiers()
  const where = scope === 'all' ? "WHERE sale_price IS NOT NULL" : "WHERE status = 'active' AND sale_price IS NOT NULL"

  const res = await db.query(`SELECT id, sale_price FROM products ${where}`)
  const rows = res.rows || []
  if (!rows.length) return 0

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

  return updated
}

module.exports = { recalculateCommissionAmounts }
