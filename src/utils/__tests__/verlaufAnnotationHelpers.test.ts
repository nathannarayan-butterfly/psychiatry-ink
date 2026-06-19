import { describe, expect, it } from 'vitest'
import {
  canViewAnnotation,
  derivedFeedEntryText,
  findOverlappingAnnotations,
  isFormatAnnotation,
  panelListMinHeight,
  rangesOverlap,
  resolvePanelItemPositions,
} from '../verlaufAnnotationHelpers'
import type { VerlaufAnnotation } from '../verlaufFeed'

function ann(partial: Partial<VerlaufAnnotation> & Pick<VerlaufAnnotation, 'type'>): VerlaufAnnotation {
  return {
    id: 'a1',
    entryId: 'entry-1',
    startOffset: 0,
    endOffset: 5,
    rangeText: 'hello',
    ...partial,
  }
}

describe('verlaufAnnotationHelpers', () => {
  it('detects overlapping ranges', () => {
    expect(rangesOverlap(0, 5, 3, 8)).toBe(true)
    expect(rangesOverlap(0, 5, 5, 8)).toBe(false)
  })

  it('finds overlapping annotations for an entry', () => {
    const annotations = [
      ann({ id: 'h1', type: 'highlight', startOffset: 0, endOffset: 10 }),
      ann({ id: 'h2', type: 'highlight', entryId: 'other', startOffset: 0, endOffset: 10 }),
      ann({ id: 'c1', type: 'comment', startOffset: 20, endOffset: 30, comment: 'note' }),
    ]
    const overlapping = findOverlappingAnnotations(annotations, 'entry-1', 5, 7)
    expect(overlapping.map((a) => a.id)).toEqual(['h1'])
  })

  it('classifies format annotation types', () => {
    expect(isFormatAnnotation('highlight')).toBe(true)
    expect(isFormatAnnotation('comment')).toBe(false)
  })

  it('filters comment visibility for viewer', () => {
    const privateComment = ann({
      type: 'comment',
      comment: 'secret',
      authorUserId: 'user-a',
      visibility: 'private',
    })
    const teamComment = ann({
      type: 'comment',
      comment: 'team',
      authorUserId: 'user-a',
      visibility: 'team',
    })
    const sharedComment = ann({
      type: 'comment',
      comment: 'for b',
      authorUserId: 'user-a',
      visibility: 'person',
      sharedWithUserId: 'user-b',
    })

    expect(canViewAnnotation(privateComment, 'user-a')).toBe(true)
    expect(canViewAnnotation(privateComment, 'user-b')).toBe(false)
    expect(canViewAnnotation(teamComment, 'user-b')).toBe(true)
    expect(canViewAnnotation(sharedComment, 'user-b')).toBe(true)
    expect(canViewAnnotation(sharedComment, 'user-c')).toBe(false)
  })

  it('builds derived feed entry plain text', () => {
    expect(derivedFeedEntryText('Sertralin', 'Dosis erhöht.')).toBe('Sertralin: Dosis erhöht.')
  })

  it('aligns panel items to anchor vertical centers', () => {
    const positions = resolvePanelItemPositions(
      ['c1', 'c2'],
      100,
      (id) => {
        if (id === 'c1') {
          return { getBoundingClientRect: () => ({ top: 200, height: 20 }) } as HTMLElement
        }
        return null
      },
    )
    expect(positions[0]).toEqual({ id: 'c1', top: 110, anchored: true })
    expect(positions[1]?.anchored).toBe(false)
    expect(panelListMinHeight(positions)).toBeGreaterThan(110)
  })
})
