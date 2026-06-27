/**
 * Extended demo fixture modules — ISDM, Butterfly, orders, clinical question notes.
 * Used by buildDemoPatientFixture for a comprehensive workflow showcase.
 */

import { buildIsdmAnalysis } from '../utils/isdm/buildAnalysis'
import { clinicalQuestionId } from '../utils/clinicalQuestions/ids'
import type { Anforderung } from '../types/anforderung'
import type { BefundRecord } from '../types/befund'
import type { IsdmClinicalAnalysis, IsdmInputState } from '../types/isdm'
import {
  ISDM_INPUT_VERSION,
  ISDM_PHENOMENOLOGY_DOMAINS,
  type IsdmDomainInput,
  type IsdmPresence,
} from '../types/isdm'
import type { ClinicianAttestationState } from '../utils/butterfly/attestationStorage'
import type { ClinicalQuestionNoteState } from '../utils/clinicalQuestions/answerNotes'
import type { DiagnoseEntry } from '../utils/diagnosenArchive'
import type { ClinicalImprintIndex } from '../types/clinicalImprint'
import type { MedicationPlanState } from '../types/medicationPlan'
import type { VerlaufFeedEntry } from '../utils/verlaufFeed'
import { DEMO_CASE_ID } from './constants'

const NOW = '2026-06-14T10:00:00.000Z'

function domain(
  presence: IsdmPresence,
  severity?: 0 | 1 | 2 | 3 | 4,
  notes?: string,
): IsdmDomainInput {
  return severity != null ? { presence, severity, notes } : { presence, notes }
}

export function buildDemoIsdmInput(): IsdmInputState {
  const domains = {
    appearance_behavior: domain('present', 2, 'Suspicious baseline posture, reduced facial expression'),
    speech_language: domain('present', 2, 'Brief answers, occasionally hesitant'),
    consciousness_orientation: domain('present', 1, 'Awake, oriented ×4'),
    attention_concentration: domain('present', 2, 'Attention easily distracted'),
    memory_cognition: domain('present', 1, 'Short-term memory reduced when agitated'),
    mood_affect: domain('present', 3, 'Affect labile between anxious and irritable'),
    drive_psychomotor_activity: domain('present', 2, 'Drive reduced with inner restlessness'),
    formal_thought_disorder: domain('present', 2, 'Mildly circumstantial, occasionally tangential'),
    thought_content: domain('present', 3, 'Paranoid interpretations of everyday events'),
    delusions_overvalued_ideas: domain('present', 4, 'Persecutory and surveillance beliefs without full insight'),
    perception_hallucinations: domain('unclear', 1, 'Auditory hallucinations in history; not clear at exam'),
    self_experience_ego_disturbance: domain('absent', undefined, 'No clear passivity experiences at exam'),
    anxiety_panic_phobic_symptoms: domain('present', 2, 'Situational anxiety in public spaces'),
    obsessions_compulsions: domain('absent'),
    trauma_intrusions_dissociation: domain('absent'),
    somatic_preoccupation: domain('present', 1, 'Occasional somatic complaints under stress'),
    sleep_appetite_vegetative: domain('present', 3, 'Sleep deficit, reduced appetite'),
    substance_related_features: domain('present', 3, 'Daily cannabis, episodic amphetamine use'),
    personality_interpersonal_style: domain('present', 2, 'Social withdrawal, mistrustful'),
    insight_judgment: domain('present', 3, 'Low illness insight; judgment impaired'),
    risk_self: domain('present', 2, 'Passive death wishes without concrete plan'),
    risk_others: domain('absent', undefined, 'No indicators of risk to others'),
    functional_impairment: domain('present', 3, 'Occupational and social function markedly impaired'),
  } as Record<(typeof ISDM_PHENOMENOLOGY_DOMAINS)[number], IsdmDomainInput>

  return {
    version: ISDM_INPUT_VERSION,
    updatedAt: NOW,
    domains,
  }
}

export function buildDemoButterflyAttestations(): ClinicianAttestationState {
  const attestedAt = '2026-06-13T15:00:00.000Z'
  const entries: Array<[string, 'met' | 'not_met']> = [
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
  return Object.fromEntries(
    entries.map(([criterionId, value]) => [criterionId, { value, attestedAt }]),
  )
}

export function buildDemoClinicalQuestionNotes(): ClinicalQuestionNoteState {
  const notes: ClinicalQuestionNoteState = {}
  const add = (criterionId: string, note: string) => {
    const questionId = clinicalQuestionId('diagnosis_criteria', criterionId)
    notes[questionId] = {
      questionId,
      sectionId: 'diagnosis_criteria',
      targetId: criterionId,
      note,
      updatedAt: NOW,
    }
  }
  add(
    'f20.delusions',
    'Patient reports neighbours watching her via cameras for weeks; police contacts without substantiated evidence.',
  )
  add(
    'f20.duration_one_month',
    'Paranoid symptoms and sleep deficit for ~5 weeks, worsening over the last 14 days.',
  )
  add(
    'f20.exclude_organic_substance',
    'Cannabis and amphetamine use documented, but timeline and symptom pattern extend beyond intoxication alone.',
  )
  add(
    '6a20.persistent_delusions',
    'Persistent persecutory ideas despite lack of external confirmation; partial insight in interview.',
  )
  return notes
}

export function buildDemoAnforderungen(admissionDate: string): Anforderung[] {
  const base = `${admissionDate}T10:00:00.000Z`
  const orders: Array<Omit<Anforderung, 'id'>> = [
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'lab-metabolisches-basis',
      category: 'labor',
      label: 'Metabolic baseline panel',
      note: 'Admission labs incl. electrolytes, renal function, glucose',
      urgency: 'urgent',
      requestedDate: '2026-06-05',
      status: 'accepted',
      createdAt: base,
      updatedAt: '2026-06-05T14:00:00.000Z',
      createdByDisplayName: 'Dr Demo (Consultant)',
      reviewedAt: '2026-06-05T14:00:00.000Z',
      reviewedByDisplayName: 'Laboratory',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'lab-prolaktin',
      category: 'labor',
      label: 'Prolactin',
      note: 'On risperidone — follow-up after switch',
      urgency: 'soon',
      requestedDate: '2026-06-20',
      status: 'accepted',
      createdAt: '2026-06-05T09:00:00.000Z',
      updatedAt: '2026-06-20T11:00:00.000Z',
      createdByDisplayName: 'Dr Demo (Consultant)',
      reviewedAt: '2026-06-20T11:00:00.000Z',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'lab-aripiprazol',
      category: 'labor',
      label: 'Aripiprazole level',
      note: 'Trough level after switch — confirm therapeutic range',
      urgency: 'routine',
      requestedDate: '2026-06-20',
      status: 'accepted',
      createdAt: '2026-06-09T09:30:00.000Z',
      updatedAt: '2026-06-20T11:00:00.000Z',
      createdByDisplayName: 'Dr Demo (Consultant)',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'lab-hba1c',
      category: 'labor',
      label: 'HbA1c',
      note: 'Metabolic monitoring on antipsychotics',
      urgency: 'routine',
      requestedDate: '2026-06-20',
      status: 'pending',
      createdAt: '2026-06-12T10:00:00.000Z',
      updatedAt: '2026-06-12T10:00:00.000Z',
      createdByDisplayName: 'Dr Demo (Registrar)',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'befund-ekg',
      category: 'befunde',
      label: 'ECG (12-lead resting)',
      note: 'Before antipsychotic therapy and with QT-relevant agents',
      urgency: 'soon',
      requestedDate: '2026-06-08',
      status: 'accepted',
      createdAt: '2026-06-06T11:00:00.000Z',
      updatedAt: '2026-06-08T10:30:00.000Z',
      createdByDisplayName: 'Dr Demo (Consultant)',
      reviewedAt: '2026-06-08T10:30:00.000Z',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'befund-eeg-ruhe',
      category: 'befunde',
      label: 'EEG (resting)',
      note: 'Work-up for psychotic symptoms and headaches',
      urgency: 'routine',
      requestedDate: '2026-06-11',
      status: 'accepted',
      createdAt: '2026-06-09T14:00:00.000Z',
      updatedAt: '2026-06-11T16:00:00.000Z',
      createdByDisplayName: 'Dr Demo (Consultant)',
      reviewedAt: '2026-06-11T16:00:00.000Z',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'therapie-sport',
      category: 'therapien',
      label: 'Exercise therapy',
      note: 'Drive and sleep regulation — 2×/week',
      urgency: 'routine',
      requestedDate: '2026-06-04',
      status: 'accepted',
      createdAt: '2026-06-03T09:00:00.000Z',
      updatedAt: '2026-06-04T10:00:00.000Z',
      createdByDisplayName: 'Therapy lead (demo)',
      reviewedAt: '2026-06-04T10:00:00.000Z',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'therapie-sozialdienst',
      category: 'therapien',
      label: 'Social services / case management',
      note: 'Discharge preparation, landlord contact',
      urgency: 'soon',
      requestedDate: '2026-06-10',
      status: 'pending',
      createdAt: '2026-06-08T10:00:00.000Z',
      updatedAt: '2026-06-08T10:00:00.000Z',
      createdByDisplayName: 'Nursing (demo)',
    },
  ]

  return orders.map((order, i) => ({
    ...order,
    id: `demo-anf-${String(i + 1).padStart(2, '0')}`,
  }))
}

export function buildDemoEegBefund(): BefundRecord {
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
      conclusion_free:
        'Mild diffuse slowing without epileptiform discharges. No evidence of focal structural pathology.',
    },
    status: 'vidert',
    examDate: '2026-06-11',
    createdAt: '2026-06-11T15:00:00.000Z',
    updatedAt: '2026-06-11T16:00:00.000Z',
    vidertAt: '2026-06-11T16:00:00.000Z',
  }
}

export function buildDemoIsdmAnalysis(input: {
  diagnoses: DiagnoseEntry[]
  clinicalImprints: ClinicalImprintIndex
  medicationPlanState: MedicationPlanState
  verlaufFeed: VerlaufFeedEntry[]
  isdmInput: IsdmInputState
  butterflyAttestations: ClinicianAttestationState
}): IsdmClinicalAnalysis {
  const attestations = Object.fromEntries(
    Object.entries(input.butterflyAttestations).map(([k, v]) => [k, v.value]),
  )
  const verlaufText = input.verlaufFeed.map((e) => e.content).join('\n')
  return buildIsdmAnalysis({
    caseId: DEMO_CASE_ID,
    imprints: input.clinicalImprints,
    checklistSelections: {},
    isdmInput: input.isdmInput,
    diagnoses: input.diagnoses,
    verlaufText,
    medicationPlanState: input.medicationPlanState,
    attestations,
    codingSystem: 'icd10',
  })
}
