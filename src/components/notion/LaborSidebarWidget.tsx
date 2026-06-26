import { useCallback, useMemo, useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { useTranslation } from '../../context/TranslationContext'
import { caseStorageKey } from '../../utils/caseContext'
import { loadBefunde, loadPinnedWidgets } from '../../utils/laborArchive'
import type { LaborBefund, PinnedLaborWidget } from '../../utils/laborArchive'
import {
  BEFUND_ARCHIVE_CHANGED_EVENT,
  loadDiagnostikBefunde,
  setDiagnosticsSectionPref,
} from '../../utils/befundArchive'
import { formatBefundDate, getBefundTypeLabel } from '../../utils/befundRender'
import { formatClinicalDate, formatClinicalDateShort } from '../../utils/clinicalDate'

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
  const short = formatClinicalDateShort(iso)
  return short.endsWith('.') ? short.slice(0, -1) : short || iso.slice(5, 10)
}

function formatDate(iso: string): string {
  return formatClinicalDate(iso) || iso.slice(0, 10)
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
  const { t, language } = useTranslation()
  const [tick, setTick] = useState(0)
  const [hidden, setHidden] = useState<boolean>(() => loadHidden(caseId))

  useEffect(() => {
    setHidden(loadHidden(caseId))
  }, [caseId])

  useEffect(() => {
    function handleChange(e: Event) {
      const detail = (e as CustomEvent<{ caseId: string }>).detail
      if (detail?.caseId === caseId) setTick((t) => t + 1)
    }
    window.addEventListener(BEFUND_ARCHIVE_CHANGED_EVENT, handleChange)
    return () => window.removeEventListener(BEFUND_ARCHIVE_CHANGED_EVENT, handleChange)
  }, [caseId])

  const handleClose = useCallback(() => {
    saveHidden(caseId, true)
    setHidden(true)
  }, [caseId])

  const befunde = useMemo(() => loadBefunde(caseId), [caseId, hidden, tick])
  const examBefunde = useMemo(
    () =>
      [...loadDiagnostikBefunde(caseId)]
        .sort((a, b) => b.examDate.localeCompare(a.examDate))
        .slice(0, 3),
    [caseId, hidden, tick],
  )
  const pinned = useMemo(() => loadPinnedWidgets(caseId), [caseId, hidden, tick])

  if (hidden) return null
  if (befunde.length === 0 && examBefunde.length === 0) return null

  const latestDate = [...befunde].sort((a, b) => b.date.localeCompare(a.date))[0]?.date

  const navigateToBefunde = () => {
    setDiagnosticsSectionPref(caseId, 'ekg')
    onNavigateToLabor?.()
  }

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

  if (pinned.length === 0 && befunde.length === 0) {
    return (
      <div className="labor-sidebar-widget">
        <div className="labor-sidebar-widget__header-row">
          <span className="labor-sidebar-widget__header">{t('diagnosticsPageTitle')}</span>
          {closeButton}
        </div>
        {examBefunde.map((record) => (
          <button
            key={record.id}
            type="button"
            className="labor-sidebar-widget__exam-row"
            onClick={navigateToBefunde}
          >
            <span className="labor-sidebar-widget__param-name">
              {getBefundTypeLabel(record.type, language)} {formatBefundDate(record.examDate)}
            </span>
            <span className="labor-sidebar-widget__exam-status">
              {record.status === 'vidert' ? t('befundStatusVidert') : t('befundStatusDraft')}
            </span>
          </button>
        ))}
        <button
          type="button"
          className="labor-sidebar-widget__link"
          onClick={navigateToBefunde}
        >
          {t('befundSidebarLink')} →
        </button>
      </div>
    )
  }

  if (pinned.length === 0) {
    return (
      <div className="labor-sidebar-widget">
        <div className="labor-sidebar-widget__header-row">
          <span className="labor-sidebar-widget__header">{t('diagnosticsPageTitle')}</span>
          {closeButton}
        </div>
        {latestDate && (
          <span className="labor-sidebar-widget__param-name">{formatDate(latestDate)}</span>
        )}
        {examBefunde.length > 0 ? (
          <div className="labor-sidebar-widget__exam-list">
            {examBefunde.map((record) => (
              <button
                key={record.id}
                type="button"
                className="labor-sidebar-widget__exam-row"
                onClick={navigateToBefunde}
              >
                <span className="labor-sidebar-widget__param-name">
                  {getBefundTypeLabel(record.type, language)} {formatBefundDate(record.examDate)}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="labor-sidebar-widget__link"
          onClick={onNavigateToLabor}
        >
          {t('befundSidebarLink')} →
        </button>
      </div>
    )
  }

  return (
    <div className="labor-sidebar-widget">
      <div className="labor-sidebar-widget__header-row">
        <span className="labor-sidebar-widget__header">Diagnostik Visualisierung</span>
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
      {examBefunde.length > 0 ? (
        <div className="labor-sidebar-widget__exam-list">
          {examBefunde.map((record) => (
            <button
              key={record.id}
              type="button"
              className="labor-sidebar-widget__exam-row"
              onClick={navigateToBefunde}
            >
              <span className="labor-sidebar-widget__param-name">
                {getBefundTypeLabel(record.type, language)} {formatBefundDate(record.examDate)}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
