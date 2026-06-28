/**
 * Strip JSON / markdown artifacts from patient-education AI section output so
 * clinicians see clean prose, not raw model scaffolding (`"content"`, fences, etc.).
 */
export function sanitizeEducationAiContent(raw: string): string {
  let text = raw.trim()
  if (!text) return ''

  // Markdown code fences (```json … ```)
  text = text.replace(/^```(?:json|html|markdown|text)?\s*\n?/i, '')
  text = text.replace(/\n?```\s*$/i, '')

  // Entire payload still wrapped as JSON
  if (text.startsWith('{') && text.includes('"content"')) {
    try {
      const parsed = JSON.parse(text) as { content?: unknown }
      if (typeof parsed.content === 'string') {
        return sanitizeEducationAiContent(parsed.content)
      }
    } catch {
      // fall through — strip partial JSON artifacts below
    }
  }

  // Partial JSON key leaks at the start
  text = text.replace(/^["']?content["']?\s*:\s*["']/i, '')
  text = text.replace(/["']\s*,?\s*["']?references["']?\s*:.*$/is, '')

  // Raw heading markup fragments (h2, h3, ##)
  text = text.replace(/^\s*#{1,6}\s+/gm, '')
  text = text.replace(/^\s*h[1-6]\.?\s+/gim, '')

  // Orphaned wrapping quotes/brackets
  text = text.replace(/^["'{[\s]+/, '').replace(/["'}\]]+\s*$/, '')

  // Trailing incomplete JSON property stubs
  text = text.replace(/,\s*["']?references["']?\s*:\s*\[?\s*$/i, '')

  return text.trim()
}
