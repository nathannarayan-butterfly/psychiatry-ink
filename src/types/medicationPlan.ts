/**
 * Medication intelligence — Layer 2b profile inside Clinical Analysis.
 * State is mirrored into clinical imprints via `medication/imprint.ts` for longitudinal analysis.
 * See `clinicalAnalysis.ts` for the full three-layer model.
 */
export const MEDICATION_PLAN_STATE_VERSION = 1

export type MedicationFormulation =
  | 'tablet'
  | 'solution'
  | 'drops'
  | 'depot'
  | 'injection'
  | 'capsule'
  | 'patch'
  | 'other'

export interface DoseSchedule {
  morning: string
  noon: string
  evening: string
  night: string
  unit: string
  prn?: boolean
  depotInterval?: string
}

export type MedicationStatus =
  | 'active'
  | 'paused'
  | 'reduced'
  | 'increased'
  | 'discontinued'

export type MedicationChangeType =
  | 'start'
  | 'increase'
  | 'decrease'
  | 'timing'
  | 'formulation'
  | 'pause'
  | 'discontinue'
  | 'restart'
  | 'prn'
  | 'other'

export interface MedicationChangeEvent {
  id: string
  changedAt: string
  changeType: MedicationChangeType
  note?: string
  /** Snapshot of key fields at time of change */
  snapshot: {
    substance: string
    formulation: MedicationFormulation
    strength: string
    doseSchedule: DoseSchedule
    doseLineGerman: string
    status: MedicationStatus
    reasonForChange: string
  }
}

export interface MedicationIntelligencePlaceholder {
  summary: string
  disclaimer: string
  isDemo: true
}

export interface MedicationEntry {
  id: string
  substance: string
  formulation: MedicationFormulation
  strength: string
  doseSchedule: DoseSchedule
  /** e.g. "Haloperidol Lösung 7,5-0-0-10 ml" */
  doseLineGerman: string
  prn: boolean
  depotInterval?: string
  startDate: string
  indication: string
  status: MedicationStatus
  reasonForChange: string
  sideEffects: string[]
  adherenceNote: string
  freeTextLine: string
  introducedAt: string
  lastChangeAt: string
  lastChangeType: MedicationChangeType
  history: MedicationChangeEvent[]
  intelligence?: MedicationIntelligencePlaceholder
}

export interface MedicationPlan {
  id: string
  caseId: string
  createdAt: string
  isCurrent: boolean
  medications: MedicationEntry[]
  readableClinicalSentence?: string
  structuredMetadata?: Record<string, unknown>
}

export type SideEffectAttribution = 'single' | 'combination' | 'unknown'

export interface SideEffectReport {
  id: string
  symptom: string
  onsetDate: string
  severity: string
  suspectedMedicationId?: string
  temporalRelation: string
  actionTaken: string
  outcome: string
  note: string
  attribution?: SideEffectAttribution
}

export interface MedicationPlanState {
  version: number
  updatedAt: string
  currentPlanId: string | null
  plans: MedicationPlan[]
  sideEffectReports: SideEffectReport[]
  labCorrelationNotes?: string
  combinationCheckPlaceholder?: string
}

export const MEDICATION_FORMULATIONS: MedicationFormulation[] = [
  'tablet',
  'solution',
  'drops',
  'depot',
  'injection',
  'capsule',
  'patch',
  'other',
]

export const MEDICATION_STATUSES: MedicationStatus[] = [
  'active',
  'paused',
  'reduced',
  'increased',
  'discontinued',
]

export const MEDICATION_CHANGE_TYPES: MedicationChangeType[] = [
  'start',
  'increase',
  'decrease',
  'timing',
  'formulation',
  'pause',
  'discontinue',
  'restart',
  'prn',
  'other',
]

export function createEmptyDoseSchedule(): DoseSchedule {
  return { morning: '', noon: '', evening: '', night: '', unit: 'mg' }
}

export function createEmptyMedicationPlanState(caseId: string): MedicationPlanState {
  const now = new Date().toISOString()
  const planId = crypto.randomUUID()
  return {
    version: MEDICATION_PLAN_STATE_VERSION,
    updatedAt: now,
    currentPlanId: planId,
    plans: [
      {
        id: planId,
        caseId,
        createdAt: now,
        isCurrent: true,
        medications: [],
      },
    ],
    sideEffectReports: [],
  }
}
