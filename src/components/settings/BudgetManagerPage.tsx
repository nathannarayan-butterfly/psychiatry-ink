import { ArrowLeft, Download } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type {
  AiBudgetConfig,
  AiBudgetWarning,
  AiUsageBreakdownRow,
  AiUsageMonthlySummary,
  CurrentUsageForQuota,
} from '../../types/aiUsage'
import {
  aiUsageExportUrl,
  fetchAiBudgetConfig,
  fetchAiBudgetWarnings,
  fetchAiUsageBreakdown,
  fetchAiUsageSummary,
  saveAiBudgetConfig,
} from '../../services/aiUsageApi'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import '../../styles/budget-manager.css'

interface BudgetManagerPageProps {
  onBack: () => void
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatTokens(value: number): string {
  return value.toLocaleString('de-DE')
}

function BreakdownTable({ title, rows }: { title: string; rows: AiUsageBreakdownRow[] }) {
  return (
    <section className="budget-section" aria-labelledby={`budget-${title}`}>
      <h2 id={`budget-${title}`} className="budget-section__heading">
        {title}
      </h2>
      <div className="budget-table-wrap">
        <table className="budget-table">
          <thead>
            <tr>
              <th>Schlüssel</th>
              <th>Tokens</th>
              <th>Kosten (EUR)</th>
              <th>Aufrufe</th>
              <th>Provider / Schätzung</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.key}</td>
                <td className="budget-table__mono">{formatTokens(row.tokens)}</td>
                <td className="budget-table__mono">{formatEur(row.costEur)}</td>
                <td>{row.count}</td>
                <td className="budget-table__mono">
                  {row.providerReportedCount} / {row.estimatedCount}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="budget-table__empty">
                  Keine Daten
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function BudgetManagerPage({ onBack }: BudgetManagerPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<AiUsageMonthlySummary | null>(null)
  const [quotaUsage, setQuotaUsage] = useState<CurrentUsageForQuota | null>(null)
  const [providerRows, setProviderRows] = useState<AiUsageBreakdownRow[]>([])
  const [modelRows, setModelRows] = useState<AiUsageBreakdownRow[]>([])
  const [featureRows, setFeatureRows] = useState<AiUsageBreakdownRow[]>([])
  const [userRows, setUserRows] = useState<AiUsageBreakdownRow[]>([])
  const [warnings, setWarnings] = useState<AiBudgetWarning[]>([])
  const [config, setConfig] = useState<AiBudgetConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const [form, setForm] = useState({
    monthlyBudgetEur: '',
    monthlyBudgetUsd: '',
    warnAt50: true,
    warnAt80: true,
    warnAt100: true,
    hardLimitEnabled: false,
    hardLimitEur: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryRes, provider, model, feature, user, configRes, warnRes] = await Promise.all([
        fetchAiUsageSummary(),
        fetchAiUsageBreakdown('provider'),
        fetchAiUsageBreakdown('model'),
        fetchAiUsageBreakdown('feature'),
        fetchAiUsageBreakdown('user'),
        fetchAiBudgetConfig(),
        fetchAiBudgetWarnings(),
      ])
      setSummary(summaryRes.summary)
      setQuotaUsage(summaryRes.quotaUsage)
      setProviderRows(provider.rows)
      setModelRows(model.rows)
      setFeatureRows(feature.rows)
      setUserRows(user.rows)
      setWarnings(warnRes.warnings)
      setConfig(configRes.config)
      if (configRes.config) {
        setForm({
          monthlyBudgetEur: configRes.config.monthlyBudgetEur?.toString() ?? '',
          monthlyBudgetUsd: configRes.config.monthlyBudgetUsd?.toString() ?? '',
          warnAt50: configRes.config.warnAt50,
          warnAt80: configRes.config.warnAt80,
          warnAt100: configRes.config.warnAt100,
          hardLimitEnabled: configRes.config.hardLimitEnabled,
          hardLimitEur: configRes.config.hardLimitEur?.toString() ?? '',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      const payload = {
        monthlyBudgetEur: form.monthlyBudgetEur ? Number(form.monthlyBudgetEur) : null,
        monthlyBudgetUsd: form.monthlyBudgetUsd ? Number(form.monthlyBudgetUsd) : null,
        warnAt50: form.warnAt50,
        warnAt80: form.warnAt80,
        warnAt100: form.warnAt100,
        hardLimitEnabled: form.hardLimitEnabled,
        hardLimitEur: form.hardLimitEur ? Number(form.hardLimitEur) : null,
      }
      const res = await saveAiBudgetConfig(payload)
      setConfig(res.config)
      setSaveMessage('Gespeichert')
      await load()
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="budget-page">
        <ClinicalLoading label="Budget-Daten laden…" />
      </div>
    )
  }

  return (
    <div className="budget-page text-ink">
      <div className="budget-page__inner">
        <header className="budget-page__header">
          <button type="button" className="budget-back" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Zurück
          </button>
          <h1 className="budget-page__title">KI-Budget &amp; Token-Nutzung</h1>
          <p className="budget-page__sub">Monatsübersicht — keine klinischen Inhalte in den Logs</p>
        </header>

        {error ? <p className="team-settings-error">{error}</p> : null}

        {summary ? (
          <>
            <section className="budget-overview" aria-labelledby="budget-overview">
              <h2 id="budget-overview" className="budget-section__heading">
                Aktueller Monat
              </h2>
              <div className="budget-overview__grid">
                <div className="budget-stat">
                  <span className="budget-stat__label">Kosten (EUR)</span>
                  <span className="budget-stat__value">{formatEur(summary.totalCostEur)}</span>
                </div>
                <div className="budget-stat">
                  <span className="budget-stat__label">Tokens gesamt</span>
                  <span className="budget-stat__value">{formatTokens(summary.totalTokens)}</span>
                </div>
                <div className="budget-stat">
                  <span className="budget-stat__label">Generierungen</span>
                  <span className="budget-stat__value">{summary.generationCount}</span>
                </div>
                <div className="budget-stat">
                  <span className="budget-stat__label">DeepSeek / OpenAI</span>
                  <span className="budget-stat__value">
                    {formatTokens(summary.deepseekTokens)} / {formatTokens(summary.openaiTokens)}
                  </span>
                </div>
                <div className="budget-stat">
                  <span className="budget-stat__label">Provider / Schätzung</span>
                  <span className="budget-stat__value">
                    {summary.providerReportedCount} / {summary.estimatedCount}
                  </span>
                </div>
                {summary.budgetPercent != null ? (
                  <div className="budget-stat">
                    <span className="budget-stat__label">Budget-Auslastung</span>
                    <span className="budget-stat__value">{summary.budgetPercent}%</span>
                  </div>
                ) : null}
              </div>

              {summary.topFeatures.length > 0 ? (
                <div className="budget-top-features">
                  <h3 className="budget-subheading">Top 5 Features</h3>
                  <ul>
                    {summary.topFeatures.map((f) => (
                      <li key={f.featureKey}>
                        {f.featureKey}: {formatTokens(f.tokens)} tokens ({formatEur(f.costEur)})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            {quotaUsage ? (
              <section className="budget-section">
                <h2 className="budget-section__heading">KI-Kontingent (parallel)</h2>
                <p className="budget-section__sub">
                  Generierungen: {quotaUsage.generationCount} · Tokens: {formatTokens(quotaUsage.tokenCount)} ·
                  Transkription: {quotaUsage.transcriptionMinutes.toFixed(1)} min
                </p>
              </section>
            ) : null}

            <BreakdownTable title="Provider" rows={providerRows} />
            <BreakdownTable title="Modelle" rows={modelRows} />
            <BreakdownTable title="Features" rows={featureRows} />
            {userRows.length > 1 ? <BreakdownTable title="Benutzer" rows={userRows} /> : null}
          </>
        ) : (
          <p className="budget-section__sub">Keine Nutzungsdaten verfügbar (Supabase nicht konfiguriert).</p>
        )}

        <section className="budget-section" aria-labelledby="budget-settings">
          <h2 id="budget-settings" className="budget-section__heading">
            Budget-Einstellungen
          </h2>
          <div className="budget-form">
            <label className="team-settings-label">
              Monatsbudget EUR
              <input
                className="team-settings-input"
                value={form.monthlyBudgetEur}
                onChange={(e) => setForm((f) => ({ ...f, monthlyBudgetEur: e.target.value }))}
                inputMode="decimal"
              />
            </label>
            <label className="team-settings-label">
              Monatsbudget USD
              <input
                className="team-settings-input"
                value={form.monthlyBudgetUsd}
                onChange={(e) => setForm((f) => ({ ...f, monthlyBudgetUsd: e.target.value }))}
                inputMode="decimal"
              />
            </label>
            <label className="team-settings-permission-item">
              <input
                type="checkbox"
                checked={form.warnAt50}
                onChange={(e) => setForm((f) => ({ ...f, warnAt50: e.target.checked }))}
              />
              Warnung bei 50%
            </label>
            <label className="team-settings-permission-item">
              <input
                type="checkbox"
                checked={form.warnAt80}
                onChange={(e) => setForm((f) => ({ ...f, warnAt80: e.target.checked }))}
              />
              Warnung bei 80%
            </label>
            <label className="team-settings-permission-item">
              <input
                type="checkbox"
                checked={form.warnAt100}
                onChange={(e) => setForm((f) => ({ ...f, warnAt100: e.target.checked }))}
              />
              Warnung bei 100%
            </label>
            <label className="team-settings-permission-item">
              <input
                type="checkbox"
                checked={form.hardLimitEnabled}
                onChange={(e) => setForm((f) => ({ ...f, hardLimitEnabled: e.target.checked }))}
              />
              Hartes Limit aktiv (optional, blockiert nur KI-Generierung)
            </label>
            <label className="team-settings-label">
              Hartes Limit EUR
              <input
                className="team-settings-input"
                value={form.hardLimitEur}
                onChange={(e) => setForm((f) => ({ ...f, hardLimitEur: e.target.value }))}
                inputMode="decimal"
              />
            </label>
            <button
              type="button"
              className="team-settings-btn team-settings-btn--primary"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              Speichern
            </button>
            {saveMessage ? <p className="team-settings-success">{saveMessage}</p> : null}
            {config?.updatedAt ? (
              <p className="budget-section__sub">Zuletzt aktualisiert: {new Date(config.updatedAt).toLocaleString('de-DE')}</p>
            ) : null}
          </div>
        </section>

        {warnings.length > 0 ? (
          <section className="budget-section">
            <h2 className="budget-section__heading">Budget-Warnungen</h2>
            <ul className="budget-warnings">
              {warnings.map((w) => (
                <li key={w.id}>
                  {w.thresholdPercent}% — {formatEur(w.currentUsage)} / {formatEur(w.budgetAmount)} ({w.currency})
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="budget-section">
          <h2 className="budget-section__heading">Export</h2>
          <div className="budget-export">
            <a className="team-settings-btn" href={aiUsageExportUrl('csv')} download>
              <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              CSV
            </a>
            <a className="team-settings-btn" href={aiUsageExportUrl('json')} download>
              <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              JSON
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
