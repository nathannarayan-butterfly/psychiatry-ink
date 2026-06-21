/**
 * Patientenaufklärung Medikation — KB templates + patient-specific documents.
 * PHI is merged client-side only; never sent to AI.
 */

import type { AiMode } from './aiUsage'

export type MedicationEducationLanguage = 'de' | 'en'

export type MedicationEducationDetailStyle = 'einfach' | 'standard' | 'ausfuehrlich'

export type MedicationEducationScope = 'single' | 'selected' | 'full_combination'

export type MedicationEducationDocumentVariant =
  | 'generic_kb_single'
  | 'patient_single'
  | 'patient_combination'
  | 'short_patient_info'
  | 'detailed_patient_education'

export type MedicationEducationKbApprovalStatus =
  | 'draft'
  | 'ai_draft'
  | 'clinician_reviewed'
  | 'approved'
  | 'deprecated'

export type MedicationEducationDocumentStatus =
  | 'draft_ai_generated'
  | 'needs_clinician_review'
  | 'accepted'
  | 'archived'

export type MedicationEducationSectionStatus =
  | 'empty'
  | 'auto_fetched'
  | 'ai_generated'
  | 'clinician_edited'
  | 'accepted'
  | 'missing_source'
  | 'excluded'

export type MedicationEducationSectionSource = 'manual' | 'fetch' | 'ai' | 'kb'

export interface MedicationEducationTemplate {
  id: string
  medicationId: string
  substanceName: string
  brandNames: string[]
  language: MedicationEducationLanguage
  region: 'DE' | 'AT' | 'CH' | 'international'
  version: number
  approvalStatus: MedicationEducationKbApprovalStatus
  reviewedBy?: string
  reviewedAt?: string
  sourceRefs: string[]
  shortPatientSummary: string
  mechanismSimple: string
  whyPrescribed: string
  whenEffect: string
  howToTake: string
  commonSideEffects: string
  seriousWarnings: string
  monitoringRequirements: string
  interactions: string
  dailyLife: string
  pregnancyLactation: string
  ifSideEffects: string
  missedDose: string
  drivingWork: string
  fullLeafletText: string
  createdAt: string
  updatedAt: string
}

export interface MedicationEducationSectionDefinition {
  id: string
  labelDe: string
  labelEn: string
  aiCapable?: boolean
  fetchModule?: string
  localIdentity?: boolean
  /** Omit from combination docs */
  singleOnly?: boolean
  /** Omit from single-med docs */
  combinationOnly?: boolean
  /** Include only when pregnancy/lactation relevant */
  conditionalPregnancy?: boolean
}

export interface MedicationEducationSectionVersion {
  content: string
  createdAt: string
  source: MedicationEducationSectionSource
  aiProvider?: string
  aiModel?: string
  aiMode?: AiMode
  tokenUsage?: { inputTokens: number; outputTokens: number }
}

export interface MedicationEducationSectionState {
  id: string
  status: MedicationEducationSectionStatus
  included: boolean
  currentContent: string
  previousContent?: string
  versions: MedicationEducationSectionVersion[]
  sourcePreview?: string
  missingDataWarning?: string
  /** Set when a clinician edits section content after AI generation or fetch. */
  clinicianEditedAt?: string
}

export interface MedicationEducationAiUsageRecord {
  provider: string
  model: string
  mode: AiMode
  inputTokens: number
  outputTokens: number
  creditsCharged: number
  sectionId?: string
  generatedAt: string
}

export interface MedicationEducationWarning {
  code: string
  messageDe: string
  messageEn: string
  severity: 'info' | 'warning' | 'critical'
}

/** AI-suggested source citation — workspace-only, excluded from patient exports. */
export interface MedicationEducationReference {
  title: string
  url?: string
  source?: string
  /** Section that cited this reference during generation */
  sectionId?: string
}

export interface MedicationEducationSourceSnapshot {
  medicationPlanVersionId?: string
  medicationPlanUpdatedAt?: string
  medicationEntryIds: string[]
  kbTemplateIds: string[]
  combinationCheckId?: string
  combinationRiskSummary?: string
  kbCoveragePercent?: number
  missingKbMedicationIds: string[]
  unapprovedKbTemplateIds: string[]
}

export interface MedicationEducationReviewRecord {
  reviewedBy?: string
  reviewedAt?: string
  discussedWithPatient?: boolean
  patientReceivedCopy?: boolean
  questionsAnswered?: boolean
  patientSignatureStatus?: 'none' | 'pending' | 'signed' | 'declined'
  clinicianNote?: string
}

export interface PatientMedicationEducationDocument {
  id: string
  patientId?: string
  caseId?: string
  medicationPlanVersionId?: string
  scope: MedicationEducationScope
  documentVariant: MedicationEducationDocumentVariant
  medicationIds: string[]
  /** Single medication id when scope is single */
  primaryMedicationId?: string
  language: MedicationEducationLanguage
  detailStyle: MedicationEducationDetailStyle
  aiMode: AiMode
  status: MedicationEducationDocumentStatus
  title: string
  sections: Record<string, MedicationEducationSectionState>
  generatedText?: string
  clinicianEditedText?: string
  finalText?: string
  sourceKbTemplateIds: string[]
  sourceCombinationCheckId?: string
  sourceSnapshot: MedicationEducationSourceSnapshot
  warnings: MedicationEducationWarning[]
  /** Clinician-facing citations from AI generation — not included in exports or patient file */
  references: MedicationEducationReference[]
  review: MedicationEducationReviewRecord
  includeMedTable: boolean
  includeMonitoringPlan: boolean
  includeSignatureArea: boolean
  requiresKbValidation: boolean
  isOutdated?: boolean
  createdAt: string
  updatedAt: string
  acceptedAt?: string
  authorId?: string
  aiUsageLog: MedicationEducationAiUsageRecord[]
}

export interface MedicationEducationIdentityBlock {
  patientName: string
  patientDob: string
  clinicName: string
  clinicianName: string
}

export interface MedicationEducationKbCoverageItem {
  medicationId: string
  substanceName: string
  templateId?: string
  approvalStatus?: MedicationEducationKbApprovalStatus
  coveragePercent: number
  missingFields: string[]
}

export interface MedicationEducationPreGenerationPanel {
  medicationsIncluded: Array<{ id: string; substance: string; doseLine: string }>
  kbCoverage: MedicationEducationKbCoverageItem[]
  combinationWarnings: string[]
  missingIndications: string[]
  missingMonitoring: string[]
  estimatedCredits: number
  recommendGruendlich: boolean
  gruendlichReasons: string[]
}

/** De-identified evidence bundle for AI — never contains PHI. */
export interface MedicationEducationEvidenceBundle {
  builtAt: string
  isDeidentified: true
  scope: MedicationEducationScope
  documentVariant: MedicationEducationDocumentVariant
  detailStyle: MedicationEducationDetailStyle
  language: MedicationEducationLanguage
  /** Age band only, e.g. "40-49", never exact DOB */
  ageBand?: string
  /** M/F/other when clinically relevant */
  sexAtBirth?: string
  medications: Array<{
    substanceName: string
    brandName?: string
    doseDescription: string
    route: string
    frequency: string
    timing: string
    startDescription: string
    titrationNote?: string
    prn: boolean
    depot: boolean
    indication: string
    patientReportedSideEffects: string[]
    adherenceNote: string
    allergies: string[]
  }>
  diagnoses: string[]
  monitoring: string[]
  kbSummaries: Array<{
    substanceName: string
    mechanismSimple: string
    commonSideEffects: string
    seriousWarnings: string
    monitoringRequirements: string
    interactions: string
    pregnancyLactation: string
    missedDose: string
    drivingWork: string
    approvalStatus: MedicationEducationKbApprovalStatus
  }>
  combinationRisks: Array<{
    substances: string
    severity: string
    mainRisk: string
    monitoring?: string
    clinicalManagement?: string
    source: 'knowledge_base' | 'ai_suggestion' | 'clinician_accepted'
  }>
  missingOrUncertain: string[]
  summaryText: string
  /** True when combination doc must synthesize, not concatenate leaflets */
  requiresCombinationSynthesis: boolean
}

export interface MedicationEducationGenerateSectionRequest {
  caseId?: string
  scope: MedicationEducationScope
  documentVariant: MedicationEducationDocumentVariant
  sectionId: string
  mode: AiMode
  detailStyle: MedicationEducationDetailStyle
  evidence: MedicationEducationEvidenceBundle
  language: MedicationEducationLanguage
  patientHints?: { patientName?: string; patientDob?: string }
}

export interface MedicationEducationGenerateSectionResponse {
  content: string
  references: MedicationEducationReference[]
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  debug?: {
    systemPrompt: string
    userPrompt: string
    rawResponse: string
    evidenceCharCount: number
    kbCoveragePercent?: number
    combinationSource?: string
  }
}
