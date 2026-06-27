import type { SomaticBefundPayload } from '../../types/somaticBefund'
import type { VerlaufFeedEntry } from '../../utils/verlaufFeed'
import type { LaborCategory } from '../../utils/laborArchive'
import type { DiagnoseEntry } from '../../utils/diagnosenArchive'
import type { MedicationPlanState } from '../../types/medicationPlan'
import type { PsychotherapyPlan } from '../../types/psychotherapy'
import type { ComplementaryTherapy } from '../../types/complementaryTherapy'
import type { WeitereTherapie } from '../../types/weitereTherapie'
import type { SozialtherapieTarget } from '../../types/sozialtherapie'
import type { DokumentEntry } from '../../utils/dokumenteArchive'
import type { GeneratedDocument } from '../../types/documentTemplate'
import type { CalendarItem } from '../../types/calendar'
import type { DemoModulePlaceholders, DemoPatientFixture } from '../types'
import type { Anforderung } from '../../types/anforderung'
import type { BefundRecord } from '../../types/befund'
import type { IsdmInputState } from '../../types/isdm'
import type { ClinicianAttestationState } from '../../utils/butterfly/attestationStorage'
import type { ClinicalQuestionNoteState } from '../../utils/clinicalQuestions/answerNotes'
import type { ClinicalImprintIndex } from '../../types/clinicalImprint'
import type { SavedTimeline } from '../../types/timeline'
import type { NotionDocumentSnapshot } from '../../utils/notionDocumentActions'

export const DEMO_ADMISSION_DATE = '2026-06-02'

export interface DemoLabGraphParam {
  parameter: string
  v1: number
  v2: number
  refLow: number
  refHigh: number
  unit: string
}

export interface DemoVerlaufFeedInput {
  date: string
  content: string
  pageType?: string
  somaticBefund?: SomaticBefundPayload
}

export interface DemoTimelineEntryInput {
  id: string
  heading: string
  subheading: string
  priority: 'high' | 'critical' | 'medium'
  dateKind: 'age' | 'ddmmyy'
  dateValue: string
  sortKey: number
  displayDate: string
  visible: boolean
}

export interface DemoLabGraphNotes {
  prolactin0: string
  prolactin1: string
  triglycerides1: string
  hba1c1: string
  aripiprazole0: string
  aripiprazole1: string
}

export interface DemoLaborBefundLabels {
  admission: string
  followup: string
  anthro: string
  glucose: string
}

export interface DemoMedMarkerNotes {
  increased: string
  started: string
}

export interface DemoLabCategoryParam {
  name: string
}

export interface DemoLabCategoryStrings {
  id: string
  label: string
  params: DemoLabCategoryParam[]
}

export interface DemoLaborCategories {
  befund1: DemoLabCategoryStrings[]
  befund2: DemoLabCategoryStrings[]
  anthro: DemoLabCategoryStrings[]
  glucose: DemoLabCategoryStrings[]
}

export interface DemoDiagnosisLabels {
  icd10Label: string
  icd11Label: string
  dsmLabel: string
}

export interface DemoMedicationEntryStrings {
  substance: string
  indication: string
  reasonForChange: string
  sideEffects: string[]
  adherenceNote: string
  doseLine: string
  historyStartNote: string
  historySnapshotReason: string
}

export interface DemoSideEffectReportStrings {
  symptom: string
  severity: string
  temporalRelation: string
  actionTaken: string
  outcome: string
  note: string
}

export interface DemoMedicationStrings {
  aripiprazole: DemoMedicationEntryStrings
  risperidone: DemoMedicationEntryStrings
  lorazepam: DemoMedicationEntryStrings
  sideEffectReport: DemoSideEffectReportStrings
  labCorrelationNotes: string
  doseScheduleUnit: string
}

export interface DemoClinicalImprintStrings {
  symptomsA: string[]
  symptomsB: string[]
  severityHigh: string
  severityMid: string
  affect: string
  drive: string
  thoughtForm: string
  thoughtContent: string
  cognition: string
  sleep: string
  cooperation: string
  insight: string
  riskSelf: string
  riskOthers: string
  aggression: string
  suicidality: string
  functioning: string
  socialInteraction: string
  hygieneSelfCare: string
  medicationResponse: string
  sideEffects: string
  adherence: string
  differentialDiagnosisHints: string[]
  uncertainty: string
}

export interface DemoWorkspaceStrings {
  admissionHeadingPrefix: string
  pageHeadings: {
    aufnahme: string
    verlauf: string
    psychopath: string
    'therapie-verlauf': string
    medikation: string
    therapieplanung: string
  }
  verlaufSections: {
    psychopathologie: string
    stationsverhalten: string
    risiko: string
    'compliance-krankheitseinsicht': string
    'medikation-vertraeglichkeit': string
    'besondere-ereignisse': string
    somatik: string
    'beurteilung-plan': string
  }
  psychopathFree: string
  therapieVerlaufBody: string
  medikationBody: string
  therapieplanungBody: string
}

export interface DemoPsychotherapySessionStrings {
  topic: string
  intervention: string
  patientReaction: string
  riskAspects: string
  nextFocus: string
  generatedParagraph: string
}

export interface DemoPsychotherapyStrings {
  therapist: string
  frequency: string
  indication: string
  shortTermGoal: string
  mediumTermGoal: string
  methodNotes: string
  reviewProgress: string
  sessions: DemoPsychotherapySessionStrings[]
}

export interface DemoComplementaryTherapyStrings {
  name: string
  frequency: string
  mainGoal: string
  participationStatus: string
  sessionNote?: string
}

export interface DemoWeitereTherapieStrings {
  type: string
  indication: string
  responsible: string
  notes: string
}

export interface DemoSozialtherapieStrings {
  goal: string
  currentMeasure: string
  responsibleRole: string
}

export interface DemoDokumenteStrings {
  anamneseTitle: string
  anamneseContent: string
  verlaufTitle: string
  medplanTitle: string
  medplanContent: string
  arztbriefTitle: string
  arztbriefContent: string
  labDocTitlePrefix: string
}

export interface DemoGeneratedDocumentsStrings {
  title: string
  dischargePlan: string
  renderedText: string
}

export interface DemoCalendarStrings {
  visitTitle: string
  medReview: string
  psychoGroup: string
  dischargeMeeting: string
}

export interface DemoCombinationCheckFindingStrings {
  mainRisk: string
  mechanism: string
  monitoring: string
  clinicalManagement: string
  rationale?: string
}

export interface DemoLabMedCorrelationFindingStrings {
  labParameterLabel: string
  zusammenhang: string
  mechanism?: string
  recommendation: string
  monitoring?: string
}

export interface DemoAiTherapyStrings {
  combinationCheck: {
    aripiprazoleLorazepamKb: DemoCombinationCheckFindingStrings
    aripiprazoleLorazepamAi: DemoCombinationCheckFindingStrings
    aripiprazoleCannabisKb: DemoCombinationCheckFindingStrings
  }
  labMedCorrelation: {
    risperidoneProlactinKb: DemoLabMedCorrelationFindingStrings
    aripiprazoleCholesterolAi: DemoLabMedCorrelationFindingStrings
    aripiprazoleProlactinAi: DemoLabMedCorrelationFindingStrings
  }
  prepAiCheck: {
    aripiprazoleDisclaimer: string
    aripiprazoleAvailabilityStandard: string
    aripiprazoleAvailabilityGeneric: string
    lorazepamDisclaimer: string
    lorazepamAvailabilityBtm: string
    lorazepamAvailabilityGeneric: string
    formTablets: string
  }
}

export interface DemoAnforderungStrings {
  catalogId: string
  label: string
  note: string
  createdByDisplayName?: string
  reviewedByDisplayName?: string
}

export interface DemoClinicalQuestionNoteInput {
  criterionId: string
  note: string
}

/** Localized synthetic clinical copy for the demo patient fixture. */
export interface DemoStrings {
  verlaufSectionLabel: string
  aufnahme: Record<string, string>
  verlaufFeed: DemoVerlaufFeedInput[]
  labGraphNotes: DemoLabGraphNotes
  laborBefundLabels: DemoLaborBefundLabels
  laborBefundHeaderPrefix: string
  labGraphTitle: string
  timelineTitle: string
  medMarkerNotes: DemoMedMarkerNotes
  labGraphParams: DemoLabGraphParam[]
  laborCategories: DemoLaborCategories
  diagnoses: DemoDiagnosisLabels[]
  medication: DemoMedicationStrings
  clinicalImprints: DemoClinicalImprintStrings
  workspace: DemoWorkspaceStrings
  timelineEntries: DemoTimelineEntryInput[]
  psychotherapy: DemoPsychotherapyStrings
  complementaryTherapies: DemoComplementaryTherapyStrings[]
  weitereTherapie: DemoWeitereTherapieStrings[]
  sozialtherapie: DemoSozialtherapieStrings[]
  dokumente: DemoDokumenteStrings
  generatedDocuments: DemoGeneratedDocumentsStrings
  calendar: DemoCalendarStrings
  modulePlaceholders: DemoModulePlaceholders
  isdmDomainNotes: Record<string, string>
  clinicalQuestionNotes: DemoClinicalQuestionNoteInput[]
  anforderungen: DemoAnforderungStrings[]
  eegConclusionFree: string
  aiTherapy: DemoAiTherapyStrings
}

export interface DemoWorkspaceDocuments {
  documents: Record<string, NotionDocumentSnapshot>
  pageHeadings: Record<string, string>
  pageDates: Record<string, string>
}

export interface DemoContentModule {
  locale: import('../demoLocale').DemoLocale
  admissionDate: string
  verlaufSectionLabel: string
  buildAufnahmeSections(): Record<string, string>
  buildVerlaufFeedInputs(): DemoVerlaufFeedInput[]
  buildVerlaufFeed(): VerlaufFeedEntry[]
  labGraphNote(parameter: string, drawIndex: number): string
  laborBefundLabel(kind: 'admission' | 'followup' | 'anthro' | 'glucose'): string
  laborBefundHeader(date: string, label: string): string
  labGraphTitle(): string
  timelineTitle(): string
  medMarkerNote(kind: 'increased' | 'started'): string
  labGraphParams(): DemoLabGraphParam[]
  buildLaborCategories(): {
    befund1: LaborCategory[]
    befund2: LaborCategory[]
    anthro: LaborCategory[]
    glucose: LaborCategory[]
  }
  buildDiagnoses(now: string): DiagnoseEntry[]
  buildMedicationPlanState(now: string): MedicationPlanState
  buildClinicalImprints(now: string, verlaufFeed: VerlaufFeedEntry[]): ClinicalImprintIndex
  buildWorkspaceDocuments(now: string, aufnahmeSections: Record<string, string>): DemoWorkspaceDocuments
  buildTimeline(now: string): { timelines: SavedTimeline[]; activeTimelineId: string }
  buildPsychotherapyPlan(now: string): PsychotherapyPlan
  buildComplementaryTherapies(now: string): ComplementaryTherapy[]
  buildWeitereTherapie(now: string): WeitereTherapie[]
  buildSozialtherapie(now: string): SozialtherapieTarget[]
  buildDokumente(
    now: string,
    aufnahmeSections: Record<string, string>,
    verlaufFeed: VerlaufFeedEntry[],
    laborBefunde: DemoPatientFixture['laborBefunde'],
  ): DokumentEntry[]
  buildGeneratedDocuments(now: string): GeneratedDocument[]
  buildCalendarItems(now: string): CalendarItem[]
  buildModulePlaceholders(): DemoModulePlaceholders
  buildIsdmInput(now: string): IsdmInputState
  buildButterflyAttestations(): ClinicianAttestationState
  buildClinicalQuestionNotes(now: string): ClinicalQuestionNoteState
  buildAnforderungen(admissionDate: string): Anforderung[]
  buildEegBefund(): BefundRecord
  buildAiTherapyDemo(now: string): NonNullable<DemoPatientFixture['aiTherapyDemo']>
}
