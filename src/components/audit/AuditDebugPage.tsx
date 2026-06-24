import { useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useAuditDebugAccess } from '../../hooks/useAuditDebugAccess'
import { useAuditLogs } from '../../hooks/useAuditLogs'
import { useTranslation } from '../../context/TranslationContext'
import { translateAdminUi } from '../../data/adminUiTranslations'
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
  const { language } = useTranslation()
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
            ← {translateAdminUi(language, 'adminBackDashboard')}
          </button>
          <h1>{translateAdminUi(language, 'auditTitle')}</h1>
        </header>
        <p className="audit-debug-denied">{translateAdminUi(language, 'auditAccessDenied')}</p>
      </div>
    )
  }

  return (
    <div className="audit-debug-page">
      <header className="audit-debug-header">
        <button type="button" className="audit-debug-back" onClick={onBack}>
          ← {translateAdminUi(language, 'adminBackDashboard')}
        </button>
        <div>
          <h1>
            <ClipboardList className="audit-debug-header__icon" strokeWidth={1.5} aria-hidden />
            {translateAdminUi(language, 'auditTitle')}
          </h1>
          <p className="audit-debug-sub">{translateAdminUi(language, 'auditSubtitle')}</p>
        </div>
      </header>

      <div className="audit-debug-filters">
        <label>
          {translateAdminUi(language, 'auditAction')}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
          >
            <option value="">{translateAdminUi(language, 'auditAllActions')}</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>
        <label>
          {translateAdminUi(language, 'auditCaseId')}
          <input
            type="text"
            value={caseIdFilter}
            onChange={(e) => setCaseIdFilter(e.target.value)}
            placeholder={translateAdminUi(language, 'auditCaseFilterPlaceholder')}
          />
        </label>
        <button type="button" className="audit-debug-refresh" onClick={() => void refresh()}>
          {translateAdminUi(language, 'adminRefresh')}
        </button>
      </div>

      {error ? <div className="audit-debug-alert audit-debug-alert--error">{error}</div> : null}
      {loading ? <p className="audit-debug-loading">{translateAdminUi(language, 'adminLoading')}</p> : null}

      <div className="audit-debug-table-wrap">
        <table className="audit-debug-table">
          <thead>
            <tr>
              <th>{translateAdminUi(language, 'auditColTimestamp')}</th>
              <th>{translateAdminUi(language, 'auditAction')}</th>
              <th>{translateAdminUi(language, 'auditColUser')}</th>
              <th>{translateAdminUi(language, 'auditColCase')}</th>
              <th>{translateAdminUi(language, 'auditColDocument')}</th>
              <th>{translateAdminUi(language, 'auditColMetadata')}</th>
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
                  {translateAdminUi(language, 'auditEmpty')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
