import { useMemo } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import type { TopNavTabId } from '../CaseTopNav'
import type { NotionPageId } from '../notionPages'
import { extractSpiegelwerte, pickLatestSpiegelSeries, spiegelGraphId } from '../SpiegelwerteSection'
import { useOverviewLayout } from '../../../hooks/useOverviewLayout'
import { OverviewLayoutToolbar } from './OverviewLayoutToolbar'
import { OverviewWidgetGrid } from './OverviewWidgetGrid'
import type { OverviewWidgetRenderContext } from './OverviewWidgetContent'
import type {
  HeroSummaryData,
  MedicationOverviewData,
  MedRegimenItem,
  SymptomSnapshotData,
} from './types'
import type { SemanticTone } from './OverviewCard'
import { useMedicationPlan } from '../../../hooks/useMedicationPlan'
import { useCaseAppointments } from '../../../hooks/useCaseAppointments'
import { isMedicationVisible } from '../../../utils/medication/planOps'
import { formatMedicationOverviewDoseGerman } from '../../../utils/medication/doseLine'
import { computeMedicationInsights } from '../../../utils/medication/medicationInsights'
import { loadBefunde } from '../../../utils/laborArchive'
import { loadVerlaufFeed } from '../../../utils/verlaufFeed'
import { loadNotionDocumentSnapshot } from '../../../utils/notionDocumentActions'
import { loadNotionPageDate } from '../../../utils/notionPageDate'
import { loadClinicalImprintIndex } from '../../../utils/clinicalImprint'
import { buildPatientSafety } from '../../../utils/overview/patientSafety'
import { buildLabsDue } from '../../../utils/overview/labsDue'
import { buildPsychopathologyStructuredCues, mergePsychopathologyProfiles } from '../../../utils/overview/psychopathologyDomains'
import { getSymptomTrajectory } from '../../../utils/overview/symptomTrajectory'
import { formatDateDe, relativeDayDe } from '../../../utils/overview/dateLabels'
import { getRecentVerlauf } from '../../../utils/overview/recentVerlauf'
import { buildDokumentationSummary } from '../../../utils/overview/dokumentationSummary'
import { buildRecentLabResults } from '../../../utils/overview/recentLabResults'
import { buildButterflySummary, hasButterflyCriteriaSupport } from '../../../utils/overview/butterflySummary'
import { loadIsdmAnalysis } from '../../../utils/isdm/storage'
import { loadDiagnosen } from '../../../utils/diagnosenArchive'
import { useOverviewHiddenGraphs } from '../../../hooks/useOverviewHiddenGraphs'
import { useOverviewCollaboration } from '../../../hooks/useOverviewCollaboration'
import { usePsychotherapyPlan } from '../../../hooks/usePsychotherapyPlan'
import type { ClinicalImprintRecord, CourseDirection } from '../../../types/clinicalImprint'
import type { MedicationStatus } from '../../../types/medicationPlan'

interface OverviewDashboardProps {
  caseId: string
  therapyScopeId: string
  onTabSelect: (tab: TopNavTabId) => void
  onOpenWorkspacePage?: (pageId: NotionPageId) => void
}

const MED_STATUS_LABEL: Partial<Record<MedicationStatus, string>> = {
  paused: 'pausiert',
  reduced: 'reduziert',
  increased: 'gesteigert',
}

const COURSE_LABEL: Record<CourseDirection, string> = {
  new: 'neu',
  improved: 'verbessert',
  worsened: 'verschlechtert',
  stable: 'stabil',
  fluctuating: 'fluktuierend',
  resolved: 'remittiert',
  unclear: 'unklar',
}

/** Headline severity ranking + German label for the summary-strip risk metric. */
const TONE_SEVERITY: Record<SemanticTone, number> = {
  high: 5,
  moderate: 4,
  info: 3,
  low: 2,
  ok: 1,
  neutral: 0,
}

const TONE_LABEL: Record<SemanticTone, string> = {
  high: 'akut',
  moderate: 'erhöht',
  ok: 'unauffällig',
  low: 'gering',
  info: 'beachten',
  neutral: '—',
}

function clamp(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

/** Read the joined anamnesis text most likely to mention allergies. */
function readAllergyText(caseId: string): string | null {
  const aufnahme = loadNotionDocumentSnapshot('aufnahme', caseId)
  if (!aufnahme) return null
  const parts = [
    aufnahme.sectionContents['somatische-anamnese'],
    aufnahme.sectionContents['eigenanamnese'],
  ].filter(Boolean)
  return parts.length > 0 ? parts.join('\n') : null
}

function readPsychopathSnapshot(caseId: string): { text: string | null; savedAt: string | null } {
  const snap = loadNotionDocumentSnapshot('psychopath', caseId)
  if (!snap) return { text: null, savedAt: null }
  const free = snap.sectionContents['free']?.trim()
  const text = free && free.length > 0 ? free : Object.values(snap.sectionContents).filter(Boolean).join(' ')
  return { text: text ? clamp(text, 320) : null, savedAt: snap.savedAt ?? null }
}

function latestPsychopathImprint(imprints: ClinicalImprintRecord[]): ClinicalImprintRecord | null {
  return (
    [...imprints]
      .filter((i) => i.clinicalDomain === 'psychopathology')
      .sort((a, b) => (b.sourceDate ?? '').localeCompare(a.sourceDate ?? ''))[0] ?? null
  )
}

/**
 * The Übersicht dashboard: a slim "Auf einen Blick" summary strip + a restrained
 * two-column grid of the cards a psychiatrist needs at a glance — safety, current
 * medication, diagnoses, psychopathology/trajectory, labs/monitoring, prior
 * therapies, and drug levels (only when present). Owns all data wiring; the cards
 * are pure presentational components.
 */
export function OverviewDashboard({
  caseId,
  therapyScopeId: _therapyScopeId,
  onTabSelect,
  onOpenWorkspacePage,
}: OverviewDashboardProps) {
  const { language } = useTranslation()
  const { currentPlan } = useMedicationPlan(caseId)
  const appointments = useCaseAppointments(caseId)
  const collaboration = useOverviewCollaboration(caseId)
  const { summary: psychotherapySummary, hasPlan: hasPsychotherapyPlan } = usePsychotherapyPlan(caseId)
  const { isHidden } = useOverviewHiddenGraphs(caseId)

  const medications = useMemo(() => currentPlan?.medications ?? [], [currentPlan])

  // ── Medication card ───────────────────────────────────────────────────────
  const medicationData = useMemo<MedicationOverviewData>(() => {
    const insights = computeMedicationInsights(medications, language)
    const meds: MedRegimenItem[] = medications
      .filter((med) => isMedicationVisible(med) && med.status !== 'discontinued')
      .map((med) => {
        const dose = formatMedicationOverviewDoseGerman(med)
        const status = (med.status === 'discontinued' ? 'active' : med.status) as MedRegimenItem['status']
        return {
          id: med.id,
          substance: med.substance,
          dose,
          status,
          statusLabel: MED_STATUS_LABEL[med.status],
        }
      })
    return {
      meds,
      activeCount: insights.activeCount,
      classes: insights.activeClasses,
      lastChange: insights.lastModifiedAt
        ? {
            dateLabel: formatDateDe(insights.lastModifiedAt) ?? insights.lastModifiedAt,
            substances: insights.lastModifiedSubstances,
          }
        : null,
      monitoringFlags: insights.monitoringBurden.map((m) => m.parameter),
      topReceptors: insights.targetedReceptors.map((r) => ({ label: r.label, count: r.count })),
      hasReferenceData: insights.hasReferenceData,
    }
  }, [medications, language])

  // ── Safety card ─────────────────────────────────────────────────────────
  const safetyData = useMemo(() => {
    const imprints = loadClinicalImprintIndex(caseId).imprints
    const riskText = loadNotionDocumentSnapshot('verlauf', caseId)?.sectionContents['risiko'] ?? null
    return buildPatientSafety({
      medications,
      language,
      imprints,
      riskText,
      allergyText: readAllergyText(caseId),
    })
  }, [caseId, medications, language])

  // ── Appointment orientation (summary strip) ───────────────────────────────
  const lastContact = useMemo(() => {
    const iso =
      appointments.lastContact?.endTime ??
      loadVerlaufFeed(caseId)[0]?.date ??
      loadNotionPageDate('verlauf', caseId)
    const dateLabel = formatDateDe(iso)
    if (!dateLabel) return null
    return { dateLabel, relativeLabel: relativeDayDe(iso) }
  }, [caseId, appointments])

  const nextAppointment = useMemo(() => {
    const next = appointments.next
    if (!next) return null
    return {
      title: next.title,
      dateLabel: formatDateDe(next.startTime) ?? next.startTime,
      relativeLabel: relativeDayDe(next.startTime),
    }
  }, [appointments])

  // ── Symptom snapshot card ─────────────────────────────────────────────────
  const symptomData = useMemo<SymptomSnapshotData>(() => {
    const { text, savedAt } = readPsychopathSnapshot(caseId)
    const imprints = loadClinicalImprintIndex(caseId).imprints
    const imprint = latestPsychopathImprint(imprints)
    const icd10Codes = loadDiagnosen(caseId).map((d) => d.icd10.code)
    const { contextLabel } = mergePsychopathologyProfiles(icd10Codes)
    const structured = buildPsychopathologyStructuredCues(imprint, icd10Codes)
    const courseLabel = imprint?.courseDirection ? COURSE_LABEL[imprint.courseDirection] : null
    const asOf = savedAt ?? imprint?.sourceDate ?? null
    return {
      snapshotText: text,
      structured,
      contextLabel,
      courseLabel,
      asOfLabel: asOf ? formatDateDe(asOf) : null,
      trajectory: getSymptomTrajectory(imprints),
    }
  }, [caseId])

  // ── Labs / monitoring card ────────────────────────────────────────────────
  const labsData = useMemo(() => {
    const activeSubstances = medications
      .filter((m) => m.status === 'active' || m.status === 'reduced' || m.status === 'increased')
      .map((m) => m.substance)
    return buildLabsDue({ befunde: loadBefunde(caseId), activeSubstances })
  }, [caseId, medications])

  const befunde = useMemo(() => loadBefunde(caseId), [caseId])
  const hasLabData = befunde.length > 0
  const recentLabResults = useMemo(() => buildRecentLabResults(befunde), [befunde])
  const recentVerlauf = useMemo(() => getRecentVerlauf(caseId, language), [caseId, language])
  const dokumentation = useMemo(() => buildDokumentationSummary(caseId), [caseId])
  const isdmAnalysis = useMemo(() => loadIsdmAnalysis(caseId), [caseId])
  const hasIsdm = isdmAnalysis !== null
  const butterflySummary = useMemo(() => buildButterflySummary(caseId, language), [caseId, language])
  const hasButterfly = useMemo(() => hasButterflyCriteriaSupport(caseId), [caseId])

  // ── Spiegel availability (preserve "≥1 value ⇒ show graph" rule) ──────────
  const spiegelSeries = useMemo(() => extractSpiegelwerte(befunde), [befunde])
  const hasSpiegel = spiegelSeries.length > 0
  const hasAdditionalSpiegel = useMemo(() => {
    const visible = spiegelSeries.filter((s) => !isHidden(spiegelGraphId(s.name)))
    const latest = pickLatestSpiegelSeries(visible)
    if (!latest) return false
    return visible.some((s) => s.name !== latest.name)
  }, [spiegelSeries, isHidden])

  // ── Summary strip ─────────────────────────────────────────────────────────
  const heroData = useMemo<HeroSummaryData>(() => {
    const diagnoses = loadDiagnosen(caseId)
    const primary = diagnoses[0]
    const coding = primary
      ? primary.icd10.code || primary.icd10.label
        ? primary.icd10
        : primary.icd11.code || primary.icd11.label
          ? primary.icd11
          : primary.dsm
      : null
    const primaryVersion: 'icd10' | 'icd11' | 'dsm' =
      primary && coding === primary.icd11
        ? 'icd11'
        : primary && coding === primary.dsm
          ? 'dsm'
          : 'icd10'
    const primaryDiagnosis = coding
      ? {
          code: coding.code,
          label: coding.label,
          version: primaryVersion,
          overridden: coding.overridden,
        }
      : null

    const tones: SemanticTone[] = [
      ...(safetyData.risk ? [safetyData.risk.tone] : []),
      ...safetyData.alerts.map((a) => a.tone),
    ]
    const risk =
      tones.length > 0
        ? (() => {
            const tone = tones.reduce<SemanticTone>(
              (acc, t) => (TONE_SEVERITY[t] > TONE_SEVERITY[acc] ? t : acc),
              'ok',
            )
            return { tone, label: TONE_LABEL[tone] }
          })()
        : null

    return {
      primaryDiagnosis,
      risk,
      activeMedCount: medicationData.activeCount,
      alertCount: safetyData.alerts.length,
      lastContact,
      nextAppointment,
    }
  }, [caseId, safetyData, medicationData, lastContact, nextAppointment])

  const {
    layout,
    editMode,
    toggleEditMode,
    moveWidget,
    removeWidget,
    addWidget,
    setWidgetWidth,
    resetToDefault,
  } = useOverviewLayout()

  const widgetContext = useMemo<OverviewWidgetRenderContext>(
    () => ({
      caseId,
      heroData,
      safetyData,
      medicationData,
      symptomData,
      labsData,
      medications,
      recentVerlauf,
      appointments: { upcoming: appointments.upcoming, loading: appointments.loading },
      dokumentation,
      psychotherapy: { summary: psychotherapySummary, hasPlan: hasPsychotherapyPlan },
      isdmAnalysis,
      collaboration,
      recentLabResults,
      butterflySummary,
      onTabSelect,
      onOpenWorkspacePage,
    }),
    [
      caseId,
      heroData,
      safetyData,
      medicationData,
      symptomData,
      labsData,
      medications,
      recentVerlauf,
      appointments.upcoming,
      appointments.loading,
      dokumentation,
      psychotherapySummary,
      hasPsychotherapyPlan,
      isdmAnalysis,
      collaboration,
      recentLabResults,
      butterflySummary,
      onTabSelect,
      onOpenWorkspacePage,
    ],
  )

  const visibilityContext = useMemo(
    () => ({
      hasSpiegel,
      hasAdditionalSpiegel,
      hasPsychotherapy: hasPsychotherapyPlan,
      hasIsdm,
      hasLabData,
      hasButterfly,
    }),
    [hasSpiegel, hasAdditionalSpiegel, hasPsychotherapyPlan, hasIsdm, hasLabData, hasButterfly],
  )

  return (
    <div className={`ov-dashboard${editMode ? ' ov-dashboard--edit-mode' : ''}`}>
      <OverviewWidgetGrid
        widgets={layout.widgets}
        editMode={editMode}
        renderContext={widgetContext}
        visibilityContext={visibilityContext}
        onMove={moveWidget}
        onRemove={removeWidget}
        onResize={setWidgetWidth}
      />

      <OverviewLayoutToolbar
        editMode={editMode}
        layout={layout}
        visibilityContext={visibilityContext}
        onToggleEditMode={toggleEditMode}
        onAddWidget={addWidget}
        onResetToDefault={resetToDefault}
      />
    </div>
  )
}
