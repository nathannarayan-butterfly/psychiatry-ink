import { useCallback, useEffect, useState } from 'react'
import type {
  ComplementaryTherapy,
  ComplementaryTherapySession,
} from '../types/complementaryTherapy'
import { createComplementaryTherapy } from '../types/complementaryTherapy'
import {
  loadComplementaryTherapies,
  saveComplementaryTherapies,
  subscribeComplementaryTherapies,
} from '../utils/complementaryTherapy/storage'

export type ComplementaryTherapyPatch = Partial<
  Omit<ComplementaryTherapy, 'id' | 'createdAt' | 'updatedAt'>
>

export function useComplementaryTherapies(caseId: string) {
  const [therapies, setTherapies] = useState<ComplementaryTherapy[]>(() =>
    loadComplementaryTherapies(caseId),
  )

  useEffect(() => {
    setTherapies(loadComplementaryTherapies(caseId))
  }, [caseId])

  useEffect(() => {
    return subscribeComplementaryTherapies((updatedCaseId) => {
      if (updatedCaseId !== caseId) return
      setTherapies(loadComplementaryTherapies(caseId))
    })
  }, [caseId])

  const persist = useCallback(
    (next: ComplementaryTherapy[]) => {
      saveComplementaryTherapies(next, caseId)
      setTherapies(next)
    },
    [caseId],
  )

  const addTherapy = useCallback(
    (name: string): ComplementaryTherapy | null => {
      const trimmed = name.trim()
      if (!trimmed) return null
      const therapy = createComplementaryTherapy(trimmed)
      persist([...loadComplementaryTherapies(caseId), therapy])
      return therapy
    },
    [caseId, persist],
  )

  const updateTherapy = useCallback(
    (id: string, patch: ComplementaryTherapyPatch) => {
      const next = loadComplementaryTherapies(caseId).map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      )
      persist(next)
    },
    [caseId, persist],
  )

  const removeTherapy = useCallback(
    (id: string) => {
      persist(loadComplementaryTherapies(caseId).filter((t) => t.id !== id))
    },
    [caseId, persist],
  )

  const addSession = useCallback(
    (id: string, session: Omit<ComplementaryTherapySession, 'id'>) => {
      const entry: ComplementaryTherapySession = { id: crypto.randomUUID(), ...session }
      const next = loadComplementaryTherapies(caseId).map((t) =>
        t.id === id
          ? {
              ...t,
              sessions: [entry, ...(t.sessions ?? [])],
              updatedAt: new Date().toISOString(),
            }
          : t,
      )
      persist(next)
    },
    [caseId, persist],
  )

  const removeSession = useCallback(
    (id: string, sessionId: string) => {
      const next = loadComplementaryTherapies(caseId).map((t) =>
        t.id === id
          ? {
              ...t,
              sessions: (t.sessions ?? []).filter((s) => s.id !== sessionId),
              updatedAt: new Date().toISOString(),
            }
          : t,
      )
      persist(next)
    },
    [caseId, persist],
  )

  return {
    therapies,
    addTherapy,
    updateTherapy,
    removeTherapy,
    addSession,
    removeSession,
  }
}
