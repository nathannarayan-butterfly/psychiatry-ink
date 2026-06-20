import type { PatientDynamicKey } from '../data/documentTemplate/dynamicFields'

export type TemplateFieldType =
  | 'static_text'
  | 'short_text'
  | 'long_text'
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
  pageSettings?: TemplatePageSettings
  createdAt: string
  updatedAt: string
  createdBy?: string
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
