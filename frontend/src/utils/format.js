/**
 * Calculate commission and consignor payout from a price and a tiers array.
 * Tiers shape: [{ max: number|null, type: 'fixed'|'percent', amount: number }]
 * Mirrors the same logic used in the backend productController / posController.
 */
export function calcCommissionFromTiers(price, tiers) {
  price = Number(price)
  if (!price || !Array.isArray(tiers) || !tiers.length) {
    return { commission: 0, consignorAmount: 0 }
  }
  const sorted = [...tiers].sort((a, b) =>
    a.max === null ? 1 : b.max === null ? -1 : a.max - b.max
  )
  for (const tier of sorted) {
    if (tier.max === null || price <= tier.max) {
      const commission = tier.type === 'percent'
        ? Math.round(price * tier.amount / 100)
        : Number(tier.amount)
      return { commission, consignorAmount: Math.max(0, price - commission) }
    }
  }
  return { commission: 0, consignorAmount: price }
}

/**
 * Format a number as Vietnamese currency: 1.500.000đ
 */
export const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('vi-VN') + 'đ';

/**
 * Format a date as Vietnamese locale string
 */
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('vi-VN') : '—';

/**
 * Format a datetime as Vietnamese locale string
 */
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('vi-VN') : '—';
