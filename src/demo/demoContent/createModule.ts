import { defaultAufnahmeSections } from '../../data/aufnahmeSections'
import type { Anforderung } from '../../types/anforderung'
import type { BefundRecord } from '../../types/befund'
import type { CalendarItem } from '../../types/calendar'
import type { GeneratedDocument } from '../../types/documentTemplate'
import type { ClinicalImprintIndex } from '../../types/clinicalImprint'
import {
  COMBINATION_CHECK_STORE_VERSION,
  type CombinationCheckStore,
} from '../../types/combinationCheck'
import {
  ISDM_INPUT_VERSION,
  ISDM_PHENOMENOLOGY_DOMAINS,
  type IsdmDomainInput,
  type IsdmInputState,
  type IsdmPresence,
} from '../../types/isdm'
import {
  LAB_MED_CORRELATION_STORE_VERSION,
  type LabMedicationCorrelationStore,
} from '../../types/labMedicationCorrelation'
import { MEDICATION_PLAN_STATE_VERSION, type MedicationPlanState } from '../../types/medicationPlan'
import { PSYCHOTHERAPY_PLAN_VERSION, type PsychotherapyPlan } from '../../types/psychotherapy'
import type { ComplementaryTherapy } from '../../types/complementaryTherapy'
import type { WeitereTherapie } from '../../types/weitereTherapie'
import type { SozialtherapieTarget } from '../../types/sozialtherapie'
import type { PrepAiCheckCache } from '../../utils/prepAiCheck/storage'
import type { ClinicianAttestationState } from '../../utils/butterfly/attestationStorage'
import { clinicalQuestionId } from '../../utils/clinicalQuestions/ids'
import type { ClinicalQuestionNoteState } from '../../utils/clinicalQuestions/answerNotes'
import { buildCombinationKeyFromNames } from '../../utils/combinationCheck/combinationKey'
import { buildCorrelationKey } from '../../utils/labMedicationCorrelation/correlationKey'
import type { DiagnoseEntry } from '../../utils/diagnosenArchive'
import type { DokumentEntry } from '../../utils/dokumenteArchive'
import type { LaborCategory, LaborValue } from '../../utils/laborArchive'
import type { VerlaufFeedEntry } from '../../utils/verlaufFeed'
import { DEMO_CASE_ID, DEMO_PATIENT_ID } from '../constants'
import type { DemoLocale } from '../demoLocale'
import type { DemoModulePlaceholders, DemoPatientFixture } from '../types'
import {
  DEMO_ADMISSION_DATE,
  type DemoContentModule,
  type DemoLabCategoryStrings,
  type DemoStrings,
} from './types'

const LAB_BEFUND_1_DATE = '2026-06-05'
const LAB_BEFUND_2_DATE = '2026-06-20'
const LAB_BEFUND_ANTHRO_DATE = '2026-06-10'
const LAB_BEFUND_GLUCOSE_DATE = '2026-06-12'

const DEMO_DOB = '1992-08-12'
const DEMO_VORNAME = 'Anna'
const DEMO_NACHNAME = 'Demo'

const AUFNAHME_SECTION_IDS = defaultAufnahmeSections.map((s) => s.id)

type LabParamInput = {
  name: string
  value: string
  numericValue: number
  unit: string
  refMin?: number
  refMax?: number
  refText?: string
  isAbnormal?: boolean
}

type LabNumericSpec = Omit<LabParamInput, 'name'>

type BefundKey = 'befund1' | 'befund2' | 'anthro' | 'glucose'

const LAB_NUMERIC: Record<BefundKey, Record<string, LabNumericSpec[]>> = {
  befund1: {
    blutbild: [
      { value: '14,1', numericValue: 14.1, unit: 'g/dl', refMin: 13.5, refMax: 17.5 },
      { value: '7,2', numericValue: 7.2, unit: 'G/l', refMin: 4.0, refMax: 10.0 },
      { value: '248', numericValue: 248, unit: 'G/l', refMin: 150, refMax: 400 },
    ],
    leberwerte: [
      { value: '24', numericValue: 24, unit: 'U/l', refMin: 0, refMax: 35 },
      { value: '31', numericValue: 31, unit: 'U/l', refMin: 0, refMax: 45 },
      { value: '38', numericValue: 38, unit: 'U/l', refMin: 0, refMax: 55 },
      { value: '0,7', numericValue: 0.7, unit: 'mg/dl', refMin: 0.1, refMax: 1.2 },
    ],
    nierenwerte: [
      { value: '0,88', numericValue: 0.88, unit: 'mg/dl', refMin: 0.7, refMax: 1.2 },
      { value: '96', numericValue: 96, unit: 'ml/min/1,73m²', refMin: 90, refText: '≥ 90' },
      { value: '34', numericValue: 34, unit: 'mg/dl', refMin: 17, refMax: 43 },
    ],
    elektrolyte: [
      { value: '141', numericValue: 141, unit: 'mmol/l', refMin: 136, refMax: 145 },
      { value: '4,2', numericValue: 4.2, unit: 'mmol/l', refMin: 3.5, refMax: 5.1 },
      { value: '103', numericValue: 103, unit: 'mmol/l', refMin: 98, refMax: 106 },
    ],
    entzuendung: [{ value: '3,2', numericValue: 3.2, unit: 'mg/l', refMin: 0, refMax: 5 }],
    stoffwechsel: [
      { value: '94', numericValue: 94, unit: 'mg/dl', refMin: 70, refMax: 100 },
      { value: '5,4', numericValue: 5.4, unit: '%', refMin: 4.0, refMax: 6.0 },
      { value: '188', numericValue: 188, unit: 'mg/dl', refMax: 200, refText: '< 200' },
      { value: '112', numericValue: 112, unit: 'mg/dl', refMax: 116, refText: '< 116' },
      { value: '48', numericValue: 48, unit: 'mg/dl', refMin: 40, refText: '> 40' },
      { value: '158', numericValue: 158, unit: 'mg/dl', refMax: 150, refText: '< 150', isAbnormal: true },
    ],
    hormone: [{ value: '48', numericValue: 48, unit: 'ng/ml', refMin: 4, refMax: 15, isAbnormal: true }],
    muskelenzyme: [{ value: '118', numericValue: 118, unit: 'U/l', refMin: 0, refMax: 190 }],
  },
  befund2: {
    blutbild: [
      { value: '14,3', numericValue: 14.3, unit: 'g/dl', refMin: 13.5, refMax: 17.5 },
      { value: '6,9', numericValue: 6.9, unit: 'G/l', refMin: 4.0, refMax: 10.0 },
      { value: '251', numericValue: 251, unit: 'G/l', refMin: 150, refMax: 400 },
    ],
    leberwerte: [
      { value: '22', numericValue: 22, unit: 'U/l', refMin: 0, refMax: 35 },
      { value: '29', numericValue: 29, unit: 'U/l', refMin: 0, refMax: 45 },
      { value: '36', numericValue: 36, unit: 'U/l', refMin: 0, refMax: 55 },
      { value: '0,6', numericValue: 0.6, unit: 'mg/dl', refMin: 0.1, refMax: 1.2 },
    ],
    nierenwerte: [
      { value: '0,86', numericValue: 0.86, unit: 'mg/dl', refMin: 0.7, refMax: 1.2 },
      { value: '98', numericValue: 98, unit: 'ml/min/1,73m²', refMin: 90, refText: '≥ 90' },
      { value: '32', numericValue: 32, unit: 'mg/dl', refMin: 17, refMax: 43 },
    ],
    elektrolyte: [
      { value: '142', numericValue: 142, unit: 'mmol/l', refMin: 136, refMax: 145 },
      { value: '4,0', numericValue: 4.0, unit: 'mmol/l', refMin: 3.5, refMax: 5.1 },
      { value: '104', numericValue: 104, unit: 'mmol/l', refMin: 98, refMax: 106 },
    ],
    entzuendung: [{ value: '1,8', numericValue: 1.8, unit: 'mg/l', refMin: 0, refMax: 5 }],
    stoffwechsel: [
      { value: '96', numericValue: 96, unit: 'mg/dl', refMin: 70, refMax: 100 },
      { value: '5,8', numericValue: 5.8, unit: '%', refMin: 4.0, refMax: 6.0, isAbnormal: true },
      { value: '192', numericValue: 192, unit: 'mg/dl', refMax: 200, refText: '< 200' },
      { value: '114', numericValue: 114, unit: 'mg/dl', refMax: 116, refText: '< 116' },
      { value: '46', numericValue: 46, unit: 'mg/dl', refMin: 40, refText: '> 40' },
      { value: '178', numericValue: 178, unit: 'mg/dl', refMax: 150, refText: '< 150', isAbnormal: true },
    ],
    hormone: [{ value: '12', numericValue: 12, unit: 'ng/ml', refMin: 4, refMax: 15 }],
    medikamentenspiegel: [
      {
        value: '218',
        numericValue: 218,
        unit: 'ng/ml',
        refMin: 150,
        refMax: 300,
        refText: '150–300 (therapeutisch)',
      },
    ],
  },
  anthro: {
    anthropometrie: [
      { value: '26,4', numericValue: 26.4, unit: 'kg/m²', refMin: 18.5, refMax: 24.9, isAbnormal: true },
      { value: '82', numericValue: 82, unit: 'kg' },
      { value: '176', numericValue: 176, unit: 'cm' },
    ],
  },
  glucose: {
    stoffwechsel: [{ value: '98', numericValue: 98, unit: 'mg/dl', refMin: 70, refMax: 100 }],
  },
}

const DIAGNOSIS_CODES = [
  { icd10: 'F20.0', icd11: '6A20.0', dsm: '295.30' },
  { icd10: 'F12.2', icd11: '6C41.2', dsm: '304.30' },
  { icd10: 'F15.2', icd11: '6C45.2', dsm: '304.40' },
] as const

const ISDM_DOMAIN_SPECS: Record<
  (typeof ISDM_PHENOMENOLOGY_DOMAINS)[number],
  { presence: IsdmPresence; severity?: 0 | 1 | 2 | 3 | 4 }
> = {
  appearance_behavior: { presence: 'present', severity: 2 },
  speech_language: { presence: 'present', severity: 2 },
  consciousness_orientation: { presence: 'present', severity: 1 },
  attention_concentration: { presence: 'present', severity: 2 },
  memory_cognition: { presence: 'present', severity: 1 },
  mood_affect: { presence: 'present', severity: 3 },
  drive_psychomotor_activity: { presence: 'present', severity: 2 },
  formal_thought_disorder: { presence: 'present', severity: 2 },
  thought_content: { presence: 'present', severity: 3 },
  delusions_overvalued_ideas: { presence: 'present', severity: 4 },
  perception_hallucinations: { presence: 'unclear', severity: 1 },
  self_experience_ego_disturbance: { presence: 'absent' },
  anxiety_panic_phobic_symptoms: { presence: 'present', severity: 2 },
  obsessions_compulsions: { presence: 'absent' },
  trauma_intrusions_dissociation: { presence: 'absent' },
  somatic_preoccupation: { presence: 'present', severity: 1 },
  sleep_appetite_vegetative: { presence: 'present', severity: 3 },
  substance_related_features: { presence: 'present', severity: 3 },
  personality_interpersonal_style: { presence: 'present', severity: 2 },
  insight_judgment: { presence: 'present', severity: 3 },
  risk_self: { presence: 'present', severity: 2 },
  risk_others: { presence: 'absent' },
  functional_impairment: { presence: 'present', severity: 3 },
}

const BUTTERFLY_ATTESTATION_ENTRIES: Array<[string, 'met' | 'not_met']> = [
  ['f20.delusions', 'met'],
  ['f20.formal_thought_disorder', 'met'],
  ['f20.duration_one_month', 'met'],
  ['f20.auditory_hallucinations', 'not_met'],
  ['f20.ego_disturbance', 'not_met'],
  ['f20.exclude_mood_primary', 'met'],
  ['f20.exclude_organic_substance', 'not_met'],
  ['6a20.persistent_delusions', 'met'],
  ['6a20.disorganised_thinking', 'met'],
  ['6a20.negative_symptoms', 'met'],
  ['6a20.persistent_hallucinations', 'not_met'],
  ['6a20.passivity', 'not_met'],
]

type AnforderungMeta = Omit<
  Anforderung,
  'id' | 'label' | 'note' | 'createdByDisplayName' | 'reviewedByDisplayName'
>

const ANFORDERUNG_META: AnforderungMeta[] = [
  {
    caseId: DEMO_CASE_ID,
    catalogId: 'lab-metabolisches-basis',
    category: 'labor',
    urgency: 'urgent',
    requestedDate: '2026-06-05',
    status: 'accepted',
    createdAt: `${DEMO_ADMISSION_DATE}T10:00:00.000Z`,
    updatedAt: '2026-06-05T14:00:00.000Z',
    reviewedAt: '2026-06-05T14:00:00.000Z',
  },
  {
    caseId: DEMO_CASE_ID,
    catalogId: 'lab-prolaktin',
    category: 'labor',
    urgency: 'soon',
    requestedDate: '2026-06-20',
    status: 'accepted',
    createdAt: '2026-06-05T09:00:00.000Z',
    updatedAt: '2026-06-20T11:00:00.000Z',
    reviewedAt: '2026-06-20T11:00:00.000Z',
  },
  {
    caseId: DEMO_CASE_ID,
    catalogId: 'lab-aripiprazol',
    category: 'labor',
    urgency: 'routine',
    requestedDate: '2026-06-20',
    status: 'accepted',
    createdAt: '2026-06-09T09:30:00.000Z',
    updatedAt: '2026-06-20T11:00:00.000Z',
  },
  {
    caseId: DEMO_CASE_ID,
    catalogId: 'lab-hba1c',
    category: 'labor',
    urgency: 'routine',
    requestedDate: '2026-06-20',
    status: 'pending',
    createdAt: '2026-06-12T10:00:00.000Z',
    updatedAt: '2026-06-12T10:00:00.000Z',
  },
  {
    caseId: DEMO_CASE_ID,
    catalogId: 'befund-ekg',
    category: 'befunde',
    urgency: 'soon',
    requestedDate: '2026-06-08',
    status: 'accepted',
    createdAt: '2026-06-06T11:00:00.000Z',
    updatedAt: '2026-06-08T10:30:00.000Z',
    reviewedAt: '2026-06-08T10:30:00.000Z',
  },
  {
    caseId: DEMO_CASE_ID,
    catalogId: 'befund-eeg-ruhe',
    category: 'befunde',
    urgency: 'routine',
    requestedDate: '2026-06-11',
    status: 'accepted',
    createdAt: '2026-06-09T14:00:00.000Z',
    updatedAt: '2026-06-11T16:00:00.000Z',
    reviewedAt: '2026-06-11T16:00:00.000Z',
  },
  {
    caseId: DEMO_CASE_ID,
    catalogId: 'therapie-sport',
    category: 'therapien',
    urgency: 'routine',
    requestedDate: '2026-06-04',
    status: 'accepted',
    createdAt: '2026-06-03T09:00:00.000Z',
    updatedAt: '2026-06-04T10:00:00.000Z',
    reviewedAt: '2026-06-04T10:00:00.000Z',
  },
  {
    caseId: DEMO_CASE_ID,
    catalogId: 'therapie-sozialdienst',
    category: 'therapien',
    urgency: 'soon',
    requestedDate: '2026-06-10',
    status: 'pending',
    createdAt: '2026-06-08T10:00:00.000Z',
    updatedAt: '2026-06-08T10:00:00.000Z',
  },
]

function labParam(input: LabParamInput): LaborValue {
  const refText =
    input.refText ??
    (input.refMin != null && input.refMax != null
      ? `${input.refMin}–${input.refMax}`
      : input.refMax != null
        ? `< ${input.refMax}`
        : input.refMin != null
          ? `> ${input.refMin}`
          : undefined)
  const isAbnormal =
    input.isAbnormal ??
    ((input.refMin != null && input.numericValue < input.refMin) ||
      (input.refMax != null && input.numericValue > input.refMax))
  return {
    name: input.name,
    value: input.value,
    numericValue: input.numericValue,
    unit: input.unit,
    refMin: input.refMin,
    refMax: input.refMax,
    refText,
    isAbnormal,
  }
}

function labCategory(id: string, label: string, params: LabParamInput[]): LaborCategory {
  return { id, label, values: params.map(labParam) }
}

function buildLaborCategoriesFromStrings(
  befundKey: BefundKey,
  categoryStrings: DemoLabCategoryStrings[],
): LaborCategory[] {
  return categoryStrings.map((cat) => {
    const numerics = LAB_NUMERIC[befundKey][cat.id]
    return labCategory(
      cat.id,
      cat.label,
      cat.params.map((param, index) => ({
        name: param.name,
        ...numerics[index],
      })),
    )
  })
}

function matchesLabKeyword(parameter: string, keywords: string[]): boolean {
  const normalized = parameter.toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword))
}

export function createDemoContentModule(locale: DemoLocale, strings: DemoStrings): DemoContentModule {
  const admissionDate = DEMO_ADMISSION_DATE

  function buildAufnahmeSections(): Record<string, string> {
    const all: Record<string, string> = {}
    for (const sectionId of AUFNAHME_SECTION_IDS) {
      all[sectionId] = strings.aufnahme[sectionId] ?? ''
    }
    return all
  }

  function buildVerlaufFeedInputs() {
    return strings.verlaufFeed
  }

  function buildVerlaufFeed(): VerlaufFeedEntry[] {
    return strings.verlaufFeed.map((entry, index) => ({
      id: `demo-verlauf-${String(index + 1).padStart(2, '0')}`,
      date: entry.date,
      content: entry.content,
      pageType: 'verlauf' as const,
      sectionLabel: strings.verlaufSectionLabel,
      source: 'manual' as const,
    }))
  }

  function labGraphNote(parameter: string, drawIndex: number): string {
    const notes = strings.labGraphNotes
    if (matchesLabKeyword(parameter, ['prolactin', 'prolaktin'])) {
      return drawIndex === 0 ? notes.prolactin0 : notes.prolactin1
    }
    if (matchesLabKeyword(parameter, ['triglyceride'])) {
      return drawIndex === 1 ? notes.triglycerides1 : ''
    }
    if (matchesLabKeyword(parameter, ['hba1c'])) {
      return drawIndex === 1 ? notes.hba1c1 : ''
    }
    if (matchesLabKeyword(parameter, ['aripiprazole', 'aripiprazol'])) {
      return drawIndex === 0 ? notes.aripiprazole0 : notes.aripiprazole1
    }
    return ''
  }

  function laborBefundLabel(kind: 'admission' | 'followup' | 'anthro' | 'glucose'): string {
    return strings.laborBefundLabels[kind]
  }

  function laborBefundHeader(date: string, label: string): string {
    return `${strings.laborBefundHeaderPrefix} ${date}${label ? ` — ${label}` : ''}`
  }

  function labGraphTitle(): string {
    return strings.labGraphTitle
  }

  function timelineTitle(): string {
    return strings.timelineTitle
  }

  function medMarkerNote(kind: 'increased' | 'started'): string {
    return strings.medMarkerNotes[kind]
  }

  function labGraphParams() {
    return strings.labGraphParams
  }

  function buildLaborCategories() {
    return {
      befund1: buildLaborCategoriesFromStrings('befund1', strings.laborCategories.befund1),
      befund2: buildLaborCategoriesFromStrings('befund2', strings.laborCategories.befund2),
      anthro: buildLaborCategoriesFromStrings('anthro', strings.laborCategories.anthro),
      glucose: buildLaborCategoriesFromStrings('glucose', strings.laborCategories.glucose),
    }
  }

  function buildDiagnoses(now: string): DiagnoseEntry[] {
    return DIAGNOSIS_CODES.map((codes, index) => {
      const labels = strings.diagnoses[index]
      return {
        id: `demo-dx-0${index + 1}`,
        icd10: { code: codes.icd10, label: labels.icd10Label, overridden: false },
        icd11: { code: codes.icd11, label: labels.icd11Label, overridden: false },
        dsm: { code: codes.dsm, label: labels.dsmLabel, overridden: false },
        createdAt: now,
        updatedAt: now,
      }
    })
  }

  function buildMedicationPlanState(now: string): MedicationPlanState {
    const med = strings.medication
    return {
      version: MEDICATION_PLAN_STATE_VERSION,
      updatedAt: now,
      currentPlanId: 'demo-med-plan-01',
      plans: [
        {
          id: 'demo-med-plan-01',
          caseId: DEMO_CASE_ID,
          createdAt: now,
          isCurrent: true,
          medications: [
            {
              id: 'demo-med-aripiprazol',
              substance: med.aripiprazole.substance,
              formulation: 'tablet' as const,
              strength: '10 mg',
              doseSchedule: { morning: '1', noon: '', evening: '', night: '', unit: med.doseScheduleUnit },
              doseLineGerman: med.aripiprazole.doseLine,
              prn: false,
              startDate: '2026-06-09',
              indication: med.aripiprazole.indication,
              status: 'active' as const,
              reasonForChange: med.aripiprazole.reasonForChange,
              sideEffects: med.aripiprazole.sideEffects,
              adherenceNote: med.aripiprazole.adherenceNote,
              freeTextLine: '',
              introducedAt: '2026-06-09T09:00:00.000Z',
              lastChangeAt: '2026-06-09T09:00:00.000Z',
              lastChangeType: 'start' as const,
              history: [
                {
                  id: 'demo-med-hist-01',
                  changedAt: '2026-06-09T09:00:00.000Z',
                  changeType: 'start' as const,
                  note: med.aripiprazole.historyStartNote,
                  snapshot: {
                    substance: med.aripiprazole.substance,
                    formulation: 'tablet' as const,
                    strength: '10 mg',
                    doseSchedule: { morning: '1', noon: '', evening: '', night: '', unit: med.doseScheduleUnit },
                    doseLineGerman: med.aripiprazole.doseLine,
                    status: 'active' as const,
                    reasonForChange: med.aripiprazole.historySnapshotReason,
                  },
                },
              ],
            },
            {
              id: 'demo-med-risperidon',
              substance: med.risperidone.substance,
              formulation: 'tablet' as const,
              strength: '3 mg',
              doseSchedule: { morning: '', noon: '', evening: '1', night: '', unit: med.doseScheduleUnit },
              doseLineGerman: med.risperidone.doseLine,
              prn: false,
              startDate: '2026-06-02',
              indication: med.risperidone.indication,
              status: 'discontinued' as const,
              reasonForChange: med.risperidone.reasonForChange,
              sideEffects: med.risperidone.sideEffects,
              adherenceNote: med.risperidone.adherenceNote,
              freeTextLine: '',
              introducedAt: '2026-06-02T08:00:00.000Z',
              lastChangeAt: '2026-06-09T08:00:00.000Z',
              lastChangeType: 'discontinue' as const,
              history: [],
            },
            {
              id: 'demo-med-lorazepam',
              substance: med.lorazepam.substance,
              formulation: 'tablet' as const,
              strength: '1 mg',
              doseSchedule: { morning: '', noon: '', evening: '', night: '', unit: 'mg', prn: true },
              doseLineGerman: med.lorazepam.doseLine,
              prn: true,
              startDate: '2026-06-02',
              indication: med.lorazepam.indication,
              status: 'active' as const,
              reasonForChange: med.lorazepam.reasonForChange,
              sideEffects: med.lorazepam.sideEffects,
              adherenceNote: med.lorazepam.adherenceNote,
              freeTextLine: '',
              introducedAt: '2026-06-02T08:00:00.000Z',
              lastChangeAt: '2026-06-02T08:00:00.000Z',
              lastChangeType: 'prn' as const,
              history: [],
            },
          ],
        },
      ],
      sideEffectReports: [
        {
          id: 'demo-se-01',
          symptom: med.sideEffectReport.symptom,
          onsetDate: '2026-06-12',
          severity: med.sideEffectReport.severity,
          suspectedMedicationId: 'demo-med-aripiprazol',
          temporalRelation: med.sideEffectReport.temporalRelation,
          actionTaken: med.sideEffectReport.actionTaken,
          outcome: med.sideEffectReport.outcome,
          note: med.sideEffectReport.note,
          attribution: 'single' as const,
        },
      ],
      labCorrelationNotes: med.labCorrelationNotes,
    }
  }

  function buildClinicalImprints(now: string, verlaufFeed: VerlaufFeedEntry[]): ClinicalImprintIndex {
    const imprintStrings = strings.clinicalImprints
    const med = strings.medication
    return {
      version: 1,
      updatedAt: now,
      imprints: verlaufFeed.slice(0, 12).map((entry, index) => ({
        imprintKey: `verlauf:${entry.id}`,
        patientId: DEMO_PATIENT_ID,
        caseId: DEMO_CASE_ID,
        sourceType: 'verlauf' as const,
        sourceId: entry.id,
        sourceDate: entry.date.slice(0, 10),
        createdAt: entry.date,
        readableClinicalSentence: entry.content,
        clinicalDomain: 'psychopathology' as const,
        symptoms: index % 2 === 0 ? imprintStrings.symptomsA : imprintStrings.symptomsB,
        severity: index > 4 ? imprintStrings.severityMid : imprintStrings.severityHigh,
        courseDirection: index > 6 ? ('improved' as const) : ('worsened' as const),
        affect: imprintStrings.affect,
        drive: imprintStrings.drive,
        thoughtForm: imprintStrings.thoughtForm,
        thoughtContent: imprintStrings.thoughtContent,
        perception: null,
        selfDisturbance: null,
        cognition: imprintStrings.cognition,
        sleep: imprintStrings.sleep,
        cooperation: imprintStrings.cooperation,
        insight: imprintStrings.insight,
        riskSelf: imprintStrings.riskSelf,
        riskOthers: imprintStrings.riskOthers,
        aggression: imprintStrings.aggression,
        suicidality: imprintStrings.suicidality,
        functioning: imprintStrings.functioning,
        socialInteraction: imprintStrings.socialInteraction,
        hygieneSelfCare: imprintStrings.hygieneSelfCare,
        medicationMentioned: [med.risperidone.substance, med.aripiprazole.substance],
        medicationResponse: index > 6 ? imprintStrings.medicationResponse : null,
        sideEffects: index > 5 ? imprintStrings.sideEffects : null,
        adherence: imprintStrings.adherence,
        diagnosisHints: ['F20.0'],
        differentialDiagnosisHints: imprintStrings.differentialDiagnosisHints,
        uncertainty: imprintStrings.uncertainty,
        evidenceStrength: 'direct_observation' as const,
        evidenceText: entry.content,
        evidenceQuoteRange: null,
        analysisEligible: true,
        excludeReason: null,
      })),
    }
  }

  function buildWorkspaceDocuments(now: string, aufnahmeSections: Record<string, string>) {
    const ws = strings.workspace
    return {
      documents: {
        aufnahme: {
          documentTypeId: 'aufnahme',
          pageHeading: ws.pageHeadings.aufnahme,
          sectionContents: aufnahmeSections,
          savedAt: now,
        },
        verlauf: {
          documentTypeId: 'verlauf',
          pageHeading: ws.pageHeadings.verlauf,
          sectionContents: ws.verlaufSections,
          savedAt: now,
        },
        psychopath: {
          documentTypeId: 'psychopath',
          pageHeading: ws.pageHeadings.psychopath,
          sectionContents: { free: ws.psychopathFree },
          savedAt: now,
        },
        'therapie-verlauf': {
          documentTypeId: 'therapie-verlauf',
          pageHeading: ws.pageHeadings['therapie-verlauf'],
          sectionContents: { body: ws.therapieVerlaufBody },
          savedAt: now,
        },
        medikation: {
          documentTypeId: 'medikation',
          pageHeading: ws.pageHeadings.medikation,
          sectionContents: { body: ws.medikationBody },
          savedAt: now,
        },
        therapieplanung: {
          documentTypeId: 'therapieplanung',
          pageHeading: ws.pageHeadings.therapieplanung,
          sectionContents: { body: ws.therapieplanungBody },
          savedAt: now,
        },
      },
      pageHeadings: ws.pageHeadings,
      pageDates: {
        aufnahme: admissionDate,
        verlauf: '2026-06-14',
      },
    }
  }

  function buildTimeline(now: string) {
    const timelineId = 'demo-timeline-01'
    return {
      timelines: [
        {
          id: timelineId,
          title: timelineTitle(),
          layout: 'horizontal' as const,
          entries: strings.timelineEntries,
          updatedAt: now,
        },
      ],
      activeTimelineId: timelineId,
    }
  }

  function buildPsychotherapyPlan(now: string): PsychotherapyPlan {
    const psy = strings.psychotherapy
    return {
      version: PSYCHOTHERAPY_PLAN_VERSION,
      updatedAt: now,
      overview: {
        status: 'active',
        therapist: psy.therapist,
        setting: 'individual',
        frequency: psy.frequency,
        startDate: '2026-06-06',
      },
      indication: psy.indication,
      goals: {
        shortTerm: [{ id: 'demo-goal-1', text: psy.shortTermGoal, status: 'in-progress' }],
        mediumTerm: [{ id: 'demo-goal-2', text: psy.mediumTermGoal, status: 'open' }],
        longTerm: [],
      },
      stages: [
        { id: 'demo-stage-1', stageId: 'stabilization', status: 'active', order: 1 },
        { id: 'demo-stage-2', stageId: 'psychoeducation', status: 'planned', order: 2 },
      ],
      methods: [{ id: 'demo-method-1', methodId: 'supportive', selected: true, notes: psy.methodNotes }],
      plannedSessions: [],
      sessions: psy.sessions.map((session, index) => ({
        id: `demo-psy-${index + 1}`,
        date: index === 0 ? '2026-06-06' : '2026-06-11',
        setting: 'individual' as const,
        duration: '50 min',
        topic: session.topic,
        intervention: session.intervention,
        patientReaction: session.patientReaction,
        progress: index === 0 ? ('on-track' as const) : ('slow' as const),
        riskAspects: session.riskAspects,
        nextFocus: session.nextFocus,
        generatedParagraph: session.generatedParagraph,
        createdAt: now,
      })),
      review: { progress: psy.reviewProgress },
    }
  }

  function buildComplementaryTherapies(now: string): ComplementaryTherapy[] {
    return strings.complementaryTherapies.map((therapy, index) => ({
      id: `demo-komp-${index + 1}`,
      name: therapy.name,
      status: 'active',
      frequency: therapy.frequency,
      mainGoal: therapy.mainGoal,
      participationStatus: therapy.participationStatus,
      startDate: index === 0 ? '2026-06-04' : '2026-06-03',
      createdAt: now,
      updatedAt: now,
      sessions: therapy.sessionNote
        ? [{ id: 'demo-komp-s1', date: '2026-06-06', note: therapy.sessionNote }]
        : undefined,
    }))
  }

  function buildWeitereTherapie(now: string): WeitereTherapie[] {
    return strings.weitereTherapie.map((therapy, index) => ({
      id: `demo-weitere-${index + 1}`,
      type: therapy.type,
      status: 'ongoing',
      indication: therapy.indication,
      startDate: '2026-06-05',
      responsible: therapy.responsible,
      notes: therapy.notes,
      createdAt: now,
      updatedAt: now,
    }))
  }

  function buildSozialtherapie(now: string): SozialtherapieTarget[] {
    const areas: SozialtherapieTarget['area'][] = ['wohnen', 'arbeit']
    const statuses: SozialtherapieTarget['status'][] = ['in-progress', 'open']
    return strings.sozialtherapie.map((entry, index) => ({
      id: `demo-sozial-${index + 1}`,
      area: areas[index],
      status: statuses[index],
      goal: entry.goal,
      currentMeasure: entry.currentMeasure,
      responsibleRole: entry.responsibleRole,
      createdAt: now,
      updatedAt: now,
    }))
  }

  function buildDokumente(
    _now: string,
    aufnahmeSections: Record<string, string>,
    verlaufFeed: VerlaufFeedEntry[],
    laborBefunde: DemoPatientFixture['laborBefunde'],
  ): DokumentEntry[] {
    const doc = strings.dokumente
    return [
      {
        id: 'demo-doc-anamnese',
        caseId: DEMO_CASE_ID,
        category: 'anamnese',
        title: doc.anamneseTitle,
        content: doc.anamneseContent,
        date: `${admissionDate}T12:00:00.000Z`,
        source: 'manual',
        pageType: 'aufnahme',
        sectionContents: aufnahmeSections,
      },
      {
        id: 'demo-doc-verlauf',
        caseId: DEMO_CASE_ID,
        category: 'arztbrief',
        title: doc.verlaufTitle,
        content: verlaufFeed.map((entry) => entry.content).join('\n\n'),
        date: '2026-06-14T08:00:00.000Z',
        source: 'manual',
        pageType: 'verlauf',
      },
      {
        id: 'demo-doc-medplan',
        caseId: DEMO_CASE_ID,
        category: 'formulare',
        title: doc.medplanTitle,
        content: doc.medplanContent,
        date: '2026-06-14T08:00:00.000Z',
        source: 'manual',
        pageType: 'medikation',
      },
      {
        id: 'demo-doc-arztbrief',
        caseId: DEMO_CASE_ID,
        category: 'arztbrief',
        title: doc.arztbriefTitle,
        content: doc.arztbriefContent,
        date: '2026-06-14T09:00:00.000Z',
        source: 'draft',
        pageType: 'therapie-verlauf',
      },
      ...laborBefunde.map((befund) => {
        const [year, month, day] = befund.date.split('-')
        return {
          id: `demo-doc-${befund.id}`,
          caseId: DEMO_CASE_ID,
          category: 'laborbefunde' as const,
          title: `${doc.labDocTitlePrefix} ${day}.${month}.${year}${befund.label ? ` — ${befund.label}` : ''}`,
          content: befund.rawText,
          date: `${befund.date}T09:00:00.000Z`,
          source: 'manual' as const,
          pageType: 'labor',
          sourceRefId: befund.id,
        }
      }),
    ]
  }

  function buildGeneratedDocuments(now: string): GeneratedDocument[] {
    const gen = strings.generatedDocuments
    return [
      {
        id: 'demo-gen-doc-01',
        templateId: 'demo-template-intern',
        templateVersion: 1,
        caseId: DEMO_CASE_ID,
        patientId: DEMO_PATIENT_ID,
        title: gen.title,
        status: 'draft',
        fieldValues: {
          patient_name: `${DEMO_VORNAME} ${DEMO_NACHNAME}`,
          admission_date: admissionDate,
          discharge_plan: gen.dischargePlan,
        },
        renderedText: gen.renderedText,
        createdAt: now,
        updatedAt: now,
      },
    ]
  }

  function buildCalendarItems(now: string): CalendarItem[] {
    const cal = strings.calendar
    return [
      {
        id: 'demo-cal-01',
        type: 'consultation',
        title: cal.visitTitle,
        patientId: DEMO_PATIENT_ID,
        caseId: DEMO_CASE_ID,
        startTime: '2026-06-14T09:00:00.000Z',
        endTime: '2026-06-14T09:30:00.000Z',
        status: 'scheduled',
        priority: 'normal',
        createdBy: 'demo-user',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'demo-cal-02',
        type: 'medication_review',
        title: cal.medReview,
        caseId: DEMO_CASE_ID,
        startTime: '2026-06-15T10:00:00.000Z',
        endTime: '2026-06-15T10:30:00.000Z',
        status: 'scheduled',
        createdBy: 'demo-user',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'demo-cal-03',
        type: 'other',
        title: cal.psychoGroup,
        caseId: DEMO_CASE_ID,
        startTime: '2026-06-16T14:00:00.000Z',
        endTime: '2026-06-16T15:00:00.000Z',
        status: 'scheduled',
        createdBy: 'demo-user',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'demo-cal-04',
        type: 'consultation',
        title: cal.dischargeMeeting,
        caseId: DEMO_CASE_ID,
        startTime: '2026-06-17T11:00:00.000Z',
        endTime: '2026-06-17T11:45:00.000Z',
        status: 'scheduled',
        priority: 'high',
        createdBy: 'demo-user',
        createdAt: now,
        updatedAt: now,
      },
    ]
  }

  function buildModulePlaceholders(): DemoModulePlaceholders {
    return strings.modulePlaceholders
  }

  function isdmDomain(presence: IsdmPresence, severity?: 0 | 1 | 2 | 3 | 4, notes?: string): IsdmDomainInput {
    return severity != null ? { presence, severity, notes } : { presence, notes }
  }

  function buildIsdmInput(now: string): IsdmInputState {
    const domains = Object.fromEntries(
      ISDM_PHENOMENOLOGY_DOMAINS.map((domainId) => {
        const spec = ISDM_DOMAIN_SPECS[domainId]
        const notes = strings.isdmDomainNotes[domainId]
        return [domainId, isdmDomain(spec.presence, spec.severity, notes)]
      }),
    ) as Record<(typeof ISDM_PHENOMENOLOGY_DOMAINS)[number], IsdmDomainInput>

    return {
      version: ISDM_INPUT_VERSION,
      updatedAt: now,
      domains,
    }
  }

  function buildButterflyAttestations(): ClinicianAttestationState {
    const attestedAt = '2026-06-13T15:00:00.000Z'
    return Object.fromEntries(
      BUTTERFLY_ATTESTATION_ENTRIES.map(([criterionId, value]) => [criterionId, { value, attestedAt }]),
    )
  }

  function buildClinicalQuestionNotes(now: string): ClinicalQuestionNoteState {
    const notes: ClinicalQuestionNoteState = {}
    for (const entry of strings.clinicalQuestionNotes) {
      const questionId = clinicalQuestionId('diagnosis_criteria', entry.criterionId)
      notes[questionId] = {
        questionId,
        sectionId: 'diagnosis_criteria',
        targetId: entry.criterionId,
        note: entry.note,
        updatedAt: now,
      }
    }
    return notes
  }

  function buildAnforderungen(admissionDateParam: string): Anforderung[] {
    const stringByCatalogId = new Map(strings.anforderungen.map((entry) => [entry.catalogId, entry]))
    return ANFORDERUNG_META.map((meta, index) => {
      const copy = stringByCatalogId.get(meta.catalogId)
      if (!copy) {
        throw new Error(`Missing demo anforderung strings for catalogId ${meta.catalogId}`)
      }
      return {
        ...meta,
        id: `demo-anf-${String(index + 1).padStart(2, '0')}`,
        label: copy.label,
        note: copy.note,
        createdByDisplayName: copy.createdByDisplayName,
        reviewedByDisplayName: copy.reviewedByDisplayName,
        createdAt:
          meta.catalogId === 'lab-metabolisches-basis'
            ? `${admissionDateParam}T10:00:00.000Z`
            : meta.createdAt,
      }
    })
  }

  function buildEegBefund(): BefundRecord {
    return {
      id: 'demo-befund-eeg-01',
      caseId: DEMO_CASE_ID,
      type: 'eeg',
      schemaVersion: 1,
      fieldValues: {
        background: ['alpha_dominant', 'theta'],
        reactivity: 'normal',
        focal: ['none'],
        focal_slowing: false,
        epileptiform: ['none'],
        sleep: ['wake'],
        activation: ['hv'],
        conclusion_preset: ['mild_slow'],
        conclusion_free: strings.eegConclusionFree,
      },
      status: 'vidert',
      examDate: '2026-06-11',
      createdAt: '2026-06-11T15:00:00.000Z',
      updatedAt: '2026-06-11T16:00:00.000Z',
      vidertAt: '2026-06-11T16:00:00.000Z',
    }
  }

  function buildAiTherapyDemo(now: string): NonNullable<DemoPatientFixture['aiTherapyDemo']> {
    const med = strings.medication
    const ai = strings.aiTherapy
    const comboKeyAL = buildCombinationKeyFromNames(med.aripiprazole.substance, med.lorazepam.substance)
    const comboKeyCannabis = buildCombinationKeyFromNames(med.aripiprazole.substance, 'Cannabis')
    const prolactinKey = buildCorrelationKey('risperidon', 'prolaktin')
    const ccKb = ai.combinationCheck.aripiprazoleLorazepamKb
    const ccAi = ai.combinationCheck.aripiprazoleLorazepamAi
    const ccCannabis = ai.combinationCheck.aripiprazoleCannabisKb
    const lmcRisperidone = ai.labMedCorrelation.risperidoneProlactinKb
    const lmcCholesterol = ai.labMedCorrelation.aripiprazoleCholesterolAi
    const lmcProlactin = ai.labMedCorrelation.aripiprazoleProlactinAi
    const prep = ai.prepAiCheck

    const combinationCheck: CombinationCheckStore = {
      version: COMBINATION_CHECK_STORE_VERSION,
      caseId: DEMO_CASE_ID,
      updatedAt: now,
      findings: [
        {
          id: 'demo-cc-kb-01',
          caseId: DEMO_CASE_ID,
          combinationKey: comboKeyAL,
          substanceAName: med.aripiprazole.substance,
          substanceBName: med.lorazepam.substance,
          interactionType: 'additive_side_effect',
          severity: 'moderate',
          mainRisk: ccKb.mainRisk,
          mechanism: ccKb.mechanism,
          monitoring: ccKb.monitoring,
          clinicalManagement: ccKb.clinicalManagement,
          source: 'knowledge_base',
          status: 'verified_kb',
          kbResult: {
            combinationKey: comboKeyAL,
            substanceAId: 'aripiprazol',
            substanceBId: 'lorazepam',
            substanceAName: med.aripiprazole.substance,
            substanceBName: med.lorazepam.substance,
            interactionType: 'additive_side_effect',
            severity: 'moderate',
            mainRisk: ccKb.mainRisk,
            mechanism: ccKb.mechanism,
            monitoring: ccKb.monitoring,
            clinicalManagement: ccKb.clinicalManagement,
            source: 'knowledge_base',
            kbInteractionId: 'demo-kb-cc-01',
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'demo-cc-ai-01',
          caseId: DEMO_CASE_ID,
          combinationKey: comboKeyAL,
          substanceAName: med.aripiprazole.substance,
          substanceBName: med.lorazepam.substance,
          interactionType: 'additive_side_effect',
          severity: 'moderate',
          mainRisk: ccAi.mainRisk,
          mechanism: ccAi.mechanism,
          monitoring: ccAi.monitoring,
          clinicalManagement: ccAi.clinicalManagement,
          source: 'clinician_accepted',
          status: 'accepted',
          aiResult: {
            combinationKey: comboKeyAL,
            substanceAName: med.aripiprazole.substance,
            substanceBName: med.lorazepam.substance,
            interactionType: 'additive_side_effect',
            severity: 'moderate',
            mainRisk: ccAi.mainRisk,
            mechanism: ccAi.mechanism,
            monitoring: ccAi.monitoring,
            clinicalManagement: ccAi.clinicalManagement,
            rationale: ccAi.rationale,
          },
          aiRunId: 'demo-cc-run-01',
          provenance: 'DeepSeek (deepseek-chat)',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'demo-cc-kb-02',
          caseId: DEMO_CASE_ID,
          combinationKey: comboKeyCannabis,
          substanceAName: med.aripiprazole.substance,
          substanceBName: 'Cannabis',
          interactionType: 'pharmacodynamic',
          severity: 'low',
          mainRisk: ccCannabis.mainRisk,
          mechanism: ccCannabis.mechanism,
          monitoring: ccCannabis.monitoring,
          clinicalManagement: ccCannabis.clinicalManagement,
          source: 'knowledge_base',
          status: 'verified_kb',
          createdAt: now,
          updatedAt: now,
        },
      ],
      aiRuns: [
        {
          id: 'demo-cc-run-01',
          caseId: DEMO_CASE_ID,
          combinationKey: comboKeyAL,
          status: 'accepted',
          thorough: false,
          result: {
            combinationKey: comboKeyAL,
            substanceAName: med.aripiprazole.substance,
            substanceBName: med.lorazepam.substance,
            interactionType: 'additive_side_effect',
            severity: 'moderate',
            mainRisk: ccAi.mainRisk,
            monitoring: ccAi.monitoring,
            clinicalManagement: ccAi.clinicalManagement,
          },
          dbResult: null,
          hasConflict: false,
          createdAt: now,
          reviewedAt: now,
          aiProvider: 'deepseek',
          aiModelLabel: 'DeepSeek (deepseek-chat)',
        },
      ],
      kbSubmissionCandidates: [],
    }

    const labMedCorrelation: LabMedicationCorrelationStore = {
      version: LAB_MED_CORRELATION_STORE_VERSION,
      caseId: DEMO_CASE_ID,
      updatedAt: now,
      findings: [
        {
          id: 'demo-lmc-01',
          caseId: DEMO_CASE_ID,
          correlationKey: prolactinKey,
          labParameter: 'prolaktin',
          labParameterLabel: lmcRisperidone.labParameterLabel,
          labValue: '48',
          labUnit: 'ng/ml',
          refRange: '4–15',
          abnormality: 'high',
          labDate: LAB_BEFUND_1_DATE,
          trend: 'rising',
          substanceId: 'risperidon',
          substanceName: med.risperidone.substance,
          medicationId: 'demo-med-risperidon',
          medStartDate: '2026-06-02',
          lastDoseChangeDate: '2026-06-09',
          temporalPlausibility: 'highly_plausible',
          zusammenhang: lmcRisperidone.zusammenhang,
          mechanism: lmcRisperidone.mechanism,
          recommendation: lmcRisperidone.recommendation,
          monitoring: lmcRisperidone.monitoring,
          correlationStrength: 'concerning',
          source: 'knowledge_base',
          status: 'verified_kb',
          kbResult: {
            correlationKey: prolactinKey,
            substanceId: 'risperidon',
            substanceName: med.risperidone.substance,
            labParameter: 'prolaktin',
            labParameterLabelDe: lmcRisperidone.labParameterLabel,
            correlationStrength: 'concerning',
            zusammenhang: lmcRisperidone.zusammenhang,
            recommendation: lmcRisperidone.recommendation,
            source: 'knowledge_base',
            kbRuleId: 'demo-kb-lmc-01',
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'demo-lmc-02',
          caseId: DEMO_CASE_ID,
          correlationKey: buildCorrelationKey('aripiprazol', 'cholesterin_gesamt'),
          labParameter: 'cholesterin_gesamt',
          labParameterLabel: lmcCholesterol.labParameterLabel,
          labValue: '192',
          labUnit: 'mg/dl',
          refRange: '<200',
          abnormality: 'normal_but_changed',
          labDate: LAB_BEFUND_2_DATE,
          trend: 'stable',
          substanceId: 'aripiprazol',
          substanceName: med.aripiprazole.substance,
          medicationId: 'demo-med-aripiprazol',
          medStartDate: '2026-06-09',
          temporalPlausibility: 'plausible',
          zusammenhang: lmcCholesterol.zusammenhang,
          recommendation: lmcCholesterol.recommendation,
          monitoring: lmcCholesterol.monitoring,
          correlationStrength: 'monitoring_required',
          source: 'clinician_accepted',
          status: 'accepted',
          aiResult: {
            correlationKey: buildCorrelationKey('aripiprazol', 'cholesterin_gesamt'),
            substanceName: med.aripiprazole.substance,
            labParameter: 'cholesterin_gesamt',
            labParameterLabelDe: lmcCholesterol.labParameterLabel,
            correlationStrength: 'monitoring_required',
            zusammenhang: lmcCholesterol.zusammenhang,
            recommendation: lmcCholesterol.recommendation,
            temporalPlausibility: 'plausible',
            provenance: 'DeepSeek (deepseek-chat)',
          },
          aiRunId: 'demo-lmc-run-01',
          provenance: 'DeepSeek (deepseek-chat)',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'demo-lmc-03',
          caseId: DEMO_CASE_ID,
          correlationKey: buildCorrelationKey('aripiprazol', 'prolaktin'),
          labParameter: 'prolaktin',
          labParameterLabel: lmcProlactin.labParameterLabel,
          labValue: '12',
          labUnit: 'ng/ml',
          refRange: '4–15',
          abnormality: 'normal',
          labDate: LAB_BEFUND_2_DATE,
          trend: 'falling',
          substanceId: 'aripiprazol',
          substanceName: med.aripiprazole.substance,
          medicationId: 'demo-med-aripiprazol',
          medStartDate: '2026-06-09',
          temporalPlausibility: 'plausible',
          zusammenhang: lmcProlactin.zusammenhang,
          recommendation: lmcProlactin.recommendation,
          monitoring: lmcProlactin.monitoring,
          correlationStrength: 'plausible',
          source: 'ai_suggestion',
          status: 'pending_clinician_review',
          aiResult: {
            correlationKey: buildCorrelationKey('aripiprazol', 'prolaktin'),
            substanceName: med.aripiprazole.substance,
            labParameter: 'prolaktin',
            labParameterLabelDe: lmcProlactin.labParameterLabel,
            correlationStrength: 'plausible',
            zusammenhang: lmcProlactin.zusammenhang,
            recommendation: lmcProlactin.recommendation,
            temporalPlausibility: 'plausible',
          },
          aiRunId: 'demo-lmc-run-02',
          provenance: 'DeepSeek (deepseek-chat)',
          createdAt: now,
          updatedAt: now,
        },
      ],
      aiRuns: [
        {
          id: 'demo-lmc-run-01',
          caseId: DEMO_CASE_ID,
          findingId: 'demo-lmc-02',
          correlationKey: buildCorrelationKey('aripiprazol', 'cholesterin_gesamt'),
          provider: 'deepseek',
          status: 'accepted',
          inputSnapshot: { labDate: LAB_BEFUND_2_DATE, substance: med.aripiprazole.substance },
          outputJson: {
            correlationKey: buildCorrelationKey('aripiprazol', 'cholesterin_gesamt'),
            substanceName: med.aripiprazole.substance,
            labParameter: 'cholesterin_gesamt',
            labParameterLabelDe: lmcCholesterol.labParameterLabel,
            correlationStrength: 'monitoring_required',
            zusammenhang: lmcCholesterol.zusammenhang,
            recommendation: lmcCholesterol.recommendation,
          },
          createdAt: now,
          reviewedAt: now,
        },
        {
          id: 'demo-lmc-run-02',
          caseId: DEMO_CASE_ID,
          findingId: 'demo-lmc-03',
          correlationKey: buildCorrelationKey('aripiprazol', 'prolaktin'),
          provider: 'deepseek',
          status: 'pending_clinician_review',
          inputSnapshot: { labDate: LAB_BEFUND_2_DATE, substance: med.aripiprazole.substance },
          outputJson: {
            correlationKey: buildCorrelationKey('aripiprazol', 'prolaktin'),
            substanceName: med.aripiprazole.substance,
            labParameter: 'prolaktin',
            labParameterLabelDe: lmcProlactin.labParameterLabel,
            correlationStrength: 'plausible',
            zusammenhang: lmcProlactin.zusammenhang,
            recommendation: lmcProlactin.recommendation,
          },
          createdAt: now,
        },
      ],
      kbSubmissionCandidates: [],
    }

    const prepAiCheck: PrepAiCheckCache = {
      version: 1,
      caseId: DEMO_CASE_ID,
      updatedAt: now,
      entries: [
        {
          medicationId: 'demo-med-aripiprazol',
          substance: med.aripiprazole.substance,
          cachedAt: now,
          response: {
            preparations: [
              {
                brandName: 'Abilify',
                strength: '10 mg',
                form: prep.formTablets,
                availabilityNote: prep.aripiprazoleAvailabilityStandard,
                sourceHint: 'Fachinformation',
              },
              {
                brandName: 'Aripiprazol-ratiopharm',
                strength: '10 mg',
                form: prep.formTablets,
                availabilityNote: prep.aripiprazoleAvailabilityGeneric,
              },
            ],
            disclaimer: prep.aripiprazoleDisclaimer,
            country: 'DE',
            model: { provider: 'deepseek', modelId: 'deepseek-chat', label: 'DeepSeek (deepseek-chat)' },
            source: 'deepseek',
            sourceLabel: 'DeepSeek (deepseek-chat)',
          },
        },
        {
          medicationId: 'demo-med-lorazepam',
          substance: med.lorazepam.substance,
          cachedAt: now,
          response: {
            preparations: [
              {
                brandName: 'Tavor',
                strength: '1 mg',
                form: prep.formTablets,
                availabilityNote: prep.lorazepamAvailabilityBtm,
              },
              {
                brandName: 'Lorazepam',
                strength: '1 mg',
                form: prep.formTablets,
                availabilityNote: prep.lorazepamAvailabilityGeneric,
              },
            ],
            disclaimer: prep.lorazepamDisclaimer,
            country: 'DE',
            model: { provider: 'deepseek', modelId: 'deepseek-chat', label: 'DeepSeek (deepseek-chat)' },
            source: 'deepseek',
            sourceLabel: 'DeepSeek (deepseek-chat)',
          },
        },
      ],
    }

    return { combinationCheck, labMedCorrelation, prepAiCheck }
  }

  return {
    locale,
    admissionDate,
    verlaufSectionLabel: strings.verlaufSectionLabel,
    buildAufnahmeSections,
    buildVerlaufFeedInputs,
    buildVerlaufFeed,
    labGraphNote,
    laborBefundLabel,
    laborBefundHeader,
    labGraphTitle,
    timelineTitle,
    medMarkerNote,
    labGraphParams,
    buildLaborCategories,
    buildDiagnoses,
    buildMedicationPlanState,
    buildClinicalImprints,
    buildWorkspaceDocuments,
    buildTimeline,
    buildPsychotherapyPlan,
    buildComplementaryTherapies,
    buildWeitereTherapie,
    buildSozialtherapie,
    buildDokumente,
    buildGeneratedDocuments,
    buildCalendarItems,
    buildModulePlaceholders,
    buildIsdmInput,
    buildButterflyAttestations,
    buildClinicalQuestionNotes,
    buildAnforderungen,
    buildEegBefund,
    buildAiTherapyDemo,
  }
}

export {
  LAB_BEFUND_1_DATE,
  LAB_BEFUND_2_DATE,
  LAB_BEFUND_ANTHRO_DATE,
  LAB_BEFUND_GLUCOSE_DATE,
  DEMO_DOB,
  DEMO_VORNAME,
  DEMO_NACHNAME,
}
