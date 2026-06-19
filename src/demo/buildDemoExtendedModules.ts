/**
 * Extended demo fixture modules — ISDM, Butterfly, Anforderungen, clinical question notes.
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
    appearance_behavior: domain('present', 2, 'Misstrauische Grundhaltung, reduzierte Mimik'),
    speech_language: domain('present', 2, 'Antworten knapp, teils zögerlich'),
    consciousness_orientation: domain('present', 1, 'Wach, allseits orientiert'),
    attention_concentration: domain('present', 2, 'Aufmerksamkeit leicht ablenkbar'),
    memory_cognition: domain('present', 1, 'Kurzzeitgedächtnis eingeschränkt bei Unruhe'),
    mood_affect: domain('present', 3, 'Affekt labil zwischen ängstlich und gereizt'),
    drive_psychomotor_activity: domain('present', 2, 'Antrieb reduziert, innere Unruhe'),
    formal_thought_disorder: domain('present', 2, 'Leicht umständlich, teils sprunghaft'),
    thought_content: domain('present', 3, 'Paranoide Interpretationen alltäglicher Ereignisse'),
    delusions_overvalued_ideas: domain('present', 4, 'Verfolgungs- und Beobachtungsideen ohne vollständige Einsicht'),
    perception_hallucinations: domain('unclear', 1, 'Akustische Halluzinationen in Vorgeschichte, aktuell nicht eindeutig'),
    self_experience_ego_disturbance: domain('absent', undefined, 'Keine eindeutigen Ich-Störungen zum Untersuchungszeitpunkt'),
    anxiety_panic_phobic_symptoms: domain('present', 2, 'Situationsangst in öffentlichen Räumen'),
    obsessions_compulsions: domain('absent'),
    trauma_intrusions_dissociation: domain('absent'),
    somatic_preoccupation: domain('present', 1, 'Gelegentliche somatische Beschwerden bei Stress'),
    sleep_appetite_vegetative: domain('present', 3, 'Schlafdefizit, Appetit reduziert'),
    substance_related_features: domain('present', 3, 'Cannabis täglich, episodischer Amphetamin-Konsum'),
    personality_interpersonal_style: domain('present', 2, 'Sozialer Rückzug, misstrauisch'),
    insight_judgment: domain('present', 3, 'Krankheitseinsicht gering, Urteilsfähigkeit eingeschränkt'),
    risk_self: domain('present', 2, 'Passives Todeswünschen ohne konkrete Pläne'),
    risk_others: domain('absent', undefined, 'Keine Hinweise auf Fremdgefährdung'),
    functional_impairment: domain('present', 3, 'Berufliche und soziale Funktion deutlich beeinträchtigt'),
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
    'Patientin berichtet seit Wochen, Nachbarn würden sie über Kameras beobachten; Polizeikontakte ohne belastbare Beweise.',
  )
  add(
    'f20.duration_one_month',
    'Paranoide Symptomatik und Schlafdefizit seit ca. 5 Wochen, zunehmend in den letzten 14 Tagen.',
  )
  add(
    'f20.exclude_organic_substance',
    'Cannabis- und Amphetaminkonsum dokumentiert, jedoch zeitlicher Verlauf und Symptomatik über reine Intoxikation hinaus.',
  )
  add(
    '6a20.persistent_delusions',
    'Anhaltende Verfolgungsideen trotz fehlender externer Bestätigung; teilweise Einsicht im Gespräch.',
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
      label: 'Metabolisches Basislabor',
      note: 'Aufnahmelabor inkl. Elektrolyte, Nierenwerte, Glukose',
      urgency: 'urgent',
      requestedDate: '2026-06-05',
      status: 'accepted',
      createdAt: base,
      updatedAt: '2026-06-05T14:00:00.000Z',
      createdByDisplayName: 'Oberarzt Demo',
      reviewedAt: '2026-06-05T14:00:00.000Z',
      reviewedByDisplayName: 'Labor',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'lab-prolaktin',
      category: 'labor',
      label: 'Prolaktin',
      note: 'Unter Risperidon — Verlaufskontrolle nach Umstellung',
      urgency: 'soon',
      requestedDate: '2026-06-20',
      status: 'accepted',
      createdAt: '2026-06-05T09:00:00.000Z',
      updatedAt: '2026-06-20T11:00:00.000Z',
      createdByDisplayName: 'Oberarzt Demo',
      reviewedAt: '2026-06-20T11:00:00.000Z',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'lab-aripiprazol',
      category: 'labor',
      label: 'Aripiprazolspiegel',
      note: 'Talspiegel nach Umstellung — therapeutischen Bereich prüfen',
      urgency: 'routine',
      requestedDate: '2026-06-20',
      status: 'accepted',
      createdAt: '2026-06-09T09:30:00.000Z',
      updatedAt: '2026-06-20T11:00:00.000Z',
      createdByDisplayName: 'Oberarzt Demo',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'lab-hba1c',
      category: 'labor',
      label: 'HbA1c',
      note: 'Metabolisches Monitoring unter Antipsychotika',
      urgency: 'routine',
      requestedDate: '2026-06-20',
      status: 'pending',
      createdAt: '2026-06-12T10:00:00.000Z',
      updatedAt: '2026-06-12T10:00:00.000Z',
      createdByDisplayName: 'Assistenz Demo',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'befund-ekg',
      category: 'befunde',
      label: 'EKG (12-Kanal-Ruhe)',
      note: 'Vor Antipsychotika-Therapie und bei QT-relevanten Medikamenten',
      urgency: 'soon',
      requestedDate: '2026-06-08',
      status: 'accepted',
      createdAt: '2026-06-06T11:00:00.000Z',
      updatedAt: '2026-06-08T10:30:00.000Z',
      createdByDisplayName: 'Oberarzt Demo',
      reviewedAt: '2026-06-08T10:30:00.000Z',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'befund-eeg-ruhe',
      category: 'befunde',
      label: 'EEG (Ruhe)',
      note: 'Abklärung bei psychotischer Symptomatik und Kopfschmerzen',
      urgency: 'routine',
      requestedDate: '2026-06-11',
      status: 'accepted',
      createdAt: '2026-06-09T14:00:00.000Z',
      updatedAt: '2026-06-11T16:00:00.000Z',
      createdByDisplayName: 'Oberarzt Demo',
      reviewedAt: '2026-06-11T16:00:00.000Z',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'therapie-sport',
      category: 'therapien',
      label: 'Sporttherapie / Bewegungstherapie',
      note: 'Antrieb und Schlafregulation — 2×/Woche',
      urgency: 'routine',
      requestedDate: '2026-06-04',
      status: 'accepted',
      createdAt: '2026-06-03T09:00:00.000Z',
      updatedAt: '2026-06-04T10:00:00.000Z',
      createdByDisplayName: 'Therapieleitung Demo',
      reviewedAt: '2026-06-04T10:00:00.000Z',
    },
    {
      caseId: DEMO_CASE_ID,
      catalogId: 'therapie-sozialdienst',
      category: 'therapien',
      label: 'Sozialdienst / Case Management',
      note: 'Entlassungsvorbereitung, Vermieterkontakt',
      urgency: 'soon',
      requestedDate: '2026-06-10',
      status: 'pending',
      createdAt: '2026-06-08T10:00:00.000Z',
      updatedAt: '2026-06-08T10:00:00.000Z',
      createdByDisplayName: 'Pflege Demo',
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
        'Leichte diffuse Verlangsamung ohne epileptiforme Entladungen. Kein Anhalt für fokale strukturelle Pathologie.',
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
