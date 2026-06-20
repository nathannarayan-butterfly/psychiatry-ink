import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockLoadState = vi.hoisted(() => vi.fn())
const mockSaveState = vi.hoisted(() => vi.fn())
const mockRequestExtract = vi.hoisted(() => vi.fn())

vi.mock('../psychopathFindingStorage', () => ({
  loadPsychopathFindingState: mockLoadState,
  savePsychopathFindingState: mockSaveState,
}))

vi.mock('../featureFlags', () => ({
  isPsychopathExtractAiEnabled: vi.fn(() => true),
}))

vi.mock('../documentImport/deidentify', () => ({
  deidentifyText: vi.fn((text: string) => ({ text, redactions: [] })),
}))

vi.mock('../../diagnosenArchive', () => ({
  loadDiagnosen: vi.fn(() => []),
}))

vi.mock('../../services/psychopathExtractApi', () => ({
  requestPsychopathExtract: mockRequestExtract,
}))

vi.mock('../clinicalImprint/storage', () => ({
  upsertClinicalImprint: vi.fn(),
  imprintKeyFor: vi.fn((sourceType: string, sourceId: string) => `${sourceType}:${sourceId}`),
}))

import {
  buildStructuredCuesFromAiDomains,
  buildStructuredCuesFromAiFields,
  hashPsychopathSourceText,
  isPsychopathAiStructuredStale,
  runPsychopathAiExtract,
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

describe('runPsychopathAiExtract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadState.mockReturnValue({
      version: 1,
      updatedAt: '2026-06-01T00:00:00.000Z',
      current: null,
      history: [],
      aiStructured: null,
    })
  })

  it('reuses accepted aiStructured when source hash matches', async () => {
    const text = 'Affekt gedrückt, Antrieb reduziert und stabil.'
    const hash = hashPsychopathSourceText(text)
    const cached = {
      version: 1 as const,
      sourceTextHash: hash,
      extractedAt: '2026-06-01T00:00:00.000Z',
      status: 'accepted' as const,
      fields: { affect: 'gedrückt' },
      courseDirection: 'stable' as const,
      confidence: 'medium' as const,
    }
    mockLoadState.mockReturnValue({
      version: 1,
      updatedAt: '2026-06-01T00:00:00.000Z',
      current: null,
      history: [],
      aiStructured: cached,
    })

    const result = await runPsychopathAiExtract({
      caseId: 'case-1',
      sourceText: text,
      language: 'de',
    })

    expect(result).toEqual(cached)
    expect(mockRequestExtract).not.toHaveBeenCalled()
    expect(mockSaveState).not.toHaveBeenCalled()
  })

  it('reuses pending aiStructured when source hash matches', async () => {
    const text = 'Affekt gedrückt, Antrieb reduziert und stabil.'
    const hash = hashPsychopathSourceText(text)
    const cached = {
      version: 1 as const,
      sourceTextHash: hash,
      extractedAt: '2026-06-01T00:00:00.000Z',
      status: 'pending' as const,
      domains: [{ domainKey: 'affect' as const, status: 'positive' as const, detail: 'gedrückt' }],
      fields: { affect: 'gedrückt' },
      courseDirection: 'stable' as const,
      confidence: 'medium' as const,
    }
    mockLoadState.mockReturnValue({
      version: 1,
      updatedAt: '2026-06-01T00:00:00.000Z',
      current: null,
      history: [],
      aiStructured: cached,
    })

    const result = await runPsychopathAiExtract({
      caseId: 'case-1',
      sourceText: text,
      language: 'de',
    })

    expect(result).toEqual(cached)
    expect(mockRequestExtract).not.toHaveBeenCalled()
  })
})
