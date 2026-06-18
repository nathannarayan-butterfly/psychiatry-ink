import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Anforderung } from '../types/anforderung'
import {
  ANFORDERUNGEN_CHANGED_EVENT,
  loadAnforderungen,
  subscribeAnforderungen,
} from '../utils/anforderungen/storage'
import { countPendingAnforderungen } from '../types/anforderung'

export function useAnforderungen(caseId: string): {
  orders: Anforderung[]
  pendingCount: number
  refresh: () => void
} {
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    return subscribeAnforderungen((changedCaseId) => {
      if (changedCaseId === caseId) refresh()
    })
  }, [caseId, refresh])

  useEffect(() => {
    function handleEvent(e: Event) {
      const detail = (e as CustomEvent<{ caseId: string }>).detail
      if (detail?.caseId === caseId) refresh()
    }
    window.addEventListener(ANFORDERUNGEN_CHANGED_EVENT, handleEvent)
    return () => window.removeEventListener(ANFORDERUNGEN_CHANGED_EVENT, handleEvent)
  }, [caseId, refresh])

  const orders = useMemo(() => loadAnforderungen(caseId), [caseId, tick])
  const pendingCount = useMemo(() => countPendingAnforderungen(orders), [orders])

  return { orders, pendingCount, refresh }
}
