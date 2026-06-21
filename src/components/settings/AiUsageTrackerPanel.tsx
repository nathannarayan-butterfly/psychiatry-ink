import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { AiUsageLogEntry } from '../../types/aiUsage'
import { fetchRecentAiUsage } from '../../services/aiUsageApi'
import { AiCreditsBundlePanel } from './AiCreditsBundlePanel'

interface AiUsageTrackerPanelProps {
  collapsed?: boolean
}

interface CreditSummary {
  monthlyCredits: number
  purchasedCredits: number
  totalAvailable: number
  monthlyResetAt: string
}

interface UsageSummary {
  callCount: number
  totalTokens: number
  totalCredits: number
  successCount: number
  failureCount: number
}

function formatCost(eur: number | null): string {
  if (eur == null) return '—'
  return `€${eur.toFixed(4)}`
}

async function fetchCreditSummary(): Promise<CreditSummary | null> {
  try {
    const res = await fetch('/api/ai-credits', { credentials: 'include' })
    if (!res.ok) return null
    return (await res.json()) as CreditSummary
  } catch {
    return null
  }
}

async function fetchUsageSummary(): Promise<UsageSummary | null> {
  try {
    const res = await fetch('/api/ai-credits/usage', { credentials: 'include' })
    if (!res.ok) return null
    return (await res.json()) as UsageSummary
  } catch {
    return null
  }
}

export function AiUsageTrackerPanel({ collapsed: initialCollapsed = true }: AiUsageTrackerPanelProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [logs, setLogs] = useState<AiUsageLogEntry[]>([])
  const [credits, setCredits] = useState<CreditSummary | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [logsData, creditData, usageData] = await Promise.all([
        fetchRecentAiUsage(),
        fetchCreditSummary(),
        fetchUsageSummary(),
      ])
      setLogs(logsData.logs)
      setCredits(creditData)
      setUsage(usageData)
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

          {/* Credit balance summary */}
          {credits ? (
            <div className="ai-usage-tracker__credit-summary">
              <div className="ai-usage-tracker__credit-row">
                <span>Monatliche Credits</span>
                <strong>{credits.monthlyCredits}</strong>
              </div>
              <div className="ai-usage-tracker__credit-row">
                <span>Gekaufte Credits</span>
                <strong>{credits.purchasedCredits}</strong>
              </div>
              <div className="ai-usage-tracker__credit-row ai-usage-tracker__credit-row--total">
                <span>Gesamt verfügbar</span>
                <strong>{credits.totalAvailable}</strong>
              </div>
              {usage ? (
                <div className="ai-usage-tracker__credit-row">
                  <span>Diesen Monat verbraucht</span>
                  <strong>{usage.totalCredits} Credits ({usage.callCount} Aufrufe)</strong>
                </div>
              ) : null}
              <div className="ai-usage-tracker__credit-row ai-usage-tracker__credit-row--reset">
                <span>Monatlicher Reset</span>
                <span>
                  {new Date(credits.monthlyResetAt).toLocaleDateString('de-DE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ) : null}

          {/* Extra credit bundle purchase — Beta v2 scope. Stripe checkout
              wires later; for now POST /api/ai-credits/purchase records
              the pending purchase row. */}
          <AiCreditsBundlePanel
            monthlyCreditsExhausted={credits != null && credits.monthlyCredits <= 0}
          />


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
