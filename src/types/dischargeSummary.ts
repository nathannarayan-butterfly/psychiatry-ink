/**
 * English Discharge Summary module — Short (16 sections) and Full Psychiatric (29 sections).
 * Patient-identifying fields are merged client-side only; never sent to AI.
 */

import type { AiMode } from './aiUsage'

export type DischargeSummaryDocumentFamily = 'discharge_summary_en'

export type DischargeSummaryDocumentType =
  | 'short_discharge_summary'
  | 'full_psychiatric_discharge_summary'

export type DischargeSummaryRegion = 'UK' | 'US' | 'international'

export type DischargeSummarySectionStatus =
  | 'empty'
  | 'auto_fetched'
  | 'ai_generated'
  | 'clinician_edited'
  | 'accepted'
  | 'missing_source'
  | 'excluded'

export type DischargeSummarySectionSource = 'manual' | 'fetch' | 'ai'

export type HospitalCourseLength = 'compact' | 'standard' | 'detailed'

export type DischargeSummaryAiSectionId =
  | 'hospital-course'
  | 'treatment-hospital-course'
  | 'discharge-recommendations'
  | 'recommendations-instructions'
  | 'diagnostic-formulation'
  | 'risk-assessment-discharge'
  | 'risk-assessment'

export interface DischargeSummarySectionDefinition {
  id: string
  /** Primary English label (international default). */
  labelEn: string
  labelUk?: string
  labelUs?: string
  aiDefault?: boolean
  aiCapable?: boolean
  fetchModule?: string
  /** PHI-bearing — merged locally, not in evidence bundle text. */
  localIdentity?: boolean
  /** No section heading in export (header, sign-off). */
  flowSection?: boolean
}

export interface DischargeSummarySectionVersion {
  content: string
  createdAt: string
  source: DischargeSummarySectionSource
  aiProvider?: string
  aiModel?: string
  aiMode?: AiMode
  tokenUsage?: { inputTokens: number; outputTokens: number }
}

export interface DischargeSummarySectionState {
  id: string
  status: DischargeSummarySectionStatus
  included: boolean
  currentContent: string
  previousContent?: string
  versions: DischargeSummarySectionVersion[]
  sourcePreview?: string
  missingDataWarning?: string
}

export interface DischargeSummaryAiUsageRecord {
  provider: string
  model: string
  mode: AiMode
  inputTokens: number
  outputTokens: number
  creditsCharged: number
  sectionId?: string
  generatedAt: string
}

export interface DischargeSummaryDraft {
  id: string
  documentFamily: DischargeSummaryDocumentFamily
  documentType: DischargeSummaryDocumentType
  language: 'en'
  region: DischargeSummaryRegion
  patientScoped: boolean
  caseId?: string
  title: string
  status: 'draft' | 'finalized'
  aiMode: AiMode
  hospitalCourseLength: HospitalCourseLength
  sections: Record<string, DischargeSummarySectionState>
  sourceSnapshotIds: string[]
  finalText?: string
  createdAt: string
  updatedAt: string
  authorId?: string
  aiUsageLog: DischargeSummaryAiUsageRecord[]
}

export interface DischargeSummaryDataModuleCoverage {
  moduleId: string
  labelEn: string
  available: boolean
  detail?: string
}

export interface DischargeSummaryFetchResult {
  sections: Record<string, { content: string; sourcePreview?: string; missing?: string }>
  coverage: DischargeSummaryDataModuleCoverage[]
  missingSummary: string[]
  sourceSnapshotIds: string[]
}

/** De-identified evidence bundle for AI — never contains PHI. */
export interface DischargeSummaryEvidenceBundle {
  builtAt: string
  isDeidentified: true
  documentType: DischargeSummaryDocumentType
  region: DischargeSummaryRegion
  hospitalCourseLength: HospitalCourseLength
  keyEvents: string[]
  diagnoses: string[]
  symptoms: string[]
  medicationCourse: string[]
  sideEffects: string[]
  therapy: string[]
  incidents: string[]
  risk: string[]
  diagnostics: string[]
  dischargeStatus: string[]
  missingOrUncertain: string[]
  summaryText: string
}

export interface DischargeSummaryGenerateSectionRequest {
  caseId?: string
  documentType: DischargeSummaryDocumentType
  region: DischargeSummaryRegion
  sectionId: string
  mode: AiMode
  hospitalCourseLength?: HospitalCourseLength
  evidence: DischargeSummaryEvidenceBundle
  patientHints?: { patientName?: string; patientDob?: string }
}

export interface DischargeSummaryGenerateSectionResponse {
  content: string
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  debug?: {
    systemPrompt?: string
    userPrompt?: string
    rawResponse?: string
    evidenceCharCount?: number
    parseError?: string
  }
}

export interface DischargeSummaryIdentityBlock {
  institution?: string
  ward?: string
  documentDate?: string
  patientName?: string
  patientDob?: string
  patientId?: string
  patientAge?: string
  patientSex?: string
  patientAddress?: string
  admissionDate?: string
  dischargeDate?: string
  treatmentPeriod?: string
  admissionType?: string
  dischargeDestination?: string
  consultant?: string
  responsibleClinician?: string
  recipient?: string
  signatureBlock?: string
}
