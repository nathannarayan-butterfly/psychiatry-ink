/**
 * Pure wiring helper for inline AI edit inside the Verlauf feed.
 *
 * The Verlauf feed renders its own selection popup (`BubbleToolbar`) instead of
 * the Notion editors' `FloatingSelectionToolbar`. Inline AI edit rewrites text
 * and writes it back, so it only makes sense on the *editable* manual entries
 * (which own a plain-text `content` string persisted via `updateVerlaufEntry`).
 * Derived / Aufnahme cards are read-only history with no write-back path, so
 * they must not expose the AI-edit trigger.
 *
 * This helper centralises that decision (and the offset basis) so the wiring is
 * testable without a DOM.
 */

export interface VerlaufAiEditableEntry {
  id: string
  content: string
}

export interface VerlaufAiEditBubble {
  entryId: string
  selectedText: string
  startOffset: number
  endOffset: number
  readonly: boolean
}

export interface VerlaufAiEditTarget {
  entryId: string
  /** Full plain-text content the selection offsets index into. */
  fullText: string
  selectedText: string
  selectionStart: number
  selectionEnd: number
}

/**
 * Resolve the inline-AI-edit target for the current selection bubble, or `null`
 * when AI edit is not applicable (read-only selection, empty selection, or a
 * selection that does not belong to an editable manual entry).
 */
export function resolveVerlaufAiEditTarget(
  entries: readonly VerlaufAiEditableEntry[],
  bubble: VerlaufAiEditBubble,
): VerlaufAiEditTarget | null {
  if (bubble.readonly) return null
  if (!bubble.entryId) return null
  if (!bubble.selectedText.trim()) return null
  if (bubble.endOffset <= bubble.startOffset) return null

  const entry = entries.find((candidate) => candidate.id === bubble.entryId)
  if (!entry) return null

  return {
    entryId: entry.id,
    fullText: entry.content,
    selectedText: bubble.selectedText,
    selectionStart: bubble.startOffset,
    selectionEnd: bubble.endOffset,
  }
}
