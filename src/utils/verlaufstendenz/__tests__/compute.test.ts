import { describe, expect, it } from 'vitest'
import type { ClinicalImprintRecord } from '../../../types/clinicalImprint'
import type { SafetyRiskSignal } from '../../../components/notion/overview/types'
import { computeVerlaufstendenz } from '../compute'

function makeImprint(overrides: Partial<ClinicalImprintRecord> = {}): ClinicalImprintRecord {
  return {
    imprintKey: 'test:1',
    patientId: 'p1',
    caseId: 'c1',
    sourceType: 'verlauf',
    sourceId: '1',
    sourceDate: '2026-06-10',
    createdAt: '2026-06-10T00:00:00.000Z',
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

const emptyInput = {
  imprints: [] as ClinicalImprintRecord[],
  verlaufEntries: [],
  harmSignals: [] as SafetyRiskSignal[],
  complianceOverallPercent: null,
  abnormalLabCount: 0,
  admissionDateIso: '2026-06-01',
  windowPreset: '14d' as const,
}

describe('computeVerlaufstendenz', () => {
  it('returns nicht_beurteilbar with insufficient confidence when no data', () => {
    const result = computeVerlaufstendenz(emptyInput)
    expect(result.trend).toBe('nicht_beurteilbar')
    expect(result.confidence).toBe('insufficient')
  })

  it('detects overall improvement from psychopathology course direction', () => {
    const result = computeVerlaufstendenz({
      ...emptyInput,
      imprints: [
        makeImprint({
          imprintKey: 'a',
          sourceDate: '2026-06-05',
          courseDirection: 'worsened',
        }),
        makeImprint({
          imprintKey: 'b',
          sourceDate: '2026-06-12',
          courseDirection: 'improved',
        }),
      ],
    })
    expect(result.trend).toBe('leicht_gebessert')
    expect(result.domains.find((d) => d.domain === 'core_psychopathology')?.direction).toBe(
      'leicht_gebessert',
    )
  })

  it('overrides other improvements when acute safety deteriorates', () => {
    const harmSignals: SafetyRiskSignal[] = [
      {
        id: 'suicidality',
        label: 'Akute Suizidalität',
        value: 'Suizidgedanken mit konkretem Plan',
        tone: 'high',
      },
    ]
    const result = computeVerlaufstendenz({
      ...emptyInput,
      imprints: [
        makeImprint({
          sourceDate: '2026-06-05',
          courseDirection: 'worsened',
        }),
        makeImprint({
          sourceDate: '2026-06-12',
          courseDirection: 'improved',
        }),
      ],
      harmSignals,
    })
    expect(result.trend).toBe('kritisch_handlungsrelevant')
    expect(result.domains.find((d) => d.domain === 'safety_risk')?.direction).toBe(
      'deutlich_verschlechtert',
    )
  })

  it('returns schwankend when domains point in opposite directions', () => {
    const result = computeVerlaufstendenz({
      ...emptyInput,
      // Anchor the rolling 14d window to a fixed end date so both entries stay
      // inside it regardless of the current clock; otherwise the earlier
      // (improving) entry drifts out of the window over time and only the
      // worsening entry remains.
      customWindowEnd: '2026-06-12T00:00:00.000Z',
      verlaufEntries: [
        {
          id: 'v1',
          date: '2026-06-08T10:00:00.000Z',
          content: 'Schlaf gebessert, Antrieb zunehmend.',
          pageType: 'verlauf',
        },
        {
          id: 'v2',
          date: '2026-06-11T10:00:00.000Z',
          content: 'Verschlechterung der Stimmung, zunehmend depressiv.',
          pageType: 'verlauf',
        },
      ],
    })
    expect(result.trend).toBe('schwankend')
  })

  it('uses Verlauf text for domain-specific worsening signals', () => {
    const result = computeVerlaufstendenz({
      ...emptyInput,
      // Anchor the rolling 14d window so the entry stays inside it regardless of the
      // current clock; otherwise it drifts out of the window and yields no signal.
      customWindowEnd: '2026-06-12T00:00:00.000Z',
      verlaufEntries: [
        {
          id: 'v1',
          date: '2026-06-09T10:00:00.000Z',
          content: 'Patient verweigert Medikamenteneinnahme, Einsicht mangelhaft.',
          pageType: 'verlauf',
        },
      ],
    })
    expect(result.domains.find((d) => d.domain === 'insight_compliance')?.direction).toBe(
      'leicht_verschlechtert',
    )
  })
})
