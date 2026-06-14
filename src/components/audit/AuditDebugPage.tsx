import { useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useAuditDebugAccess } from '../../hooks/useAuditDebugAccess'
import { useAuditLogs } from '../../hooks/useAuditLogs'
import type { AuditAction } from '../../types/auditLog'
import '../../styles/clinical-ui.css'
import '../../styles/audit-debug.css'

function truncate(value: string | null | undefined, max = 12): string {
  if (!value) return '—'
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

function formatMetadata(metadata: Record<string, unknown>): string {
  const keys = Object.keys(metadata)
  if (keys.length === 0) return '—'
  const preview = JSON.stringify(metadata)
  return preview.length > 80 ? `${preview.slice(0, 80)}…` : preview
}

interface AuditDebugPageProps {
  onBack: () => void
}

export function AuditDebugPage({ onBack }: AuditDebugPageProps) {
  const canAccess = useAuditDebugAccess()
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('')
  const [caseIdFilter, setCaseIdFilter] = useState('')

  const filters = useMemo(
    () => ({
      action: actionFilter || undefined,
      caseId: caseIdFilter.trim() || undefined,
    }),
    [actionFilter, caseIdFilter],
  )

  const { logs, actions, loading, error, refresh } = useAuditLogs(filters)

  if (!canAccess) {
    return (
      <div className="audit-debug-page">
        <header className="audit-debug-header">
          <button type="button" className="audit-debug-back" onClick={onBack}>
            ← Dashboard
          </button>
          <h1>Audit Logs</h1>
        </header>
        <p className="audit-debug-denied">Access denied — requires dev mode, KB admin, or audit.view permission.</p>
      </div>
    )
  }

  return (
    <div className="audit-debug-page">
      <header className="audit-debug-header">
        <button type="button" className="audit-debug-back" onClick={onBack}>
          ← Dashboard
        </button>
        <div>
          <h1>
            <ClipboardList className="audit-debug-header__icon" strokeWidth={1.5} aria-hidden />
            Audit Logs
          </h1>
          <p className="audit-debug-sub">Development view — org audit trail (not production UI)</p>
        </div>
      </header>

      <div className="audit-debug-filters">
        <label>
          Action
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
          >
            <option value="">All actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>
        <label>
          Case ID
          <input
            type="text"
            value={caseIdFilter}
            onChange={(e) => setCaseIdFilter(e.target.value)}
            placeholder="Filter by case…"
          />
        </label>
        <button type="button" className="audit-debug-refresh" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {error ? <div className="audit-debug-alert audit-debug-alert--error">{error}</div> : null}
      {loading ? <p className="audit-debug-loading">Loading…</p> : null}

      <div className="audit-debug-table-wrap">
        <table className="audit-debug-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>User</th>
              <th>Case</th>
              <th>Document</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="audit-debug-table__mono">{new Date(log.createdAt).toLocaleString()}</td>
                <td>
                  <span className="audit-debug-action-chip">{log.action}</span>
                </td>
                <td className="audit-debug-table__mono" title={log.userId ?? undefined}>
                  {truncate(log.userId, 10)}
                </td>
                <td className="audit-debug-table__mono" title={log.caseId ?? undefined}>
                  {truncate(log.caseId, 14)}
                </td>
                <td className="audit-debug-table__mono" title={log.documentId ?? undefined}>
                  {truncate(log.documentId, 14)}
                </td>
                <td className="audit-debug-table__meta" title={JSON.stringify(log.metadata)}>
                  {formatMetadata(log.metadata)}
                </td>
              </tr>
            ))}
            {!loading && logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="audit-debug-empty">
                  No audit logs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
