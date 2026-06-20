import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { AiUsageLogEntry } from '../../types/aiUsage'
import { fetchRecentAiUsage } from '../../services/aiUsageApi'

interface AiUsageTrackerPanelProps {
  collapsed?: boolean
}

function formatCost(eur: number | null): string {
  if (eur == null) return '—'
  return `€${eur.toFixed(4)}`
}

export function AiUsageTrackerPanel({ collapsed: initialCollapsed = true }: AiUsageTrackerPanelProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [logs, setLogs] = useState<AiUsageLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRecentAiUsage()
      setLogs(data.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('aiUsageTrackerLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!collapsed) void refresh()
  }, [collapsed, refresh])

  return (
    <section className="ai-usage-tracker" aria-labelledby="ai-usage-tracker-title">
      <button
        type="button"
        className="ai-usage-tracker__toggle"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
      >
        <span id="ai-usage-tracker-title">{t('aiUsageTrackerTitle')}</span>
        <span className="ai-usage-tracker__chevron">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed ? (
        <div className="ai-usage-tracker__body">
          <div className="ai-usage-tracker__toolbar">
            <button type="button" className="team-settings-btn" onClick={() => void refresh()} disabled={loading}>
              {t('aiUsageTrackerRefresh')}
            </button>
          </div>
          {error ? <p className="team-settings-error">{error}</p> : null}
          {loading ? <p className="ai-usage-tracker__loading">{t('aiUsageTrackerLoading')}</p> : null}
          <div className="ai-usage-tracker__table-wrap">
            <table className="ai-usage-tracker__table">
              <thead>
                <tr>
                  <th>{t('aiUsageTrackerColTime')}</th>
                  <th>{t('aiUsageTrackerColFeature')}</th>
                  <th>{t('aiUsageTrackerColModel')}</th>
                  <th>{t('aiUsageTrackerColTokens')}</th>
                  <th>{t('aiUsageTrackerColCost')}</th>
                  <th>{t('aiUsageTrackerColSource')}</th>
                  <th>{t('aiUsageTrackerColStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="ai-usage-tracker__mono">
                      {new Date(log.createdAt).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{log.featureKey}</td>
                    <td className="ai-usage-tracker__mono" title={`${log.provider}/${log.model}`}>
                      {log.model}
                    </td>
                    <td className="ai-usage-tracker__mono">{log.totalTokens.toLocaleString('de-DE')}</td>
                    <td className="ai-usage-tracker__mono">{formatCost(log.estimatedCostEur)}</td>
                    <td>
                      {log.usageSource === 'provider_reported'
                        ? t('aiUsageTrackerSourceProvider')
                        : t('aiUsageTrackerSourceEstimate')}
                    </td>
                    <td>{log.success ? t('aiUsageTrackerStatusOk') : log.errorCode ?? t('aiUsageTrackerStatusError')}</td>
                  </tr>
                ))}
                {logs.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="ai-usage-tracker__empty">
                      {t('aiUsageTrackerEmpty')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}
