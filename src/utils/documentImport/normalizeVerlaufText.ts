/**
 * Normalize clinical-course entry text after DOCX/table flattening.
 *
 * Collapses runs of 3+ blank lines to a single paragraph break (at most one empty
 * line between blocks), trims trailing whitespace on each line, and trims the
 * whole body. Does not merge separate dated entries — call once per entry.
 */
export function normalizeVerlaufText(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim())
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
