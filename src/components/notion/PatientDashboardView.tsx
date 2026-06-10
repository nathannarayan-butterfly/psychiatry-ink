import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { useTranslation } from '../../context/TranslationContext'
import { DiagnosenWidget } from './DiagnosenWidget'
import type { TopNavTabId } from './CaseTopNav'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { NOTION_PAGES, type NotionPageId } from './notionPages'
import {
  loadBefunde,
  loadPinnedWidgets,
  savePinnedWidgets,
} from '../../utils/laborArchive'
import { SpiegelwerteSection } from './SpiegelwerteSection'
import { useMedicationPlan } from '../../hooks/useMedicationPlan'
import { formatDoseScheduleGerman } from '../../utils/medication/doseLine'

// ---------------------------------------------------------------------------
// Labor dashboard widget
// ---------------------------------------------------------------------------

function shortDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
  } catch {
    return iso.slice(5, 10)
  }
}

interface LaborDashboardWidgetProps {
  caseId: string
}

function LaborDashboardWidget({ caseId }: LaborDashboardWidgetProps) {
  const [pinned, setPinned] = useState(() => loadPinnedWidgets(caseId))
  const befunde = loadBefunde(caseId)
  const sortedBefunde = [...befunde].sort((a, b) => a.date.localeCompare(b.date))

  if (pinned.length === 0) return null

  function handleUnpin(widgetId: string) {
    const next = pinned.filter((w) => w.id !== widgetId)
    savePinnedWidgets(caseId, next)
    setPinned(next)
  }

  return (
    <div className="labor-dashboard-widgets">
      <h3 className="labor-dashboard-widgets__title">Labor-Verlauf</h3>
      <div className="labor-dashboard-widgets__grid">
        {pinned.map((widget) => {
          const chartData = sortedBefunde.map((b) => {
            const val = b.categories
              .flatMap((c) => c.values)
              .find((v) => v.name.toLowerCase() === widget.parameterName.toLowerCase())
            return {
              date: shortDate(b.date),
              value: val?.numericValue,
            }
          }).filter((d) => d.value !== undefined)

          return (
            <div key={widget.id} className="labor-dashboard-widget">
              <div className="labor-dashboard-widget__header">
                <span className="labor-dashboard-widget__name">{widget.parameterName}</span>
                <button
                  type="button"
                  className="labor-dashboard-widget__unpin"
                  onClick={() => handleUnpin(widget.id)}
                  title="Widget entfernen"
                  aria-label="Widget entfernen"
                >
                  ×
                </button>
              </div>
              <span className="labor-dashboard-widget__cat">{widget.categoryLabel}</span>
              {chartData.length < 2 ? (
                <p className="labor-dashboard-widget__no-data">Nicht genug Daten</p>
              ) : (
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aktuelle Medikation widget
// ---------------------------------------------------------------------------

interface AktuelleMedikationWidgetProps {
  caseId: string
  onNavigateToTherapie: () => void
}

function AktuelleMedikationWidget({ caseId, onNavigateToTherapie }: AktuelleMedikationWidgetProps) {
  const { t } = useTranslation()
  const { currentPlan } = useMedicationPlan(caseId)

  const activeMeds = useMemo(() => {
    if (!currentPlan) return []
    return currentPlan.medications.filter((med) => med.status !== 'discontinued')
  }, [currentPlan])

  return (
    <div className="aktuelle-medikation">
      <h3 className="aktuelle-medikation__title">{t('aktuelleMedikationTitle')}</h3>
      {activeMeds.length === 0 ? (
        <p className="aktuelle-medikation__empty">{t('aktuelleMedikationEmpty')}</p>
      ) : (
        <ul className="aktuelle-medikation__list">
          {activeMeds.map((med) => {
            const schedule = formatDoseScheduleGerman(med.doseSchedule)
            const strengthPart = med.strength.trim()
            return (
              <li key={med.id} className="aktuelle-medikation__row">
                <span className="aktuelle-medikation__name">{med.substance}</span>
                <span className="aktuelle-medikation__dose">
                  {[strengthPart, schedule].filter(Boolean).join(' · ')}
                </span>
                {med.status !== 'active' && (
                  <span className={`aktuelle-medikation__badge aktuelle-medikation__badge--${med.status}`}>
                    {med.status === 'paused'
                      ? 'pausiert'
                      : med.status === 'reduced'
                        ? 'reduziert'
                        : 'gesteigert'}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <button
        type="button"
        className="aktuelle-medikation__link"
        onClick={onNavigateToTherapie}
      >
        {t('aktuelleMedikationGoToTherapie')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------

interface PatientDashboardViewProps {
  caseId: string
  onTabSelect: (tab: TopNavTabId) => void
  onOpenWorkspacePage?: (pageId: NotionPageId) => void
}

/** Primary clinical areas a psychiatrist needs at a glance. */
const CLINICAL_AREAS: { id: TopNavTabId; labelKey: UiTranslationKey }[] = [
  { id: 'workspace', labelKey: 'topNavWorkspaceFall' },
  { id: 'verlauf', labelKey: 'topNavVerlauf' },
  { id: 'labor', labelKey: 'topNavLabor' },
  { id: 'therapie', labelKey: 'topNavTherapie' },
  { id: 'dokumente', labelKey: 'topNavDokumente' },
]

/** Common documentation entry points — top-level only, no subsections. */
const DOCUMENT_START_PAGES = NOTION_PAGES.filter((page) => page.kind === 'document')

export function PatientDashboardView({
  caseId,
  onTabSelect,
  onOpenWorkspacePage,
}: PatientDashboardViewProps) {
  const { t } = useTranslation()
  const meta = getCaseMeta(caseId)

  const structuredName = [meta?.localVorname?.trim(), meta?.localNachname?.trim()]
    .filter(Boolean)
    .join(' ')
  const name = structuredName || meta?.localName?.trim() || t('patientNavFallback')
  const geburtsdatum = meta?.localGeburtsdatum?.trim()
  const geschlecht = meta?.localGeschlecht

  const genderLabel =
    geschlecht === 'maennlich'
      ? t('patientGeschlechtMaennlich')
      : geschlecht === 'weiblich'
        ? t('patientGeschlechtWeiblich')
        : geschlecht === 'divers'
          ? t('patientGeschlechtDivers')
          : null

  const metaParts = [
    geburtsdatum ? `${t('patientFieldGeburtsdatum')}: ${geburtsdatum}` : null,
    genderLabel,
  ].filter(Boolean)

  return (
    <div className="patient-dashboard">
      <header className="patient-dashboard__header">
        <h1 className="patient-dashboard__name">{name}</h1>
        {metaParts.length > 0 ? (
          <p className="patient-dashboard__meta">{metaParts.join(' · ')}</p>
        ) : null}
      </header>

      <div className="patient-dashboard__body">
        <main className="patient-dashboard__main">
          <DiagnosenWidget caseId={caseId} variant="panel" />
          <AktuelleMedikationWidget caseId={caseId} onNavigateToTherapie={() => onTabSelect('therapie')} />
          <SpiegelwerteSection caseId={caseId} />
          <LaborDashboardWidget caseId={caseId} />
        </main>

        <aside className="patient-dashboard__sidebar">
          <nav className="patient-dashboard__nav" aria-label={t('patientDashboardQuickAccess')}>
            <p className="patient-dashboard__actions-heading">{t('patientDashboardQuickAccess')}</p>
            {CLINICAL_AREAS.map((area) => (
              <button
                key={area.id}
                type="button"
                className="patient-dashboard__nav-link"
                onClick={() => onTabSelect(area.id)}
              >
                {t(area.labelKey)}
              </button>
            ))}
          </nav>

          <nav className="patient-dashboard__workspace-actions" aria-label={t('patientDashboardNewDocument')}>
            <p className="patient-dashboard__actions-heading">{t('patientDashboardNewDocument')}</p>
            {DOCUMENT_START_PAGES.map((page) => (
              <button
                key={page.id}
                type="button"
                className="patient-dashboard__nav-link"
                onClick={() => onOpenWorkspacePage?.(page.id)}
              >
                {t(page.labelKey)}
              </button>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  )
}
