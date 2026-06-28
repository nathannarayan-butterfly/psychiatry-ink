import { describe, expect, it } from 'vitest'
import {
  containsGerman,
  findGermanTokens,
  walkStringFields,
} from '../germanLeak'

/** Unit tests for the detector itself — keeps the heuristic honest. */
describe('findGermanTokens', () => {
  it('flags umlauts / eszett', () => {
    expect(findGermanTokens('Gründlich')).toContain('Gründlich')
    expect(findGermanTokens('Maßnahme')).toContain('Maßnahme')
  })

  it('flags high-signal German function and clinical words', () => {
    expect(containsGerman('Patient mit Befund und Diagnose')).toBe(true)
    expect(findGermanTokens('keine Beschwerden')).toEqual(
      expect.arrayContaining(['keine', 'Beschwerden']),
    )
  })

  it('does not flag clean English clinical copy', () => {
    expect(findGermanTokens('No known drug allergies. Mild tremor.')).toEqual([])
    expect(findGermanTokens('Aripiprazole 10 mg once daily; lorazepam PRN.')).toEqual([])
    expect(findGermanTokens('Stabilisation on antipsychotic, structured withdrawal.')).toEqual([])
    // English verb "diagnose" and clinical eponyms must not trip the heuristic.
    expect(findGermanTokens('It does not diagnose patients or replace clinicians.')).toEqual([])
    expect(findGermanTokens('von Willebrand factor and von Recklinghausen disease.')).toEqual([])
  })

  it('avoids English collisions with German function words', () => {
    // "submit", "permit", "fund", "wound", "amend" must not trip "mit"/"und".
    expect(findGermanTokens('Submit the permit; fund the wound care amendment.')).toEqual([])
    // IM (intramuscular) / MIT / AM are allowlisted uppercase abbreviations.
    expect(findGermanTokens('Give 5 mg IM. Licensed under MIT. 8 AM dose.')).toEqual([])
  })

  it('honours the caller allowlist for proper nouns / brands', () => {
    expect(findGermanTokens('Müller Pharma', { allowlist: ['müller'] })).toEqual([])
  })
})

describe('walkStringFields', () => {
  it('skips identifier keys and slug values, flags display copy', () => {
    const hits = walkStringFields({
      documentTypeId: 'medikation', // slug + non-display key → skipped
      status: 'vidert', // enum slug → skipped
      pageHeading: 'Medication', // clean English
      note: 'Patient mit akuter Eigengefährdung', // German leak
    })
    expect(hits.map((h) => h.path)).toEqual(['note'])
    expect(hits[0]?.tokens).toEqual(expect.arrayContaining(['mit', 'Eigengefährdung']))
  })

  it('reports nested paths', () => {
    const hits = walkStringFields({ a: { b: [{ c: 'Befund und Verlauf' }] } })
    expect(hits[0]?.path).toBe('a.b[0].c')
  })
})
