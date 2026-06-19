import { describe, expect, it } from 'vitest'
import {
  buildPatientSafety,
  filterElevatedHarmSignals,
  isMeaningfulRiskRawValue,
} from '../patientSafety'
import type { ClinicalImprintRecord } from '../../../types/clinicalImprint'
import type { SafetyRiskSignal } from '../../../components/notion/overview/types'

function makeImprint(overrides: Partial<ClinicalImprintRecord> = {}): ClinicalImprintRecord {
  return {
    imprintKey: 'test:1',
    patientId: 'p1',
    caseId: 'c1',
    sourceType: 'verlauf',
    sourceId: '1',
    sourceDate: '2026-06-01',
    createdAt: '2026-06-01T00:00:00.000Z',
    readableClinicalSentence: 'Test',
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
    evidenceStrength: 'direct_observation',
    evidenceText: null,
    evidenceQuoteRange: null,
    analysisEligible: true,
    excludeReason: null,
    ...overrides,
  }
}

describe('isMeaningfulRiskRawValue', () => {
  it('rejects label echoes and generic suicidality fragments', () => {
    expect(isMeaningfulRiskRawValue('suicidality', 'Suizidale')).toBe(false)
    expect(isMeaningfulRiskRawValue('suicidality', 'Suizidalität')).toBe(false)
    expect(isMeaningfulRiskRawValue('suicidality', 'keine Suizidalität')).toBe(false)
  })

  it('accepts clinically specific suicidality documentation', () => {
    expect(isMeaningfulRiskRawValue('suicidality', 'passive Suizidgedanken')).toBe(true)
  })
})

describe('filterElevatedHarmSignals', () => {
  it('drops calm or meaningless harm axes for the PPB safety strip', () => {
    const signals: SafetyRiskSignal[] = [
      { id: 'suicidality', label: 'Suizidalität', value: 'Suizidale', tone: 'info' },
      {
        id: 'riskSelf',
        label: 'Akute Eigengefährdung',
        value: 'Suizidgedanken mit Plan',
        tone: 'high',
      },
    ]
    expect(filterElevatedHarmSignals(signals)).toHaveLength(1)
    expect(filterElevatedHarmSignals(signals)[0]?.id).toBe('riskSelf')
  })
})

describe('buildPatientSafety risk signals', () => {
  it('does not emit suicidality signals for imprint label echoes', () => {
    const safety = buildPatientSafety({
      medications: [],
      language: 'de',
      imprints: [makeImprint({ suicidality: 'Suizidale' })],
    })
    expect(safety.risk?.signals ?? []).toHaveLength(0)
  })

  it('emits elevated suicidality when clinically documented', () => {
    const safety = buildPatientSafety({
      medications: [],
      language: 'de',
      imprints: [makeImprint({ suicidality: 'aktive Suizidgedanken mit Plan' })],
    })
    const suicide = safety.risk?.signals?.find((s) => s.id === 'suicidality')
    expect(suicide?.tone).toBe('high')
    expect(suicide?.value).toMatch(/suizidgedanken/i)
  })
})
