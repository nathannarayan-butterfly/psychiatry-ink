import { describe, expect, it } from 'vitest'
import { buildClinicalThesis, composeThesisFromDocumentedSections } from '../clinicalThesis'

describe('composeThesisFromDocumentedSections', () => {
  it('synthesizes stabilization + insight from demo-like documented sections', () => {
    const thesis = composeThesisFromDocumentedSections(
      'Wechselhafte Stimmung, paranoid-misstrauische Grundhaltung, zuletzt ruhiger.',
      'Einnahme aktuell regelmäßig, Einsicht langsam zunehmend.',
      'Stabilisierung unter Antipsychotikum, psychoedukative Gruppe, Sporttherapie.',
    )
    expect(thesis).toBe(
      'Stabilisierung der paranoiden Symptomatik unter Antipsychotikum — Krankheitseinsicht langsam zunehmend.',
    )
  })

  it('returns null when sections are too sparse to compose safely', () => {
    expect(composeThesisFromDocumentedSections(undefined, undefined, undefined)).toBeNull()
    expect(composeThesisFromDocumentedSections('kurz', undefined, undefined)).toBeNull()
  })
})

describe('buildClinicalThesis', () => {
  it('returns null for an empty case without documentation', () => {
    expect(buildClinicalThesis('UNKNOWN-CASE-WITHOUT-DATA')).toBeNull()
  })
})
