import type { CalendarItem } from '../types/calendar'
import type { GeneratedDocument } from '../types/documentTemplate'
import type { ComplementaryTherapy } from '../types/complementaryTherapy'
import type { BefundRecord } from '../types/befund'
import type { PsychotherapyPlan } from '../types/psychotherapy'
import type { WeitereTherapie } from '../types/weitereTherapie'
import type { SozialtherapieTarget } from '../types/sozialtherapie'
import type { CombinationCheckStore } from '../types/combinationCheck'
import type { LabMedicationCorrelationStore } from '../types/labMedicationCorrelation'
import type { MedicationPlanState } from '../types/medicationPlan'
import type { PrepAiCheckCache } from '../utils/prepAiCheck/storage'
import type { Anforderung } from '../types/anforderung'
import type { ClinicalImprintIndex } from '../types/clinicalImprint'
import type { IsdmClinicalAnalysis, IsdmInputState } from '../types/isdm'
import type { ClinicianAttestationState } from '../utils/butterfly/attestationStorage'
import type { ClinicalQuestionNoteState } from '../utils/clinicalQuestions/answerNotes'
import type { DiagnoseEntry } from '../utils/diagnosenArchive'
import type { DokumentEntry } from '../utils/dokumenteArchive'
import type { NotionDocumentSnapshot } from '../utils/notionDocumentActions'
import type { VerlaufFeedEntry } from '../utils/verlaufFeed'
import type { SavedLabGraph } from '../types/lab'
import type { SavedTimeline } from '../types/timeline'
import type { LaborBefund } from '../utils/laborArchive'
import {
  DEMO_CASE_ID,
  DEMO_PATIENT_ID,
  DEMO_SEED_VERSION,
  DEMO_FIXTURE_VERSION,
} from './constants'

export type DemoUserStatus = 'none' | 'installed' | 'archived' | 'removed'

export interface DemoUserState {
  status: DemoUserStatus
  seedVersion: string
  installedAt?: string
  archivedAt?: string
  removedAt?: string
}

export interface DemoPatientMaster {
  vorname: string
  nachname: string
  geburtsdatum: string
  geschlecht: 'maennlich' | 'weiblich' | 'divers'
  age: string
  admissionDate: string
  patientId: string
  caseId: string
}

export interface DemoModulePlaceholders {
  consultation?: {
    title: string
    question: string
    specialty: string
    status: string
  }
  discussCase?: {
    title: string
    purpose: string
    status: string
  }
}

export interface DemoPatientFixture {
  version: string
  isDemoPatient: true
  demoSeedVersion: string
  demoPatientId: typeof DEMO_PATIENT_ID
  demoCaseId: typeof DEMO_CASE_ID
  patient: DemoPatientMaster
  workspace: {
    age: string
    selectedDocumentType: string | null
    documents: Record<string, NotionDocumentSnapshot>
    pageHeadings: Record<string, string>
    pageDates: Record<string, string>
    pageTimes: Record<string, string>
    timelines: SavedTimeline[]
    activeTimelineId: string | null
    labGraphs: SavedLabGraph[]
    activeLabGraphId: string | null
    diagnoses: DiagnoseEntry[]
    clinicalImprints?: ClinicalImprintIndex
    isdmAnalysis?: IsdmClinicalAnalysis
    isdmInput?: IsdmInputState
    butterflyAttestations?: ClinicianAttestationState
    clinicalQuestionNotes?: ClinicalQuestionNoteState
    anforderungen?: Anforderung[]
    medicationPlanState?: MedicationPlanState
    psychotherapyPlan?: PsychotherapyPlan
    complementaryTherapies?: ComplementaryTherapy[]
    weitereTherapie?: WeitereTherapie[]
    activeVariantIds?: Record<string, string>
  }
  verlaufFeed: VerlaufFeedEntry[]
  laborBefunde: LaborBefund[]
  befundRecords: BefundRecord[]
  sozialtherapie: SozialtherapieTarget[]
  dokumente: DokumentEntry[]
  generatedDocuments: GeneratedDocument[]
  calendarItems: CalendarItem[]
  modulePlaceholders: DemoModulePlaceholders
  /** Deterministic cached AI therapy results — no live API on demo open. */
  aiTherapyDemo?: {
    combinationCheck: CombinationCheckStore
    labMedCorrelation: LabMedicationCorrelationStore
    prepAiCheck: PrepAiCheckCache
  }
}

export interface DemoValidationIssue {
  level: 'error' | 'warn'
  code: string
  message: string
  path?: string
}

export interface DemoValidationResult {
  ok: boolean
  errors: DemoValidationIssue[]
  warnings: DemoValidationIssue[]
}

export type DemoQaStatus = 'pass' | 'warn' | 'fail'

export interface DemoQaModuleResult {
  module: string
  status: DemoQaStatus
  message: string
  count?: number
}

export interface DemoSeedCounts {
  documents: number
  verlaufEntries: number
  diagnoses: number
  labValues: number
  laborBefunde: number
  befundRecords: number
  calendarItems: number
  dokumente: number
  generatedDocuments: number
  clinicalImprints: number
  medications: number
  psychotherapySessions: number
  complementaryTherapies: number
  sozialtherapieTargets: number
  anforderungen?: number
  isdmDomains?: number
  butterflyAttestations?: number
}

export const DEMO_FIXTURE_META = {
  version: DEMO_FIXTURE_VERSION,
  isDemoPatient: true as const,
  demoSeedVersion: DEMO_SEED_VERSION,
  demoPatientId: DEMO_PATIENT_ID,
  demoCaseId: DEMO_CASE_ID,
}
