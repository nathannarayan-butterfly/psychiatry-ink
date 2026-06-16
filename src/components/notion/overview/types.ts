import type { SemanticTone } from './OverviewCard'

// ---------------------------------------------------------------------------
// Shared presentational data contracts for the Übersicht dashboard cards.
// All values are DERIVED from real patient/demo data by the data layer
// (src/utils/overview/* + hooks) and passed into pure presentational cards.
// ---------------------------------------------------------------------------

export type SafetyCategory = 'risk' | 'allergy' | 'interaction' | 'monitoring'

export interface SafetyAlert {
  id: string
  category: SafetyCategory
  tone: SemanticTone
  /** Short scannable headline, e.g. "Clozapin → Agranulozytose-Monitoring". */
  title: string
  /** Optional supporting clause. */
  detail?: string
}

export interface SafetyData {
  /** Headline risk chip (suicidality / self- / other-harm), null when not modeled. */
  risk: { tone: SemanticTone; label: string; detail?: string } | null
  alerts: SafetyAlert[]
  /** True when no risk + no alerts could be derived at all (hide / "all clear"). */
  hasAnySignal: boolean
}

export interface StatusEntry {
  id: string
  label: string
  value: string
  emphasis?: boolean
}

export interface NextAppointment {
  title: string
  dateLabel: string
  relativeLabel?: string
}

export interface PatientStatusData {
  entries: StatusEntry[]
  nextAppointment: NextAppointment | null
  appointmentsLoading: boolean
}

export interface MedRegimenItem {
  id: string
  substance: string
  dose: string
  status: 'active' | 'paused' | 'reduced' | 'increased'
  statusLabel?: string
}

export interface MedicationOverviewData {
  meds: MedRegimenItem[]
  activeCount: number
  classes: { label: string; count: number }[]
  lastChange: { dateLabel: string; substances: string[] } | null
  monitoringFlags: string[]
  topReceptors: { label: string; count: number }[]
  hasReferenceData: boolean
}

export interface SymptomStructuredCue {
  label: string
  value: string
}

/** One recorded course assessment, ordinal-encoded for the trajectory sparkline. */
export interface SymptomTrajectoryPoint {
  dateLabel: string
  /** Ordinal course tendency: −1 worsened … 0 stable … +2 remittiert. */
  value: number
  /** Human label for the tooltip ("verbessert", "stabil" …). */
  label: string
}

export interface SymptomSnapshotData {
  snapshotText: string | null
  structured: SymptomStructuredCue[]
  courseLabel: string | null
  asOfLabel: string | null
  /** Real course-direction history (≥2 points) → mini trend chart. */
  trajectory: SymptomTrajectoryPoint[]
}

export interface RecentVerlaufItem {
  id: string
  dateLabel: string
  text: string
  sourceLabel: string | null
  isManual: boolean
}

export interface LabDueItem {
  id: string
  name: string
  valueLabel: string | null
  refLabel: string | null
  dateLabel: string | null
  status: 'abnormal' | 'ok'
  rationale: string | null
  /** Recent numeric history (oldest→newest, ≥2) for an inline sparkline. */
  trend: number[]
}

export interface LabsDueData {
  abnormal: LabDueItem[]
  /** Relevant analytes with a recent in-range value (reassurance / context). */
  watched: LabDueItem[]
  /** Monitoring parameters required by the regimen with NO matching lab on file. */
  missingMonitoring: { parameter: string; drugs: string[] }[]
  hasLabData: boolean
}

export interface KonsilCardItem {
  id: string
  title: string
  statusLabel: string
  tone: SemanticTone
}

export interface OpenTaskItem {
  id: string
  text: string
  area: string | null
}

export interface KonsileTasksData {
  konsile: KonsilCardItem[]
  discussions: KonsilCardItem[]
  tasks: OpenTaskItem[]
  loading: boolean
}

/**
 * Executive-summary band data — the four headline facts a psychiatrist needs at
 * a glance. Every field is derived from real wired data; missing sources degrade
 * to a calm placeholder rather than a fabricated value.
 */
export interface HeroSummaryData {
  primaryDiagnosis: { code: string; label: string } | null
  /** Headline risk: tone drives the semantic color, label is the German severity word. */
  risk: { tone: SemanticTone; label: string } | null
  activeMedCount: number
  alertCount: number
  nextAppointment: { dateLabel: string; relativeLabel: string | null; title: string } | null
}
