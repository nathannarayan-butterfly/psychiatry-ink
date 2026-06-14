import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
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
  type LaborBefund,
  type PinnedLaborWidget,
} from '../../utils/laborArchive'
import { SpiegelwerteSection } from './SpiegelwerteSection'
import { GraphEnlargeModal } from './GraphEnlargeModal'
import { useOverviewHiddenGraphs } from '../../hooks/useOverviewHiddenGraphs'
import { useMedicationPlan } from '../../hooks/useMedicationPlan'
import { formatDoseScheduleGerman } from '../../utils/medication/doseLine'
import { usePsychotherapyPlan } from '../../hooks/usePsychotherapyPlan'
import { useComplementaryTherapies } from '../../hooks/useComplementaryTherapies'
import { useSozialtherapie } from '../../hooks/useSozialtherapie'
import { useWeitereTherapie } from '../../hooks/useWeitereTherapie'
import { translatePsychotherapyStatus } from '../../data/psychotherapyUiTranslations'
import {
  translateSozialtherapieArea,
  translateSozialtherapieStatus,
} from '../../data/sozialtherapieUiTranslations'
import {
  translateWeitereTherapieStatus,
  translateWeitereTherapieType,
} from '../../data/weitereTherapieUiTranslations'
import type { ComplementaryTherapyStatus } from '../../types/complementaryTherapy'
import { TherapieAdherenceSection } from './TherapieAdherenceSection'

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

interface LaborWidgetRef {
  refMin?: number
  refMax?: number
  refText?: string
  unit?: string
}

/** Best reference info for a parameter, taken from the most-recent befund that has it. */
function getWidgetRef(befunde: LaborBefund[], parameterName: string): LaborWidgetRef {
  const target = parameterName.toLowerCase()
  const byDateDesc = [...befunde].sort((a, b) => b.date.localeCompare(a.date))
  for (const b of byDateDesc) {
    const v = b.categories
      .flatMap((c) => c.values)
      .find((vv) => vv.name.toLowerCase() === target)
    if (v && (v.refText || v.refMin !== undefined || v.refMax !== undefined)) {
      return { refMin: v.refMin, refMax: v.refMax, refText: v.refText, unit: v.unit }
    }
  }
  return {}
}

/** Human-readable reference-range label, e.g. "3.5–5.0 mmol/L". */
function laborRefLabel(ref: LaborWidgetRef): string | null {
  const unitSuffix = ref.unit ? ` ${ref.unit}` : ''
  if (ref.refText) return `${ref.refText}${unitSuffix}`
  if (ref.refMin !== undefined && ref.refMax !== undefined) {
    return `${ref.refMin}–${ref.refMax}${unitSuffix}`
  }
  if (ref.refMin !== undefined) return `≥ ${ref.refMin}${unitSuffix}`
  if (ref.refMax !== undefined) return `≤ ${ref.refMax}${unitSuffix}`
  return null
}

function laborGraphId(widget: PinnedLaborWidget): string {
  return `labor:${widget.id}`
}

/**
 * Whether a parameter's trend is "consistently abnormal" w.r.t. its reference
 * range. Requires numeric refMin/refMax (best-effort: text-only ranges are
 * skipped). A value is abnormal if it falls below refMin or above refMax.
 * Returns true when the latest value is abnormal AND either every visible
 * point is abnormal, or a majority of the most recent points (last 3, or fewer
 * if there aren't that many) are abnormal.
 */
function isConsistentlyAbnormal(
  data: { value: number | undefined }[],
  ref: LaborWidgetRef,
): boolean {
  if (ref.refMin === undefined && ref.refMax === undefined) return false
  const values = data
    .map((d) => d.value)
    .filter((v): v is number => v !== undefined)
  if (values.length === 0) return false

  const isAbnormal = (v: number) =>
    (ref.refMin !== undefined && v < ref.refMin) ||
    (ref.refMax !== undefined && v > ref.refMax)

  const latest = values[values.length - 1]
  if (!isAbnormal(latest)) return false

  if (values.every(isAbnormal)) return true

  const recent = values.slice(-Math.min(3, values.length))
  const abnormalCount = recent.filter(isAbnormal).length
  return abnormalCount > recent.length / 2
}

const LABOR_LINE_COLOR_NORMAL = '#3b82f6'
const LABOR_LINE_COLOR_ABNORMAL = '#dc2626'

interface LaborChartViewProps {
  data: { date: string; value: number | undefined }[]
  refInfo: LaborWidgetRef
  height: number
  large?: boolean
}

function LaborChartView({ data, refInfo, height, large = false }: LaborChartViewProps) {
  const hasRefBand = refInfo.refMin !== undefined || refInfo.refMax !== undefined
  const abnormal = isConsistentlyAbnormal(data, refInfo)
  const lineColor = abnormal ? LABOR_LINE_COLOR_ABNORMAL : LABOR_LINE_COLOR_NORMAL
  const tickSize = large ? 12 : 10
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 4, right: large ? 16 : 4, bottom: 0, left: large ? 0 : -30 }}
      >
        <XAxis dataKey="date" tick={{ fontSize: tickSize }} />
        <YAxis tick={{ fontSize: tickSize }} width={large ? 44 : undefined} />
        <Tooltip contentStyle={{ fontSize: large ? 12 : 11 }} />
        {hasRefBand && (
          <ReferenceArea
            y1={refInfo.refMin}
            y2={refInfo.refMax}
            fill="#22c55e"
            fillOpacity={0.1}
            ifOverflow="extendDomain"
          />
        )}
        {refInfo.refMin !== undefined && (
          <ReferenceLine y={refInfo.refMin} stroke="#16a34a" strokeDasharray="3 2" strokeOpacity={0.6} />
        )}
        {refInfo.refMax !== undefined && (
          <ReferenceLine y={refInfo.refMax} stroke="#16a34a" strokeDasharray="3 2" strokeOpacity={0.6} />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={large ? 2 : 1.5}
          dot={{ r: large ? 3 : 2, fill: lineColor }}
          activeDot={{ r: large ? 4 : 3, fill: lineColor }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface LaborDashboardWidgetProps {
  caseId: string
}

function LaborDashboardWidget({ caseId }: LaborDashboardWidgetProps) {
  const { t } = useTranslation()
  const { isHidden, hide, unhide } = useOverviewHiddenGraphs(caseId)
  const [pinned] = useState(() => loadPinnedWidgets(caseId))
  const [enlargedId, setEnlargedId] = useState<string | null>(null)
  const [showHiddenMenu, setShowHiddenMenu] = useState(false)

  const befunde = loadBefunde(caseId)
  const sortedBefunde = [...befunde].sort((a, b) => a.date.localeCompare(b.date))

  if (pinned.length === 0) return null

  const buildChartData = (widget: PinnedLaborWidget) =>
    sortedBefunde
      .map((b) => {
        const val = b.categories
          .flatMap((c) => c.values)
          .find((v) => v.name.toLowerCase() === widget.parameterName.toLowerCase())
        return { date: shortDate(b.date), value: val?.numericValue }
      })
      .filter((d) => d.value !== undefined)

  const visible = pinned.filter((w) => !isHidden(laborGraphId(w)))
  const hidden = pinned.filter((w) => isHidden(laborGraphId(w)))
  const enlarged = enlargedId ? pinned.find((w) => w.id === enlargedId) ?? null : null

  return (
    <div className="labor-dashboard-widgets">
      <div className="labor-dashboard-widgets__head">
        <h3 className="labor-dashboard-widgets__title">Labor-Verlauf</h3>
        {hidden.length > 0 && (
          <div className="overview-hidden-menu">
            <button
              type="button"
              className="overview-hidden-menu__toggle"
              onClick={() => setShowHiddenMenu((v) => !v)}
              aria-expanded={showHiddenMenu}
            >
              {t('overviewChartAdd')} ({hidden.length})
            </button>
            {showHiddenMenu && (
              <ul className="overview-hidden-menu__list">
                {hidden.map((w) => (
                  <li key={w.id} className="overview-hidden-menu__item">
                    <span className="overview-hidden-menu__name">{w.parameterName}</span>
                    <button
                      type="button"
                      className="overview-hidden-menu__add"
                      onClick={() => {
                        unhide(laborGraphId(w))
                        if (hidden.length <= 1) setShowHiddenMenu(false)
                      }}
                    >
                      {t('overviewChartAddBack')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="labor-dashboard-widgets__grid">
        {visible.map((widget) => {
          const chartData = buildChartData(widget)
          const ref = getWidgetRef(befunde, widget.parameterName)
          const refLabel = laborRefLabel(ref)

          return (
            <div key={widget.id} className="labor-dashboard-widget">
              <div className="labor-dashboard-widget__header">
                <span className="labor-dashboard-widget__name">{widget.parameterName}</span>
                <div className="overview-chart-card__actions">
                  <button
                    type="button"
                    className="overview-chart-card__action"
                    onClick={() => setEnlargedId(widget.id)}
                    title={t('overviewChartEnlarge')}
                    aria-label={t('overviewChartEnlarge')}
                  >
                    ⤢
                  </button>
                  <button
                    type="button"
                    className="overview-chart-card__action overview-chart-card__action--close"
                    onClick={() => hide(laborGraphId(widget))}
                    title={t('overviewChartHide')}
                    aria-label={t('overviewChartHide')}
                  >
                    ×
                  </button>
                </div>
              </div>
              <span className="labor-dashboard-widget__cat">{widget.categoryLabel}</span>
              {chartData.length < 2 ? (
                <p className="labor-dashboard-widget__no-data">Nicht genug Daten</p>
              ) : (
                <LaborChartView data={chartData} refInfo={ref} height={80} />
              )}
              {refLabel && (
                <span className="labor-dashboard-widget__ref">
                  {t('overviewChartReference')}: {refLabel}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {enlarged && (
        <GraphEnlargeModal
          title={enlarged.parameterName}
          subtitle={enlarged.categoryLabel}
          refText={laborRefLabel(getWidgetRef(befunde, enlarged.parameterName))}
          onClose={() => setEnlargedId(null)}
        >
          {buildChartData(enlarged).length < 2 ? (
            <p className="labor-dashboard-widget__no-data">Nicht genug Daten</p>
          ) : (
            <LaborChartView
              data={buildChartData(enlarged)}
              refInfo={getWidgetRef(befunde, enlarged.parameterName)}
              height={420}
              large
            />
          )}
        </GraphEnlargeModal>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aktuelle Medikation widget
// ---------------------------------------------------------------------------

interface AktuelleMedikationWidgetProps {
  caseId: string
  onNavigateToTherapie: () => void
  onAddMedication: () => void
}

function AktuelleMedikationWidget({
  caseId,
  onNavigateToTherapie,
  onAddMedication,
}: AktuelleMedikationWidgetProps) {
  const { t } = useTranslation()
  const { currentPlan } = useMedicationPlan(caseId)

  const activeMeds = useMemo(() => {
    if (!currentPlan) return []
    return currentPlan.medications.filter((med) => med.status !== 'discontinued')
  }, [currentPlan])

  return (
    <div className="aktuelle-medikation">
      <div className="aktuelle-medikation__header">
        <h3 className="aktuelle-medikation__title">{t('aktuelleMedikationTitle')}</h3>
        <button
          type="button"
          className="aktuelle-medikation__add"
          onClick={onAddMedication}
          title={t('aktuelleMedikationAdd')}
          aria-label={t('aktuelleMedikationAdd')}
        >
          <Plus size={14} aria-hidden />
        </button>
      </div>
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
// Weitere Therapien (planned/other therapies) — compact cards
// ---------------------------------------------------------------------------

type PlannedTherapyKind = 'psychotherapy' | 'weitere' | 'complementary' | 'sozial'

interface PlannedTherapyCard {
  id: string
  kind: PlannedTherapyKind
  kindLabel: string
  title: string
  statusLabel: string
  statusTone: string
  detail?: string
}

const THERAPY_GRID_CLASS: Record<PlannedTherapyKind, string> = {
  psychotherapy: 'overview-therapy-grid--default',
  weitere: 'overview-therapy-grid--weitere',
  complementary: 'overview-therapy-grid--komplementaer',
  sozial: 'overview-therapy-grid--default',
}

function renderPlannedTherapyCard(
  card: PlannedTherapyCard,
  onNavigateToTherapie: () => void,
) {
  return (
    <button
      key={card.id}
      type="button"
      className="overview-therapy-card"
      onClick={onNavigateToTherapie}
    >
      <div className="overview-therapy-card__head">
        <span className="overview-therapy-card__kind">{card.kindLabel}</span>
        <span className={`therapy-status therapy-status--${card.statusTone}`}>
          {card.statusLabel}
        </span>
      </div>
      <span className="overview-therapy-card__name">{card.title}</span>
      {card.detail ? (
        <span className="overview-therapy-card__detail">{card.detail}</span>
      ) : null}
    </button>
  )
}

const COMPLEMENTARY_STATUS_LABEL_KEYS: Record<ComplementaryTherapyStatus, UiTranslationKey> = {
  active: 'ctStatusActive',
  planned: 'ctStatusPlanned',
  paused: 'ctStatusPaused',
  completed: 'ctStatusCompleted',
}

const COMPLEMENTARY_STATUS_TONE: Record<ComplementaryTherapyStatus, string> = {
  active: 'green',
  planned: 'blue',
  paused: 'amber',
  completed: 'gray',
}

const SOZIAL_STATUS_TONE: Record<string, string> = {
  open: 'amber',
  'in-progress': 'blue',
  arranged: 'violet',
  resolved: 'green',
  'not-relevant': 'gray',
}

const WEITERE_STATUS_TONE: Record<string, string> = {
  planned: 'blue',
  ongoing: 'green',
  paused: 'amber',
  completed: 'violet',
  declined: 'gray',
  contraindicated: 'amber',
}

const PT_STATUS_TONE: Record<string, string> = {
  'not-started': 'gray',
  active: 'green',
  paused: 'amber',
  completed: 'gray',
}

interface PlannedTherapiesSectionProps {
  caseId: string
  onNavigateToTherapie: () => void
}

/**
 * Compact read-only overview of the patient's non-pharmacological therapies, sourced from
 * the same hooks the Therapie tab uses. Only active/planned (non-finished) items are shown.
 */
function PlannedTherapiesSection({ caseId, onNavigateToTherapie }: PlannedTherapiesSectionProps) {
  const { t, language } = useTranslation()
  const { summary, hasPlan } = usePsychotherapyPlan(caseId)
  const { therapies } = useComplementaryTherapies(caseId)
  const { targets } = useSozialtherapie(caseId)
  const { entries } = useWeitereTherapie(caseId)

  const cards = useMemo<PlannedTherapyCard[]>(() => {
    const list: PlannedTherapyCard[] = []

    if (hasPlan && summary.status !== 'completed') {
      list.push({
        id: 'psychotherapy',
        kind: 'psychotherapy',
        kindLabel: t('overviewTherapyKindPsychotherapie'),
        title: summary.method || summary.currentStage || t('overviewTherapyKindPsychotherapie'),
        statusLabel: translatePsychotherapyStatus(language, summary.status),
        statusTone: PT_STATUS_TONE[summary.status] ?? 'gray',
        detail: summary.mainGoal,
      })
    }

    for (const entry of entries) {
      if (entry.status === 'completed' || entry.status === 'declined' || entry.status === 'contraindicated') {
        continue
      }
      list.push({
        id: `weitere:${entry.id}`,
        kind: 'weitere',
        kindLabel: t('overviewTherapyKindWeitere'),
        title: translateWeitereTherapieType(language, entry.type),
        statusLabel: translateWeitereTherapieStatus(language, entry.status),
        statusTone: WEITERE_STATUS_TONE[entry.status] ?? 'gray',
        detail: entry.clinicalGoal?.trim() || entry.frequency?.trim() || undefined,
      })
    }

    for (const therapy of therapies) {
      if (therapy.status === 'completed') continue
      list.push({
        id: `complementary:${therapy.id}`,
        kind: 'complementary',
        kindLabel: t('overviewTherapyKindKomplementaer'),
        title: therapy.name,
        statusLabel: t(COMPLEMENTARY_STATUS_LABEL_KEYS[therapy.status]),
        statusTone: COMPLEMENTARY_STATUS_TONE[therapy.status] ?? 'gray',
        detail: therapy.mainGoal?.trim() || therapy.frequency?.trim() || undefined,
      })
    }

    for (const target of targets) {
      if (target.status === 'resolved' || target.status === 'not-relevant') continue
      list.push({
        id: `sozial:${target.id}`,
        kind: 'sozial',
        kindLabel: t('overviewTherapyKindSozial'),
        title: translateSozialtherapieArea(language, target.area),
        statusLabel: translateSozialtherapieStatus(language, target.status),
        statusTone: SOZIAL_STATUS_TONE[target.status] ?? 'gray',
        detail: target.goal?.trim() || target.currentMeasure?.trim() || undefined,
      })
    }

    return list
  }, [hasPlan, summary, entries, therapies, targets, t, language])

  const cardGroups = useMemo(() => {
    const order: PlannedTherapyKind[] = ['psychotherapy', 'weitere', 'complementary', 'sozial']
    return order
      .map((kind) => ({
        kind,
        cards: cards.filter((card) => card.kind === kind),
      }))
      .filter((group) => group.cards.length > 0)
  }, [cards])

  return (
    <div className="overview-therapies">
      <h3 className="overview-therapies__title">{t('overviewWeitereTherapienTitle')}</h3>
      {cards.length === 0 ? (
        <p className="overview-therapies__empty">{t('overviewWeitereTherapienEmpty')}</p>
      ) : (
        <div className="overview-therapies__groups">
          {cardGroups.map((group) => (
            <div
              key={group.kind}
              className={`overview-therapy-grid ${THERAPY_GRID_CLASS[group.kind]}`}
            >
              {group.cards.map((card) => renderPlannedTherapyCard(card, onNavigateToTherapie))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

interface PatientDashboardViewProps {
  caseId: string
  /** Storage-scoped case id used by the Therapie data hooks; falls back to caseId. */
  therapyCaseId?: string
  onTabSelect: (tab: TopNavTabId) => void
  onAddMedication?: () => void
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
  therapyCaseId,
  onTabSelect,
  onAddMedication,
  onOpenWorkspacePage,
}: PatientDashboardViewProps) {
  const { t } = useTranslation()
  const meta = getCaseMeta(caseId)
  const therapyScopeId = therapyCaseId ?? caseId

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
          <div className="patient-dashboard__overview-grid">
            <div className="patient-dashboard__col patient-dashboard__col--left">
              <DiagnosenWidget caseId={caseId} variant="panel" />
              <AktuelleMedikationWidget
                caseId={caseId}
                onNavigateToTherapie={() => onTabSelect('therapie')}
                onAddMedication={() =>
                  onAddMedication ? onAddMedication() : onTabSelect('therapie')
                }
              />
              <PlannedTherapiesSection
                caseId={therapyScopeId}
                onNavigateToTherapie={() => onTabSelect('therapie')}
              />
              <TherapieAdherenceSection caseId={therapyScopeId} />
            </div>
            <div className="patient-dashboard__col patient-dashboard__col--right">
              <SpiegelwerteSection caseId={caseId} />
              <LaborDashboardWidget caseId={caseId} />
            </div>
          </div>
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
