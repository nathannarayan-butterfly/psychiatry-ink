import { caseStorageKey } from './caseContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LaborValue {
  name: string
  value: string
  numericValue?: number
  unit: string
  refMin?: number
  refMax?: number
  refText?: string
  isAbnormal?: boolean
}

export interface LaborCategory {
  id: string
  label: string
  values: LaborValue[]
}

export interface LaborBefund {
  id: string
  caseId: string
  date: string
  rawText: string
  categories: LaborCategory[]
  createdAt: string
  label?: string
}

export interface PinnedLaborWidget {
  id: string
  caseId: string
  parameterName: string
  categoryLabel: string
  pinnedAt: string
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const LABOR_BEFUNDE_BASE = 'psychiatry-ink:laborBefunde'
const PINNED_LABOR_WIDGETS_BASE = 'psychiatry-ink:pinnedLaborWidgets'

export const PINNED_LABOR_WIDGETS_KEY = PINNED_LABOR_WIDGETS_BASE

function befundeKey(caseId: string): string {
  return caseStorageKey(LABOR_BEFUNDE_BASE, caseId)
}

function pinnedKey(caseId: string): string {
  return caseStorageKey(PINNED_LABOR_WIDGETS_BASE, caseId)
}

// ---------------------------------------------------------------------------
// LaborBefund CRUD
// ---------------------------------------------------------------------------

export function loadBefunde(caseId: string): LaborBefund[] {
  try {
    const raw = localStorage.getItem(befundeKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as LaborBefund[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (b) =>
        typeof b.id === 'string' &&
        typeof b.date === 'string' &&
        Array.isArray(b.categories),
    )
  } catch {
    return []
  }
}

export function saveBefunde(caseId: string, befunde: LaborBefund[]): void {
  try {
    localStorage.setItem(befundeKey(caseId), JSON.stringify(befunde))
  } catch {
    // ignore storage errors
  }
}

export function addBefund(caseId: string, befund: LaborBefund): void {
  const existing = loadBefunde(caseId)
  saveBefunde(caseId, [...existing, befund])
}

export function deleteBefund(caseId: string, id: string): void {
  const existing = loadBefunde(caseId)
  saveBefunde(
    caseId,
    existing.filter((b) => b.id !== id),
  )
}

// ---------------------------------------------------------------------------
// Pinned widgets CRUD
// ---------------------------------------------------------------------------

export function loadPinnedWidgets(caseId: string): PinnedLaborWidget[] {
  try {
    const raw = localStorage.getItem(pinnedKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as PinnedLaborWidget[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function savePinnedWidgets(caseId: string, widgets: PinnedLaborWidget[]): void {
  try {
    localStorage.setItem(pinnedKey(caseId), JSON.stringify(widgets))
  } catch {
    // ignore storage errors
  }
}
