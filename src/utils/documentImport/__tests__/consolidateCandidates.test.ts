import { describe, expect, it } from 'vitest'
import { consolidateImportCandidates } from '../consolidateCandidates'
import { docxTextToResult } from '../parsers/docxParser'
import { makeCandidate } from '../candidateFactory'

describe('consolidateImportCandidates', () => {
  it('merges multiple aufnahme subsection candidates into one Aufnahmebefund', () => {
    const candidates = [
      makeCandidate({
        module: 'anamnese',
        sourceLocation: { section: 'Aktuelle Anamnese', lineNumber: 2 },
        data: { sectionId: 'aktuelle-krankheitsanamnese', title: 'Aktuelle Anamnese', text: 'Wortkarg.' },
      }),
      makeCandidate({
        module: 'anamnese',
        sourceLocation: { section: 'Psychiatrische Anamnese', lineNumber: 4 },
        data: { sectionId: 'psychiatrische-vorgeschichte', title: 'Psychiatrische Anamnese', text: 'Schizophrenie.' },
      }),
      makeCandidate({
        module: 'verlauf',
        sourceLocation: { section: 'Verlauf', lineNumber: 20 },
        data: { text: 'Stabil.', date: '2025-12-09' },
      }),
    ]

    const consolidated = consolidateImportCandidates(candidates)
    expect(consolidated).toHaveLength(2)

    const aufnahme = consolidated.find((c) => c.module === 'anamnese')
    expect(aufnahme?.module).toBe('anamnese')
    if (aufnahme?.module !== 'anamnese') return

    expect(aufnahme.data.title).toBe('Aufnahmebefund')
    expect(aufnahme.data.sectionId).toBeUndefined()
    expect(aufnahme.data.sectionContents).toEqual({
      'aktuelle-krankheitsanamnese': 'Wortkarg.',
      'psychiatrische-vorgeschichte': 'Schizophrenie.',
    })
    expect(aufnahme.data.text).toContain('Wortkarg.')
    expect(aufnahme.data.text).toContain('Schizophrenie.')
  })

  it('leaves a single generic anamnese block untouched', () => {
    const single = makeCandidate({
      module: 'anamnese',
      data: { title: 'Anamnese', text: 'Freitext ohne Unterabschnitte.' },
    })
    expect(consolidateImportCandidates([single])).toEqual([single])
  })
})

describe('docxTextToResult — merged Aufnahmebefund', () => {
  it('returns one anamnese candidate for multi-section aufnahme letters', () => {
    const result = docxTextToResult([
      'Aufnahmeanlass und -umstände:',
      'Überstellung zur stationären Behandlung.',
      '',
      'Aktuelle Anamnese:',
      'Patient wortkarg.',
      '',
      'Psychiatrische Anamnese:',
      'Paranoide Schizophrenie.',
      '',
      'Psychopathologischer Befund:',
      'Affektiv verflacht.',
    ].join('\n'))

    const anamnese = result.candidates.filter((c) => c.module === 'anamnese')
    expect(anamnese).toHaveLength(1)
    if (anamnese[0]?.module !== 'anamnese') return

    expect(anamnese[0].data.title).toBe('Aufnahmebefund')
    expect(anamnese[0].data.sectionContents?.['aufnahmeanlass']).toContain('Überstellung')
    expect(anamnese[0].data.sectionContents?.['aktuelle-krankheitsanamnese']).toContain('wortkarg')
    expect(anamnese[0].data.sectionContents?.['psychiatrische-vorgeschichte']).toContain('Schizophrenie')
    expect(anamnese[0].data.sectionContents?.['psychopathologischer-befund']).toContain('verflacht')
  })
})
