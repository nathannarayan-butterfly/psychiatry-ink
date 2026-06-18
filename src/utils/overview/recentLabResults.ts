import type { LaborBefund, LaborValue } from '../laborArchive'
import { isSpiegelAnalyte } from '../diagnostics/labRelevance'
import { formatDateDe } from './dateLabels'

export interface RecentLabResultItem {
  id: string
  name: string
  valueLabel: string
  refLabel: string | null
  dateLabel: string
  abnormal: boolean
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
  return null
}

function valueLabel(v: LaborValue): string {
  const base = v.numericValue !== undefined ? String(v.numericValue) : v.value
  return v.unit ? `${base} ${v.unit}` : base
}

/**
 * Latest lab values across all befunde — a general Befunde snapshot distinct
 * from the medication-monitoring-focused labs-due card.
 */
export function buildRecentLabResults(befunde: LaborBefund[], limit = 5): RecentLabResultItem[] {
  const rows: RecentLabResultItem[] = []
  const seen = new Set<string>()

  const sorted = [...befunde].sort((a, b) => b.date.localeCompare(a.date))
  for (const befund of sorted) {
    for (const cat of befund.categories) {
      for (const value of cat.values) {
        if (isSpiegelAnalyte(value.name, cat.label, cat.id)) continue
        const key = value.name.trim().toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        rows.push({
          id: `${befund.id}:${key}`,
          name: value.name,
          valueLabel: valueLabel(value),
          refLabel: refLabel(value),
          dateLabel: formatDateDe(befund.date) ?? befund.date,
          abnormal: isAbnormal(value),
        })
      }
    }
  }

  rows.sort((a, b) => Number(b.abnormal) - Number(a.abnormal))
  return rows.slice(0, limit)
}
