import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCommissionTiers } from '../services/api'
import { calcCommissionFromTiers } from '../utils/format'

const DEFAULT_TIERS = [
  { max: 60000,  type: 'fixed',   amount: 20000 },
  { max: 130000, type: 'fixed',   amount: 30000 },
  { max: null,   type: 'percent', amount: 25    },
]

/**
 * Fetches commission tiers from the API (cached 5 min) and exposes
 * a `calcCommission(price)` helper that mirrors the backend logic.
 * Falls back to default tiers while loading or on error.
 */
export function useCommissionTiers() {
  const { data: tiers = DEFAULT_TIERS } = useQuery({
    queryKey: ['commission-tiers'],
    queryFn: () => getCommissionTiers().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const calcCommission = useCallback(
    (price) => calcCommissionFromTiers(price, tiers),
    [tiers],
  )

  return { tiers, calcCommission }
}
