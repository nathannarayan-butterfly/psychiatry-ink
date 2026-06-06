export type MedicationChangeType =
  | 'started'
  | 'increased'
  | 'reduced'
  | 'stopped'
  | 'continued'
  | 'missed'
  | 'unknown'

export interface LabEntry {
  id: string
  date: string
  parameter: string
  value: number
  unit: string
  referenceLow: number | null
  referenceHigh: number | null
  note: string
  createdAt: string
  updatedAt: string
}

export interface MedicationMarker {
  id: string
  date: string
  medicationName: string
  dose: string
  doseUnit: string
  changeType: MedicationChangeType
  note: string
  createdAt: string
  updatedAt: string
}

export interface LabSnapshot {
  entries: LabEntry[]
  markers: MedicationMarker[]
  selectedParameter: string | null
  dateRangePreset: LabDateRangePreset
}

export type LabDateRangePreset = 'all' | '3m' | '6m' | '12m'

export interface SavedLabGraph {
  id: string
  title: string
  entries: LabEntry[]
  markers: MedicationMarker[]
  selectedParameter: string | null
  dateRangePreset: LabDateRangePreset
  updatedAt: string
}

export type LabValueStatus = 'low' | 'normal' | 'high'

export const LAB_PARAMETER_SUGGESTIONS = [
  'Leukozyten',
  'Neutrophile',
  'Clozapin-Spiegel',
  'Norclozapin',
  'Valproat',
  'Lithium',
  'GOT',
  'GPT',
  'GGT',
  'CRP',
] as const

export const MEDICATION_CHANGE_TYPES: MedicationChangeType[] = [
  'started',
  'increased',
  'reduced',
  'stopped',
  'continued',
  'missed',
  'unknown',
]

export function getLabValueStatus(
  value: number,
  referenceLow: number | null,
  referenceHigh: number | null,
): LabValueStatus {
  if (referenceLow !== null && value < referenceLow) return 'low'
  if (referenceHigh !== null && value > referenceHigh) return 'high'
  return 'normal'
}

export function parseLabDate(date: string): number {
  const parsed = Date.parse(date)
  return Number.isNaN(parsed) ? 0 : parsed
}

export function formatLabDate(date: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function filterByDateRange<T extends { date: string }>(
  items: T[],
  preset: LabDateRangePreset,
): T[] {
  if (preset === 'all') return items
  const months = preset === '3m' ? 3 : preset === '6m' ? 6 : 12
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  const cutoffMs = cutoff.getTime()
  return items.filter((item) => parseLabDate(item.date) >= cutoffMs)
}
