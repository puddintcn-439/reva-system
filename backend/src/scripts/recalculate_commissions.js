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
const recalc = require('../services/recalcCommissions')

async function run() {
  try {
    const arg = process.argv[2]
    const scope = arg === '--all' ? 'all' : 'active'
    console.log(`Recalculating commissions (scope=${scope})...`)
    const updated = await recalc.recalculateCommissionAmounts({ scope })
    console.log(`Updated ${updated} products`)
    process.exit(0)
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err)
    process.exit(1)
  }
}

run()
