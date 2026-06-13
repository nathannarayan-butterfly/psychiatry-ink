import { useMemo } from 'react'
import {
  DEFAULT_HIGHLIGHT_COLOR,
  type HighlightColor,
  type HighlightStyle,
  type UserHighlight,
} from '../../types/knowledgeBaseAnnotations'

interface HighlightedTextProps {
  content: string
  highlights: UserHighlight[]
  onRemoveHighlight?: (highlightId: string) => void
}

interface Segment {
  text: string
  highlightId?: string
  style?: HighlightStyle
  color?: HighlightColor
}

function buildSegments(content: string, highlights: UserHighlight[]): Segment[] {
  if (!content || highlights.length === 0) return [{ text: content }]

  const sorted = [...highlights]
    .filter((h) => h.startOffset >= 0 && h.endOffset > h.startOffset && h.endOffset <= content.length)
    .sort((a, b) => a.startOffset - b.startOffset)

  const segments: Segment[] = []
  let cursor = 0

  for (const hl of sorted) {
    if (hl.startOffset < cursor) continue
    if (hl.startOffset > cursor) {
      segments.push({ text: content.slice(cursor, hl.startOffset) })
    }
    segments.push({
      text: content.slice(hl.startOffset, hl.endOffset),
      highlightId: hl.id,
      style: hl.style ?? 'highlight',
      color: hl.color ?? DEFAULT_HIGHLIGHT_COLOR,
    })
    cursor = hl.endOffset
  }

  if (cursor < content.length) {
    segments.push({ text: content.slice(cursor) })
  }

  return segments.length > 0 ? segments : [{ text: content }]
}

const STYLE_CLASS: Record<HighlightStyle, string> = {
  highlight: 'kbp-annot kbp-annot--highlight',
  underline: 'kbp-annot kbp-annot--underline',
  bold: 'kbp-annot kbp-annot--bold',
}

const HIGHLIGHT_COLOR_CLASS: Record<HighlightColor, string> = {
  yellow: 'kbp-annot--highlight-yellow',
  green: 'kbp-annot--highlight-green',
  blue: 'kbp-annot--highlight-blue',
  pink: 'kbp-annot--highlight-pink',
  orange: 'kbp-annot--highlight-orange',
  purple: 'kbp-annot--highlight-purple',
  teal: 'kbp-annot--highlight-teal',
  gray: 'kbp-annot--highlight-gray',
  red: 'kbp-annot--highlight-red',
  beige: 'kbp-annot--highlight-beige',
}

function markClassName(style: HighlightStyle, color: HighlightColor): string {
  const base = STYLE_CLASS[style]
  // Color tint only applies to highlight marks; underline/bold keep their look.
  return style === 'highlight' ? `${base} ${HIGHLIGHT_COLOR_CLASS[color]}` : base
}

export function HighlightedText({ content, highlights, onRemoveHighlight }: HighlightedTextProps) {
  const segments = useMemo(() => buildSegments(content, highlights), [content, highlights])

  return (
    <p className="kbp-section__text">
      {segments.map((seg, i) =>
        seg.highlightId ? (
          <mark
            key={`${seg.highlightId}-${i}`}
            className={markClassName(seg.style ?? 'highlight', seg.color ?? DEFAULT_HIGHLIGHT_COLOR)}
            title={onRemoveHighlight ? undefined : seg.text}
            onClick={onRemoveHighlight ? () => onRemoveHighlight(seg.highlightId!) : undefined}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </p>
  )
}

/** Map a DOM text selection to offsets within plain `content`. */
export function getTextSelectionOffsets(
  container: HTMLElement,
  content: string,
): { startOffset: number; endOffset: number; text: string } | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) return null

  const preRange = document.createRange()
  preRange.selectNodeContents(container)
  preRange.setEnd(range.startContainer, range.startOffset)
  const startOffset = preRange.toString().length
  const selectedText = range.toString()
  const endOffset = startOffset + selectedText.length

  if (!selectedText.trim() || startOffset < 0 || endOffset > content.length) return null
  if (content.slice(startOffset, endOffset) !== selectedText) {
    const fuzzyOffsets = findSelectionOffsets(content, selectedText, startOffset)
    if (!fuzzyOffsets) return null
    return { ...fuzzyOffsets, text: selectedText }
  }

  return { startOffset, endOffset, text: selectedText }
}

function findSelectionOffsets(
  content: string,
  selectedText: string,
  approximateStart: number,
): { startOffset: number; endOffset: number } | null {
  const exactMatches = allIndexesOf(content, selectedText)
  if (exactMatches.length > 0) {
    const best = nearestIndex(exactMatches, approximateStart)
    return { startOffset: best, endOffset: best + selectedText.length }
  }

  const normalizedSelection = normalizeSelectionText(selectedText)
  if (!normalizedSelection) return null

  const contentMap = buildNormalizedIndexMap(content)
  const normalizedStart = contentMap.text.indexOf(normalizedSelection)
  if (normalizedStart === -1) return null

  const matchingStarts = allIndexesOf(contentMap.text, normalizedSelection)
  const candidates = matchingStarts
    .map((start) => ({
      startOffset: contentMap.indexes[start],
      endOffset: contentMap.indexes[start + normalizedSelection.length - 1] + 1,
    }))
    .filter((candidate) => candidate.endOffset > candidate.startOffset)

  if (candidates.length === 0) return null
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate.startOffset - approximateStart) < Math.abs(best.startOffset - approximateStart)
      ? candidate
      : best,
  )
}

function allIndexesOf(haystack: string, needle: string): number[] {
  if (!needle) return []
  const indexes: number[] = []
  let fromIndex = 0
  while (fromIndex <= haystack.length) {
    const index = haystack.indexOf(needle, fromIndex)
    if (index === -1) break
    indexes.push(index)
    fromIndex = index + Math.max(needle.length, 1)
  }
  return indexes
}

function nearestIndex(indexes: number[], approximateStart: number): number {
  return indexes.reduce((best, current) =>
    Math.abs(current - approximateStart) < Math.abs(best - approximateStart) ? current : best,
  )
}

function normalizeSelectionText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function buildNormalizedIndexMap(content: string): { text: string; indexes: number[] } {
  let text = ''
  const indexes: number[] = []
  let inWhitespace = false

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]
    if (/\s/.test(char)) {
      if (!inWhitespace && text.length > 0) {
        text += ' '
        indexes.push(i)
      }
      inWhitespace = true
      continue
    }

    text += char
    indexes.push(i)
    inWhitespace = false
  }

  if (text.endsWith(' ')) {
    text = text.slice(0, -1)
    indexes.pop()
  }

  return { text, indexes }
}
