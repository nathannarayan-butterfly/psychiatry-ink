import { useCallback, useEffect, useState } from 'react'
import { fetchAuditLogs } from '../services/auditApi'
import type { AuditAction, AuditLogEntry } from '../types/auditLog'
import { AUDIT_ACTIONS } from '../types/auditLog'

export function useAuditLogs(filters: { action?: string; caseId?: string }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [actions, setActions] = useState<AuditAction[]>([...AUDIT_ACTIONS])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAuditLogs({
        action: filters.action as AuditAction | undefined,
        caseId: filters.caseId,
        limit: 200,
      })
      setLogs(result.logs)
      setActions(result.actions)
    } catch (err) {
      setLogs([])
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [filters.action, filters.caseId])

  useEffect(() => {
    void load()
  }, [load])

  return { logs, actions, loading, error, refresh: load }
}
