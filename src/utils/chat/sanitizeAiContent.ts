/**
 * Strip JSON / markdown artifacts from LLM chat answers so clinicians see
 * clean prose, not raw model scaffolding (`"content"`, fences, etc.).
 * Shared by Ask Butterfly, patient education, and pharma ask flows.
 */

/** Object keys most likely to hold the human-facing prose, in priority order. */
const PROSE_KEYS = [
  'content',
  'answer',
  'text',
  'response',
  'message',
  'result',
  'output',
  'reply',
  'summary',
]

/** Object keys that carry metadata/scaffolding, never the prose we want. */
const METADATA_KEY_RE = /^(references|sources|citations|role|id|type|meta|metadata|usage|model|provider|finish_reason)$/i

/**
 * Recursively pull the human-facing prose out of a parsed JSON value, no matter
 * which key the model wrapped it in. Some providers (notably Gemini on the
 * standard tier) intermittently return `{"response": "..."}` or nested objects
 * instead of bare prose; extracting by shape (not a fixed key list) keeps raw
 * JSON from ever reaching the clinician.
 */
function extractProseFromJson(value: unknown, depth = 0): string | null {
  if (depth > 6) return null
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => extractProseFromJson(entry, depth + 1))
      .filter((part): part is string => Boolean(part && part.trim()))
    return parts.length ? parts.join('\n\n') : null
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of PROSE_KEYS) {
      const candidate = obj[key]
      if (typeof candidate === 'string' && candidate.trim()) return candidate
      if (candidate && typeof candidate === 'object') {
        const nested = extractProseFromJson(candidate, depth + 1)
        if (nested && nested.trim()) return nested
      }
    }
    const parts: string[] = []
    for (const [key, entry] of Object.entries(obj)) {
      if (METADATA_KEY_RE.test(key)) continue
      const part = extractProseFromJson(entry, depth + 1)
      if (part && part.trim()) parts.push(part)
    }
    return parts.length ? parts.join('\n\n') : null
  }
  return null
}

export function sanitizeAiContent(raw: string): string {
  let text = raw.trim()
  if (!text) return ''

  text = text.replace(/^```(?:json|html|markdown|text)?\s*\n?/i, '')
  text = text.replace(/\n?```\s*$/i, '')

  // A well-formed JSON wrapper: parse it and extract the prose from any shape.
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)
      const inner = extractProseFromJson(parsed)
      // Guard against infinite recursion: only recurse when the extracted prose
      // actually changed (a bare prose string never re-enters this branch).
      if (inner && inner.trim() && inner.trim() !== text) return sanitizeAiContent(inner)
    } catch {
      // Not valid JSON (e.g. truncated) — fall through to best-effort cleanup.
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
