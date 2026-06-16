/**
 * Pure helper that derives the AI-edit context from a plain-text editor value
 * and a selection range. The editor is a plain <textarea>, so a "selection" is
 * just `fullText.slice(selectionStart, selectionEnd)` and context is the
 * neighbouring text.
 *
 * Strategy (mirrors the server caps):
 *  - Always send the selection + its enclosing paragraph.
 *  - When the selection is very short, widen to neighbouring paragraphs so the
 *    model has enough context to rephrase sensibly.
 *  - Cap the before/after context so requests stay small.
 */

export const SHORT_SELECTION_CHARS = 40
export const MAX_SELECTION_CHARS = 6_000
export const MAX_CONTEXT_CHARS = 4_000

export interface EditContext {
  selectedText: string
  contextBefore: string
  contextAfter: string
}

/** Index of the paragraph boundary (blank line) at or before `index`. */
function paragraphStart(text: string, index: number): number {
  const boundary = text.lastIndexOf('\n\n', Math.max(0, index - 1))
  return boundary === -1 ? 0 : boundary + 2
}

/** Index of the paragraph boundary (blank line) at or after `index`. */
function paragraphEnd(text: string, index: number): number {
  const boundary = text.indexOf('\n\n', index)
  return boundary === -1 ? text.length : boundary
}

export function buildEditContext(
  fullText: string,
  selectionStart: number,
  selectionEnd: number,
): EditContext {
  const start = Math.max(0, Math.min(selectionStart, selectionEnd))
  const end = Math.min(fullText.length, Math.max(selectionStart, selectionEnd))

  const selectedText = fullText.slice(start, end).slice(0, MAX_SELECTION_CHARS)

  let beforeStart = paragraphStart(fullText, start)
  let afterEnd = paragraphEnd(fullText, end)

  // Widen to neighbouring paragraphs for very short selections.
  if (selectedText.trim().length < SHORT_SELECTION_CHARS) {
    beforeStart = paragraphStart(fullText, Math.max(0, beforeStart - 2))
    afterEnd = paragraphEnd(fullText, Math.min(fullText.length, afterEnd + 2))
  }

  const contextBefore = fullText.slice(beforeStart, start).slice(-MAX_CONTEXT_CHARS)
  const contextAfter = fullText.slice(end, afterEnd).slice(0, MAX_CONTEXT_CHARS)

  return { selectedText, contextBefore, contextAfter }
}

/** Apply an accepted edit: splice `editedText` into `fullText` at the range. */
export function applyEdit(
  fullText: string,
  selectionStart: number,
  selectionEnd: number,
  editedText: string,
): string {
  const start = Math.max(0, Math.min(selectionStart, selectionEnd))
  const end = Math.min(fullText.length, Math.max(selectionStart, selectionEnd))
  return fullText.slice(0, start) + editedText + fullText.slice(end)
}
