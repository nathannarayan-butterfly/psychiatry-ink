/** Labor–Medikament-Korrelation — pairwise med–lab rules in MVP. */

import type { UiLanguage } from './settings'

export type LabAbnormalityType = 'high' | 'low' | 'critical' | 'normal' | 'normal_but_changed' | 'unknown'

export type LabCorrelationStrength = 'none' | 'possible' | 'plausible' | 'monitoring_required' | 'concerning'

export type LabTemporalPlausibility = 'unlikely' | 'uncertain' | 'plausible' | 'highly_plausible'

export type LabCorrelationFindingSource = 'knowledge_base' | 'ai_suggestion' | 'clinician_accepted'

export type LabCorrelationFindingStatus =
  | 'verified_kb'
  | 'pending_clinician_review'
  | 'accepted'
  | 'rejected'
  | 'not_relevant'

export type LabCorrelationAiProvider = 'deepseek' | 'openai'

export interface MedicationLabCorrelationKnowledge {
  correlationKey: string
  substanceId: string
  substanceName: string
  labParameter: string
  labParameterLabelDe: string
  correlationStrength: LabCorrelationStrength
  zusammenhang: string
  mechanism?: string
  recommendation: string
  monitoring?: string
  alternatives?: string
  source: 'knowledge_base'
  kbRuleId?: string
}

export interface LabCorrelationAIResult {
  correlationKey: string
  substanceName: string
  labParameter: string
  labParameterLabelDe: string
  correlationStrength: LabCorrelationStrength
  zusammenhang: string
  mechanism?: string
  recommendation: string
  monitoring?: string
  alternatives?: string
  temporalPlausibility?: LabTemporalPlausibility
  rationale?: string
  uncertainties?: string[]
  provenance?: string
}

export interface PatientMedicationLabCorrelationFinding {
  id: string
  caseId: string
  correlationKey: string
  labParameter: string
  labParameterLabel: string
  labValue: string
  labUnit: string
  refRange?: string
  abnormality: LabAbnormalityType
  labDate: string
  trend?: 'rising' | 'falling' | 'stable'
  substanceId: string
  substanceName: string
  medicationId?: string
  medStartDate?: string
  lastDoseChangeDate?: string
  temporalPlausibility?: LabTemporalPlausibility
  zusammenhang: string
  mechanism?: string
  recommendation: string
  monitoring?: string
  alternatives?: string
  correlationStrength: LabCorrelationStrength
  source: LabCorrelationFindingSource
  status: LabCorrelationFindingStatus
  kbResult?: MedicationLabCorrelationKnowledge
  aiResult?: LabCorrelationAIResult
  openaiResult?: LabCorrelationAIResult
  hasConflict?: boolean
  clinicianNote?: string
  isRelevant?: boolean
  provenance?: string
  aiRunId?: string
  openaiRunId?: string
  deepseekRejected?: boolean
  createdAt: string
  updatedAt: string
}

export interface LabCorrelationAIRun {
  id: string
  caseId: string
  findingId: string
  correlationKey: string
  provider: LabCorrelationAiProvider
  status: 'pending_clinician_review' | 'accepted' | 'rejected'
  inputSnapshot: Record<string, unknown>
  outputJson: LabCorrelationAIResult
  dbResult?: MedicationLabCorrelationKnowledge | null
  hasConflict?: boolean
  createdAt: string
  reviewedAt?: string
  reviewedBy?: string
  clinicianNote?: string
  editedResult?: LabCorrelationAIResult
}

/** Stub only — no global KB admin workflow in MVP. */
export interface LabKbSubmissionCandidate {
  flagged: boolean
  correlationKey: string
  reason?: string
}

export interface LabSnapshotParameterInput {
  parameterName: string
  normalizedParameter: string
  value: string
  numericValue?: number
  unit: string
  refMin?: number
  refMax?: number
  refText?: string
  abnormality: LabAbnormalityType
}

export interface LabBefundSnapshotInput {
  befundId: string
  labDate: string
  label?: string
  source: 'labor_befund' | 'lab_graph'
  parameters: LabSnapshotParameterInput[]
}

export interface LabObservationInput {
  parameterName: string
  normalizedParameter: string
  value: string
  numericValue?: number
  unit: string
  refMin?: number
  refMax?: number
  refText?: string
  abnormality: LabAbnormalityType
  labDate: string
  befundId?: string
  trend?: 'rising' | 'falling' | 'stable'
}

export interface LabCorrelationMedicationInput {
  id: string
  substance: string
  strength?: string
  doseLineGerman?: string
  formulation?: string
  route?: string
  status: string
  startDate?: string
  lastChangeAt?: string
  lastChangeType?: string
}

export interface LabMedicationCorrelationRunRequest {
  caseId: string
  medications: LabCorrelationMedicationInput[]
  /** Last two lab result sets (most recent by date), full parameter lists. */
  lastTwoLabSnapshots: LabBefundSnapshotInput[]
  /** Abnormal / trend-changed parameters derived from snapshots. */
  labObservations: LabObservationInput[]
  clinicalNotes?: string
  /** Only assess this pair (optional) */
  correlationKey?: string
  /** UI language for AI output (from Settings). */
  language?: UiLanguage
}

export interface LabMedicationCorrelationRunResponse {
  findings: PatientMedicationLabCorrelationFinding[]
  aiRuns: LabCorrelationAIRun[]
  /** Informational note (e.g. no abnormal labs but AI still ran). */
  infoNote?: string
  /** Set when AI was requested but produced no reviewable runs. */
  aiWarning?: string
}

export interface LabMedicationCorrelationStore {
  version: 1
  caseId: string
  updatedAt: string
  findings: PatientMedicationLabCorrelationFinding[]
  aiRuns: LabCorrelationAIRun[]
  kbSubmissionCandidates?: LabKbSubmissionCandidate[]
}

export const LAB_MED_CORRELATION_STORE_VERSION = 1 as const
