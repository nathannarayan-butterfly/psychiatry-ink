import { useCallback, useMemo, useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { useTranslation } from '../../context/TranslationContext'
import { caseStorageKey } from '../../utils/caseContext'
import { loadBefunde, loadPinnedWidgets } from '../../utils/laborArchive'
import type { LaborBefund, PinnedLaborWidget } from '../../utils/laborArchive'

interface LaborSidebarWidgetProps {
  caseId: string
  onNavigateToLabor?: () => void
}

// Persisted per-case flag so the dismissed lab visualization stays hidden across reloads.
const HIDDEN_FLAG_BASE = 'psychiatry-ink:workspaceLabPanelHidden'

function loadHidden(caseId: string): boolean {
  try {
    return localStorage.getItem(caseStorageKey(HIDDEN_FLAG_BASE, caseId)) === '1'
  } catch {
    return false
  }
}

function saveHidden(caseId: string, hidden: boolean): void {
  try {
    localStorage.setItem(caseStorageKey(HIDDEN_FLAG_BASE, caseId), hidden ? '1' : '0')
  } catch {
    // ignore storage errors
  }
}

function shortDate(iso: string): string {
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}.${mm}`
  } catch {
    return iso.slice(5, 10)
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}.${mm}.${yyyy}`
  } catch {
    return iso.slice(0, 10)
  }
}

function buildSparkData(widget: PinnedLaborWidget, befunde: LaborBefund[]) {
  const sorted = [...befunde].sort((a, b) => a.date.localeCompare(b.date))
  return sorted
    .map((b) => {
      const cat = b.categories.find((c) => c.label === widget.categoryLabel)
      const val = cat?.values.find((v) => v.name === widget.parameterName)
      return { date: shortDate(b.date), value: val?.numericValue }
    })
    .filter((d): d is { date: string; value: number } => d.value !== undefined)
}

export function LaborSidebarWidget({ caseId, onNavigateToLabor }: LaborSidebarWidgetProps) {
  const { t } = useTranslation()
  const [, setTick] = useState(0)
  const [hidden, setHidden] = useState<boolean>(() => loadHidden(caseId))

  // Re-read from storage on mount (no live subscription needed — sidebar is
  // only mounted once per workspace session)
  useEffect(() => {
    setTick((t) => t + 1)
    setHidden(loadHidden(caseId))
  }, [caseId])

  const handleClose = useCallback(() => {
    saveHidden(caseId, true)
    setHidden(true)
  }, [caseId])

  const befunde = useMemo(() => loadBefunde(caseId), [caseId])
  const pinned = useMemo(() => loadPinnedWidgets(caseId), [caseId])

  if (hidden) return null
  if (befunde.length === 0) return null

  const latestDate = [...befunde].sort((a, b) => b.date.localeCompare(a.date))[0]?.date

  const closeButton = (
    <button
      type="button"
      className="labor-sidebar-widget__close"
      onClick={handleClose}
      title={t('laborSidebarHide')}
      aria-label={t('laborSidebarHide')}
    >
      <X className="h-3 w-3" strokeWidth={2} aria-hidden />
    </button>
  )

  if (pinned.length === 0) {
    return (
      <div className="labor-sidebar-widget">
        <div className="labor-sidebar-widget__header-row">
          <span className="labor-sidebar-widget__header">Labor</span>
          {closeButton}
        </div>
        {latestDate && (
          <span className="labor-sidebar-widget__param-name">{formatDate(latestDate)}</span>
        )}
        <button
          type="button"
          className="labor-sidebar-widget__link"
          onClick={onNavigateToLabor}
        >
          Zum Labor →
        </button>
      </div>
    )
  }

  return (
    <div className="labor-sidebar-widget">
      <div className="labor-sidebar-widget__header-row">
        <span className="labor-sidebar-widget__header">Lab Visualisierung</span>
        {closeButton}
      </div>
      {pinned.map((widget) => {
        const sparkData = buildSparkData(widget, befunde)
        if (sparkData.length < 2) return null
        return (
          <div
            key={widget.id}
            className="labor-sidebar-widget__chart-row"
            onClick={onNavigateToLabor}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateToLabor?.() }}
          >
            <span className="labor-sidebar-widget__param-name">{widget.parameterName}</span>
            <div className="labor-sidebar-widget__chart">
              <ResponsiveContainer width="100%" height={36}>
                <LineChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                  <Tooltip
                    contentStyle={{ fontSize: '0.65rem', padding: '2px 6px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--accent, #4a7c59)"
                    dot={false}
                    strokeWidth={1.5}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
  )
}
