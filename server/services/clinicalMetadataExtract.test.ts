import { describe, expect, it } from 'vitest'
import {
  buildCmeaContextText,
  parseCmeaResponse,
  runClinicalMetadataExtraction,
  type CmeaSectionInput,
} from './clinicalMetadataExtract'

const SECTIONS: CmeaSectionInput[] = [
  {
    sourceId: 'aufnahme:document',
    sourceType: 'anamnesis',
    sourceDate: '2024-05-01T00:00:00.000Z',
    text: 'Patient mit Angst. Unter Olanzapin keine Besserung.',
  },
]

describe('parseCmeaResponse', () => {
  it('parses typed facts keyed by sourceId with llm provenance', () => {
    const json = JSON.stringify({
      facts: [
        {
          sourceId: 'aufnahme:document',
          kind: 'symptom',
          label: 'Angst',
          domain: 'anxiety_panic_phobic_symptoms',
          severity: 'moderate',
          negated: false,
          evidenceQuote: 'Patient mit Angst',
          confidence: 0.82,
        },
        {
          sourceId: 'aufnahme:document',
          kind: 'medication_trial',
          substance: 'Olanzapin',
          outcome: 'no_response',
          timeframe: 'history',
          evidenceQuote: 'Unter Olanzapin keine Besserung',
          confidence: 0.7,
        },
      ],
    })
    const facts = parseCmeaResponse(json, SECTIONS, 'case-1')
    expect(facts).toHaveLength(2)
    for (const fact of facts) {
      expect(fact.provenance.extractor).toBe('llm')
      expect(fact.provenance.sourceId).toBe('aufnahme:document')
      expect(fact.caseId).toBe('case-1')
    }
    const trial = facts.find((f) => f.kind === 'medication_trial')
    expect(trial && trial.kind === 'medication_trial' ? trial.substance : null).toBe('Olanzapin')
  })

  it('clamps confidence and drops invalid / unmatched rows', () => {
    const json = JSON.stringify({
      facts: [
        { sourceId: 'aufnahme:document', kind: 'symptom', label: 'Angst', confidence: 9, evidenceQuote: 'q' },
        { sourceId: 'aufnahme:document', kind: 'not_a_kind', label: 'x' },
        { sourceId: 'ghost:source', kind: 'symptom', label: 'Hallucinated' },
        { kind: 'symptom' },
      ],
    })
    const facts = parseCmeaResponse(json, SECTIONS, 'case-1')
    expect(facts).toHaveLength(1)
    expect(facts[0]?.provenance.confidence).toBe(1)
  })

  it('falls back to the only section when sourceId is omitted', () => {
    const json = JSON.stringify({ facts: [{ kind: 'risk', axis: 'suicide', status: 'present', evidenceQuote: 'q' }] })
    const facts = parseCmeaResponse(json, SECTIONS, 'case-1')
    expect(facts).toHaveLength(1)
    expect(facts[0]?.kind).toBe('risk')
  })

  it('returns [] for non-JSON (mock provider echo)', () => {
    expect(parseCmeaResponse('Patient mit Angst.\n\n[AI draft — no key]', SECTIONS, 'case-1')).toEqual([])
  })
})

describe('buildCmeaContextText', () => {
  it('de-identifies section content before the prompt', () => {
    const text = buildCmeaContextText({
      sections: [
        {
          sourceId: 'aufnahme:document',
          sourceType: 'anamnesis',
          sourceDate: '2024-05-01T00:00:00.000Z',
          text: 'Kontakt: patient@example.com, geb. 01.02.1990. Angst.',
        },
      ],
    })
    expect(text).not.toContain('patient@example.com')
    expect(text).not.toContain('01.02.1990')
    expect(text).toContain('sourceId: aufnahme:document')
  })
})

describe('runClinicalMetadataExtraction (mock mode)', () => {
  it('returns empty facts + mock=true when no provider key is configured', async () => {
    const prevOpenai = process.env.OPENAI_API_KEY
    const prevDeepseek = process.env.DEEPSEEK_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.DEEPSEEK_API_KEY
    try {
      const result = await runClinicalMetadataExtraction({
        caseId: 'case-1',
        sections: SECTIONS,
        tier: 'fast',
        language: 'de',
      })
      expect(result.mock).toBe(true)
      expect(result.facts).toEqual([])
    } finally {
      if (prevOpenai !== undefined) process.env.OPENAI_API_KEY = prevOpenai
      if (prevDeepseek !== undefined) process.env.DEEPSEEK_API_KEY = prevDeepseek
    }
  })
})
