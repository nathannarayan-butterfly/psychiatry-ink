/** Medication combination check — pairwise only in MVP. */

import type { UiLanguage } from './settings'

export type CombinationInteractionType =
  | 'pharmacodynamic'
  | 'pharmacokinetic'
  | 'additive_side_effect'
  | 'contraindication'
  | 'monitoring_required'
  | 'uncertain'

export type CombinationSeverity = 'none' | 'low' | 'moderate' | 'high' | 'critical'

export type CombinationFindingSource = 'knowledge_base' | 'ai_suggestion' | 'clinician_accepted'

export type CombinationFindingStatus =
  | 'verified_kb'
  | 'pending_clinician_review'
  | 'accepted'
  | 'rejected'
  | 'not_relevant'

export interface MedicationCombinationKnowledge {
  combinationKey: string
  substanceAId: string
  substanceBId: string
  substanceAName: string
  substanceBName: string
  interactionType: CombinationInteractionType
  severity: CombinationSeverity
  mainRisk: string
  mechanism?: string
  monitoring?: string
  clinicalManagement?: string
  source: 'knowledge_base'
  kbInteractionId?: string
}

export interface CombinationCheckAIResult {
  combinationKey: string
  substanceAName: string
  substanceBName: string
  interactionType: CombinationInteractionType
  severity: CombinationSeverity
  mainRisk: string
  mechanism?: string
  monitoring?: string
  clinicalManagement?: string
  rationale?: string
  uncertainties?: string[]
}

export interface PatientCombinationCheckFinding {
  id: string
  caseId: string
  combinationKey: string
  substanceAName: string
  substanceBName: string
  interactionType: CombinationInteractionType
  severity: CombinationSeverity
  mainRisk: string
  mechanism?: string
  monitoring?: string
  clinicalManagement?: string
  source: CombinationFindingSource
  status: CombinationFindingStatus
  kbResult?: MedicationCombinationKnowledge
  aiResult?: CombinationCheckAIResult
  hasConflict?: boolean
  clinicianNote?: string
  isRelevant?: boolean
  createdAt: string
  updatedAt: string
  aiRunId?: string
  /** AI provider label for Quelle display (e.g. DeepSeek, OpenAI). */
  provenance?: string
}

export interface CombinationCheckAIRun {
  id: string
  caseId: string
  combinationKey: string
  status: 'pending_clinician_review' | 'accepted' | 'rejected'
  thorough: boolean
  result: CombinationCheckAIResult
  dbResult?: MedicationCombinationKnowledge | null
  hasConflict?: boolean
  createdAt: string
  reviewedAt?: string
  reviewedBy?: string
  clinicianNote?: string
  editedResult?: CombinationCheckAIResult
  /** LLM provider used for this run. */
  aiProvider?: 'deepseek' | 'openai' | 'other'
  aiModelLabel?: string
}

/** Stub only — no global KB admin workflow in MVP. */
export interface KnowledgeBaseSubmissionCandidate {
  flagged: boolean
  combinationKey: string
  reason?: string
}

export interface PatientRiskFactors {
  renal?: string
  hepatic?: string
  qtc?: string
  epilepsy?: string
  sedation?: string
  age?: string
  other?: string
}

export interface CombinationCheckMedicationInput {
  id: string
  substance: string
  strength?: string
  doseLineGerman?: string
  formulation?: string
  route?: string
  status: string
}

export interface CombinationCheckRunRequest {
  caseId: string
  medications: CombinationCheckMedicationInput[]
  patientRiskFactors?: PatientRiskFactors
  labNotes?: string
  /** Re-run AI with deeper prompt after reject */
  thorough?: boolean
  /** Only assess this pair (optional, for "Gründlich prüfen") */
  combinationKey?: string
  /** UI language for AI/KB text selection (from Settings). */
  language?: UiLanguage
}

export interface CombinationCheckRunResponse {
  findings: PatientCombinationCheckFinding[]
  aiRuns: CombinationCheckAIRun[]
  /** Set when AI was requested but produced no reviewable runs. */
  aiWarning?: string
}

export interface CombinationCheckStore {
  version: 1
  caseId: string
  updatedAt: string
  findings: PatientCombinationCheckFinding[]
  aiRuns: CombinationCheckAIRun[]
  kbSubmissionCandidates?: KnowledgeBaseSubmissionCandidate[]
}

export const COMBINATION_CHECK_STORE_VERSION = 1 as const
