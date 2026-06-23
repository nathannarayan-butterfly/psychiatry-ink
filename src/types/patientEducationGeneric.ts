/**
 * Generic, standalone patient education ("Patientenaufklärung (generisch)").
 *
 * Unlike the medication-education feature, this is NOT tied to a patient case
 * or medication plan. A clinician picks a subject (drug, condition, therapy or
 * free-text topic) plus presentation options, and the AI drafts patient-friendly
 * education material section by section. Nothing here is patient-identifiable.
 */

import type { AiMode } from './aiUsage'
import type {
  MedicationEducationAiUsageRecord,
  MedicationEducationReference,
  MedicationEducationSectionState,
} from './medicationEducation'

export type GenericEducationLanguage = 'de' | 'en'

/** Hint about what the subject is, so the AI tailors structure/wording. */
export type GenericEducationSubjectKind = 'medikament' | 'erkrankung' | 'therapie' | 'thema'

/** Who the material is written for. */
export type GenericEducationAudience = 'patient' | 'angehoerige'

/** Plain-language register. */
export type GenericEducationReadingLevel = 'einfache_sprache' | 'standard'

/** Overall length / depth. */
export type GenericEducationDetailStyle = 'kurz' | 'standard' | 'ausfuehrlich'

export type GenericEducationDocumentStatus =
  | 'draft_ai_generated'
  | 'needs_clinician_review'
  | 'accepted'
  | 'archived'

export interface GenericEducationSectionDefinition {
  id: string
  labelDe: string
  labelEn: string
  /** Whether the section can be AI-generated. Identity sections (title) cannot. */
  aiCapable?: boolean
  /** Title/identity sections are rendered without a heading in exports. */
  localIdentity?: boolean
  /** Short instruction to the model describing what this section should cover. */
  promptHintDe: string
  promptHintEn: string
}

export interface GenericPatientEducationDocument {
  id: string
  subject: string
  subjectKind: GenericEducationSubjectKind
  audience: GenericEducationAudience
  readingLevel: GenericEducationReadingLevel
  detailStyle: GenericEducationDetailStyle
  /** Optional clinician notes to steer the content. Must contain no PHI. */
  additionalContext?: string
  language: GenericEducationLanguage
  aiMode: AiMode
  title: string
  status: GenericEducationDocumentStatus
  sections: Record<string, MedicationEducationSectionState>
  /** Clinician-facing citations from AI generation — excluded from patient exports. */
  references: MedicationEducationReference[]
  aiUsageLog: MedicationEducationAiUsageRecord[]
  createdAt: string
  updatedAt: string
  acceptedAt?: string
}

export interface GenericEducationGenerateSectionRequest {
  subject: string
  subjectKind: GenericEducationSubjectKind
  sectionId: string
  sectionLabel: string
  promptHint: string
  audience: GenericEducationAudience
  readingLevel: GenericEducationReadingLevel
  detailStyle: GenericEducationDetailStyle
  additionalContext?: string
  language: GenericEducationLanguage
  mode: AiMode
}

export interface GenericEducationGenerateSectionResponse {
  content: string
  references: MedicationEducationReference[]
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}
