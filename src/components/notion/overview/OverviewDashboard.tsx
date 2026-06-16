import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import type { TopNavTabId } from '../CaseTopNav'
import type { NotionPageId } from '../notionPages'
import { DiagnosenWidget } from '../DiagnosenWidget'
import { SpiegelwerteSection, extractSpiegelwerte } from '../SpiegelwerteSection'
import { OverviewCard, OverviewCardShell, OverviewEmpty } from './OverviewCard'
import { OverviewHero } from './OverviewHero'
import { SafetyAlertsCard } from './SafetyAlertsCard'
import { StatusCard } from './StatusCard'
import { MedicationOverviewCard } from './MedicationOverviewCard'
import { PriorTherapiesOverviewCard } from './PriorTherapiesOverviewCard'
import { SymptomSnapshotCard } from './SymptomSnapshotCard'
import { RecentVerlaufCard } from './RecentVerlaufCard'
import { LabsDueCard } from './LabsDueCard'
import { KonsileTasksCard } from './KonsileTasksCard'
import type {
  HeroSummaryData,
  KonsilCardItem,
  MedicationOverviewData,
  MedRegimenItem,
  OpenTaskItem,
  PatientStatusData,
  StatusEntry,
  SymptomSnapshotData,
} from './types'
import type { SemanticTone } from './OverviewCard'
import { useMedicationPlan } from '../../../hooks/useMedicationPlan'
import { useCaseAppointments } from '../../../hooks/useCaseAppointments'
import { usePsychotherapyPlan } from '../../../hooks/usePsychotherapyPlan'
import { useSozialtherapie } from '../../../hooks/useSozialtherapie'
import { isMedicationVisible } from '../../../utils/medication/planOps'
import { formatDoseScheduleGerman } from '../../../utils/medication/doseLine'
import { computeMedicationInsights } from '../../../utils/medication/medicationInsights'
import { loadBefunde } from '../../../utils/laborArchive'
import { loadVerlaufFeed } from '../../../utils/verlaufFeed'
import { loadNotionDocumentSnapshot } from '../../../utils/notionDocumentActions'
import { loadNotionPageDate } from '../../../utils/notionPageDate'
import { loadClinicalImprintIndex } from '../../../utils/clinicalImprint'
import { buildPatientSafety } from '../../../utils/overview/patientSafety'
import { buildLabsDue } from '../../../utils/overview/labsDue'
import { getRecentVerlauf } from '../../../utils/overview/recentVerlauf'
import { getSymptomTrajectory } from '../../../utils/overview/symptomTrajectory'
import { formatDateDe, relativeDayDe } from '../../../utils/overview/dateLabels'
import { loadDiagnosen } from '../../../utils/diagnosenArchive'
import { listConsultationsForCase } from '../../../services/consultationApi'
import { listDiscussions } from '../../../services/discussCaseApi'
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

const KONSIL_OPEN_STATUS: Record<string, { label: string; tone: SemanticTone } | undefined> = {
  sent: { label: 'gesendet', tone: 'info' },
  viewed: { label: 'gesehen', tone: 'info' },
  in_progress: { label: 'in Bearbeitung', tone: 'info' },
  more_info_requested: { label: 'Rückfrage', tone: 'moderate' },
  submitted: { label: 'beantwortet', tone: 'ok' },
}

const DISCUSS_OPEN_STATUS: Record<string, { label: string; tone: SemanticTone } | undefined> = {
  active: { label: 'aktiv', tone: 'info' },
  draft: { label: 'Entwurf', tone: 'neutral' },
}

/** Headline severity ranking + German label for the hero risk metric. */
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

function readSetting(caseId: string): string | null {
  const aufnahme = loadNotionDocumentSnapshot('aufnahme', caseId)
  if (!aufnahme) return null
  const joined = Object.values(aufnahme.sectionContents).join(' ').toLowerCase()
  if (/station[äa]r/.test(joined)) return 'stationär'
  if (/ambulant/.test(joined)) return 'ambulant'
  return null
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
 * The at-a-glance Übersicht dashboard: a responsive bento grid of clinical
 * cards composed from real patient/demo data. Owns data wiring; the cards are
 * pure presentational components.
 */
export function OverviewDashboard({
  caseId,
  therapyScopeId,
  onTabSelect,
  onOpenWorkspacePage,
}: OverviewDashboardProps) {
  const { language } = useTranslation()
  const { currentPlan } = useMedicationPlan(caseId)
  const appointments = useCaseAppointments(caseId)
  const { summary: ptSummary, hasPlan: hasPtPlan } = usePsychotherapyPlan(therapyScopeId)
  const { targets: sozialTargets } = useSozialtherapie(therapyScopeId)

  const [konsilItems, setKonsilItems] = useState<KonsilCardItem[]>([])
  const [discussionItems, setDiscussionItems] = useState<KonsilCardItem[]>([])
  const [remoteLoading, setRemoteLoading] = useState(true)

  useEffect(() => {
    let active = true
    setRemoteLoading(true)
    Promise.allSettled([listConsultationsForCase(caseId), listDiscussions(caseId)])
      .then(([consultRes, discussRes]) => {
        if (!active) return
        if (consultRes.status === 'fulfilled') {
          setKonsilItems(
            consultRes.value
              .map((req): KonsilCardItem | null => {
                const meta = KONSIL_OPEN_STATUS[req.status]
                if (!meta) return null
                return { id: req.id, title: req.title || req.specialty || 'Konsil', statusLabel: meta.label, tone: meta.tone }
              })
              .filter((x): x is KonsilCardItem => x !== null),
          )
        } else {
          setKonsilItems([])
        }
        if (discussRes.status === 'fulfilled') {
          setDiscussionItems(
            discussRes.value
              .map((d): KonsilCardItem | null => {
                const meta = DISCUSS_OPEN_STATUS[d.status]
                if (!meta) return null
                return { id: d.id, title: d.title || 'Fallbesprechung', statusLabel: meta.label, tone: meta.tone }
              })
              .filter((x): x is KonsilCardItem => x !== null),
          )
        } else {
          setDiscussionItems([])
        }
      })
      .finally(() => {
        if (active) setRemoteLoading(false)
      })
    return () => {
      active = false
    }
  }, [caseId])

  const medications = useMemo(() => currentPlan?.medications ?? [], [currentPlan])

  // ── Medication card ───────────────────────────────────────────────────────
  const medicationData = useMemo<MedicationOverviewData>(() => {
    const insights = computeMedicationInsights(medications, language)
    const meds: MedRegimenItem[] = medications
      .filter((med) => isMedicationVisible(med) && med.status !== 'discontinued')
      .map((med) => {
        const dose = [med.strength.trim(), formatDoseScheduleGerman(med.doseSchedule)]
          .filter(Boolean)
          .join(' · ')
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

  // ── Status card ───────────────────────────────────────────────────────────
  const statusData = useMemo<PatientStatusData>(() => {
    const entries: StatusEntry[] = []
    const setting = readSetting(caseId)
    if (setting) entries.push({ id: 'setting', label: 'Setting', value: setting, emphasis: true })

    const admission = formatDateDe(loadNotionPageDate('aufnahme', caseId))
    if (admission) entries.push({ id: 'admission', label: 'Aufnahme', value: admission })

    const lastContactIso =
      appointments.lastContact?.endTime ??
      loadVerlaufFeed(caseId)[0]?.date ??
      loadNotionPageDate('verlauf', caseId)
    const lastContact = formatDateDe(lastContactIso)
    if (lastContact) {
      const rel = relativeDayDe(lastContactIso)
      entries.push({ id: 'last', label: 'Letzter Kontakt', value: rel ? `${lastContact} (${rel})` : lastContact })
    }

    if (hasPtPlan && ptSummary.currentStage) {
      entries.push({ id: 'phase', label: 'Therapiephase', value: ptSummary.currentStage })
    }

    const next = appointments.next
    return {
      entries,
      nextAppointment: next
        ? {
            title: next.title,
            dateLabel: formatDateDe(next.startTime) ?? next.startTime,
            relativeLabel: relativeDayDe(next.startTime) ?? undefined,
          }
        : null,
      appointmentsLoading: appointments.loading,
    }
  }, [caseId, appointments, hasPtPlan, ptSummary])

  // ── Symptom snapshot card ─────────────────────────────────────────────────
  const symptomData = useMemo<SymptomSnapshotData>(() => {
    const { text, savedAt } = readPsychopathSnapshot(caseId)
    const imprints = loadClinicalImprintIndex(caseId).imprints
    const imprint = latestPsychopathImprint(imprints)
    const structured: SymptomSnapshotData['structured'] = []
    if (imprint) {
      if (imprint.affect) structured.push({ label: 'Affekt', value: imprint.affect })
      if (imprint.drive) structured.push({ label: 'Antrieb', value: imprint.drive })
      if (imprint.thoughtContent) structured.push({ label: 'Denkinhalt', value: imprint.thoughtContent })
      if (imprint.insight) structured.push({ label: 'Krankheitseinsicht', value: imprint.insight })
    }
    const courseLabel = imprint?.courseDirection ? COURSE_LABEL[imprint.courseDirection] : null
    const asOf = savedAt ?? imprint?.sourceDate ?? null
    return {
      snapshotText: text,
      structured,
      courseLabel,
      asOfLabel: asOf ? formatDateDe(asOf) : null,
      trajectory: getSymptomTrajectory(imprints),
    }
  }, [caseId])

  // ── Recent Verlauf card ───────────────────────────────────────────────────
  const recentVerlauf = useMemo(() => getRecentVerlauf(caseId, language, 4), [caseId, language])

  // ── Labs / monitoring card ────────────────────────────────────────────────
  const labsData = useMemo(() => {
    const activeSubstances = medications
      .filter((m) => m.status === 'active' || m.status === 'reduced' || m.status === 'increased')
      .map((m) => m.substance)
    return buildLabsDue({ befunde: loadBefunde(caseId), activeSubstances })
  }, [caseId, medications])

  // ── Spiegel availability (preserve "≥1 value ⇒ show graph" rule) ──────────
  const hasSpiegel = useMemo(
    () => extractSpiegelwerte(loadBefunde(caseId)).length > 0,
    [caseId],
  )

  // ── Open tasks (social-work) ──────────────────────────────────────────────
  const tasks = useMemo<OpenTaskItem[]>(() => {
    return sozialTargets
      .filter((t) => t.status !== 'resolved' && t.status !== 'not-relevant')
      .flatMap((target) =>
        (target.tasks ?? [])
          .filter((task) => !task.done)
          .map((task) => ({ id: task.id, text: task.text, area: target.area || null })),
      )
      .slice(0, 5)
  }, [sozialTargets])

  // ── Hero executive-summary band ───────────────────────────────────────────
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
    const primaryDiagnosis = coding ? { code: coding.code, label: coding.label } : null

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
      nextAppointment: statusData.nextAppointment
        ? {
            dateLabel: statusData.nextAppointment.dateLabel,
            relativeLabel: statusData.nextAppointment.relativeLabel ?? null,
            title: statusData.nextAppointment.title,
          }
        : null,
    }
  }, [caseId, safetyData, medicationData, statusData])

  return (
    <div className="ov-dashboard">
      <OverviewHero data={heroData} />

      <div className="ov-grid">
        {/* Heavyweights — Safety + Medication anchor the page. */}
        <SafetyAlertsCard data={safetyData} />

        <MedicationOverviewCard
          data={medicationData}
          onOpenMedikation={() => onTabSelect('medikation')}
        />

        <PriorTherapiesOverviewCard
          caseId={caseId}
          medications={medications}
          onOpenMedikation={() => onTabSelect('medikation')}
        />

        <OverviewCardShell className="ov-col-5">
          <DiagnosenWidget caseId={caseId} variant="panel" />
        </OverviewCardShell>

        {hasSpiegel ? (
          <OverviewCardShell className="ov-col-4">
            <SpiegelwerteSection caseId={caseId} />
          </OverviewCardShell>
        ) : (
          <OverviewCard title="Spiegel (Talspiegel)" className="ov-col-4">
            <OverviewEmpty>Keine Spiegelwerte vorhanden.</OverviewEmpty>
          </OverviewCard>
        )}

        <StatusCard data={statusData} />

        <SymptomSnapshotCard
          data={symptomData}
          onOpen={onOpenWorkspacePage ? () => onOpenWorkspacePage('psychopath') : undefined}
        />

        <LabsDueCard data={labsData} onOpenLabor={() => onTabSelect('labor')} />

        <RecentVerlaufCard items={recentVerlauf} onOpenVerlauf={() => onTabSelect('verlauf')} />

        <KonsileTasksCard
          data={{ konsile: konsilItems, discussions: discussionItems, tasks, loading: remoteLoading }}
          onOpenKonsil={() => onTabSelect('konsil')}
        />
      </div>
    </div>
  )
}
