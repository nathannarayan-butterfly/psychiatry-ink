/**
 * Best-effort JSON parse for LLM structured responses (salvage truncated output).
 */
export function parseStructuredJson(text: string): unknown | null {
  let trimmed = text.trim()
  if (!trimmed.startsWith('{')) {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) trimmed = trimmed.slice(start, end + 1)
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    const repaired = repairTruncatedJson(trimmed)
    if (!repaired) return null
    try {
      return JSON.parse(repaired)
    } catch {
      return null
    }
  }
}

function repairTruncatedJson(input: string): string | null {
  if (!input.startsWith('{')) return null
  const stack: string[] = []
  let inString = false
  let escaped = false
  let lastSafe = -1

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']')
    else if (ch === '}' || ch === ']') stack.pop()
    if (ch === ',' || ch === '}' || ch === ']') {
      if (stack.length >= 1) lastSafe = i
    }
  }

  if (lastSafe < 0) return null
  let truncated = input.slice(0, lastSafe + 1)
  if (truncated.trimEnd().endsWith(',')) {
    truncated = truncated.slice(0, truncated.lastIndexOf(','))
  }

  const closers: string[] = []
  let s = false
  let esc = false
  for (let i = 0; i < truncated.length; i += 1) {
    const ch = truncated[i]
    if (s) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') s = false
      continue
    }
    if (ch === '"') s = true
    else if (ch === '{' || ch === '[') closers.push(ch === '{' ? '}' : ']')
    else if (ch === '}' || ch === ']') closers.pop()
  }

  return truncated + closers.reverse().join('')
}
