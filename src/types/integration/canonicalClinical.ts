/**
 * Canonical clinical data model — adapter-neutral representation.
 * Built client-side from decrypted vault; never stored decrypted on server.
 */

export interface CanonicalIdentifier {
  system?: string
  value: string
}

export interface CanonicalCoding {
  system?: string
  code: string
  display?: string
}

export interface PatientProfile {
  caseId: string
  name?: string
  geburtsdatum?: string
  age?: string
  geschlecht?: string
  identifiers?: CanonicalIdentifier[]
}

export interface ClinicalCase {
  caseId: string
  displayTitle?: string
  documentTypeId?: string | null
  updatedAt: string
  patient?: PatientProfile
}

export interface Encounter {
  id: string
  caseId: string
  status: 'planned' | 'in-progress' | 'finished' | 'cancelled'
  type?: string
  periodStart?: string
  periodEnd?: string
  note?: string
}

export interface AnamnesisDocument {
  id: string
  caseId: string
  pageId: string
  title?: string
  content: string
  createdAt?: string
  updatedAt?: string
}

export interface ClinicalCourseEntry {
  id: string
  caseId: string
  date?: string
  summary: string
  source?: string
}

export interface MentalStatusExam {
  caseId: string
  pageId?: string
  sections: Record<string, string>
  updatedAt?: string
}

export interface DiagnosisItem {
  id: string
  icd10Code?: string
  icd10Label?: string
  icd11Code?: string
  icd11Label?: string
  dsmCode?: string
  dsmLabel?: string
  status?: 'active' | 'inactive' | 'resolved'
}

export interface MedicationItem {
  id: string
  name: string
  dose?: string
  frequency?: string
  route?: string
  status?: 'active' | 'stopped' | 'on-hold'
  notes?: string
}

export interface MedicationPlan {
  caseId: string
  items: MedicationItem[]
  sideEffects?: SideEffectReport[]
  updatedAt?: string
}

export interface SideEffectReport {
  id: string
  medicationId?: string
  description: string
  severity?: 'mild' | 'moderate' | 'severe'
  reportedAt?: string
}

export interface LabResult {
  id: string
  caseId: string
  name: string
  value?: string
  unit?: string
  referenceRange?: string
  observedAt?: string
  graphId?: string
}

export interface TherapyPlan {
  caseId: string
  modality?: string
  goals?: string[]
  sessions?: ClinicalCourseEntry[]
  complementaryTherapies?: string[]
  updatedAt?: string
}

export interface ArztbriefDocument {
  id: string
  caseId: string
  title?: string
  content: string
  finalizedAt?: string
}

export interface CustomGeneratedDocument {
  id: string
  caseId: string
  templateId?: string
  title?: string
  html?: string
  createdAt?: string
}

export interface ConsultationRequest {
  id: string
  caseId: string
  question: string
  status?: string
  createdAt?: string
}

export interface ConsultationReport {
  id: string
  requestId: string
  caseId: string
  summary: string
  recommendations?: string
  finalizedAt?: string
}

/** Full canonical snapshot for a case — used by adapters. */
export interface CanonicalCaseSnapshot {
  schemaVersion: '1.0'
  exportedAt: string
  case: ClinicalCase
  encounters: Encounter[]
  anamnesisDocuments: AnamnesisDocument[]
  clinicalCourse: ClinicalCourseEntry[]
  mentalStatusExam?: MentalStatusExam
  diagnoses: DiagnosisItem[]
  medicationPlan?: MedicationPlan
  labResults: LabResult[]
  therapyPlan?: TherapyPlan
  arztbriefDocuments: ArztbriefDocument[]
  customDocuments: CustomGeneratedDocument[]
  consultationRequests: ConsultationRequest[]
  consultationReports: ConsultationReport[]
}

export type CanonicalClinicalObjectType =
  | 'case'
  | 'encounter'
  | 'anamnesis'
  | 'clinicalCourse'
  | 'mentalStatusExam'
  | 'diagnosis'
  | 'medicationPlan'
  | 'labResult'
  | 'therapyPlan'
  | 'arztbrief'
  | 'customDocument'
  | 'consultationRequest'
  | 'consultationReport'
