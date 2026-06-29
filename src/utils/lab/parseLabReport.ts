import type { LabEntry } from '../../types/lab'

export interface ParsedLabValue {
  parameter: string
  value: number
  rawValue: string
  unit: string
  referenceLow: number | null
  referenceHigh: number | null
}

function toNumber(raw: string): number | null {
  const normalized = raw.replace(/\s/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Reference range like `(135-145)`, `135 - 145`, `[3,5–5,0]` or `Ref 70-100`.
 * Returns [low, high] or [null, null].
 */
function parseReference(segment: string): [number | null, number | null] {
  const match = segment.match(
    /(-?\d+(?:[.,]\d+)?)\s*[-–—bis]+\s*(-?\d+(?:[.,]\d+)?)/i,
  )
  if (!match) return [null, null]
  return [toNumber(match[1]), toNumber(match[2])]
}

const VALUE_RE = /(-?\d+(?:[.,]\d+)?)/

/**
 * Best-effort parser for a pasted lab report. Each non-empty line is interpreted
 * as `<parameter> <value> [unit] [reference]`, tolerating a leading `:` after
 * the parameter and German decimal commas. Lines without a numeric value are
 * skipped. Used by the standalone Lab Tools "paste report" flow (#11) so a whole
 * panel can be imported at once; the clinician then chooses which values to keep.
 */
export function parseLabReport(text: string): ParsedLabValue[] {
  const out: ParsedLabValue[] = []
  const lines = text.replace(/\r\n/g, '\n').split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Split off an explicit reference range in parentheses/brackets first.
    let working = line
    let refLow: number | null = null
    let refHigh: number | null = null
    const bracket = working.match(/[([]\s*([^()[\]]*\d[^()[\]]*)\s*[)\]]/)
    if (bracket) {
      ;[refLow, refHigh] = parseReference(bracket[1])
      working = working.replace(bracket[0], ' ').trim()
    }

    const valueMatch = working.match(VALUE_RE)
    if (!valueMatch || valueMatch.index === undefined) continue
    const value = toNumber(valueMatch[1])
    if (value === null) continue

    const parameter = working
      .slice(0, valueMatch.index)
      .replace(/[:=]\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!parameter) continue

    let rest = working.slice(valueMatch.index + valueMatch[1].length).trim()
    // If no inline-bracket ref was found, try a trailing "low-high" range in rest.
    if (refLow === null && refHigh === null) {
      const trailingRef = parseReference(rest)
      if (trailingRef[0] !== null) {
        ;[refLow, refHigh] = trailingRef
        rest = rest.replace(
          /-?\d+(?:[.,]\d+)?\s*[-–—bis]+\s*-?\d+(?:[.,]\d+)?/i,
          '',
        ).trim()
      }
    }

    const unit = rest
      .replace(/^[:=]\s*/, '')
      .split(/\s{2,}|\t/)[0]
      .trim()
      .slice(0, 24)

    out.push({
      parameter,
      value,
      rawValue: valueMatch[1],
      unit: /[a-zµ%/]/i.test(unit) ? unit : '',
      referenceLow: refLow,
      referenceHigh: refHigh,
    })
  }

  return dedupe(out)
}

function dedupe(values: ParsedLabValue[]): ParsedLabValue[] {
  const seen = new Set<string>()
  const result: ParsedLabValue[] = []
  for (const v of values) {
    const key = `${v.parameter.toLowerCase()}|${v.rawValue}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(v)
  }
  return result
}

export function parsedValueToLabEntry(parsed: ParsedLabValue, date: string): LabEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date,
    parameter: parsed.parameter,
    value: parsed.value,
    unit: parsed.unit,
    referenceLow: parsed.referenceLow,
    referenceHigh: parsed.referenceHigh,
    note: '',
    createdAt: now,
    updatedAt: now,
  }
}
