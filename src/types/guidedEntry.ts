import type { UiLanguage } from './settings'
import type { TemplateCondition } from './documentTemplate'

/** Workspace clinical items that support optional guided entry (v1). */
export type GuidedEntryItemType =
  | 'verlauf-short'
  | 'verlauf-broad'
  | 'verlauf-risiko'
  | 'verlauf-note-quick'
  | 'psychopath-finding'
  | 'psychopath-quick'
  | 'risk-update-quick'
  | 'befund-ecg'
  | 'befund-eeg'
  | 'befund-roentgen'
  | 'somatic-befund-quick'
  | 'vitalwerte-quick'
  | 'anamnese-somatic-befund'
  | 'anamnese-neuro-befund'

export type GuidedEntryMode = 'direct' | 'guided'

export type GuidedEntryFieldType =
  | 'short_text'
  | 'long_text'
  | 'textarea'
  | 'yes_no'
  | 'select'
  | 'radio_group'
  | 'checkbox_group'
  | 'date'
  | 'number'

export interface GuidedEntryFieldOption {
  id: string
  labelKey: string
}

export interface GuidedEntryField {
  id: string
  type: GuidedEntryFieldType
  labelKey: string
  placeholderKey?: string
  helperKey?: string
  required?: boolean
  options?: GuidedEntryFieldOption[]
  /** Resolve initial value from case/patient data, e.g. `diagnosis.primary`. */
  prefillPath?: string
  showWhen?: TemplateCondition
}

export interface GuidedEntryStep {
  id: string
  titleKey: string
  descriptionKey?: string
  fieldIds: string[]
  /** Hide entire step when condition is false. */
  showWhen?: TemplateCondition
}

export type GuidedEntryOutputKind =
  | 'verlauf-feed'
  | 'workspace-document'
  | 'workspace-section'
  | 'befund-record'
  | 'psychopath-overview'

export interface GuidedEntryOutputTarget {
  kind: GuidedEntryOutputKind
  documentTypeId?: string
  variantId?: string
  sectionId?: string
  befundType?: 'ecg' | 'eeg'
  verlaufPageType?: string
}

/** Deterministic narrative assembly — v1 uses template segments, not LLM. */
export interface GuidedEntryGenerationSegment {
  /** When set, segment is included only if condition passes. */
  showWhen?: TemplateCondition
  /** Paragraph heading (optional). Uses labelKey for i18n. */
  headingKey?: string
  /** Lines assembled from field values. `{fieldId}` placeholders. */
  lines: string[]
}

export interface GuidedEntrySchema {
  itemType: GuidedEntryItemType
  titleKey: string
  descriptionKey?: string
  steps: GuidedEntryStep[]
  fields: GuidedEntryField[]
  generation: GuidedEntryGenerationSegment[]
  output: GuidedEntryOutputTarget
}

export type GuidedEntryAnswerSource = 'prefill' | 'manual' | 'default' | 'generated'

export interface GuidedEntryAnswer {
  fieldId: string
  value: string | boolean | string[]
  answeredAt: string
  source: GuidedEntryAnswerSource
}

export type GuidedEntryInstanceStatus = 'draft' | 'completed' | 'abandoned'

export interface GuidedEntryAuditEntry {
  at: string
  action: 'open' | 'step' | 'draft_saved' | 'generated' | 'completed' | 'cancelled'
  stepIndex?: number
  metadata?: Record<string, unknown>
}

/** In-progress guided session — encrypted per case for draft resume. */
export interface GuidedEntryInstance {
  id: string
  itemType: GuidedEntryItemType
  caseId: string
  status: GuidedEntryInstanceStatus
  currentStepIndex: number
  answers: GuidedEntryAnswer[]
  /** Generated narrative before user review (optional until Generate). */
  generatedText?: string
  reviewedText?: string
  auditTrail: GuidedEntryAuditEntry[]
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export type GuidedEntryReviewStatus = 'draft' | 'reviewed' | 'finalized'

export interface GuidedEntryProvenance {
  instanceId: string
  itemType: GuidedEntryItemType
  mode: GuidedEntryMode
  userId?: string
  createdAt: string
  completedAt?: string
  reviewStatus: GuidedEntryReviewStatus
  /** Per-field source map for audit. */
  fieldSources: Record<string, GuidedEntryAnswerSource>
  /** True when narrative was assembled deterministically from schema (v1 default). */
  generatedDeterministically: boolean
  /** Optional hook for future AI polish — absent in v1. */
  aiPolished?: boolean
}

/** Stored alongside the created workspace item / feed entry. */
export interface GuidedEntryRecord {
  id: string
  caseId: string
  itemType: GuidedEntryItemType
  provenance: GuidedEntryProvenance
  structuredAnswers: GuidedEntryAnswer[]
  generatedText: string
  /** Entity id created in target module (verlauf entry id, befund id, …). */
  targetEntityId?: string
  createdAt: string
}

export type GuidedEntryFieldValues = Record<string, string | boolean | string[]>

export interface GuidedEntryGenerateResult {
  text: string
  answers: GuidedEntryAnswer[]
}

export interface GuidedEntryPrefillContext {
  caseId: string
  language: UiLanguage
}
