import type { DocumentChecklistItem } from '../types'

export function compileChecklistText(
  items: DocumentChecklistItem[],
  selections: Record<string, boolean>,
  sectionLabel?: string,
): string {
  const selectedTexts = items
    .filter((item) => selections[item.id])
    .map((item) => item.text.trim())
    .filter(Boolean)

  if (selectedTexts.length === 0) return ''

  const body = selectedTexts.join(', ')
  if (!sectionLabel) return body

  return `${sectionLabel}: ${body}`
}
