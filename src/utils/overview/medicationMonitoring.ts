import type { MedicationEntry } from '../../types/medicationPlan'
import type { LaborBefund, LaborValue } from '../laborArchive'
import {
  analyteLabel,
  getMonitoringAnalytesForSubstance,
  isSpiegelAnalyte,
  matchAnalyteKey,
  type AnalyteKey,
} from '../diagnostics/labRelevance'
import { formatDateDe } from './dateLabels'
import type {
  MedicationMonitoringGroup,
  MedicationMonitoringParameter,
} from '../../components/notion/overview/types'

export interface MedicationMonitoringInput {
  medications: MedicationEntry[]
  befunde: LaborBefund[]
}

interface LatestLabValue {
  value: LaborValue
  date: string
}

/** Clinician-facing labels — weight/BMI shown as BMI when a value is available. */
const PARAM_DISPLAY_LABEL: Partial<Record<AnalyteKey, string>> = {
  glucose: 'Glukose',
  hba1c: 'HbA1c',
  weight: 'BMI',
  lipids: 'Lipide',
  prolactin: 'Prolaktin',
  qtc: 'QTc',
}

function displayLabel(key: AnalyteKey): string {
  return PARAM_DISPLAY_LABEL[key] ?? analyteLabel(key)
}

function valueLabel(v: LaborValue): string {
  const base = v.numericValue !== undefined ? String(v.numericValue) : v.value
  return v.unit ? `${base} ${v.unit}` : base
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
  // cm → m when value looks like stature in cm (typical 140–220).
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

function resolveParameterValue(
  key: AnalyteKey,
  index: ReturnType<typeof buildLabIndex>,
): { valueLabel: string | null; dateLabel: string | null; missing: boolean } {
  if (key === 'weight') {
    if (index.latestBmi) {
      return {
        valueLabel: valueLabel(index.latestBmi.value),
        dateLabel: formatDateDe(index.latestBmi.date),
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
          missing: false,
        }
      }
    }
    if (weight) {
      return {
        valueLabel: valueLabel(weight.value),
        dateLabel: formatDateDe(weight.date),
        missing: false,
      }
    }
    const fromKey = index.latestByKey.get('weight')
    if (fromKey) {
      return {
        valueLabel: valueLabel(fromKey.value),
        dateLabel: formatDateDe(fromKey.date),
        missing: false,
      }
    }
    return { valueLabel: null, dateLabel: null, missing: true }
  }

  const latest = index.latestByKey.get(key)
  if (!latest) {
    return { valueLabel: null, dateLabel: null, missing: true }
  }
  return {
    valueLabel: valueLabel(latest.value),
    dateLabel: formatDateDe(latest.date),
    missing: false,
  }
}

const ACTIVE_STATUSES = new Set(['active', 'reduced', 'increased'])

/**
 * Group medication-driven monitoring parameters under each active medication,
 * with the latest matching lab value per parameter (from befunde / anthropometry).
 *
 * Mapping source: {@link DRUG_LAB_RULES} + psychopharmacology class fallback
 * in `labRelevance.ts` (not hardcoded per demo patient).
 */
export function getMedicationMonitoringGroups(
  input: MedicationMonitoringInput,
): MedicationMonitoringGroup[] {
  const labIndex = buildLabIndex(input.befunde)
  const groups: MedicationMonitoringGroup[] = []
  const seenMedIds = new Set<string>()

  for (const med of input.medications) {
    if (!ACTIVE_STATUSES.has(med.status)) continue
    if (seenMedIds.has(med.id)) continue
    seenMedIds.add(med.id)

    const analyteRules = getMonitoringAnalytesForSubstance(med.substance)
    if (analyteRules.length === 0) continue

    const seenKeys = new Set<AnalyteKey>()
    const parameters: MedicationMonitoringParameter[] = []

    for (const rule of analyteRules) {
      if (seenKeys.has(rule.key)) continue
      seenKeys.add(rule.key)

      const resolved = resolveParameterValue(rule.key, labIndex)
      parameters.push({
        key: rule.key,
        label: displayLabel(rule.key),
        valueLabel: resolved.valueLabel,
        dateLabel: resolved.dateLabel,
        missing: resolved.missing,
      })
    }

    if (parameters.length > 0) {
      groups.push({
        medicationId: med.id,
        medicationName: med.substance.trim(),
        parameters,
      })
    }
  }

  return groups
}
