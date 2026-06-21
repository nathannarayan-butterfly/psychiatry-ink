import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Admin AI Analytics page.
 *
 * Reads /api/admin/ai-analytics (admin-gated by the server). The page renders
 * a banner reflecting marginHealth, a tiled summary of the key aggregates,
 * and per-feature / per-provider / per-model tables. Labels are English-only
 * by spec ("admin UI is technical").
 */

interface BundleRevenue {
  sku: string
  purchases: number
  revenueGbp: number
  credits: number
}

interface Breakdown {
  featureKey?: string
  provider?: string
  model?: string
  creditsCharged: number
  estimatedCostUsd: number
  revenueGbp: number
  marginGbp: number
  callCount: number
}

interface AnalyticsResponse {
  window: { from: string; to: string; days: number }
  revenue: { totalGbp: number; perBundle: BundleRevenue[] }
  credits: { totalConsumed: number; monthlyConsumed: number; purchasedConsumed: number }
  cost: {
    totalEstimatedUsd: number
    totalEstimatedGbp: number
    failedCallCostUsd: number
    fallbackCostUsd: number
    openAiCostUsd: number
    gruendlichCostUsd: number
    openAiCostShare: number
    gruendlichCostShare: number
  }
  averages: {
    costPerPatientUsd: number | null
    costPerUserPerMonthUsd: number | null
    distinctCases: number
    distinctUsers: number
  }
  features: Array<Breakdown & { featureKey: string }>
  providers: Array<Breakdown & { provider: string }>
  models: Array<Breakdown & { provider: string; model: string }>
  marginHealth: {
    status: 'healthy' | 'warning' | 'critical'
    message: string
    marginPct: number
    costRatio: number
    thresholds: { warn: number; critical: number }
  }
  usdToGbpRate: number
  generatedAt: string
}

const PRESETS = [
  { key: '7', label: 'Last 7 days', days: 7 },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: 'custom', label: 'Custom', days: 0 },
] as const

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function formatGbp(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export interface AiAnalyticsPageProps {
  onBack: () => void
}

export function AiAnalyticsPage({ onBack }: AiAnalyticsPageProps) {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [presetKey, setPresetKey] = useState<(typeof PRESETS)[number]['key']>('30')
  const [customFrom, setCustomFrom] = useState<string>(
    isoDaysAgo(30).slice(0, 10),
  )
  const [customTo, setCustomTo] = useState<string>(new Date().toISOString().slice(0, 10))

  const query = useMemo(() => {
    if (presetKey === 'custom') {
      const from = new Date(customFrom).toISOString()
      const to = new Date(`${customTo}T23:59:59.999Z`).toISOString()
      return `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    }
    const preset = PRESETS.find((p) => p.key === presetKey) ?? PRESETS[1]
    const from = isoDaysAgo(preset.days)
    const to = new Date().toISOString()
    return `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  }, [presetKey, customFrom, customTo])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/ai-analytics${query}`, {
        credentials: 'include',
      })
      if (res.status === 404) {
        setError(
          'AI analytics is disabled on this server. Set ENABLE_ADMIN_AI_ANALYTICS_API=true and restart the API.',
        )
        return
      }
      if (res.status === 401) {
        setError('Sign in required.')
        return
      }
      if (res.status === 403) {
        setError('Admin role required.')
        return
      }
      if (!res.ok) {
        setError(`Failed to load analytics (HTTP ${res.status}).`)
        return
      }
      setData((await res.json()) as AnalyticsResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="ai-analytics-page">
      <button type="button" className="ai-analytics-page__back" onClick={onBack}>
        ← Back to dashboard
      </button>

      <header className="ai-analytics-page__header">
        <h1 className="ai-analytics-page__title">AI Analytics</h1>
        <p className="ai-analytics-page__subtitle">
          Margin health, credit consumption, and provider cost rollup. Revenue
          is in GBP (bundle currency); provider cost in USD with a configurable
          USD→GBP conversion for the margin banner.
        </p>
      </header>

      <div className="ai-analytics-window" role="toolbar" aria-label="Time window">
        {PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.key}
            className={`ai-analytics-window__btn${presetKey === preset.key ? ' ai-analytics-window__btn--active' : ''}`}
            onClick={() => setPresetKey(preset.key)}
          >
            {preset.label}
          </button>
        ))}
        {presetKey === 'custom' ? (
          <>
            <input
              type="date"
              className="ai-analytics-window__input"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <input
              type="date"
              className="ai-analytics-window__input"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </>
        ) : null}
        <button
          type="button"
          className="ai-analytics-window__btn"
          onClick={() => void refresh()}
          disabled={loading}
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="ai-analytics-error">{error}</p> : null}
      {!error && data ? (
        <>
          <section
            className={`ai-analytics-banner ai-analytics-banner--${data.marginHealth.status}`}
            role="status"
          >
            <span className="ai-analytics-banner__title">Margin: {data.marginHealth.status}</span>
            <span>{data.marginHealth.message}</span>
            <span>
              Warn threshold {formatPct(data.marginHealth.thresholds.warn)} · Critical{' '}
              {formatPct(data.marginHealth.thresholds.critical)} · Cost ratio{' '}
              {formatPct(data.marginHealth.costRatio)} · USD→GBP{' '}
              {data.usdToGbpRate.toFixed(4)}
            </span>
          </section>

          <section className="ai-analytics-grid">
            <Card
              label="Revenue (GBP)"
              value={formatGbp(data.revenue.totalGbp)}
              sub={`${data.revenue.perBundle.reduce((s, b) => s + b.purchases, 0)} purchases · ${data.window.days} days`}
            />
            <Card
              label="Estimated provider cost (USD)"
              value={formatUsd(data.cost.totalEstimatedUsd)}
              sub={`${formatGbp(data.cost.totalEstimatedGbp)} converted`}
            />
            <Card
              label="Credits consumed"
              value={data.credits.totalConsumed.toLocaleString()}
              sub={`${data.credits.monthlyConsumed.toLocaleString()} monthly · ${data.credits.purchasedConsumed.toLocaleString()} purchased`}
            />
            <Card
              label="Avg cost / patient"
              value={
                data.averages.costPerPatientUsd != null
                  ? formatUsd(data.averages.costPerPatientUsd)
                  : '—'
              }
              sub={`${data.averages.distinctCases} distinct cases`}
            />
            <Card
              label="Avg cost / user · month"
              value={
                data.averages.costPerUserPerMonthUsd != null
                  ? formatUsd(data.averages.costPerUserPerMonthUsd)
                  : '—'
              }
              sub={`${data.averages.distinctUsers} distinct users`}
            />
            <Card
              label="Failed-call cost (USD)"
              value={formatUsd(data.cost.failedCallCostUsd)}
              sub="Calls without usable output"
            />
            <Card
              label="Fallback cost (USD)"
              value={formatUsd(data.cost.fallbackCostUsd)}
              sub="Non-primary provider for mode"
            />
            <Card
              label="OpenAI cost share"
              value={formatPct(data.cost.openAiCostShare)}
              sub={`${formatUsd(data.cost.openAiCostUsd)} on OpenAI`}
            />
            <Card
              label="Gründlich cost share"
              value={formatPct(data.cost.gruendlichCostShare)}
              sub={`${formatUsd(data.cost.gruendlichCostUsd)} in Gründlich mode`}
            />
          </section>

          <BundleSection rows={data.revenue.perBundle} />
          <BreakdownSection
            title="Per feature"
            rows={data.features}
            keyName="featureKey"
          />
          <BreakdownSection
            title="Per provider"
            rows={data.providers}
            keyName="provider"
          />
          <BreakdownSection
            title="Per model"
            rows={data.models}
            keyName="model"
            secondKey="provider"
          />
        </>
      ) : null}

      {!error && !data && !loading ? (
        <p className="ai-analytics-empty">No data yet.</p>
      ) : null}
    </div>
  )
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ai-analytics-card">
      <span className="ai-analytics-card__label">{label}</span>
      <span className="ai-analytics-card__value">{value}</span>
      {sub ? <span className="ai-analytics-card__sub">{sub}</span> : null}
    </div>
  )
}

function BundleSection({ rows }: { rows: BundleRevenue[] }) {
  return (
    <section className="ai-analytics-section">
      <h2 className="ai-analytics-section__title">Revenue per bundle (GBP)</h2>
      {rows.length === 0 ? (
        <p className="ai-analytics-empty">No paid purchases in this window.</p>
      ) : (
        <table className="ai-analytics-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th className="num">Purchases</th>
              <th className="num">Credits issued</th>
              <th className="num">Revenue (GBP)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sku}>
                <td>{row.sku}</td>
                <td className="num">{row.purchases.toLocaleString()}</td>
                <td className="num">{row.credits.toLocaleString()}</td>
                <td className="num">{formatGbp(row.revenueGbp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

interface BreakdownSectionProps {
  title: string
  rows: Breakdown[]
  keyName: 'featureKey' | 'provider' | 'model'
  secondKey?: 'provider'
}

function BreakdownSection({ title, rows, keyName, secondKey }: BreakdownSectionProps) {
  return (
    <section className="ai-analytics-section">
      <h2 className="ai-analytics-section__title">{title}</h2>
      {rows.length === 0 ? (
        <p className="ai-analytics-empty">No usage in this window.</p>
      ) : (
        <table className="ai-analytics-table">
          <thead>
            <tr>
              {secondKey ? <th>Provider</th> : null}
              <th>{keyName === 'featureKey' ? 'Feature' : keyName === 'provider' ? 'Provider' : 'Model'}</th>
              <th className="num">Calls</th>
              <th className="num">Credits charged</th>
              <th className="num">Provider cost (USD)</th>
              <th className="num">Allocated revenue (GBP)</th>
              <th className="num">Gross margin (GBP)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row[keyName]}-${idx}`}>
                {secondKey ? <td>{row[secondKey] ?? ''}</td> : null}
                <td>{row[keyName] ?? ''}</td>
                <td className="num">{row.callCount.toLocaleString()}</td>
                <td className="num">{row.creditsCharged.toLocaleString()}</td>
                <td className="num">{formatUsd(row.estimatedCostUsd)}</td>
                <td className="num">{formatGbp(row.revenueGbp)}</td>
                <td className={`num${row.marginGbp < 0 ? ' ai-analytics-margin-neg' : ''}`}>
                  {formatGbp(row.marginGbp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
