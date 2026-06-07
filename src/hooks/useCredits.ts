import { useCallback, useEffect, useState } from 'react'
import { FREE_SIGNUP_CREDITS } from '../data/subscriptionPlans'
import { API_BASE } from '../services/apiClient'
import { getAuthHeaders } from '../services/authHeaders'

const DEFAULT_BALANCE = FREE_SIGNUP_CREDITS

async function fetchBalance(): Promise<number | null> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/credits`, { headers })
    if (!response.ok) return null
    const data = (await response.json()) as { balance?: number }
    return typeof data.balance === 'number' ? data.balance : null
  } catch {
    return null
  }
}

export function useCredits() {
  const [balance, setBalance] = useState(DEFAULT_BALANCE)
  const [loading, setLoading] = useState(true)

  const refreshBalance = useCallback(async () => {
    const next = await fetchBalance()
    if (next != null) setBalance(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refreshBalance()
  }, [refreshBalance])

  const setBalanceFromServer = useCallback((next: number) => {
    setBalance(Math.max(0, next))
  }, [])

  const hasEnoughCredits = useCallback(
    (amount: number) => balance >= amount,
    [balance],
  )

  return {
    balance,
    loading,
    refreshBalance,
    setBalanceFromServer,
    hasEnoughCredits,
  }
}
