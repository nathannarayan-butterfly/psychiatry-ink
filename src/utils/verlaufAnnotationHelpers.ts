import type { VerlaufAnnotation } from './verlaufFeed'

export type VerlaufCommentVisibility = 'private' | 'team' | 'person'

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

export interface PanelItemPosition {
  id: string
  top: number
  anchored: boolean
}

/** Dispatched after comment panel cards finish layout (positioned `top` applied). */
export const VERLAUF_ANNOTATION_PANEL_LAYOUT_EVENT = 'verlauf-annotation-panel-layout'

const PANEL_ITEM_FALLBACK_HEIGHT = 80

/**
 * Positions comment panel cards so each card's vertical center aligns with its
 * anchor span in the feed. Items without a visible anchor stack from the top.
 */
export function resolvePanelItemPositions(
  commentIds: string[],
  listContainerTop: number,
  queryAnchor: (id: string) => HTMLElement | null = (id) =>
    document.querySelector<HTMLElement>(`[data-verlauf-annotation-id="${id}"]`),
): PanelItemPosition[] {
  let fallbackY = 24
  return commentIds.map((id) => {
    const anchor = queryAnchor(id)
    if (anchor) {
      const anchorRect = anchor.getBoundingClientRect()
      return {
        id,
        top: anchorRect.top + anchorRect.height / 2 - listContainerTop,
        anchored: true,
      }
    }
    const top = fallbackY + PANEL_ITEM_FALLBACK_HEIGHT / 2
    fallbackY += PANEL_ITEM_FALLBACK_HEIGHT
    return { id, top, anchored: false }
  })
}

export function panelListMinHeight(positions: PanelItemPosition[]): number {
  if (positions.length === 0) return 0
  const maxTop = Math.max(...positions.map((p) => p.top))
  return maxTop + PANEL_ITEM_FALLBACK_HEIGHT / 2 + 16
}
