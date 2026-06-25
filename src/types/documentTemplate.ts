import type { PatientDynamicKey } from '../data/documentTemplate/dynamicFields'

export type TemplateFieldType =
  | 'static_text'
  | 'short_text'
  | 'long_text'
  | 'text'
  | 'textarea'
  | 'checkbox'
  | 'checkbox_group'
  | 'multi_select'
  | 'radio_group'
  | 'yes_no'
  | 'select'
  | 'date'
  | 'time'
  | 'number'
  | 'number_with_unit'
  | 'email'
  | 'phone'
  | 'patient_placeholder'
  | 'case_placeholder'
  | 'clinician_placeholder'
  | 'organization_placeholder'
  | 'dynamic'
  | 'medication_selector'
  | 'diagnosis_selector'
  | 'risk_selector'
  | 'legal_checkbox'
  | 'conditional_section'
  | 'repeatable_list'
  | 'signature'
  | 'ai_assisted_text'
  | 'heading'
  | 'divider'
  | 'spacer'
  | 'initials'
  | 'name_line'

export type TemplateCategory =
  | 'gericht-legal'
  | 'zwangsmaßnahmen'
  | 'gutachten'
  | 'arztbrief'
  | 'atteste-bescheinigungen'
  | 'konsile'
  | 'klinikintern'
  | 'freie-vorlagen'

export type TemplateStatus = 'draft' | 'active' | 'archived'

export type TemplateAvailability = {
  emptyWorkspace: boolean
  patientWorkspace: boolean
  patientDocuments: boolean
}

export interface TemplateFieldOption {
  id: string
  label: string
}

export interface TemplatePageMargins {
  top: number
  right: number
  bottom: number
  left: number
}

export interface TemplatePageHeaderFooter {
  content?: string
  heightMm?: number
}

export interface TemplatePageSettings {
  format: 'a4'
  margins?: TemplatePageMargins
  header?: TemplatePageHeaderFooter
  footer?: TemplatePageHeaderFooter
  headerFooterFirstPageOnly?: boolean
}

/** Canvas / document grid span out of 12 columns. */
export type TemplateFieldColSpan = 4 | 6 | 8 | 12

export type TemplateFieldWidth = 'full' | 'half' | 'third' | 'two-thirds'

export interface TemplateFieldLayout {
  colSpan?: TemplateFieldColSpan
  /** Minimum block height in mm (builder + rendered document). */
  minHeightMm?: number
}

export type TemplateConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'checked'
  | 'unchecked'
  | 'contains'
  | 'in'

/** When a field is shown in the wizard / rendered document. */
export interface TemplateCondition {
  id: string
  /** Source field whose value is evaluated. */
  fieldId: string
  operator: TemplateConditionOperator
  value?: string | boolean | string[]
}

/** Logical wizard step grouping — builder assigns fields to sections. */
export interface TemplateSection {
  id: string
  title: string
  description?: string
  fieldIds: string[]
  order: number
}

export interface TemplateField {
  id: string
  type: TemplateFieldType
  label?: string
  placeholder?: string
  defaultValue?: string | boolean | string[]
  required?: boolean
  options?: TemplateFieldOption[]
  /** Placeholder binding, e.g. patient.name, case.diagnosis, system.date */
  binding?: string
  /** Dynamic patient/case token — resolved at document generation time. */
  dynamicKey?: PatientDynamicKey
  helperText?: string
  /** Unit suffix for number_with_unit, e.g. EUR, mg */
  unit?: string
  order: number
  layout?: TemplateFieldLayout
  /** Builder section this field belongs to (wizard step grouping). */
  sectionId?: string
  /** Show this field only when the condition is satisfied. */
  showWhen?: TemplateCondition
  /** For `conditional_section`: nested field ids rendered when condition is met. */
  childFieldIds?: string[]
  /** For `repeatable_list`: label for each repeated row. */
  repeatItemLabel?: string
  /** Legal/forensic checkbox — full statutory text shown beside the control. */
  legalText?: string
}

export interface DocumentTemplate {
  id: string
  title: string
  description?: string
  category: TemplateCategory
  language: 'de' | 'en'
  version: number
  status: TemplateStatus
  availability: TemplateAvailability
  fields: TemplateField[]
  /** Optional explicit wizard sections (fields reference via sectionId). */
  sections?: TemplateSection[]
  pageSettings?: TemplatePageSettings
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export type TemplateInstanceStatus = 'in_progress' | 'completed' | 'abandoned'

export type TemplateAnswerSource = 'prefill' | 'manual' | 'default'

export interface TemplateInstanceAnswer {
  fieldId: string
  value: string | boolean | string[]
  answeredAt: string
  source: TemplateAnswerSource
}

export interface TemplateInstanceAuditEntry {
  at: string
  action: string
  stepIndex?: number
  metadata?: Record<string, unknown>
}

/** In-progress wizard session — persisted for draft resume and audit. */
export interface TemplateInstance {
  id: string
  templateId: string
  templateVersion: number
  caseId?: string
  patientId?: string
  status: TemplateInstanceStatus
  currentStepIndex: number
  answers: TemplateInstanceAnswer[]
  auditTrail: TemplateInstanceAuditEntry[]
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface GeneratedDocumentProvenance {
  generatedAt: string
  wizardCompletedAt?: string
  templateTitle: string
  instanceId?: string
}

export type GeneratedDocumentStatus = 'draft' | 'finalized' | 'archived'

export interface GeneratedDocument {
  id: string
  templateId: string
  templateVersion: number
  patientId?: string
  caseId?: string
  title: string
  fieldValues: Record<string, string | boolean | string[]>
  renderedText: string
  status: GeneratedDocumentStatus
  createdAt: string
  updatedAt: string
  createdBy?: string
  /** Link back to the wizard session that produced this document. */
  instanceId?: string
  /** Structured answers for reuse, audit, and legal provenance. */
  structuredAnswers?: TemplateInstanceAnswer[]
  auditTrail?: TemplateInstanceAuditEntry[]
  provenance?: GeneratedDocumentProvenance
}

export interface TemplateRenderContext {
  patient?: {
    name?: string
    vorname?: string
    nachname?: string
    geburtsdatum?: string
    geschlecht?: string
    age?: string
    height?: string
    weight?: string
    bmi?: string
    address?: string
    kostentraeger?: string
  }
  case?: {
    diagnosis?: string
    ward?: string
    caseId?: string
    aufnahmedatum?: string
    entlassungsdatum?: string
    aufenthaltsdauer?: string
    medikationKurz?: string
  }
  clinician?: {
    name?: string
    title?: string
  }
  organization?: {
    name?: string
    address?: string
  }
  system?: {
    date?: string
    time?: string
    year?: string
    documentDate?: string
  }
}
