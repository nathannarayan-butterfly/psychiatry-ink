import type { LaborBefund, LaborValue } from '../laborArchive'
import {
  analyteLabel,
  buildLabRelevance,
  isSpiegelAnalyte,
  matchAnalyteKey,
  type AnalyteKey,
  type AnalyteRationale,
} from '../diagnostics/labRelevance'
import { formatShortDateDe } from './dateLabels'
import type { LabDueItem, LabsDueData } from '../../components/notion/overview/types'

export interface LabsDueInput {
  befunde: LaborBefund[]
  activeSubstances: string[]
}

interface LatestValue {
  value: LaborValue
  date: string
}

function isAbnormal(v: LaborValue): boolean {
  if (v.isAbnormal === true) return true
  if (v.numericValue === undefined) return false
  if (v.refMin !== undefined && v.numericValue < v.refMin) return true
  if (v.refMax !== undefined && v.numericValue > v.refMax) return true
  return false
}

function refLabel(v: LaborValue): string | null {
  const unit = v.unit ? ` ${v.unit}` : ''
  if (v.refText) return `${v.refText}${unit}`
  if (v.refMin !== undefined && v.refMax !== undefined) return `${v.refMin}–${v.refMax}${unit}`
  if (v.refMin !== undefined) return `≥ ${v.refMin}${unit}`
  if (v.refMax !== undefined) return `≤ ${v.refMax}${unit}`
  return null
}

function valueLabel(v: LaborValue): string {
  const base = v.numericValue !== undefined ? String(v.numericValue) : v.value
  return v.unit ? `${base} ${v.unit}` : base
}

function rationaleText(rationale: AnalyteRationale[]): string | null {
  if (rationale.length === 0) return null
  const drugs = [...new Set(rationale.map((r) => r.drug))].join(', ')
  const reasons = [...new Set(rationale.map((r) => r.reason))].join(' · ')
  return `${drugs}: ${reasons}`
}

/**
 * Medication-relevant lab surveillance for the dashboard: the most-recent value
 * for every analyte the active regimen makes us watch, split into abnormal vs.
 * in-range, plus monitoring obligations that have no lab on file yet.
 */
export function buildLabsDue(input: LabsDueInput): LabsDueData {
  const relevance = buildLabRelevance(input.activeSubstances)
  const relevantKeys = new Set<AnalyteKey>(relevance.rationaleByKey.keys())

  // Latest value per analyte key across all befunde (ignoring drug serum levels —
  // those are owned by the Spiegel trend card). We also accumulate the numeric
  // history per analyte so the card can render a real inline sparkline.
  const latestByKey = new Map<AnalyteKey, LatestValue>()
  const seriesByKey = new Map<AnalyteKey, number[]>()
  const sorted = [...input.befunde].sort((a, b) => a.date.localeCompare(b.date))
  for (const befund of sorted) {
    for (const cat of befund.categories) {
      for (const value of cat.values) {
        if (isSpiegelAnalyte(value.name, cat.label, cat.id)) continue
        const key = matchAnalyteKey(value.name)
        if (!key || !relevantKeys.has(key)) continue
        // sorted ascending → later writes overwrite with the most recent.
        latestByKey.set(key, { value, date: befund.date })
        if (value.numericValue !== undefined) {
          const list = seriesByKey.get(key) ?? []
          list.push(value.numericValue)
          seriesByKey.set(key, list)
        }
      }
    }
  }

  const abnormal: LabDueItem[] = []
  const watched: LabDueItem[] = []

  for (const key of relevantKeys) {
    const latest = latestByKey.get(key)
    if (!latest) continue
    const rationale = relevance.rationaleByKey.get(key) ?? []
    const item: LabDueItem = {
      id: `lab:${key}`,
      name: analyteLabel(key),
      valueLabel: valueLabel(latest.value),
      refLabel: refLabel(latest.value),
      dateLabel: formatShortDateDe(latest.date),
      status: isAbnormal(latest.value) ? 'abnormal' : 'ok',
      rationale: rationaleText(rationale),
      trend: (seriesByKey.get(key) ?? []).slice(-6),
    }
    if (item.status === 'abnormal') abnormal.push(item)
    else watched.push(item)
  }

  const missingMonitoring = [...relevance.rationaleByKey.entries()]
    .filter(([key]) => !latestByKey.has(key))
    .map(([key, rationale]) => ({
      parameter: analyteLabel(key),
      drugs: [...new Set(rationale.map((r) => r.drug))],
    }))

  return {
    abnormal,
    watched,
    missingMonitoring,
    hasLabData: input.befunde.length > 0,
  }
}
