/**
 * Normalize clinical-course entry text after DOCX/table flattening.
 *
 * Strips invisible Unicode whitespace, collapses consecutive blank lines to at most
 * one paragraph break, and trims each line and the whole body. Does not merge
 * separate dated entries — call once per entry.
 */

/** Non-breaking and other invisible space characters common in DOCX flattening. */
const INVISIBLE_SPACE = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g

function normalizeLine(line: string): string {
  return line.replace(/\r/g, '').replace(INVISIBLE_SPACE, ' ').trim()
}

export function normalizeVerlaufText(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').map(normalizeLine)

  const collapsed: string[] = []
  let previousEmpty = false
  for (const line of lines) {
    const isEmpty = line.length === 0
    if (isEmpty) {
      if (!previousEmpty) collapsed.push('')
      previousEmpty = true
    } else {
      collapsed.push(line)
      previousEmpty = false
    }
  }

  return collapsed.join('\n').trim()
}
