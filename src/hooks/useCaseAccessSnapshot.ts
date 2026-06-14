import { useCallback, useEffect, useState } from 'react'
import type { CaseAccessSnapshot } from '../services/orgApi'
import { fetchCaseAccessSnapshot } from '../services/orgApi'
import { usePermissionContext } from '../contexts/PermissionContext'

export interface UseCaseAccessSnapshotResult {
  snapshot: CaseAccessSnapshot | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Loads per-case access grants from the server (Small Praxis enforcement source of truth).
 */
export function useCaseAccessSnapshot(caseId?: string): UseCaseAccessSnapshotResult {
  const { organisation } = usePermissionContext()
  const [snapshot, setSnapshot] = useState<CaseAccessSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!caseId || !organisation) {
      setSnapshot(null)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchCaseAccessSnapshot(caseId)
      setSnapshot(data)
    } catch (err) {
      setSnapshot(null)
      setError(err instanceof Error ? err.message : 'Failed to load case access')
    } finally {
      setIsLoading(false)
    }
  }, [caseId, organisation?.id])

  useEffect(() => {
    void load()
  }, [load])

  return { snapshot, isLoading, error, refresh: load }
}
