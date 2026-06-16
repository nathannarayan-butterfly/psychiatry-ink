import { describe, expect, it } from 'vitest'
import {
  enrichFailureSignalsWithFact,
  indexTrialFactsBySubstance,
  medicationTrialFactsToItems,
} from '../priorTherapyFacts'
import { CMEA_EXTRACTOR_VERSION, type MedicationTrialFact } from '../../../types/clinicalMetadata'
import type { DeterministicFailureSignals } from '../../../types/priorTherapies'

function trialFact(overrides: Partial<MedicationTrialFact> = {}): MedicationTrialFact {
  return {
    id: 'aufnahme:document:medication_trial:olanzapin',
    kind: 'medication_trial',
    caseId: 'c',
    substance: 'Olanzapin',
    doseText: null,
    doseAdequacy: null,
    durationText: null,
    serumLevel: null,
    outcome: 'no_response',
    reasonStopped: null,
    adherenceSignal: null,
    smokingInteractionFlag: false,
    timeframe: 'history',
    provenance: {
      sourceType: 'anamnesis',
      sourceId: 'aufnahme:document',
      sourceDate: '2024-01-01T00:00:00.000Z',
      evidenceStrength: 'inferred',
      evidenceQuote: 'unter Olanzapin keine Besserung',
      confidence: 0.7,
      extractor: 'llm',
      extractorVersion: CMEA_EXTRACTOR_VERSION,
    },
    ...overrides,
  }
}

function baseSignals(overrides: Partial<DeterministicFailureSignals> = {}): DeterministicFailureSignals {
  return {
    substance: 'Olanzapin',
    subtherapeuticLevel: null,
    levelMeasured: false,
    cyp1a2Smoking: false,
    smoking: null,
    poorAdherence: null,
    inadequateDoseDuration: null,
    receptorProfileSummary: null,
    ...overrides,
  }
}

describe('medicationTrialFactsToItems', () => {
  it('maps trial facts to inferred prior-therapy items', () => {
    const items = medicationTrialFactsToItems([trialFact()])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      substance: 'Olanzapin',
      event: 'no_response',
      source: 'aufnahme',
      inferred: true,
      timeframe: 'history',
      evidenceQuote: 'unter Olanzapin keine Besserung',
    })
  })

  it('uses verlauf source for verlauf-sourced facts and dedupes by strongest event', () => {
    const items = medicationTrialFactsToItems([
      trialFact({ outcome: 'mentioned' }),
      trialFact({ outcome: 'side_effect', provenance: { ...trialFact().provenance, sourceType: 'verlauf' } }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0]?.event).toBe('side_effect')
    expect(items[0]?.source).toBe('verlauf')
  })
})

describe('indexTrialFactsBySubstance', () => {
  it('indexes by normalized substance key', () => {
    const index = indexTrialFactsBySubstance([trialFact()])
    expect(index.get('olanzapin')?.substance).toBe('Olanzapin')
  })
})

describe('enrichFailureSignalsWithFact', () => {
  it('returns signals unchanged when no fact', () => {
    const signals = baseSignals()
    expect(enrichFailureSignalsWithFact(signals, undefined)).toEqual(signals)
  })

  it('fills a subtherapeutic serum level from the fact', () => {
    const result = enrichFailureSignalsWithFact(
      baseSignals(),
      trialFact({ serumLevel: { value: 12, unit: 'ng/ml', interpretation: 'subtherapeutic' } }),
    )
    expect(result.subtherapeuticLevel).toMatchObject({ parameter: 'Olanzapin', value: 12, unit: 'ng/ml' })
    expect(result.levelMeasured).toBe(true)
  })

  it('fills smoking interaction, adherence and dose gaps but never overrides', () => {
    const result = enrichFailureSignalsWithFact(
      baseSignals(),
      trialFact({ smokingInteractionFlag: true, adherenceSignal: 'poor', doseAdequacy: 'subtherapeutic', doseText: '5mg' }),
    )
    expect(result.cyp1a2Smoking).toBe(true)
    expect(result.poorAdherence).not.toBeNull()
    expect(result.inadequateDoseDuration?.detail).toContain('5mg')

    // Existing stronger deterministic signal is preserved.
    const preset = enrichFailureSignalsWithFact(
      baseSignals({ poorAdherence: { note: 'deterministic' } }),
      trialFact({ adherenceSignal: 'poor' }),
    )
    expect(preset.poorAdherence?.note).toBe('deterministic')
  })
})
