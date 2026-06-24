import type { LaborBefund, LaborValue } from '../laborArchive'
import type { SomaticBefundPayload } from '../../types/somaticBefund'
import { isSomaticBefundEntry } from '../verlauf/somaticBefund'
import type { VerlaufFeedEntry } from '../verlaufFeed'

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

function parseNumericFromText(raw: string | undefined): number | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  const match = trimmed.replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
}

function parseHeightCmFromText(raw: string | undefined): number | null {
  const value = parseNumericFromText(raw)
  if (value === null) return null
  if (value > 3) return Math.round(value)
  return Math.round(value * 100)
}

function parseWeightKgFromText(raw: string | undefined): number | null {
  const value = parseNumericFromText(raw)
  if (value === null) return null
  return value
}

function computeBmi(weightKg: number, heightCm: number): number | null {
  if (heightCm <= 0 || weightKg <= 0) return null
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

function formatHeight(heightCm: number): string {
  return `${Math.round(heightCm)} cm`
}

function formatWeight(weightKg: number): string {
  const rounded = Math.round(weightKg * 10) / 10
  return `${rounded} kg`
}

export interface AnthropometrySnapshot {
  height?: string
  weight?: string
  bmi?: string
}

interface DatedMeasurement {
  date: string
  heightCm?: number
  weightKg?: number
  bmi?: number
}

function pickLatest(
  current: DatedMeasurement | null,
  candidate: DatedMeasurement,
): DatedMeasurement {
  if (!current) return candidate
  if (candidate.date.localeCompare(current.date) >= 0) return candidate
  return current
}

function mergeMeasurements(
  lab: DatedMeasurement | null,
  somatic: DatedMeasurement | null,
): AnthropometrySnapshot {
  const pickByDate = <T,>(labValue: T | undefined, somaticValue: T | undefined): T | null => {
    if (labValue != null && somaticValue != null) {
      return (somatic?.date ?? '').localeCompare(lab?.date ?? '') >= 0 ? somaticValue : labValue
    }
    return somaticValue ?? labValue ?? null
  }

  const height = pickByDate(lab?.heightCm, somatic?.heightCm)
  const weight = pickByDate(lab?.weightKg, somatic?.weightKg)
  let bmi = pickByDate(lab?.bmi, somatic?.bmi)
  if (bmi == null && height != null && weight != null) {
    bmi = computeBmi(weight, height)
  }

  const result: AnthropometrySnapshot = {}
  if (height != null) result.height = formatHeight(height)
  if (weight != null) result.weight = formatWeight(weight)
  if (bmi != null) result.bmi = String(bmi)
  return result
}

/** Latest height (cm), weight (kg), and BMI from labor befunde. */
export function resolveAnthropometryFromBefunde(befunde: LaborBefund[]): AnthropometrySnapshot {
  let latest: DatedMeasurement | null = null

  const sorted = [...befunde].sort((a, b) => a.date.localeCompare(b.date))
  for (const befund of sorted) {
    let heightCm: number | undefined
    let weightKg: number | undefined
    let bmi: number | undefined

    for (const cat of befund.categories) {
      for (const value of cat.values) {
        if (/\bbmi\b/i.test(value.name) && value.numericValue !== undefined) {
          bmi = value.numericValue
        } else if (matchesWeightOnly(value.name)) {
          const parsed = parseWeightKg(value)
          if (parsed != null) weightKg = parsed
        } else if (matchesHeight(value.name)) {
          const parsed = parseHeightCm(value)
          if (parsed != null) heightCm = parsed
        }
      }
    }

    if (heightCm != null || weightKg != null || bmi != null) {
      latest = pickLatest(latest, {
        date: befund.date,
        ...(heightCm != null ? { heightCm } : {}),
        ...(weightKg != null ? { weightKg } : {}),
        ...(bmi != null ? { bmi } : {}),
      })
    }
  }

  if (!latest) return {}

  const computedBmi =
    latest.bmi ??
    (latest.weightKg != null && latest.heightCm != null
      ? computeBmi(latest.weightKg, latest.heightCm) ?? undefined
      : undefined)

  const result: AnthropometrySnapshot = {}
  if (latest.heightCm != null) result.height = formatHeight(latest.heightCm)
  if (latest.weightKg != null) result.weight = formatWeight(latest.weightKg)
  if (computedBmi != null) result.bmi = String(computedBmi)
  return result
}

function measurementFromSomaticPayload(payload: SomaticBefundPayload, entryDate: string): DatedMeasurement | null {
  const heightCm = parseHeightCmFromText(payload.vitals.height)
  const weightKg = parseWeightKgFromText(payload.vitals.weight)
  if (heightCm == null && weightKg == null) return null

  const date = payload.examDate?.trim() || entryDate.slice(0, 10)
  const bmi =
    heightCm != null && weightKg != null ? computeBmi(weightKg, heightCm) ?? undefined : undefined

  return {
    date,
    ...(heightCm != null ? { heightCm } : {}),
    ...(weightKg != null ? { weightKg } : {}),
    ...(bmi != null ? { bmi } : {}),
  }
}

/** Latest anthropometrics from structured somatic Befund Verlauf entries. */
export function resolveAnthropometryFromSomaticBefunde(
  entries: VerlaufFeedEntry[],
): AnthropometrySnapshot {
  let latest: DatedMeasurement | null = null

  const sorted = [...entries]
    .filter(isSomaticBefundEntry)
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const entry of sorted) {
    const payload = entry.somaticBefund
    if (!payload) continue
    const measurement = measurementFromSomaticPayload(payload, entry.date)
    if (measurement) latest = pickLatest(latest, measurement)
  }

  if (!latest) return {}

  const computedBmi =
    latest.bmi ??
    (latest.weightKg != null && latest.heightCm != null
      ? computeBmi(latest.weightKg, latest.heightCm) ?? undefined
      : undefined)

  const result: AnthropometrySnapshot = {}
  if (latest.heightCm != null) result.height = formatHeight(latest.heightCm)
  if (latest.weightKg != null) result.weight = formatWeight(latest.weightKg)
  if (computedBmi != null) result.bmi = String(computedBmi)
  return result
}

/** Merge lab and somatic sources — per field, prefer the measurement with the latest date. */
export function resolveCaseAnthropometry(
  befunde: LaborBefund[],
  verlaufEntries: VerlaufFeedEntry[] = [],
): AnthropometrySnapshot {
  let latestLab: DatedMeasurement | null = null
  let latestSomatic: DatedMeasurement | null = null

  const sortedBefunde = [...befunde].sort((a, b) => a.date.localeCompare(b.date))
  for (const befund of sortedBefunde) {
    let heightCm: number | undefined
    let weightKg: number | undefined
    let bmi: number | undefined

    for (const cat of befund.categories) {
      for (const value of cat.values) {
        if (/\bbmi\b/i.test(value.name) && value.numericValue !== undefined) {
          bmi = value.numericValue
        } else if (matchesWeightOnly(value.name)) {
          const parsed = parseWeightKg(value)
          if (parsed != null) weightKg = parsed
        } else if (matchesHeight(value.name)) {
          const parsed = parseHeightCm(value)
          if (parsed != null) heightCm = parsed
        }
      }
    }

    if (heightCm != null || weightKg != null || bmi != null) {
      latestLab = pickLatest(latestLab, {
        date: befund.date,
        ...(heightCm != null ? { heightCm } : {}),
        ...(weightKg != null ? { weightKg } : {}),
        ...(bmi != null ? { bmi } : {}),
      })
    }
  }

  const sortedSomatic = [...verlaufEntries]
    .filter(isSomaticBefundEntry)
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const entry of sortedSomatic) {
    const payload = entry.somaticBefund
    if (!payload) continue
    const measurement = measurementFromSomaticPayload(payload, entry.date)
    if (measurement) latestSomatic = pickLatest(latestSomatic, measurement)
  }

  return mergeMeasurements(latestLab, latestSomatic)
}

/** Numeric snapshots for monitoring widgets (height cm, weight kg, optional BMI). */
export function resolveCaseAnthropometryNumeric(
  befunde: LaborBefund[],
  verlaufEntries: VerlaufFeedEntry[] = [],
): {
  heightCm: number | null
  weightKg: number | null
  bmi: number | null
  heightDate: string | null
  weightDate: string | null
  bmiDate: string | null
} {
  let latestLab: DatedMeasurement | null = null
  let latestSomatic: DatedMeasurement | null = null

  const sortedBefunde = [...befunde].sort((a, b) => a.date.localeCompare(b.date))
  for (const befund of sortedBefunde) {
    let heightCm: number | undefined
    let weightKg: number | undefined
    let bmi: number | undefined

    for (const cat of befund.categories) {
      for (const value of cat.values) {
        if (/\bbmi\b/i.test(value.name) && value.numericValue !== undefined) {
          bmi = value.numericValue
        } else if (matchesWeightOnly(value.name)) {
          const parsed = parseWeightKg(value)
          if (parsed != null) weightKg = parsed
        } else if (matchesHeight(value.name)) {
          const parsed = parseHeightCm(value)
          if (parsed != null) heightCm = parsed
        }
      }
    }

    if (heightCm != null || weightKg != null || bmi != null) {
      latestLab = pickLatest(latestLab, {
        date: befund.date,
        ...(heightCm != null ? { heightCm } : {}),
        ...(weightKg != null ? { weightKg } : {}),
        ...(bmi != null ? { bmi } : {}),
      })
    }
  }

  const sortedSomatic = [...verlaufEntries]
    .filter(isSomaticBefundEntry)
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const entry of sortedSomatic) {
    const payload = entry.somaticBefund
    if (!payload) continue
    const measurement = measurementFromSomaticPayload(payload, entry.date)
    if (measurement) latestSomatic = pickLatest(latestSomatic, measurement)
  }

  const pickByDate = <T,>(
    labValue: T | undefined,
    somaticValue: T | undefined,
    labDate: string | undefined,
    somaticDate: string | undefined,
  ): { value: T | null; date: string | null } => {
    if (labValue != null && somaticValue != null) {
      const somaticIsNewer = (somaticDate ?? '').localeCompare(labDate ?? '') >= 0
      return {
        value: somaticIsNewer ? somaticValue : labValue,
        date: somaticIsNewer ? somaticDate ?? null : labDate ?? null,
      }
    }
    if (somaticValue != null) return { value: somaticValue, date: somaticDate ?? null }
    if (labValue != null) return { value: labValue, date: labDate ?? null }
    return { value: null, date: null }
  }

  const height = pickByDate(
    latestLab?.heightCm,
    latestSomatic?.heightCm,
    latestLab?.date,
    latestSomatic?.date,
  )
  const weight = pickByDate(
    latestLab?.weightKg,
    latestSomatic?.weightKg,
    latestLab?.date,
    latestSomatic?.date,
  )
  const bmiDirect = pickByDate(latestLab?.bmi, latestSomatic?.bmi, latestLab?.date, latestSomatic?.date)

  let bmiValue = bmiDirect.value
  let bmiDate = bmiDirect.date
  if (bmiValue == null && height.value != null && weight.value != null) {
    bmiValue = computeBmi(weight.value, height.value)
    bmiDate =
      (weight.date ?? '').localeCompare(height.date ?? '') >= 0 ? weight.date : height.date
  }

  return {
    heightCm: height.value,
    weightKg: weight.value,
    bmi: bmiValue,
    heightDate: height.date,
    weightDate: weight.date,
    bmiDate,
  }
}
