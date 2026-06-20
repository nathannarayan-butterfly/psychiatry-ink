import type { LaborBefund, LaborValue } from '../laborArchive'

const HEIGHT_PATTERNS = [/größe/i, /groesse/i, /\bheight\b/i, /körpergröße/i, /korpergrosse/i, /statur/i]
const WEIGHT_ONLY_PATTERNS = [/gewicht/i, /körpergewicht/i, /korpergewicht/i, /body\s?mass/i, /k[oö]rpergewicht/i]

function matchesHeight(name: string): boolean {
  return HEIGHT_PATTERNS.some((p) => p.test(name))
}

function matchesWeightOnly(name: string): boolean {
  const n = name.trim()
  if (/\bbmi\b/i.test(n)) return false
  return WEIGHT_ONLY_PATTERNS.some((p) => p.test(n))
}

function parseHeightCm(v: LaborValue): number | null {
  if (v.numericValue === undefined) return null
  const val = v.numericValue
  if (val > 3) return val
  return Math.round(val * 100)
}

function parseWeightKg(v: LaborValue): number | null {
  if (v.numericValue === undefined) return null
  return v.numericValue
}

function computeBmi(weightKg: number, heightCm: number): number | null {
  if (heightCm <= 0 || weightKg <= 0) return null
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

export interface AnthropometrySnapshot {
  height?: string
  weight?: string
  bmi?: string
}

/** Latest height (cm), weight (kg), and BMI from labor befunde. */
export function resolveAnthropometryFromBefunde(befunde: LaborBefund[]): AnthropometrySnapshot {
  let latestBmi: number | null = null
  let latestWeightKg: number | null = null
  let latestHeightCm: number | null = null

  const sorted = [...befunde].sort((a, b) => a.date.localeCompare(b.date))
  for (const befund of sorted) {
    for (const cat of befund.categories) {
      for (const value of cat.values) {
        if (/\bbmi\b/i.test(value.name) && value.numericValue !== undefined) {
          latestBmi = value.numericValue
        } else if (matchesWeightOnly(value.name)) {
          latestWeightKg = parseWeightKg(value)
        } else if (matchesHeight(value.name)) {
          latestHeightCm = parseHeightCm(value)
        }
      }
    }
  }

  if (latestBmi == null && latestWeightKg != null && latestHeightCm != null) {
    latestBmi = computeBmi(latestWeightKg, latestHeightCm)
  }

  const result: AnthropometrySnapshot = {}
  if (latestHeightCm != null) result.height = `${latestHeightCm} cm`
  if (latestWeightKg != null) result.weight = `${latestWeightKg} kg`
  if (latestBmi != null) result.bmi = String(latestBmi)
  return result
}
