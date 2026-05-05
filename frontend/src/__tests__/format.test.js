import { describe, test, expect } from 'vitest'
import { calcCommissionFromTiers, fmtMoney, fmtDate, fmtDateTime } from '../utils/format'

const TIERS = [
  { max: 60000,  type: 'fixed',   amount: 20000 },
  { max: 130000, type: 'fixed',   amount: 30000 },
  { max: null,   type: 'percent', amount: 25 },
]

describe('calcCommissionFromTiers', () => {
  test('returns zero for missing price', () => {
    expect(calcCommissionFromTiers(0, TIERS)).toEqual({ commission: 0, consignorAmount: 0 })
    expect(calcCommissionFromTiers(null, TIERS)).toEqual({ commission: 0, consignorAmount: 0 })
  })

  test('returns zero for empty tiers', () => {
    expect(calcCommissionFromTiers(50000, [])).toEqual({ commission: 0, consignorAmount: 0 })
  })

  test('tier 1: price ≤ 60k → fixed 20k commission', () => {
    const result = calcCommissionFromTiers(50000, TIERS)
    expect(result.commission).toBe(20000)
    expect(result.consignorAmount).toBe(30000)
  })

  test('tier 2: price between 60k–130k → fixed 30k commission', () => {
    const result = calcCommissionFromTiers(100000, TIERS)
    expect(result.commission).toBe(30000)
    expect(result.consignorAmount).toBe(70000)
  })

  test('tier 3: price > 130k → 25% commission', () => {
    const result = calcCommissionFromTiers(200000, TIERS)
    expect(result.commission).toBe(50000)
    expect(result.consignorAmount).toBe(150000)
  })

  test('boundary at exactly 60k uses first tier', () => {
    const result = calcCommissionFromTiers(60000, TIERS)
    expect(result.commission).toBe(20000)
  })

  test('boundary at exactly 130k uses second tier', () => {
    const result = calcCommissionFromTiers(130000, TIERS)
    expect(result.commission).toBe(30000)
  })

  test('consignorAmount cannot be negative', () => {
    const tiers = [{ max: null, type: 'fixed', amount: 999999 }]
    const result = calcCommissionFromTiers(100, tiers)
    expect(result.consignorAmount).toBe(0)
  })

  test('string price is coerced to number', () => {
    const result = calcCommissionFromTiers('50000', TIERS)
    expect(result.commission).toBe(20000)
  })
})

describe('fmtMoney', () => {
  test('formats Vietnamese currency with đ suffix', () => {
    expect(fmtMoney(1500000)).toMatch(/1\.500\.000đ/)
  })

  test('handles zero', () => {
    expect(fmtMoney(0)).toMatch(/0đ/)
  })

  test('handles null/undefined gracefully', () => {
    expect(fmtMoney(null)).toMatch(/0đ/)
    expect(fmtMoney(undefined)).toMatch(/0đ/)
  })
})

describe('fmtDate', () => {
  test('returns em-dash for falsy values', () => {
    expect(fmtDate(null)).toBe('—')
    expect(fmtDate('')).toBe('—')
    expect(fmtDate(undefined)).toBe('—')
  })

  test('formats a valid date string', () => {
    const result = fmtDate('2026-01-15T00:00:00Z')
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
  })
})

describe('fmtDateTime', () => {
  test('returns em-dash for falsy values', () => {
    expect(fmtDateTime(null)).toBe('—')
  })

  test('formats a valid datetime', () => {
    const result = fmtDateTime('2026-01-15T10:30:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
