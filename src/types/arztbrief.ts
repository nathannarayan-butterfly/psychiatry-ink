/**
 * Arztbrief module — Kurzbrief (13 sections) and Langbrief (24 sections).
 * Patient-identifying fields are merged client-side only; never sent to AI.
 */

import type { AiMode } from './aiUsage'

export type ArztbriefDocumentType = 'kurzbrief' | 'langbrief'

export type ArztbriefSectionStatus =
  | 'empty'
  | 'auto_fetched'
  | 'ai_generated'
  | 'clinician_edited'
  | 'accepted'
  | 'missing_source'
  | 'excluded'

export type ArztbriefSectionSource = 'manual' | 'fetch' | 'ai'

export type TherapieVerlaufLength = 'compact' | 'standard' | 'detailed'

export type ArztbriefAiSectionId =
  | 'therapie-verlauf'
  | 'besondere-hinweise'
  | 'aufnahmeanlass-summary'
  | 'diagnostik-summary'
  | 'kurzanamnese-summary'

export interface ArztbriefSectionDefinition {
  id: string
  labelDe: string
  labelEn: string
  /** Default AI section when document is created. */
  aiDefault?: boolean
  /** Section can be AI-generated (optional). */
  aiCapable?: boolean
  /** Data module key for auto-fetch (patient context). */
  fetchModule?: string
  /** PHI-bearing — merged locally, not in evidence bundle text. */
  localIdentity?: boolean
}

export interface ArztbriefSectionVersion {
  content: string
  createdAt: string
  source: ArztbriefSectionSource
  aiProvider?: string
  aiModel?: string
  aiMode?: AiMode
  tokenUsage?: { inputTokens: number; outputTokens: number }
}

export interface ArztbriefSectionState {
  id: string
  status: ArztbriefSectionStatus
  included: boolean
  currentContent: string
  previousContent?: string
  versions: ArztbriefSectionVersion[]
  sourcePreview?: string
  missingDataWarning?: string
}

export interface ArztbriefAiUsageRecord {
  provider: string
  model: string
  mode: AiMode
  inputTokens: number
  outputTokens: number
  creditsCharged: number
  sectionId?: string
  generatedAt: string
}

export interface ArztbriefDraft {
  id: string
  documentType: ArztbriefDocumentType
  patientScoped: boolean
  caseId?: string
  title: string
  status: 'draft' | 'finalized'
  aiMode: AiMode
  therapieVerlaufLength: TherapieVerlaufLength
  sections: Record<string, ArztbriefSectionState>
  sourceSnapshotIds: string[]
  finalText?: string
  createdAt: string
  updatedAt: string
  authorId?: string
  aiUsageLog: ArztbriefAiUsageRecord[]
}

export interface ArztbriefDataModuleCoverage {
  moduleId: string
  labelDe: string
  labelEn: string
  available: boolean
  detail?: string
}

export interface ArztbriefFetchResult {
  sections: Record<string, { content: string; sourcePreview?: string; missing?: string }>
  coverage: ArztbriefDataModuleCoverage[]
  missingSummary: string[]
  sourceSnapshotIds: string[]
}

/** De-identified evidence bundle for AI — never contains PHI. */
export interface ArztbriefEvidenceBundle {
  builtAt: string
  isDeidentified: true
  documentType: ArztbriefDocumentType
  therapieVerlaufLength: TherapieVerlaufLength
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
  /** Compact narrative for prompt injection. */
  summaryText: string
}

export interface ArztbriefGenerateSectionRequest {
  caseId?: string
  documentType: ArztbriefDocumentType
  sectionId: string
  mode: AiMode
  therapieVerlaufLength?: TherapieVerlaufLength
  evidence: ArztbriefEvidenceBundle
  language: 'de' | 'en'
  patientHints?: { patientName?: string; patientDob?: string }
}

export interface ArztbriefGenerateSectionResponse {
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

export interface ArztbriefIdentityBlock {
  institution?: string
  ward?: string
  letterDate?: string
  patientName?: string
  patientDob?: string
  treatmentPeriod?: string
  recipient?: string
  signatureBlock?: string
}
