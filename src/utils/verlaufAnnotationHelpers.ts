import type { VerlaufAnnotation } from './verlaufFeed'
import type { TodoPriority } from '../types/todo'

export type VerlaufCommentVisibility = 'private' | 'team' | 'person'

/**
 * Priority → inline colour for `todo` annotations. Used both for the dotted
 * underline on the anchored chart text and the panel/checkbox accent.
 * Clinical palette: red = high, amber = medium (normal), teal/green = low.
 */
export const VERLAUF_TODO_PRIORITY_COLORS: Record<TodoPriority, string> = {
  high: '#c0392b',
  normal: '#b45309',
  low: '#0d9488',
}

export function verlaufTodoPriorityColor(priority: TodoPriority | null | undefined): string {
  return VERLAUF_TODO_PRIORITY_COLORS[priority ?? 'normal']
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && aEnd > bStart
}

export function findOverlappingAnnotations(
  annotations: VerlaufAnnotation[],
  entryId: string,
  startOffset: number,
  endOffset: number,
): VerlaufAnnotation[] {
  return annotations.filter(
    (ann) =>
      ann.entryId === entryId &&
      rangesOverlap(ann.startOffset, ann.endOffset, startOffset, endOffset),
  )
}

export function isFormatAnnotation(type: VerlaufAnnotation['type']): boolean {
  return type === 'bold' || type === 'italic' || type === 'underline' || type === 'highlight'
}

export function isTodoAnnotation(
  annotation: VerlaufAnnotation,
): annotation is VerlaufAnnotation & { type: 'todo' } {
  return annotation.type === 'todo'
}

export function canViewAnnotation(
  annotation: VerlaufAnnotation,
  viewerUserId: string | undefined,
): boolean {
  if (annotation.type !== 'comment') return true
  const visibility = annotation.visibility ?? 'private'
  const authorId = annotation.authorUserId ?? viewerUserId
  if (!viewerUserId) return visibility === 'team'
  if (authorId === viewerUserId) return true
  if (visibility === 'team') return true
  if (visibility === 'person' && annotation.sharedWithUserId === viewerUserId) return true
  return false
}

export function normalizeVerlaufAnnotation(annotation: VerlaufAnnotation): VerlaufAnnotation {
  return {
    ...annotation,
    id: annotation.id ?? crypto.randomUUID(),
    visibility:
      annotation.type === 'comment' ? (annotation.visibility ?? 'private') : annotation.visibility,
    ...(annotation.type === 'todo'
      ? {
          priority: annotation.priority ?? 'normal',
          done: annotation.done ?? false,
          dueDate: annotation.dueDate ?? null,
          linkedTodoId: annotation.linkedTodoId ?? null,
        }
      : {}),
    createdAt: annotation.createdAt ?? new Date().toISOString(),
  }
}

export function normalizeVerlaufAnnotations(annotations: VerlaufAnnotation[]): VerlaufAnnotation[] {
  return annotations.map(normalizeVerlaufAnnotation)
}

/** Plain-text body used for derived feed cards (title prefix + body). */
export function derivedFeedEntryText(title: string, body: string): string {
  return `${title}: ${body}`
}

/** Which comment bubble (if any) should be visible near its anchor. */
export function resolveRevealedCommentId(
  hoveredId: string | null,
  focusedId: string | null,
): string | null {
  return hoveredId ?? focusedId
}

export interface DomRectLike {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

export interface CommentBubblePlacement {
  top: number
  left: number
  /** False when the anchor is off-screen — bubble should not render. */
  placeable: boolean
}

export const COMMENT_BUBBLE_VIEWPORT_MARGIN = 12
/** Gap between the anchor span's bottom edge and the comment bubble's top edge. */
export const COMMENT_BUBBLE_ANCHOR_GAP = 8

/**
 * Positions a hover-revealed comment bubble just below (or above, if needed)
 * the anchor span, left-aligned with the anchor and clamped inside the viewport.
 */
export function resolveCommentBubblePlacement(
  anchorRect: DomRectLike,
  bubbleWidth: number,
  bubbleHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): CommentBubblePlacement {
  const margin = COMMENT_BUBBLE_VIEWPORT_MARGIN

  if (
    anchorRect.bottom < margin ||
    anchorRect.top > viewportHeight - margin ||
    anchorRect.right < margin ||
    anchorRect.left > viewportWidth - margin
  ) {
    return { top: 0, left: 0, placeable: false }
  }

  let left = anchorRect.left
  let top = anchorRect.bottom + COMMENT_BUBBLE_ANCHOR_GAP

  left = Math.max(margin, Math.min(left, viewportWidth - bubbleWidth - margin))

  if (top + bubbleHeight > viewportHeight - margin) {
    top = anchorRect.top - bubbleHeight - COMMENT_BUBBLE_ANCHOR_GAP
  }
  top = Math.max(margin, Math.min(top, viewportHeight - bubbleHeight - margin))

  return { top, left, placeable: true }
}

export interface ConnectorGeometry {
  startX: number
  startY: number
  endX: number
  endY: number
  orientation: 'horizontal' | 'vertical'
}

/** How far the connector endpoint is inset from a target's near edge. */
export const CONNECTOR_EDGE_INSET = 10

/**
 * Computes the two endpoints of a leader line linking an annotated text anchor
 * to its comment target (a side-panel card in wide mode, a hover bubble in
 * narrow mode). The line leaves the anchor toward whichever side the target
 * sits on and lands on the target's near edge, clamped so it stays on the edge
 * rather than the corner. Orientation drives the curve handles in the SVG.
 */
export function resolveConnectorGeometry(
  anchor: DomRectLike,
  target: DomRectLike,
): ConnectorGeometry {
  const anchorCx = anchor.left + anchor.width / 2
  const anchorCy = anchor.top + anchor.height / 2
  const inset = CONNECTOR_EDGE_INSET

  // Target to the right — the wide-mode side panel.
  if (target.left >= anchor.right) {
    const endY = Math.max(target.top + inset, Math.min(anchorCy, target.bottom - inset))
    return {
      startX: anchor.right,
      startY: anchorCy,
      endX: target.left,
      endY,
      orientation: 'horizontal',
    }
  }
  // Target to the left.
  if (target.right <= anchor.left) {
    const endY = Math.max(target.top + inset, Math.min(anchorCy, target.bottom - inset))
    return {
      startX: anchor.left,
      startY: anchorCy,
      endX: target.right,
      endY,
      orientation: 'horizontal',
    }
  }
  // Target below the text — the hover bubble placed under the anchor.
  if (target.top >= anchor.bottom) {
    const endX = Math.max(target.left + inset, Math.min(anchorCx, target.right - inset))
    return {
      startX: anchorCx,
      startY: anchor.bottom,
      endX,
      endY: target.top,
      orientation: 'vertical',
    }
  }
  // Target above the text — the hover bubble flipped above the anchor.
  const endX = Math.max(target.left + inset, Math.min(anchorCx, target.right - inset))
  return {
    startX: anchorCx,
    startY: anchor.top,
    endX,
    endY: target.bottom,
    orientation: 'vertical',
  }
}
