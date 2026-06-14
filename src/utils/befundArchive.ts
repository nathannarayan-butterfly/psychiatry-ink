import { caseStorageKey } from './caseContext'
import type { BefundRecord, BefundType } from '../types/befund'

const BEFUND_ARCHIVE_BASE = 'psychiatry-ink:diagnostikBefunde'

export const BEFUND_ARCHIVE_CHANGED_EVENT = 'psychiatry-ink:diagnostik-befunde:changed'

/** Session flag: LaborPage reads this to open a specific diagnostics tab after navigation. */
export const DIAGNOSTICS_SECTION_PREF_BASE = 'psychiatry-ink:diagnosticsSection'

function archiveKey(caseId: string): string {
  return caseStorageKey(BEFUND_ARCHIVE_BASE, caseId)
}

function notifyChanged(caseId: string): void {
  try {
    window.dispatchEvent(
      new CustomEvent(BEFUND_ARCHIVE_CHANGED_EVENT, { detail: { caseId } }),
    )
  } catch {
    // not in browser
  }
}

function isValidRecord(value: unknown): value is BefundRecord {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.caseId === 'string' &&
    (r.type === 'ecg' || r.type === 'eeg') &&
    typeof r.schemaVersion === 'number' &&
    typeof r.fieldValues === 'object' &&
    r.fieldValues !== null &&
    (r.status === 'draft' || r.status === 'vidert') &&
    typeof r.examDate === 'string' &&
    typeof r.createdAt === 'string' &&
    typeof r.updatedAt === 'string'
  )
}

export function loadDiagnostikBefunde(caseId: string): BefundRecord[] {
  try {
    const raw = localStorage.getItem(archiveKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidRecord)
  } catch {
    return []
  }
}

function saveAll(caseId: string, records: BefundRecord[]): void {
  try {
    localStorage.setItem(archiveKey(caseId), JSON.stringify(records))
  } catch {
    // ignore quota errors
  }
  notifyChanged(caseId)
}

export function saveDiagnostikBefunde(caseId: string, records: BefundRecord[]): void {
  saveAll(caseId, records)
}

export function upsertDiagnostikBefund(caseId: string, record: BefundRecord): BefundRecord {
  const existing = loadDiagnostikBefunde(caseId)
  const idx = existing.findIndex((r) => r.id === record.id)
  const next = idx >= 0
    ? existing.map((r) => (r.id === record.id ? record : r))
    : [record, ...existing]
  saveAll(caseId, next)
  return record
}

export function deleteDiagnostikBefund(caseId: string, id: string): void {
  const existing = loadDiagnostikBefunde(caseId)
  saveAll(
    caseId,
    existing.filter((r) => r.id !== id),
  )
}

export function getDiagnostikBefund(caseId: string, id: string): BefundRecord | null {
  return loadDiagnostikBefunde(caseId).find((r) => r.id === id) ?? null
}

export function setDiagnosticsSectionPref(caseId: string, section: string): void {
  try {
    sessionStorage.setItem(caseStorageKey(DIAGNOSTICS_SECTION_PREF_BASE, caseId), section)
  } catch {
    // ignore
  }
}

export function consumeDiagnosticsSectionPref(caseId: string): string | null {
  try {
    const key = caseStorageKey(DIAGNOSTICS_SECTION_PREF_BASE, caseId)
    const value = sessionStorage.getItem(key)
    if (value) sessionStorage.removeItem(key)
    return value
  } catch {
    return null
  }
}

export function createBefundRecord(
  caseId: string,
  type: BefundType,
  schemaVersion: number,
  fieldValues: BefundRecord['fieldValues'],
  status: BefundRecord['status'] = 'draft',
): BefundRecord {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    caseId,
    type,
    schemaVersion,
    fieldValues,
    status,
    examDate: now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    vidertAt: status === 'vidert' ? now : undefined,
  }
}
