import { describe, expect, it } from 'vitest'
import {
  canViewAnnotation,
  COMMENT_BUBBLE_ANCHOR_GAP,
  COMMENT_BUBBLE_VIEWPORT_MARGIN,
  CONNECTOR_EDGE_INSET,
  derivedFeedEntryText,
  findOverlappingAnnotations,
  isFormatAnnotation,
  isTodoAnnotation,
  rangesOverlap,
  resolveCommentBubblePlacement,
  resolveConnectorGeometry,
  resolveRevealedCommentId,
  VERLAUF_TODO_PRIORITY_COLORS,
  verlaufTodoPriorityColor,
} from '../verlaufAnnotationHelpers'
import { normalizeVerlaufAnnotation } from '../verlaufAnnotationHelpers'
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
    expect(isFormatAnnotation('todo')).toBe(false)
  })

  it('identifies todo annotations', () => {
    expect(isTodoAnnotation(ann({ type: 'todo', todoText: 'Labor anfordern' }))).toBe(true)
    expect(isTodoAnnotation(ann({ type: 'comment', comment: 'x' }))).toBe(false)
  })

  it('maps todo priority to a clinical colour (red/amber/teal)', () => {
    expect(verlaufTodoPriorityColor('high')).toBe(VERLAUF_TODO_PRIORITY_COLORS.high)
    expect(verlaufTodoPriorityColor('normal')).toBe(VERLAUF_TODO_PRIORITY_COLORS.normal)
    expect(verlaufTodoPriorityColor('low')).toBe(VERLAUF_TODO_PRIORITY_COLORS.low)
    // Defaults to the medium/normal colour when unset.
    expect(verlaufTodoPriorityColor(null)).toBe(VERLAUF_TODO_PRIORITY_COLORS.normal)
    expect(verlaufTodoPriorityColor(undefined)).toBe(VERLAUF_TODO_PRIORITY_COLORS.normal)
  })

  it('normalizes todo annotations with sensible defaults', () => {
    const normalized = normalizeVerlaufAnnotation(
      ann({ type: 'todo', todoText: 'Befund nachreichen', id: undefined }),
    )
    expect(normalized.priority).toBe('normal')
    expect(normalized.done).toBe(false)
    expect(normalized.dueDate).toBeNull()
    expect(normalized.linkedTodoId).toBeNull()
    expect(normalized.id).toBeTruthy()
    expect(normalized.createdAt).toBeTruthy()
  })

  it('always allows viewing non-comment (todo) annotations', () => {
    const todo = ann({ type: 'todo', todoText: 'Aufgabe', authorUserId: 'user-a' })
    expect(canViewAnnotation(todo, 'user-b')).toBe(true)
    expect(canViewAnnotation(todo, undefined)).toBe(true)
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

  it('prefers hovered comment over focused for reveal', () => {
    expect(resolveRevealedCommentId('hover', 'focus')).toBe('hover')
    expect(resolveRevealedCommentId(null, 'focus')).toBe('focus')
    expect(resolveRevealedCommentId(null, null)).toBeNull()
  })

  it('places comment bubble below anchor left edge', () => {
    const placement = resolveCommentBubblePlacement(
      { top: 100, left: 40, right: 120, bottom: 120, width: 80, height: 20 },
      200,
      80,
      800,
      600,
    )
    expect(placement.placeable).toBe(true)
    expect(placement.top).toBe(120 + COMMENT_BUBBLE_ANCHOR_GAP)
    expect(placement.left).toBe(40)
  })

  it('flips bubble above anchor when it would overflow the viewport bottom', () => {
    const placement = resolveCommentBubblePlacement(
      { top: 520, left: 40, right: 120, bottom: 540, width: 80, height: 20 },
      200,
      80,
      800,
      600,
    )
    expect(placement.placeable).toBe(true)
    expect(placement.top).toBe(520 - COMMENT_BUBBLE_ANCHOR_GAP - 80)
  })

  it('hides bubble when anchor is off-screen', () => {
    const placement = resolveCommentBubblePlacement(
      { top: -50, left: 40, right: 120, bottom: -20, width: 80, height: 30 },
      200,
      80,
      800,
      600,
    )
    expect(placement.placeable).toBe(false)
  })

  it('clamps bubble inside viewport margins', () => {
    const placement = resolveCommentBubblePlacement(
      { top: 100, left: 760, right: 790, bottom: 120, width: 30, height: 20 },
      200,
      80,
      800,
      600,
    )
    expect(placement.placeable).toBe(true)
    expect(placement.left).toBe(800 - COMMENT_BUBBLE_VIEWPORT_MARGIN - 200)
  })

  it('draws a horizontal connector from text to a side panel card on the right', () => {
    const anchor = { top: 200, left: 100, right: 180, bottom: 220, width: 80, height: 20 }
    const card = { top: 260, left: 600, right: 880, bottom: 340, width: 280, height: 80 }
    const geo = resolveConnectorGeometry(anchor, card)
    expect(geo.orientation).toBe('horizontal')
    expect(geo.startX).toBe(180)
    expect(geo.startY).toBe(210)
    expect(geo.endX).toBe(600)
    // Anchor centre (210) is above the card, so it clamps to the card's top inset.
    expect(geo.endY).toBe(260 + CONNECTOR_EDGE_INSET)
  })

  it('draws a vertical connector from text down to a hover bubble below it', () => {
    const anchor = { top: 100, left: 100, right: 180, bottom: 120, width: 80, height: 20 }
    const bubble = { top: 140, left: 110, right: 430, bottom: 240, width: 320, height: 100 }
    const geo = resolveConnectorGeometry(anchor, bubble)
    expect(geo.orientation).toBe('vertical')
    expect(geo.startX).toBe(140)
    expect(geo.startY).toBe(120)
    expect(geo.endY).toBe(140)
    // Anchor centre (140) falls within the bubble's horizontal span.
    expect(geo.endX).toBe(140)
  })

  it('flips the connector upward when the bubble sits above the anchor', () => {
    const anchor = { top: 300, left: 100, right: 180, bottom: 320, width: 80, height: 20 }
    const bubble = { top: 180, left: 100, right: 420, bottom: 290, width: 320, height: 110 }
    const geo = resolveConnectorGeometry(anchor, bubble)
    expect(geo.orientation).toBe('vertical')
    expect(geo.startY).toBe(300)
    expect(geo.endY).toBe(290)
  })
})
