import { useMemo, useCallback } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import { isClinicalIntelligenceAvailableForCase } from '../../../utils/featureFlags'
import type { TopNavTabId } from '../CaseTopNav'
import type { NotionPageId } from '../notionPages'
import { extractSpiegelwerte, pickLatestSpiegelSeries, spiegelGraphId } from '../SpiegelwerteSection'
import { useOverviewLayout } from '../../../hooks/useOverviewLayout'
import { OverviewLayoutToolbar } from './OverviewLayoutToolbar'
import { OverviewWidgetGrid } from './OverviewWidgetGrid'
import { OverviewHero } from './OverviewHero'
import type { OverviewWidgetRenderContext } from './OverviewWidgetContent'
import type {
  HeroSummaryData,
  MedicationOverviewData,
  MedRegimenItem,
  SymptomSnapshotData,
  StatusRibbonItem,
} from './types'
import type { SemanticTone } from './OverviewCard'
import { useOverviewClinicalRefresh } from '../../../hooks/useOverviewClinicalRefresh'
import { useMedicationPlan } from '../../../hooks/useMedicationPlan'
import { useCaseAppointments } from '../../../hooks/useCaseAppointments'
import { isMedicationVisible } from '../../../utils/medication/planOps'
import { formatMedicationOverviewDoseGerman } from '../../../utils/medication/doseLine'
import { computeMedicationInsights } from '../../../utils/medication/medicationInsights'
import { activeMedications } from '../../../utils/medication/planOps'
import {
  computeCombinedReceptorFingerprint,
  computeTargetedReceptors,
  resolveReceptorProfiles,
} from '../../../utils/medication/receptorBurden'
import { DEFAULT_MEDICATIONS_COLLECTION_ID } from '../../../types/knowledgeBase'
import { useKnowledgeBaseDrugs } from '../../../hooks/useKnowledgeBaseDrugs'
import { loadBefunde } from '../../../utils/laborArchive'
import { loadVerlaufFeed } from '../../../utils/verlaufFeed'
import { loadNotionDocumentSnapshot } from '../../../utils/notionDocumentActions'
import { loadNotionPageDate } from '../../../utils/notionPageDate'
import { loadClinicalImprintIndex } from '../../../utils/clinicalImprint'
import { buildPatientSafety } from '../../../utils/overview/patientSafety'
import { buildLaborOverview } from '../../../utils/overview/labOverview'
import { buildSymptomSnapshotData } from '../../../utils/overview/psychopathFindingOps'
import { usePsychopathFindingRevision } from '../../../hooks/usePsychopathFindingRevision'
import { daysSinceIso, formatDateDe, relativeDayDe } from '../../../utils/overview/dateLabels'
import { getRecentVerlauf } from '../../../utils/overview/recentVerlauf'
import { buildDokumentationSummary } from '../../../utils/overview/dokumentationSummary'
import { buildRecentLabResults } from '../../../utils/overview/recentLabResults'
import { buildButterflySummary, hasButterflyCriteriaSupport } from '../../../utils/overview/butterflySummary'
import { loadIsdmAnalysis } from '../../../utils/isdm/storage'
import { loadDiagnosen, selectPrimaryCoding } from '../../../utils/diagnosenArchive'
import {
  categoryTranslationKey,
  resolveClinicalCategory,
  sortDiagnosesForDisplay,
} from '../../../utils/diagnosisClassification'
import { resolveDiagnosisLabelSync } from '../../../utils/diagnosisDisplayRequests'
import { useDiagnosenRevision } from '../../../hooks/useDiagnosenRevision'
import { useOverviewHiddenGraphs } from '../../../hooks/useOverviewHiddenGraphs'
import { useOverviewCollaboration } from '../../../hooks/useOverviewCollaboration'
import { usePsychotherapyPlan } from '../../../hooks/usePsychotherapyPlan'
import { loadComplementaryTherapies } from '../../../utils/complementaryTherapy/storage'
import { loadWeitereTherapie } from '../../../utils/weitereTherapie/storage'
import { loadSozialtherapie } from '../../../utils/sozialtherapie/storage'
import {
  buildEkgSummary,
  buildEegSummary,
  buildCtSummary,
  hasConductedEeg,
} from '../../../utils/overview/diagnosticSummaries'
import {
  buildZwangsmassnahmeSummary,
  hasZwangsmassnahmeSignal,
} from '../../../utils/overview/zwangsmassnahmeSummary'
import { buildVerlaufstendenzSummary } from '../../../utils/overview/verlaufstendenzSummary'
import { useVerlaufstendenzRevision } from '../../../hooks/useVerlaufstendenzRevision'
import { buildRegisteredTherapiesSummary } from '../../../utils/overview/registeredTherapiesSummary'
import { buildComplianceSummary } from '../../../utils/overview/complianceSummary'
import {
  exportOverviewDashboardPdf,
  exportOverviewDashboardWord,
  printOverviewDashboard,
} from '../../../utils/overview/printOverview'
import type { MedicationStatus } from '../../../types/medicationPlan'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import type { OverviewQuickActionId } from '../../../utils/overview/overviewQuickActions'
import { buildClinicalSignalChips } from '../../../utils/overview/overviewClinicalSignals'
import type { ClinicalSignalChip } from '../../../utils/overview/overviewClinicalSignals'
import type { OverviewWidgetId } from '../../../utils/overview/overviewLayout'
import { useClinicalIntelligence } from '../../../hooks/useClinicalIntelligence'
import type { ClinicalIntelligenceRunResponse } from '../../../types/clinicalIntelligence'

interface OverviewDashboardProps {
  caseId: string
  therapyScopeId: string
  /** Bump when local patient meta changes so the hero re-reads registry data. */
  metaVersion?: number
  onClinicalSubheadingChange?: () => void
  onTabSelect: (tab: TopNavTabId) => void
  onOpenWorkspacePage?: (pageId: NotionPageId) => void
  onQuickAction?: (action: OverviewQuickActionId) => void
}

function scrollToOverviewWidget(widgetId: OverviewWidgetId): boolean {
  const el = document.querySelector(`[data-widget-id="${widgetId}"]`)
  if (!el) return false
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}

const MED_STATUS_I18N: Partial<Record<MedicationStatus, UiTranslationKey>> = {
  paused: 'overviewMedStatusPaused',
  reduced: 'overviewMedStatusReduced',
  increased: 'overviewMedStatusIncreased',
}

/** Headline severity ranking for the summary-strip risk metric. */
const TONE_SEVERITY: Record<SemanticTone, number> = {
  high: 5,
  moderate: 4,
  info: 3,
  low: 2,
  ok: 1,
  neutral: 0,
}

const TONE_I18N: Record<SemanticTone, UiTranslationKey> = {
  high: 'overviewRiskToneHigh',
  moderate: 'overviewRiskToneModerate',
  ok: 'overviewRiskToneOk',
  low: 'overviewRiskToneLow',
  info: 'overviewRiskToneInfo',
  neutral: 'overviewRiskToneNeutral',
}

function riskToneLabel(t: (key: UiTranslationKey) => string, tone: SemanticTone): string {
  return t(TONE_I18N[tone])
}

function countCiPendingReview(run: ClinicalIntelligenceRunResponse | null): number {
  if (!run) return 0
  let pending = 0
  for (const dimension of run.dimensional.activeDimensions) {
    if (dimension.reviewStatus === 'pending') pending += 1
  }
  for (const mechanism of run.mechanism.activeMechanisms) {
    if (mechanism.reviewStatus === 'pending') pending += 1
  }
  return pending
}

const LAST_CONTACT_OVERDUE_DAYS = 7

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
  metaVersion = 0,
  onClinicalSubheadingChange,
  onTabSelect,
  onOpenWorkspacePage,
  onQuickAction,
}: OverviewDashboardProps) {
  const { language, t } = useTranslation()
  const { drugs: knowledgeBaseDrugs } = useKnowledgeBaseDrugs(DEFAULT_MEDICATIONS_COLLECTION_ID)
  const diagnosenRevision = useDiagnosenRevision(caseId)
  const psychopathFindingRevision = usePsychopathFindingRevision(caseId)
  const clinicalRefreshRevision = useOverviewClinicalRefresh(caseId)
  const verlaufstendenzRevision = useVerlaufstendenzRevision(caseId)
  const { currentPlan } = useMedicationPlan(caseId)
  const appointments = useCaseAppointments(caseId)
  const collaboration = useOverviewCollaboration(caseId)
  const { summary: psychotherapySummary, hasPlan: hasPsychotherapyPlan, plan: psychotherapyPlan } =
    usePsychotherapyPlan(caseId)
  const { isHidden } = useOverviewHiddenGraphs(caseId)
  const ci = useClinicalIntelligence(caseId)
  const clinicalIntelligenceEnabled = isClinicalIntelligenceAvailableForCase(caseId)

  const medications = useMemo(() => currentPlan?.medications ?? [], [currentPlan])

  // ── Medication card ───────────────────────────────────────────────────────
  const medicationData = useMemo<MedicationOverviewData>(() => {
    const insights = computeMedicationInsights(medications, language)
    const activeMeds = activeMedications(medications)
    const resolved = resolveReceptorProfiles(
      activeMeds.map((med) => ({ id: med.id, substance: med.substance })),
      knowledgeBaseDrugs,
    )
    const targetedReceptors = computeTargetedReceptors(resolved, language)
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
          statusLabel: MED_STATUS_I18N[med.status] ? t(MED_STATUS_I18N[med.status]!) : undefined,
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
      topReceptors: targetedReceptors.map((r) => ({ label: r.label, count: r.count })),
      hasReferenceData: insights.hasReferenceData || resolved.length > 0,
      receptorFingerprint: computeCombinedReceptorFingerprint(resolved),
    }
  }, [medications, language, knowledgeBaseDrugs, t])

  const befunde = useMemo(() => loadBefunde(caseId), [caseId])
  const verlaufFeed = useMemo(() => {
    void clinicalRefreshRevision
    return loadVerlaufFeed(caseId)
  }, [caseId, clinicalRefreshRevision])

  // ── Safety card ─────────────────────────────────────────────────────────
  const safetyData = useMemo(() => {
    const imprints = loadClinicalImprintIndex(caseId).imprints
    const riskText = loadNotionDocumentSnapshot('verlauf', caseId)?.sectionContents['risiko'] ?? null
    return buildPatientSafety({
      medications,
      language,
      caseId,
      imprints,
      riskText,
      allergyText: readAllergyText(caseId),
      befunde,
      verlaufEntries: verlaufFeed,
    })
  }, [caseId, medications, language, befunde, verlaufFeed, clinicalRefreshRevision])

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
    void psychopathFindingRevision
    return buildSymptomSnapshotData(caseId, language)
  }, [caseId, language, psychopathFindingRevision, diagnosenRevision])

  const hasLabData = befunde.length > 0

  const laborData = useMemo(() => {
    const activeSubstances = medications
      .filter((m) => m.status === 'active' || m.status === 'reduced' || m.status === 'increased')
      .map((m) => m.substance)
    return buildLaborOverview({ befunde, medications, activeSubstances, verlaufEntries: verlaufFeed })
  }, [caseId, medications, befunde, verlaufFeed])
  const recentLabResults = useMemo(() => buildRecentLabResults(befunde), [befunde])
  const recentVerlauf = useMemo(() => {
    void clinicalRefreshRevision
    return getRecentVerlauf(caseId, language)
  }, [caseId, language, clinicalRefreshRevision])
  const dokumentation = useMemo(() => buildDokumentationSummary(caseId), [caseId])
  const isdmAnalysis = useMemo(() => loadIsdmAnalysis(caseId), [caseId])
  const hasIsdm = isdmAnalysis !== null
  const butterflySummary = useMemo(() => buildButterflySummary(caseId, language), [caseId, language])
  const hasButterfly = useMemo(() => hasButterflyCriteriaSupport(caseId), [caseId])

  const complementaryTherapies = useMemo(() => loadComplementaryTherapies(caseId), [caseId])
  const weitereTherapie = useMemo(() => loadWeitereTherapie(caseId), [caseId])
  const sozialTargets = useMemo(() => loadSozialtherapie(caseId), [caseId])

  const zwangsmassnahme = useMemo(() => buildZwangsmassnahmeSummary(caseId), [caseId])
  const ekgSummary = useMemo(() => buildEkgSummary(caseId, language), [caseId, language])
  const eegSummary = useMemo(() => buildEegSummary(caseId, language), [caseId, language])
  const ctSummary = useMemo(() => buildCtSummary(caseId, language), [caseId, language])
  const hasEkg = ekgSummary.conducted
  const hasEeg = useMemo(() => hasConductedEeg(caseId), [caseId])
  const hasCt = ctSummary.conducted
  const hasZwangsmassnahme = useMemo(() => hasZwangsmassnahmeSignal(zwangsmassnahme), [zwangsmassnahme])

  const registeredTherapies = useMemo(
    () =>
      buildRegisteredTherapiesSummary({
        language,
        psychotherapy: { summary: psychotherapySummary, hasPlan: hasPsychotherapyPlan },
        complementaryTherapies,
        weitereEntries: weitereTherapie,
        sozialTargets,
      }),
    [
      language,
      psychotherapySummary,
      hasPsychotherapyPlan,
      complementaryTherapies,
      weitereTherapie,
      sozialTargets,
    ],
  )

  const compliance = useMemo(
    () =>
      buildComplianceSummary(caseId, {
        medications,
        psychotherapyPlan: psychotherapyPlan,
        complementaryTherapies,
        weitereEntries: weitereTherapie,
        sozialTargets,
        language,
      }),
    [
      caseId,
      medications,
      psychotherapyPlan,
      complementaryTherapies,
      weitereTherapie,
      sozialTargets,
      language,
    ],
  )

  const verlaufstendenz = useMemo(() => {
    void verlaufstendenzRevision
    const imprints = loadClinicalImprintIndex(caseId).imprints
    return buildVerlaufstendenzSummary({
      caseId,
      imprints,
      verlaufEntries: loadVerlaufFeed(caseId),
      harmSignals: safetyData.risk?.signals ?? [],
      complianceOverallPercent: compliance.overallPercent,
      abnormalLabCount: laborData.recentAbnormal.length,
      admissionDateIso: loadNotionPageDate('aufnahme', caseId),
    })
  }, [
    caseId,
    psychopathFindingRevision,
    verlaufstendenzRevision,
    safetyData,
    compliance.overallPercent,
    laborData.recentAbnormal.length,
  ])

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
    const diagnoses = sortDiagnosesForDisplay(loadDiagnosen(caseId))
    const primary =
      diagnoses.find((entry) => resolveClinicalCategory(entry) === 'primary') ?? diagnoses[0]
    const selected = primary ? selectPrimaryCoding(primary) : null
    const primaryDiagnosis = selected
      ? {
          code: selected.coding.code,
          label: resolveDiagnosisLabelSync(selected.coding, selected.version, undefined, language),
          version: selected.version,
          overridden: selected.coding.overridden,
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
            return { tone, label: riskToneLabel(t, tone) }
          })()
        : null

    const statusRibbon: StatusRibbonItem[] = []

    if (risk && (risk.tone === 'high' || risk.tone === 'moderate')) {
      statusRibbon.push({
        id: 'risk',
        label: t('overviewRibbonRisk'),
        tone: risk.tone,
        detail: risk.label,
      })
    }

    if (safetyData.alerts.length > 0) {
      const worstAlertTone = safetyData.alerts.reduce<SemanticTone>(
        (acc, alert) => (TONE_SEVERITY[alert.tone] > TONE_SEVERITY[acc] ? alert.tone : acc),
        'info',
      )
      statusRibbon.push({
        id: 'safety-alerts',
        label: t('overviewRibbonSafetyAlerts'),
        tone: worstAlertTone,
        detail: String(safetyData.alerts.length),
      })
    }

    const abnormalCount = laborData.recentAbnormal.length
    if (abnormalCount > 0) {
      statusRibbon.push({
        id: 'abnormal-labs',
        label: t('overviewRibbonAbnormalLabs'),
        tone: 'moderate',
        detail: String(abnormalCount),
      })
    }

    const butterflyOpen = butterflySummary.reduce((sum, item) => sum + item.openCriteriaCount, 0)
    if (butterflyOpen > 0) {
      statusRibbon.push({
        id: 'butterfly-open',
        label: t('overviewRibbonButterflyOpen'),
        tone: 'info',
        detail: String(butterflyOpen),
      })
    }

    if (
      verlaufstendenz.trend !== 'nicht_beurteilbar' &&
      !verlaufstendenz.isClinicianApproved
    ) {
      statusRibbon.push({
        id: 'verlauf-review',
        label: t('overviewRibbonVerlaufReview'),
        tone: 'info',
      })
    }

    const verlaufNeedsReview =
      verlaufstendenz.trend !== 'nicht_beurteilbar' && !verlaufstendenz.isClinicianApproved

    const admissionIso = loadNotionPageDate('aufnahme', caseId)
    const admissionDays = daysSinceIso(admissionIso)
    const admissionDayLabel =
      admissionDays !== null
        ? t('overviewHeroAdmissionDayValue').replace('{n}', String(admissionDays + 1))
        : null

    const primaryCategory = primary ? resolveClinicalCategory(primary) : null
    const caseTypeLabel = primaryCategory
      ? t(categoryTranslationKey(primaryCategory) as UiTranslationKey)
      : null

    const diagnosisLine = primaryDiagnosis
      ? primaryDiagnosis.label
        ? `${primaryDiagnosis.code} · ${primaryDiagnosis.label}`
        : primaryDiagnosis.code
      : null

    const lastContactIso =
      appointments.lastContact?.endTime ??
      loadVerlaufFeed(caseId)[0]?.date ??
      loadNotionPageDate('verlauf', caseId)
    const daysSinceLastContact = daysSinceIso(lastContactIso)
    const lastContactOverdue =
      daysSinceLastContact !== null && daysSinceLastContact > LAST_CONTACT_OVERDUE_DAYS

    const aiReviewPendingCount = clinicalIntelligenceEnabled
      ? countCiPendingReview(ci.latestRun)
      : 0
    const medicationReviewDue =
      medicationData.monitoringFlags.length > 0 || laborData.missingMonitoring.length > 0

    const visitActionContext = {
      abnormalLabCount: abnormalCount,
      safetyAlertCount: safetyData.alerts.length,
      daysSinceLastContact,
    }

    const clinicalSignalChips = buildClinicalSignalChips({
      hero: {
        identityContext: {
          diagnosisLine,
          caseTypeLabel,
          admissionDayLabel,
        },
        clinicalSignalChips: [],
        visitActionContext,
        primaryDiagnosis,
        risk,
        activeMedCount: medicationData.activeCount,
        alertCount: safetyData.alerts.length,
        lastContact,
        nextAppointment,
        statusRibbon,
      },
      safetyAlertCount: safetyData.alerts.length,
      abnormalLabCount: abnormalCount,
      butterflyOpenCount: butterflyOpen,
      verlaufNeedsReview,
      aiReviewPendingCount,
      medicationReviewDue,
      lastContactOverdue,
      hasButterflyWidget: hasButterflyCriteriaSupport(caseId),
      hasCiWidgets: clinicalIntelligenceEnabled,
    })

    return {
      identityContext: {
        diagnosisLine,
        caseTypeLabel,
        admissionDayLabel,
      },
      clinicalSignalChips,
      visitActionContext,
      primaryDiagnosis,
      risk,
      activeMedCount: medicationData.activeCount,
      alertCount: safetyData.alerts.length,
      lastContact,
      nextAppointment,
      statusRibbon,
    }
  }, [
    caseId,
    diagnosenRevision,
    safetyData,
    medicationData,
    lastContact,
    nextAppointment,
    laborData.recentAbnormal.length,
    laborData.missingMonitoring.length,
    butterflySummary,
    verlaufstendenz,
    appointments.lastContact?.endTime,
    ci.latestRun,
    clinicalIntelligenceEnabled,
    language,
    t,
  ])

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
      laborData,
      medications,
      recentVerlauf,
      appointments: { upcoming: appointments.upcoming, loading: appointments.loading },
      dokumentation,
      psychotherapy: { summary: psychotherapySummary, hasPlan: hasPsychotherapyPlan },
      isdmAnalysis,
      collaboration,
      recentLabResults,
      butterflySummary,
      zwangsmassnahme,
      verlaufstendenz,
      ekgSummary,
      eegSummary,
      ctSummary,
      registeredTherapies,
      compliance,
      psychopathFindingRevision,
      onTabSelect,
      onOpenWorkspacePage,
    }),
    [
      caseId,
      heroData,
      safetyData,
      medicationData,
      symptomData,
      laborData,
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
      zwangsmassnahme,
      verlaufstendenz,
      ekgSummary,
      eegSummary,
      ctSummary,
      registeredTherapies,
      compliance,
      psychopathFindingRevision,
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
      hasEkg,
      hasEeg,
      hasCt,
      hasZwangsmassnahme,
      clinicalIntelligenceEnabled: isClinicalIntelligenceAvailableForCase(caseId),
    }),
    [
      hasSpiegel,
      hasAdditionalSpiegel,
      hasPsychotherapyPlan,
      hasIsdm,
      hasLabData,
      hasButterfly,
      hasEkg,
      hasEeg,
      hasCt,
      hasZwangsmassnahme,
    ],
  )

  const gridWidgets = useMemo(
    () => layout.widgets.filter((w) => w.widgetId !== 'hero-summary'),
    [layout.widgets],
  )

  const handleExportPdf = useCallback(() => {
    exportOverviewDashboardPdf(gridWidgets, widgetContext, visibilityContext, t)
  }, [gridWidgets, widgetContext, visibilityContext, t])

  const handleExportWord = useCallback(() => {
    exportOverviewDashboardWord(gridWidgets, widgetContext, visibilityContext, t, caseId)
  }, [gridWidgets, widgetContext, visibilityContext, t, caseId])

  const handlePrint = useCallback(() => {
    printOverviewDashboard(gridWidgets, widgetContext, visibilityContext, t)
  }, [gridWidgets, widgetContext, visibilityContext, t])

  const handleVisitAction = useCallback(
    (action: OverviewQuickActionId) => {
      const scrollFirst: Partial<Record<OverviewQuickActionId, OverviewWidgetId>> = {
        reviewAbnormalLabs: 'labs-due',
        reviewSafetyAlert: 'safety',
        reviewOpenCriteria: 'butterfly-criteria',
        reviewDiagnosisCriteria: 'butterfly-criteria',
        reviewAiHypotheses: 'ci-status',
        openAiPendingReview: 'ci-status',
        medicationReview: 'medication',
      }
      const widgetId = scrollFirst[action]
      if (widgetId && scrollToOverviewWidget(widgetId)) return
      onQuickAction?.(action)
    },
    [onQuickAction],
  )

  const handleSignalChipClick = useCallback(
    (chip: ClinicalSignalChip) => {
      if (chip.widgetId && scrollToOverviewWidget(chip.widgetId)) return
      if (chip.action) handleVisitAction(chip.action)
    },
    [handleVisitAction],
  )

  return (
    <div
      className={[
        'ov-dashboard',
        'cm-workspace',
        'cm-workspace--flush',
        editMode ? 'ov-dashboard--edit-mode' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <OverviewHero
        data={heroData}
        caseId={caseId}
        metaVersion={metaVersion}
        title={t('overviewPageTitle')}
        onExportPdf={handleExportPdf}
        onExportWord={handleExportWord}
        onPrint={handlePrint}
        onVisitAction={handleVisitAction}
        onSignalChipClick={handleSignalChipClick}
        onClinicalSubheadingChange={onClinicalSubheadingChange}
      />
      <OverviewWidgetGrid
        widgets={gridWidgets}
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
