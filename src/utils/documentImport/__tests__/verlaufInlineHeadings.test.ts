import { describe, expect, it } from 'vitest'
import { docxTextToResult } from '../parsers/docxParser'

describe('verlauf inline headings', () => {
  it('keeps Procedere inside a Verlauf section as note content, not therapy', () => {
    const result = docxTextToResult([
      'Verlauf',
      '12.03.2024',
      'Patient stabil, kooperativ.',
      'Procedere:',
      'Medikation beibehalten, Sporttherapie anmelden.',
      '13.03.2024',
      'Weiterhin stabil.',
    ].join('\n'))

    expect(result.candidates.filter((c) => c.module === 'therapy')).toHaveLength(0)
    const verlauf = result.candidates.filter((c) => c.module === 'verlauf')
    expect(verlauf).toHaveLength(2)
    expect(verlauf[0].module).toBe('verlauf')
    if (verlauf[0].module === 'verlauf') {
      expect(verlauf[0].data.text).toContain('Procedere')
      expect(verlauf[0].data.text).toContain('Sporttherapie')
    }
  })

  it('keeps Diagnose mentions inside Verlauf as content', () => {
    const result = docxTextToResult([
      'Verlaufsdokumentation',
      '15.03.2024',
      'Patient ruhig.',
      'Diagnose:',
      'F20.0 Paranoide Schizophrenie unverändert.',
    ].join('\n'))

    expect(result.candidates.filter((c) => c.module === 'diagnosis')).toHaveLength(0)
    const verlauf = result.candidates.filter((c) => c.module === 'verlauf')
    expect(verlauf).toHaveLength(1)
    if (verlauf[0]?.module === 'verlauf') {
      expect(verlauf[0].data.text).toContain('Diagnose')
      expect(verlauf[0].data.text).toContain('F20.0')
    }
  })

  it('still maps a top-level Procedere section to therapy outside Verlauf', () => {
    const result = docxTextToResult([
      'Therapie und Verlauf',
      'Stationärer Aufenthalt geplant.',
      '',
      'Procedere:',
      'Medikation optimieren.',
    ].join('\n'))

    expect(result.candidates.some((c) => c.module === 'therapy')).toBe(true)
  })
})
