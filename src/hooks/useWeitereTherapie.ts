import { useCallback, useEffect, useState } from 'react'
import type { WeitereTherapie } from '../types/weitereTherapie'
import { createWeitereTherapie } from '../types/weitereTherapie'
import {
  loadWeitereTherapie,
  saveWeitereTherapie,
  subscribeWeitereTherapie,
} from '../utils/weitereTherapie/storage'

export type WeitereTherapiePatch = Partial<
  Omit<WeitereTherapie, 'id' | 'createdAt' | 'updatedAt'>
>

export function useWeitereTherapie(caseId: string) {
  const [entries, setEntries] = useState<WeitereTherapie[]>(() => loadWeitereTherapie(caseId))

  useEffect(() => {
    setEntries(loadWeitereTherapie(caseId))
  }, [caseId])

  useEffect(() => {
    return subscribeWeitereTherapie((updatedCaseId) => {
      if (updatedCaseId !== caseId) return
      setEntries(loadWeitereTherapie(caseId))
    })
  }, [caseId])

  const persist = useCallback(
    (next: WeitereTherapie[]) => {
      saveWeitereTherapie(next, caseId)
      setEntries(next)
    },
    [caseId],
  )

  const addTherapie = useCallback(
    (type: string): WeitereTherapie | null => {
      const trimmed = type.trim()
      if (!trimmed) return null
      const entry = createWeitereTherapie(trimmed)
      persist([...loadWeitereTherapie(caseId), entry])
      return entry
    },
    [caseId, persist],
  )

  const updateTherapie = useCallback(
    (id: string, patch: WeitereTherapiePatch) => {
      const next = loadWeitereTherapie(caseId).map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      )
      persist(next)
    },
    [caseId, persist],
  )

  const removeTherapie = useCallback(
    (id: string) => {
      persist(loadWeitereTherapie(caseId).filter((t) => t.id !== id))
    },
    [caseId, persist],
  )

  return {
    entries,
    addTherapie,
    updateTherapie,
    removeTherapie,
  }
}
