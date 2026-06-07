import { useMemo, useState, useEffect } from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { loadBefunde, loadPinnedWidgets } from '../../utils/laborArchive'
import type { LaborBefund, PinnedLaborWidget } from '../../utils/laborArchive'

interface LaborSidebarWidgetProps {
  caseId: string
  onNavigateToLabor?: () => void
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
  const [, setTick] = useState(0)

  // Re-read from storage on mount (no live subscription needed — sidebar is
  // only mounted once per workspace session)
  useEffect(() => {
    setTick((t) => t + 1)
  }, [caseId])

  const befunde = useMemo(() => loadBefunde(caseId), [caseId])
  const pinned = useMemo(() => loadPinnedWidgets(caseId), [caseId])

  if (befunde.length === 0) return null

  const latestDate = [...befunde].sort((a, b) => b.date.localeCompare(a.date))[0]?.date

  if (pinned.length === 0) {
    return (
      <div className="labor-sidebar-widget">
        <span className="labor-sidebar-widget__header">Labor</span>
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
      <span className="labor-sidebar-widget__header">Lab Visualisierung</span>
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
