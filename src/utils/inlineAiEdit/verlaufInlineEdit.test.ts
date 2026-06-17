import { describe, expect, it } from 'vitest'
import {
  resolveVerlaufAiEditTarget,
  type VerlaufAiEditBubble,
} from './verlaufInlineEdit'

const ENTRIES = [
  { id: 'e1', content: 'Der Patient wirkt unruhig und angespannt.' },
  { id: 'e2', content: 'Keine akute Eigen- oder Fremdgefährdung.' },
]

function bubble(overrides: Partial<VerlaufAiEditBubble> = {}): VerlaufAiEditBubble {
  return {
    entryId: 'e1',
    selectedText: 'unruhig und angespannt',
    startOffset: 18,
    endOffset: 40,
    readonly: false,
    ...overrides,
  }
}

describe('resolveVerlaufAiEditTarget', () => {
  it('resolves a target for an editable manual entry', () => {
    const target = resolveVerlaufAiEditTarget(ENTRIES, bubble())
    expect(target).toEqual({
      entryId: 'e1',
      fullText: 'Der Patient wirkt unruhig und angespannt.',
      selectedText: 'unruhig und angespannt',
      selectionStart: 18,
      selectionEnd: 40,
    })
  })

  it('returns null for read-only selections (derived/Aufnahme history)', () => {
    expect(resolveVerlaufAiEditTarget(ENTRIES, bubble({ readonly: true }))).toBeNull()
  })

  it('returns null when the selection does not belong to a manual entry', () => {
    expect(
      resolveVerlaufAiEditTarget(ENTRIES, bubble({ entryId: 'aufnahmebefund:doc:1' })),
    ).toBeNull()
  })

  it('returns null for an empty/whitespace-only selection', () => {
    expect(resolveVerlaufAiEditTarget(ENTRIES, bubble({ selectedText: '   ' }))).toBeNull()
  })

  it('returns null for a collapsed or inverted range', () => {
    expect(
      resolveVerlaufAiEditTarget(ENTRIES, bubble({ startOffset: 40, endOffset: 40 })),
    ).toBeNull()
    expect(
      resolveVerlaufAiEditTarget(ENTRIES, bubble({ startOffset: 40, endOffset: 18 })),
    ).toBeNull()
  })

  it('returns null when there is no entryId', () => {
    expect(resolveVerlaufAiEditTarget(ENTRIES, bubble({ entryId: '' }))).toBeNull()
  })
})
