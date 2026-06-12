import { useCallback, useEffect, useState } from 'react'
import { caseStorageKey } from '../utils/caseContext'

// ---------------------------------------------------------------------------
// Dismissed (hidden) Overview graphs, persisted per caseId in localStorage.
//
// Graph ids are namespaced so that the Spiegelwerte and Lab-Verlauf widgets can
// share the same storage entry without clashing:
//   - Spiegelwerte:  "spiegel:<substance name>"
//   - Lab-Verlauf:   "labor:<pinned widget id>"
// ---------------------------------------------------------------------------

const HIDDEN_GRAPHS_BASE = 'psychiatry-ink:overviewHiddenGraphs'

function storageKey(caseId: string): string {
  return caseStorageKey(HIDDEN_GRAPHS_BASE, caseId)
}

function loadHidden(caseId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

function saveHidden(caseId: string, ids: string[]): void {
  try {
    localStorage.setItem(storageKey(caseId), JSON.stringify(ids))
  } catch {
    // ignore storage errors
  }
}

export interface OverviewHiddenGraphs {
  hidden: string[]
  isHidden: (id: string) => boolean
  hide: (id: string) => void
  unhide: (id: string) => void
}

export function useOverviewHiddenGraphs(caseId: string): OverviewHiddenGraphs {
  const [hidden, setHidden] = useState<string[]>(() => loadHidden(caseId))

  useEffect(() => {
    setHidden(loadHidden(caseId))
  }, [caseId])

  const hide = useCallback(
    (id: string) => {
      // Re-read current persisted set so concurrent widgets don't clobber each other.
      const next = Array.from(new Set([...loadHidden(caseId), id]))
      saveHidden(caseId, next)
      setHidden(next)
    },
    [caseId],
  )

  const unhide = useCallback(
    (id: string) => {
      const next = loadHidden(caseId).filter((x) => x !== id)
      saveHidden(caseId, next)
      setHidden(next)
    },
    [caseId],
  )

  const isHidden = useCallback((id: string) => hidden.includes(id), [hidden])

  return { hidden, isHidden, hide, unhide }
}
