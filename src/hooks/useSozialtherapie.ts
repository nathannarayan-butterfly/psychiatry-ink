import { useCallback, useEffect, useState } from 'react'
import type { SozialtherapieTarget } from '../types/sozialtherapie'
import { createSozialtherapieTarget } from '../types/sozialtherapie'
import {
  loadSozialtherapie,
  saveSozialtherapie,
  subscribeSozialtherapie,
} from '../utils/sozialtherapie/storage'

export function useSozialtherapie(caseId: string) {
  const [targets, setTargets] = useState<SozialtherapieTarget[]>(() => loadSozialtherapie(caseId))

  useEffect(() => {
    setTargets(loadSozialtherapie(caseId))
  }, [caseId])

  useEffect(() => {
    return subscribeSozialtherapie((updatedCaseId) => {
      if (updatedCaseId !== caseId) return
      setTargets(loadSozialtherapie(caseId))
    })
  }, [caseId])

  const persist = useCallback(
    (next: SozialtherapieTarget[]) => {
      saveSozialtherapie(next, caseId)
      setTargets(next)
    },
    [caseId],
  )

  const addTarget = useCallback(
    (area: string): SozialtherapieTarget | null => {
      const trimmed = area.trim()
      if (!trimmed) return null
      const target = createSozialtherapieTarget(trimmed)
      persist([...targets, target])
      return target
    },
    [persist, targets],
  )

  const updateTarget = useCallback(
    (id: string, patch: Partial<Omit<SozialtherapieTarget, 'id' | 'createdAt'>>) => {
      persist(
        targets.map((target) =>
          target.id === id
            ? { ...target, ...patch, updatedAt: new Date().toISOString() }
            : target,
        ),
      )
    },
    [persist, targets],
  )

  const removeTarget = useCallback(
    (id: string) => {
      persist(targets.filter((target) => target.id !== id))
    },
    [persist, targets],
  )

  return {
    targets,
    addTarget,
    updateTarget,
    removeTarget,
  }
}
