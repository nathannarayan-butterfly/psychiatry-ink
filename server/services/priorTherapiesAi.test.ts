import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  extractPriorTherapies,
  heuristicExtractPriorTherapies,
  isLlmMockMode,
} from './priorTherapiesAi'
import { deidentifyPriorTherapySources } from './priorTherapiesDeidentify'

const AUFNAHME =
  'Medikamentenanamnese: Vor Aufnahme unregelmäßig Risperidon 2 mg abends. ' +
  'In der Vorgeschichte Olanzapin wegen Gewichtszunahme abgesetzt.'
const VERLAUF =
  'Wechsel auf Aripiprazol 10 mg begonnen (Risperidon ausgeschlichen) wegen Prolaktin-Anstieg.'

describe('deidentifyPriorTherapySources', () => {
  it('redacts the patient name and identifiers before the text leaves the server', () => {
    const result = deidentifyPriorTherapySources({
      caseId: 'CASE-1',
      aufnahmeText: 'Anna Beispiel berichtet seit 12.03.2024 über Symptome. Risperidon abgesetzt.',
      verlaufText: '',
      patientName: 'Anna Beispiel',
    })
    expect(result.aufnahmeText).not.toContain('Anna')
    expect(result.aufnahmeText).not.toContain('Beispiel')
    expect(result.aufnahmeText).not.toContain('12.03.2024')
    expect(result.aufnahmeText).toContain('[REDACTED]')
    // Clinically relevant content is preserved.
    expect(result.aufnahmeText).toContain('Risperidon')
  })
})

describe('heuristicExtractPriorTherapies', () => {
  it('extracts prior agents with classified events from free text', () => {
    const items = heuristicExtractPriorTherapies(AUFNAHME, VERLAUF)
    const bySubstance = new Map(items.map((i) => [i.substance, i]))

    const olanzapin = bySubstance.get('Olanzapin')
    expect(olanzapin).toBeDefined()
    expect(olanzapin?.event).toBe('side_effect')
    expect(olanzapin?.source).toBe('aufnahme')

    const risperidon = bySubstance.get('Risperidon')
    expect(risperidon).toBeDefined()
    // Each item carries an evidence quote from the real source text.
    expect(risperidon?.evidenceQuote.length).toBeGreaterThan(0)
  })

  it('does not surface substances mentioned without a prior-trial signal', () => {
    const items = heuristicExtractPriorTherapies('Aktuell Sertralin 50 mg morgens.', '')
    expect(items.find((i) => i.substance === 'Sertralin')).toBeUndefined()
  })
})

describe('extractPriorTherapies (mock provider)', () => {
  const original = {
    openai: process.env.OPENAI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
  }

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY
    delete process.env.DEEPSEEK_API_KEY
  })

  afterEach(() => {
    if (original.openai === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = original.openai
    if (original.deepseek === undefined) delete process.env.DEEPSEEK_API_KEY
    else process.env.DEEPSEEK_API_KEY = original.deepseek
  })

  it('reports mock mode when no provider key is configured', () => {
    expect(isLlmMockMode()).toBe(true)
  })

  it('returns structured prior-therapy items via the deterministic fallback', async () => {
    const result = await extractPriorTherapies({
      aufnahmeText: AUFNAHME,
      verlaufText: VERLAUF,
      language: 'de',
      caseId: 'CASE-1',
    })
    expect(result.mock).toBe(true)
    expect(result.items.length).toBeGreaterThan(0)
    for (const item of result.items) {
      expect(item.substance.length).toBeGreaterThan(0)
      expect(['aufnahme', 'verlauf']).toContain(item.source)
      expect(item.evidenceQuote.length).toBeGreaterThan(0)
    }
    expect(result.items.some((i) => i.substance === 'Olanzapin')).toBe(true)
  })
})
