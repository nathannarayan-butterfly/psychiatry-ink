import type { MedicationEntry } from '../../types/medicationPlan'
import type { LaborBefund, LaborValue } from '../laborArchive'
import type { VerlaufFeedEntry } from '../verlaufFeed'
import { resolveCaseAnthropometryNumeric } from '../documentTemplate/anthropometryContext'
import {
  analyteLabel,
  analytePriority,
  getMonitoringAnalytesForSubstance,
  isSpiegelAnalyte,
  matchAnalyteKey,
  type AnalyteKey,
} from '../diagnostics/labRelevance'
import { formatDateDe } from './dateLabels'
import type { ParameterMonitoringRow } from '../../components/notion/overview/types'

export interface MedicationMonitoringInput {
  medications: MedicationEntry[]
  befunde: LaborBefund[]
  /** Verlauf feed entries — somatic Befund vitals supplement lab anthropometry. */
  verlaufEntries?: VerlaufFeedEntry[]
  /** UI language for localized analyte labels (defaults to German). */
  language?: string
}

interface LatestLabValue {
  value: LaborValue
  date: string
}

/** Clinician-facing label overrides — weight shown as BMI when a value is available. */
const PARAM_DISPLAY_LABEL: Partial<Record<AnalyteKey, { de: string; en: string }>> = {
  glucose: { de: 'Glukose', en: 'Glucose' },
  hba1c: { de: 'HbA1c', en: 'HbA1c' },
  weight: { de: 'BMI', en: 'BMI' },
  lipids: { de: 'Lipide', en: 'Lipids' },
  prolactin: { de: 'Prolaktin', en: 'Prolactin' },
  qtc: { de: 'QTc', en: 'QTc' },
}

function displayLabel(key: AnalyteKey, language: string): string {
  const override = PARAM_DISPLAY_LABEL[key]
  if (override) return language === 'de' ? override.de : override.en
  return analyteLabel(key, language)
}

function valueLabel(v: LaborValue): string {
  const base = v.numericValue !== undefined ? String(v.numericValue) : v.value
  return v.unit ? `${base} ${v.unit}` : base
}

function refLabel(v: LaborValue): string | null {
  const unit = v.unit ? ` ${v.unit}` : ''
  if (v.refText) return `${v.refText}${unit}`
  if (v.refMin !== undefined && v.refMax !== undefined) return `${v.refMin}–${v.refMax}${unit}`
  if (v.refMin !== undefined) return `≥ ${v.refMin}${unit}`
  if (v.refMax !== undefined) return `≤ ${v.refMax}${unit}`
  return null
}

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

function parseHeightMeters(v: LaborValue): number | null {
  if (v.numericValue === undefined) return null
  const val = v.numericValue
  if (val > 3) return val / 100
  return val
}

function parseWeightKg(v: LaborValue): number | null {
  if (v.numericValue === undefined) return null
  return v.numericValue
}

function computeBmi(weightKg: number, heightM: number): number | null {
  if (heightM <= 0 || weightKg <= 0) return null
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

/**
 * Scan befunde (ascending by date) and return the latest lab value per analyte key,
 * plus the latest weight/height/BMI snapshots for anthropometry.
 */
function buildLabIndex(befunde: LaborBefund[]) {
  const latestByKey = new Map<AnalyteKey, LatestLabValue>()
  let latestBmi: LatestLabValue | null = null
  let latestWeight: LatestLabValue | null = null
  let latestHeight: LatestLabValue | null = null

  const sorted = [...befunde].sort((a, b) => a.date.localeCompare(b.date))
  for (const befund of sorted) {
    for (const cat of befund.categories) {
      for (const value of cat.values) {
        if (isSpiegelAnalyte(value.name, cat.label, cat.id)) continue

        const key = matchAnalyteKey(value.name)
        if (key) {
          latestByKey.set(key, { value, date: befund.date })
        }

        if (/\bbmi\b/i.test(value.name)) {
          latestBmi = { value, date: befund.date }
        } else if (matchesWeightOnly(value.name)) {
          latestWeight = { value, date: befund.date }
        } else if (matchesHeight(value.name)) {
          latestHeight = { value, date: befund.date }
        }
      }
    }
  }

  return { latestByKey, latestBmi, latestWeight, latestHeight }
}

function applyMergedAnthropometry(
  index: ReturnType<typeof buildLabIndex>,
  befunde: LaborBefund[],
  verlaufEntries: VerlaufFeedEntry[],
): void {
  const merged = resolveCaseAnthropometryNumeric(befunde, verlaufEntries)

  if (merged.bmi != null) {
    index.latestBmi = {
      value: {
        name: 'BMI',
        value: String(merged.bmi),
        numericValue: merged.bmi,
        unit: 'kg/m²',
      },
      date: merged.bmiDate ?? merged.weightDate ?? merged.heightDate ?? '',
    }
  }

  if (merged.weightKg != null) {
    index.latestWeight = {
      value: {
        name: 'Gewicht',
        value: String(merged.weightKg),
        numericValue: merged.weightKg,
        unit: 'kg',
      },
      date: merged.weightDate ?? '',
    }
  }

  if (merged.heightCm != null) {
    index.latestHeight = {
      value: {
        name: 'Körpergröße',
        value: String(merged.heightCm),
        numericValue: merged.heightCm,
        unit: 'cm',
      },
      date: merged.heightDate ?? '',
    }
  }
}

function resolveParameterValue(
  key: AnalyteKey,
  index: ReturnType<typeof buildLabIndex>,
): { valueLabel: string | null; dateLabel: string | null; refLabel: string | null; missing: boolean } {
  if (key === 'weight') {
    if (index.latestBmi) {
      return {
        valueLabel: valueLabel(index.latestBmi.value),
        dateLabel: formatDateDe(index.latestBmi.date),
        refLabel: refLabel(index.latestBmi.value),
        missing: false,
      }
    }
    const weight = index.latestWeight
    const height = index.latestHeight
    if (weight && height) {
      const bmi = computeBmi(parseWeightKg(weight.value) ?? 0, parseHeightMeters(height.value) ?? 0)
      if (bmi !== null) {
        const date =
          weight.date.localeCompare(height.date) >= 0 ? weight.date : height.date
        return {
          valueLabel: `${bmi} kg/m²`,
          dateLabel: formatDateDe(date),
          refLabel: null,
          missing: false,
        }
      }
    }
    if (weight) {
      return {
        valueLabel: valueLabel(weight.value),
        dateLabel: formatDateDe(weight.date),
        refLabel: refLabel(weight.value),
        missing: false,
      }
    }
    const fromKey = index.latestByKey.get('weight')
    if (fromKey) {
      return {
        valueLabel: valueLabel(fromKey.value),
        dateLabel: formatDateDe(fromKey.date),
        refLabel: refLabel(fromKey.value),
        missing: false,
      }
    }
    return { valueLabel: null, dateLabel: null, refLabel: null, missing: true }
  }

  const latest = index.latestByKey.get(key)
  if (!latest) {
    return { valueLabel: null, dateLabel: null, refLabel: null, missing: true }
  }
  return {
    valueLabel: valueLabel(latest.value),
    dateLabel: formatDateDe(latest.date),
    refLabel: refLabel(latest.value),
    missing: false,
  }
}

const ACTIVE_STATUSES = new Set(['active', 'reduced', 'increased'])

/** Format `Parameter (Med1, Med2)` for display. */
export function formatParameterMonitoringLabel(row: ParameterMonitoringRow): string {
  if (row.medications.length === 0) return row.label
  return `${row.label} (${row.medications.join(', ')})`
}

/**
 * Group medication-driven monitoring by **parameter** (not by medication).
 * Each row lists all contributing active substances in brackets and the latest
 * matching lab value when available.
 *
 * Mapping source: {@link DRUG_LAB_RULES} + psychopharmacology class fallback
 * in `labRelevance.ts` (not hardcoded per demo patient).
 */
export function getParameterMonitoringRows(
  input: MedicationMonitoringInput,
): ParameterMonitoringRow[] {
  const language = input.language ?? 'de'
  const labIndex = buildLabIndex(input.befunde)
  applyMergedAnthropometry(labIndex, input.befunde, input.verlaufEntries ?? [])
  const paramMeds = new Map<AnalyteKey, string[]>()
  const seenMedIds = new Set<string>()

  for (const med of input.medications) {
    if (!ACTIVE_STATUSES.has(med.status)) continue
    if (seenMedIds.has(med.id)) continue
    seenMedIds.add(med.id)

    const analyteRules = getMonitoringAnalytesForSubstance(med.substance)
    if (analyteRules.length === 0) continue

    const medName = med.substance.trim()
    const seenKeys = new Set<AnalyteKey>()
    for (const rule of analyteRules) {
      if (seenKeys.has(rule.key)) continue
      seenKeys.add(rule.key)

      const list = paramMeds.get(rule.key) ?? []
      if (!list.includes(medName)) list.push(medName)
      paramMeds.set(rule.key, list)
    }
  }

  const rows: ParameterMonitoringRow[] = []
  for (const [key, medications] of paramMeds) {
    const resolved = resolveParameterValue(key, labIndex)
    rows.push({
      key,
      label: displayLabel(key, language),
      medications: [...medications].sort((a, b) => a.localeCompare(b, 'de')),
      valueLabel: resolved.valueLabel,
      dateLabel: resolved.dateLabel,
      refLabel: resolved.refLabel,
      missing: resolved.missing,
    })
  }

  rows.sort(
    (a, b) =>
      analytePriority(a.key as AnalyteKey) - analytePriority(b.key as AnalyteKey) ||
      a.label.localeCompare(b.label, 'de'),
  )

  return rows
}

/** @deprecated Use {@link getParameterMonitoringRows}. */
export const getMedicationMonitoringGroups = getParameterMonitoringRows
