import { describe, expect, it } from 'vitest'
import {
  buildStructuredCuesFromAiDomains,
  buildStructuredCuesFromAiFields,
  hashPsychopathSourceText,
  isPsychopathAiStructuredStale,
} from '../psychopathAiExtract'

describe('hashPsychopathSourceText', () => {
  it('is stable for whitespace-normalized text', () => {
    expect(hashPsychopathSourceText('a  b c')).toBe(hashPsychopathSourceText('a b c'))
  })
})

describe('isPsychopathAiStructuredStale', () => {
  it('returns true when snapshot hash differs from source text', () => {
    const text = 'Affekt gedrückt, Antrieb reduziert.'
    expect(
      isPsychopathAiStructuredStale(text, {
        version: 1,
        sourceTextHash: 'deadbeef',
        extractedAt: '2026-06-01T00:00:00.000Z',
        status: 'accepted',
        fields: { affect: 'gedrückt' },
        courseDirection: 'stable',
        confidence: 'medium',
      }),
    ).toBe(true)
  })

  it('returns true when snapshot hash matches but structured output is empty', () => {
    const text = 'Affekt gedrückt, Antrieb reduziert.'
    const hash = hashPsychopathSourceText(text)
    expect(
      isPsychopathAiStructuredStale(text, {
        version: 1,
        sourceTextHash: hash,
        extractedAt: '2026-06-01T00:00:00.000Z',
        status: 'accepted',
        fields: {},
        courseDirection: 'stable',
        confidence: 'low',
      }),
    ).toBe(true)
  })

  it('returns false when hash matches and structured output exists', () => {
    const text = 'Affekt gedrückt, Antrieb reduziert.'
    const hash = hashPsychopathSourceText(text)
    expect(
      isPsychopathAiStructuredStale(text, {
        version: 1,
        sourceTextHash: hash,
        extractedAt: '2026-06-01T00:00:00.000Z',
        status: 'accepted',
        fields: { affect: 'gedrückt' },
        courseDirection: 'stable',
        confidence: 'medium',
      }),
    ).toBe(false)
  })
})

describe('buildStructuredCuesFromAiFields', () => {
  it('returns only positive or unclear domains in canonical order by default', () => {
    const cues = buildStructuredCuesFromAiFields({
      consciousness: 'wach',
      affect: 'gedrückt',
      drive: 'reduziert',
      thoughtContent: 'unauffällig',
    })
    expect(cues.map((c) => c.domainKey)).toEqual(['consciousness', 'affect', 'drive'])
    expect(cues[1]?.value).toBe('gedrückt')
    expect(cues.every((c) => c.status !== 'negative')).toBe(true)
  })

  it('can show the full AMDP grid without placeholder values', () => {
    const cues = buildStructuredCuesFromAiFields({ affect: 'labil' }, { showAllDomains: true })
    expect(cues).toHaveLength(20)
    expect(cues.some((c) => c.value === 'nicht dokumentiert')).toBe(false)
    expect(cues.filter((c) => c.status === 'positive').length).toBe(1)
  })
})

describe('buildStructuredCuesFromAiDomains', () => {
  it('renders tri-state domains compactly', () => {
    const cues = buildStructuredCuesFromAiDomains([
      { domainKey: 'affect', status: 'positive', detail: 'gedrückt' },
      { domainKey: 'drive', status: 'negative', detail: null },
      { domainKey: 'sleep', status: 'unclear', detail: 'schlecht' },
    ])
    expect(cues.map((c) => c.domainKey)).toEqual(['affect', 'sleep'])
    expect(cues[0]?.status).toBe('positive')
    expect(cues[1]?.status).toBe('unclear')
  })
})
