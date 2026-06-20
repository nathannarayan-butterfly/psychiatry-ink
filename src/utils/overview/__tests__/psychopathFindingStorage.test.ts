import { describe, expect, it } from 'vitest'
import { shouldPersistPsychopathFindingState } from '../psychopathFindingStorage'
import type { PsychopathFindingState } from '../../../types/psychopathFinding'

function emptyState(): PsychopathFindingState {
  return {
    version: 1,
    updatedAt: '2026-06-01T00:00:00.000Z',
    current: null,
    history: [],
    aiStructured: null,
  }
}

describe('shouldPersistPsychopathFindingState', () => {
  it('returns false for an empty store', () => {
    expect(shouldPersistPsychopathFindingState(emptyState())).toBe(false)
  })

  it('returns true when current finding text exists', () => {
    const state = {
      ...emptyState(),
      current: {
        id: '1',
        date: '2026-06-01T00:00:00.000Z',
        text: 'Affekt gedrückt.',
        source: 'overview' as const,
        courseDirection: 'stable' as const,
        savedAt: '2026-06-01T00:00:00.000Z',
      },
    }
    expect(shouldPersistPsychopathFindingState(state)).toBe(true)
  })

  it('returns true when only aiStructured is present', () => {
    const state = {
      ...emptyState(),
      aiStructured: {
        version: 1 as const,
        sourceTextHash: 'abc123',
        extractedAt: '2026-06-01T00:00:00.000Z',
        status: 'accepted' as const,
        fields: { affect: 'gedrückt' },
        courseDirection: 'stable' as const,
        confidence: 'medium' as const,
      },
    }
    expect(shouldPersistPsychopathFindingState(state)).toBe(true)
  })
})
