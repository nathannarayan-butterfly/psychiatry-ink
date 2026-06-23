/**
 * Resolve a template's display name from raw user input, falling back to a
 * sensible default (e.g. the category name) when the user leaves it blank.
 * Collapses surrounding/internal whitespace.
 */
export function resolveTemplateName(rawName: string, fallback: string): string {
  const cleaned = rawName.replace(/\s+/g, ' ').trim()
  if (cleaned) return cleaned
  const cleanedFallback = fallback.replace(/\s+/g, ' ').trim()
  return cleanedFallback || 'Vorlage'
}
