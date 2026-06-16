import { describe, expect, it } from 'vitest'
import type { DiscussPackageContent } from '../../src/types/discussCase'
import {
  buildButterflyContextText,
  buildButterflyUserPrompt,
  parseButterflyExtractionResponse,
  type ButterflyCriterionQuery,
} from './butterflyExtract'

function pkg(content: string): DiscussPackageContent {
  return {
    version: 1,
    builtAt: new Date().toISOString(),
    caseId: 'c1',
    patientLabel: 'Patient',
    sections: [{ key: 'anamnesis', id: 'aufnahme', label: 'Aufnahme', content }],
    isDeidentified: false,
  }
}

const CRITERIA: ButterflyCriterionQuery[] = [
  { id: 'f10_2.craving', text: 'Starkes Verlangen, Alkohol zu konsumieren' },
  { id: 'f10_2.tolerance', text: 'Toleranzentwicklung' },
]

describe('buildButterflyContextText', () => {
  it('de-identifies PHI before the text leaves the service', () => {
    const text = buildButterflyContextText(
      pkg('Geboren am 12.03.1980, erreichbar unter kontakt@example.com.'),
    )
    expect(text).not.toContain('12.03.1980')
    expect(text).not.toContain('kontakt@example.com')
    expect(text).toContain('[REDACTED]')
  })
})

describe('buildButterflyUserPrompt', () => {
  it('batches exactly the provided criteria for one disorder', () => {
    const prompt = buildButterflyUserPrompt({
      disorderName: 'Alkoholabhängigkeit',
      criteria: CRITERIA,
      contextText: 'Doku',
    })
    expect(prompt).toContain('Alkoholabhängigkeit')
    expect(prompt).toContain('f10_2.craving')
    expect(prompt).toContain('f10_2.tolerance')
    // A criterion that was NOT provided must not be queried.
    expect(prompt).not.toContain('f10_2.withdrawal')
  })
})

describe('parseButterflyExtractionResponse', () => {
  it('maps a valid JSON object to per-criterion results', () => {
    const text = JSON.stringify({
      results: [
        { id: 'f10_2.craving', status: 'met', evidenceQuote: 'starkes Verlangen', confidence: 0.9 },
        { id: 'f10_2.tolerance', status: 'not_met', evidenceQuote: null, confidence: 1.4 },
      ],
    })
    const out = parseButterflyExtractionResponse(text, CRITERIA)
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ id: 'f10_2.craving', status: 'met', evidenceQuote: 'starkes Verlangen' })
    expect(out[0].confidence).toBeCloseTo(0.9)
    // confidence is clamped into [0,1]
    expect(out[1].confidence).toBe(1)
  })

  it('falls back to unclear for missing ids and invalid statuses', () => {
    const text = JSON.stringify({ results: [{ id: 'f10_2.craving', status: 'maybe', confidence: 0.5 }] })
    const out = parseButterflyExtractionResponse(text, CRITERIA)
    expect(out[0].status).toBe('unclear') // invalid status coerced
    expect(out[1].status).toBe('unclear') // missing id -> unclear
    expect(out[1].evidenceQuote).toBeNull()
  })

  it('never auto-resolves when the response is not JSON (mock provider echo)', () => {
    const out = parseButterflyExtractionResponse('Doku\n\n[AI draft — set DEEPSEEK_API_KEY]', CRITERIA)
    expect(out.every((r) => r.status === 'unclear')).toBe(true)
    expect(out.every((r) => r.evidenceQuote === null)).toBe(true)
  })
})
