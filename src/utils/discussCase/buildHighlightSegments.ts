import type { DiscussCaseAnnotation } from '../../types/discussCase'
import { getParticipantColor } from './participantColors'

export interface HighlightSegment {
  text: string
  annotationId?: string
  authorUserId?: string
  backgroundColor?: string
  borderColor?: string
  commentBody?: string | null
}

interface ResolvedRange {
  annotation: DiscussCaseAnnotation
  startOffset: number
  endOffset: number
}

/** Resolve character offsets; fall back to highlightedText search for legacy rows. */
export function resolveAnnotationRange(
  content: string,
  annotation: DiscussCaseAnnotation,
): ResolvedRange | null {
  if (annotation.resolvedAt) return null

  const hasNumericOffsets =
    Number.isFinite(annotation.startOffset) &&
    Number.isFinite(annotation.endOffset) &&
    annotation.endOffset > annotation.startOffset

  if (hasNumericOffsets) {
    const startOffset = Math.max(0, Math.min(annotation.startOffset, content.length))
    const endOffset = Math.max(startOffset, Math.min(annotation.endOffset, content.length))
    if (endOffset > startOffset) {
      return { annotation, startOffset, endOffset }
    }
  }

  const needle = annotation.highlightedText?.trim()
  if (!needle) return null

  const idx = content.indexOf(needle)
  if (idx < 0) return null

  return {
    annotation,
    startOffset: idx,
    endOffset: idx + needle.length,
  }
}

/**
 * Split plain text into segments with per-author highlight styling.
 * Supports overlapping ranges from different participants via boundary splitting.
 */
export function buildHighlightSegments(
  content: string,
  annotations: DiscussCaseAnnotation[],
): HighlightSegment[] {
  if (!content) return [{ text: '' }]
  if (annotations.length === 0) return [{ text: content }]

  const valid = annotations
    .map((a) => resolveAnnotationRange(content, a))
    .filter((r): r is ResolvedRange => r !== null)
    .sort(
      (a, b) =>
        a.startOffset - b.startOffset ||
        a.annotation.createdAt.localeCompare(b.annotation.createdAt),
    )

  if (valid.length === 0) return [{ text: content }]

  const boundaries = new Set<number>([0, content.length])
  for (const r of valid) {
    boundaries.add(r.startOffset)
    boundaries.add(r.endOffset)
  }
  const points = [...boundaries].sort((a, b) => a - b)

  const segments: HighlightSegment[] = []

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i]
    const end = points[i + 1]
    if (start >= end) continue

    const covering = valid.filter((r) => r.startOffset <= start && r.endOffset >= end)
    const text = content.slice(start, end)

    if (covering.length === 0) {
      segments.push({ text })
      continue
    }

    const primary = covering[covering.length - 1].annotation
    const participantColor = getParticipantColor(primary.authorUserId)
    segments.push({
      text,
      annotationId: primary.id,
      authorUserId: primary.authorUserId,
      backgroundColor: participantColor.highlight,
      borderColor: participantColor.border,
      commentBody: primary.commentBody,
    })
  }

  return mergeAdjacentSegments(segments)
}

function mergeAdjacentSegments(segments: HighlightSegment[]): HighlightSegment[] {
  if (segments.length <= 1) return segments

  const merged: HighlightSegment[] = []
  for (const seg of segments) {
    const prev = merged[merged.length - 1]
    if (
      prev &&
      prev.annotationId === seg.annotationId &&
      prev.authorUserId === seg.authorUserId &&
      prev.backgroundColor === seg.backgroundColor &&
      prev.borderColor === seg.borderColor
    ) {
      prev.text += seg.text
    } else {
      merged.push({ ...seg })
    }
  }
  return merged
}
