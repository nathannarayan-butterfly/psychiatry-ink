import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type {
  DeterministicFailureSignals,
  PriorTherapyFailureDrugInput,
} from '../../src/types/priorTherapies'
import { extractFailureAnalyses } from './priorTherapyFailureAnalysisAi'

function signals(overrides: Partial<DeterministicFailureSignals> = {}): DeterministicFailureSignals {
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

function drug(
  substance: string,
  override: Partial<DeterministicFailureSignals> = {},
): PriorTherapyFailureDrugInput {
  return {
    substance,
    event: 'no_response',
    reason: null,
    signals: signals({ substance, ...override }),
  }
}

describe('extractFailureAnalyses (mock provider)', () => {
  const original = { OPENAI_API_KEY: process.env.OPENAI_API_KEY, DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY }

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY
    delete process.env.DEEPSEEK_API_KEY
  })

  afterEach(() => {
    if (original.OPENAI_API_KEY === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = original.OPENAI_API_KEY
    if (original.DEEPSEEK_API_KEY === undefined) delete process.env.DEEPSEEK_API_KEY
    else process.env.DEEPSEEK_API_KEY = original.DEEPSEEK_API_KEY
  })

  it('falls back to deterministic synthesis from the signals', async () => {
    const result = await extractFailureAnalyses({
      drugs: [
        drug('Clozapin', { cyp1a2Smoking: true, smoking: true }),
        drug('Lithium', {
          levelMeasured: true,
          subtherapeuticLevel: { parameter: 'Lithium', value: 0.3, unit: 'mmol/L', refMin: 0.6, refMax: 1.2 },
        }),
      ],
      aufnahmeText: 'Raucher. Vortherapien dokumentiert.',
      verlaufText: '',
      language: 'de',
      caseId: 'case-1',
    })

    expect(result.mock).toBe(true)
    const clozapin = result.analyses.find((a) => a.substance === 'Clozapin')
    expect(clozapin?.likelyCauses.map((c) => c.cause)).toContain('cyp_induction_smoking')
    const lithium = result.analyses.find((a) => a.substance === 'Lithium')
    expect(lithium?.likelyCauses.map((c) => c.cause)).toContain('subtherapeutic_level')
  })

  it('returns insufficient_data when no signals are present', async () => {
    const result = await extractFailureAnalyses({
      drugs: [drug('Quetiapin')],
      aufnahmeText: '',
      verlaufText: '',
      language: 'de',
      caseId: 'case-2',
    })
    const quetiapin = result.analyses.find((a) => a.substance === 'Quetiapin')
    expect(quetiapin?.likelyCauses).toHaveLength(1)
    expect(quetiapin?.likelyCauses[0]?.cause).toBe('insufficient_data')
  })
})
