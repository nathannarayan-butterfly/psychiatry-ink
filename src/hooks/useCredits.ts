import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAiCreditSummary } from '../services/aiCreditsApi'

const DEFAULT_BALANCE = 0

export interface CreditBalanceState {
  totalAvailable: number
  monthlyCredits: number
  purchasedCredits: number
  monthlyResetAt: string | null
}

export function useCredits() {
  const [balance, setBalance] = useState(DEFAULT_BALANCE)
  const [details, setDetails] = useState<CreditBalanceState | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refreshBalance = useCallback(async () => {
    try {
      const summary = await fetchAiCreditSummary()
      if (!mountedRef.current) return
      setBalance(summary.totalAvailable)
      setDetails({
        totalAvailable: summary.totalAvailable,
        monthlyCredits: summary.monthlyCredits,
        purchasedCredits: summary.purchasedCredits,
        monthlyResetAt: summary.monthlyResetAt,
      })
    } catch {
      if (!mountedRef.current) return
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshBalance()
  }, [refreshBalance])

  const setBalanceFromServer = useCallback((next: number) => {
    setBalance(Math.max(0, next))
    setDetails((previous) =>
      previous
        ? { ...previous, totalAvailable: Math.max(0, next) }
        : {
            totalAvailable: Math.max(0, next),
            monthlyCredits: 0,
            purchasedCredits: Math.max(0, next),
            monthlyResetAt: null,
          },
    )
  }, [])

  const hasEnoughCredits = useCallback(
    (amount: number) => balance >= amount,
    [balance],
  )

  return {
    balance,
    details,
    loading,
    refreshBalance,
    setBalanceFromServer,
    hasEnoughCredits,
  }
}
