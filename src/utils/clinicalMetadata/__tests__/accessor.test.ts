import { afterEach, describe, expect, it } from 'vitest'
import {
  allFacts,
  diagnosisHints,
  factsForSource,
  freshness,
  labSignals,
  medicationTrials,
  riskFacts,
  symptomFacts,
} from '../accessor'
import {
  CMEA_EXTRACTOR_VERSION,
  CMEA_SCHEMA_VERSION,
  type ClinicalFact,
} from '../../../types/clinicalMetadata'
import {
  applyClinicalImprintIndex,
  clearClinicalImprintCache,
  emptyClinicalImprintIndex,
} from '../../clinicalImprint/storage'
import type { ClinicalImprintRecord } from '../../../types/clinicalImprint'

const CASE_ID = 'case-accessor-test'

function baseRecord(overrides: Partial<ClinicalImprintRecord>): ClinicalImprintRecord {
  return {
    patientId: CASE_ID,
    caseId: CASE_ID,
    sourceType: 'anamnesis',
    sourceId: 'aufnahme:document',
    sourceDate: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    readableClinicalSentence: 'sentence',
    clinicalDomain: 'psychopathology',
    symptoms: [],
    severity: null,
    courseDirection: null,
    affect: null,
    drive: null,
    thoughtForm: null,
    thoughtContent: null,
    perception: null,
    selfDisturbance: null,
    cognition: null,
    sleep: null,
    cooperation: null,
    insight: null,
    riskSelf: null,
    riskOthers: null,
    aggression: null,
    suicidality: null,
    functioning: null,
    socialInteraction: null,
    hygieneSelfCare: null,
    medicationMentioned: [],
    medicationResponse: null,
    sideEffects: null,
    adherence: null,
    diagnosisHints: [],
    differentialDiagnosisHints: [],
    uncertainty: null,
    evidenceStrength: 'patient_report',
    evidenceText: null,
    evidenceQuoteRange: null,
    analysisEligible: true,
    excludeReason: null,
    imprintKey: 'anamnesis:aufnahme:document',
    ...overrides,
  }
}

function fact(partial: Partial<ClinicalFact> & Pick<ClinicalFact, 'kind'>): ClinicalFact {
  return {
    id: 'aufnahme:document:symptom:angst',
    caseId: CASE_ID,
    provenance: {
      sourceType: 'anamnesis',
      sourceId: 'aufnahme:document',
      sourceDate: '2024-01-01T00:00:00.000Z',
      evidenceStrength: 'patient_report',
      evidenceQuote: 'quote',
      confidence: 0.8,
      extractor: 'regex',
      extractorVersion: CMEA_EXTRACTOR_VERSION,
    },
    ...partial,
  } as ClinicalFact
}

function seed(facts: ClinicalFact[], recordOverrides?: Partial<ClinicalImprintRecord>): void {
  const index = emptyClinicalImprintIndex()
  index.imprints = [baseRecord({ facts, schemaVersion: CMEA_SCHEMA_VERSION, extractorVersion: CMEA_EXTRACTOR_VERSION, ...recordOverrides })]
  applyClinicalImprintIndex(index, CASE_ID)
}

afterEach(() => clearClinicalImprintCache(CASE_ID))

describe('clinicalMetadata accessor', () => {
  it('returns [] for a case with no imprints', () => {
    clearClinicalImprintCache(CASE_ID)
    expect(allFacts(CASE_ID)).toEqual([])
    expect(symptomFacts(CASE_ID)).toEqual([])
    expect(medicationTrials(CASE_ID)).toEqual([])
  })

  it('up-converts v1 records (no facts field) to empty facts', () => {
    const index = emptyClinicalImprintIndex()
    const record = baseRecord({})
    delete (record as { facts?: unknown }).facts
    index.imprints = [record]
    applyClinicalImprintIndex(index, CASE_ID)
    expect(allFacts(CASE_ID)).toEqual([])
    expect(freshness(CASE_ID).totalFacts).toBe(0)
  })

  it('selects symptom facts and filters by domain', () => {
    seed([
      fact({ kind: 'symptom', label: 'Angst', domain: 'anxiety_panic_phobic_symptoms', severity: null, onset: null, durationDays: null, negated: false } as Partial<ClinicalFact> & { kind: 'symptom' }),
      fact({ kind: 'symptom', label: 'Schlaflos', domain: 'sleep_appetite_vegetative', severity: null, onset: null, durationDays: null, negated: false } as Partial<ClinicalFact> & { kind: 'symptom' }),
    ])
    expect(symptomFacts(CASE_ID)).toHaveLength(2)
    expect(symptomFacts(CASE_ID, 'sleep_appetite_vegetative')).toHaveLength(1)
    expect(symptomFacts(CASE_ID, 'sleep_appetite_vegetative')[0]?.label).toBe('Schlaflos')
  })

  it('selects medication trial, risk, lab and diagnosis facts by kind', () => {
    seed([
      fact({ kind: 'medication_trial', substance: 'Olanzapin', doseText: null, doseAdequacy: null, durationText: null, serumLevel: null, outcome: 'no_response', reasonStopped: null, adherenceSignal: null, smokingInteractionFlag: false, timeframe: 'history' } as Partial<ClinicalFact> & { kind: 'medication_trial' }),
      fact({ kind: 'risk', axis: 'suicide', status: 'present', acuity: 'acute' } as Partial<ClinicalFact> & { kind: 'risk' }),
      fact({ kind: 'lab_signal', parameter: 'Lithium', value: 0.4, unit: 'mmol/l', interpretation: 'low', refRange: { min: 0.6, max: 1.2 } } as Partial<ClinicalFact> & { kind: 'lab_signal' }),
      fact({ kind: 'diagnosis_hint', label: 'Depression', code: 'F32.1', status: 'suspected' } as Partial<ClinicalFact> & { kind: 'diagnosis_hint' }),
    ])
    expect(medicationTrials(CASE_ID)).toHaveLength(1)
    expect(medicationTrials(CASE_ID)[0]?.substance).toBe('Olanzapin')
    expect(riskFacts(CASE_ID)[0]?.axis).toBe('suicide')
    expect(labSignals(CASE_ID)[0]?.interpretation).toBe('low')
    expect(diagnosisHints(CASE_ID)[0]?.code).toBe('F32.1')
  })

  it('factsForSource filters by provenance.sourceId', () => {
    seed([
      fact({ kind: 'symptom', label: 'A', domain: null, severity: null, onset: null, durationDays: null, negated: false } as Partial<ClinicalFact> & { kind: 'symptom' }),
      fact({ kind: 'symptom', label: 'B', domain: null, severity: null, onset: null, durationDays: null, negated: false, provenance: { sourceType: 'verlauf', sourceId: 'verlauf:document', sourceDate: '2024-02-01T00:00:00.000Z', evidenceStrength: 'patient_report', evidenceQuote: null, confidence: 0.5, extractor: 'llm', extractorVersion: CMEA_EXTRACTOR_VERSION } } as Partial<ClinicalFact> & { kind: 'symptom' }),
    ])
    expect(factsForSource(CASE_ID, 'aufnahme:document')).toHaveLength(1)
    expect(factsForSource(CASE_ID, 'verlauf:document')).toHaveLength(1)
  })

  it('freshness reports extractor breakdown and staleness', () => {
    seed(
      [
        fact({ kind: 'symptom', label: 'A', domain: null, severity: null, onset: null, durationDays: null, negated: false } as Partial<ClinicalFact> & { kind: 'symptom' }),
        fact({ kind: 'symptom', label: 'B', domain: null, severity: null, onset: null, durationDays: null, negated: false, provenance: { sourceType: 'anamnesis', sourceId: 'aufnahme:document', sourceDate: '2024-03-01T00:00:00.000Z', evidenceStrength: 'inferred', evidenceQuote: null, confidence: 0.6, extractor: 'llm', extractorVersion: CMEA_EXTRACTOR_VERSION } } as Partial<ClinicalFact> & { kind: 'symptom' }),
      ],
      { extractorVersion: 0 },
    )
    const f = freshness(CASE_ID)
    expect(f.totalFacts).toBe(2)
    expect(f.regexFacts).toBe(1)
    expect(f.llmFacts).toBe(1)
    expect(f.hasLlmEnrichment).toBe(true)
    expect(f.staleRecordCount).toBe(1)
    expect(f.lastSourceDate).toBe('2024-03-01T00:00:00.000Z')
    expect(f.schemaVersion).toBe(CMEA_SCHEMA_VERSION)
  })
})
