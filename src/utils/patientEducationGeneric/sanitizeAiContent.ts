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

  // Stray HTML tags the model sometimes emits despite the plain-prose contract
  // (`<h2>…</h2>`, `<p>`, `<br>`, `<ul><li>`, and the bare `</h2>` / `/h2`
  // fragments the clinician reported). Convert block-level closers to paragraph
  // breaks, list items to sentences, then drop every remaining tag.
  text = text.replace(/<\s*\/?\s*(?:p|div|h[1-6]|ul|ol|section|article)\s*[^>]*>/gi, '\n\n')
  text = text.replace(/<\s*br\s*\/?\s*>/gi, '\n')
  text = text.replace(/<\s*li\s*[^>]*>/gi, '\n• ')
  text = text.replace(/<\s*\/\s*li\s*>/gi, '')
  text = text.replace(/<\/?[a-z][a-z0-9]*\b[^>]*>/gi, '')
  // Orphaned closing-tag remnants like "/h2", "h2>" left after partial output.
  text = text.replace(/^\s*\/?h[1-6]\s*>?\s*$/gim, '')

  // Orphaned wrapping quotes/brackets
  text = text.replace(/^["'{[\s]+/, '').replace(/["'}\]]+\s*$/, '')

  // Trailing incomplete JSON property stubs
  text = text.replace(/,\s*["']?references["']?\s*:\s*\[?\s*$/i, '')

  // Collapse the runs of blank lines the tag→break conversions can create.
  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')

  return text.trim()
}
