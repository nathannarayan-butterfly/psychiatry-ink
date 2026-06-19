import { describe, expect, it } from 'vitest'
import { docxTextToResult } from '../parsers/docxParser'
import {
  appendComplementaryTherapyCandidatesFromMentions,
  detectComplementaryTherapyMentions,
} from '../complementaryTherapyDetection'
import { makeCandidate } from '../candidateFactory'

describe('detectComplementaryTherapyMentions', () => {
  it('detects all default therapy types from German mentions', () => {
    const text = [
      'Ergotherapie und Sporttherapie laufen gut.',
      'Musiktherapie, Kunsttherapie, Skillgruppe.',
      'Fokusgruppe, Psychoedukation, Suchtgruppe.',
      'Entspannungstraining, Arbeitstherapie, Gruppentherapie, Physiotherapie.',
    ].join(' ')

    expect(detectComplementaryTherapyMentions(text)).toEqual([
      'ergotherapie',
      'sporttherapie',
      'musiktherapie',
      'kunsttherapie',
      'skillgruppe',
      'fokusgruppe',
      'psychoedukation',
      'suchtgruppe',
      'entspannungstraining',
      'arbeitstherapie',
      'gruppentherapien',
      'physiotherapie',
    ])
  })

  it('does not match unrelated words', () => {
    expect(detectComplementaryTherapyMentions('Patient stabil, keine Therapieänderung.')).toEqual([])
  })
})

describe('appendComplementaryTherapyCandidatesFromMentions', () => {
  it('adds complementary therapy candidates when Verlauf mentions therapies', () => {
    const base = [
      makeCandidate({
        module: 'verlauf',
        sourceLocation: { section: 'Verlauf' },
        data: { date: '2024-03-12', text: 'Teilnahme an Ergotherapie und Sporttherapie.' },
      }),
    ]

    const result = appendComplementaryTherapyCandidatesFromMentions(base)
    const ct = result.filter((c) => c.module === 'complementaryTherapy')
    expect(ct).toHaveLength(2)
    expect(ct.map((c) => (c.module === 'complementaryTherapy' ? c.data.therapyTypeId : '')).sort()).toEqual([
      'ergotherapie',
      'sporttherapie',
    ])
  })

  it('skips types already covered by dedicated Ergotherapieverlauf candidates', () => {
    const base = [
      makeCandidate({
        module: 'complementaryTherapy',
        data: { therapyTypeId: 'ergotherapie', text: 'Feinmotorik.' },
      }),
      makeCandidate({
        module: 'verlauf',
        data: { text: 'Ergotherapie und Sporttherapie besprochen.' },
      }),
    ]

    const ct = appendComplementaryTherapyCandidatesFromMentions(base).filter(
      (c) => c.module === 'complementaryTherapy',
    )
    expect(ct).toHaveLength(2)
    expect(ct.some((c) => c.module === 'complementaryTherapy' && c.data.therapyTypeId === 'sporttherapie')).toBe(
      true,
    )
    expect(ct.filter((c) => c.module === 'complementaryTherapy' && c.data.therapyTypeId === 'ergotherapie')).toHaveLength(
      1,
    )
  })

  it('derives therapy candidates through the full docx pipeline', () => {
    const result = docxTextToResult([
      'Verlauf',
      '12.03.2024',
      'Patient nimmt regelmäßig an Ergotherapie teil.',
    ].join('\n'))

    const ct = result.candidates.filter((c) => c.module === 'complementaryTherapy')
    expect(ct).toHaveLength(1)
    if (ct[0].module === 'complementaryTherapy') {
      expect(ct[0].data.therapyTypeId).toBe('ergotherapie')
    }
  })
})
