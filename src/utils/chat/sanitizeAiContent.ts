/**
 * Strip JSON / markdown artifacts from LLM chat answers so clinicians see
 * clean prose, not raw model scaffolding (`"content"`, fences, etc.).
 * Shared by Ask Butterfly, patient education, and pharma ask flows.
 */
export function sanitizeAiContent(raw: string): string {
  let text = raw.trim()
  if (!text) return ''

  text = text.replace(/^```(?:json|html|markdown|text)?\s*\n?/i, '')
  text = text.replace(/\n?```\s*$/i, '')

  if (text.startsWith('{') && (text.includes('"content"') || text.includes('"answer"') || text.includes('"text"'))) {
    try {
      const parsed = JSON.parse(text) as { content?: unknown; answer?: unknown; text?: unknown }
      const inner =
        typeof parsed.content === 'string'
          ? parsed.content
          : typeof parsed.answer === 'string'
            ? parsed.answer
            : typeof parsed.text === 'string'
              ? parsed.text
              : null
      if (inner) return sanitizeAiContent(inner)
    } catch {
      // fall through
    }
  }

  text = text.replace(/^["']?(?:content|answer|text)["']?\s*:\s*["']/i, '')
  text = text.replace(/["']\s*,?\s*["']?(?:references|sources|citations)["']?\s*:.*$/is, '')

  text = text.replace(/^\s*#{1,6}\s+/gm, '')
  text = text.replace(/^\s*h[1-6]\.?\s+/gim, '')

  text = text.replace(/<\s*\/?\s*(?:p|div|h[1-6]|ul|ol|section|article)\s*[^>]*>/gi, '\n\n')
  text = text.replace(/<\s*br\s*\/?\s*>/gi, '\n')
  text = text.replace(/<\s*li\s*[^>]*>/gi, '\n• ')
  text = text.replace(/<\s*\/\s*li\s*>/gi, '')
  text = text.replace(/<\/?[a-z][a-z0-9]*\b[^>]*>/gi, '')
  text = text.replace(/^\s*\/?h[1-6]\s*>?\s*$/gim, '')

  text = text.replace(/^["'{[\s]+/, '').replace(/["'}\]]+\s*$/, '')
  text = text.replace(/,\s*["']?(?:references|sources)["']?\s*:\s*\[?\s*$/i, '')

  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')

  return text.trim()
}
