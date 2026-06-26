import { caseStorageKey } from './caseContext'
import type {
  FreeTextBefundModality,
  FreeTextBefundRecord,
} from '../types/freeTextBefund'

const FREE_TEXT_BEFUND_BASE = 'psychiatry-ink:diagnostikFreeTextBefunde'

export const FREE_TEXT_BEFUND_CHANGED_EVENT =
  'psychiatry-ink:diagnostik-freetext-befunde:changed'

function archiveKey(caseId: string): string {
  return caseStorageKey(FREE_TEXT_BEFUND_BASE, caseId)
}

function notifyChanged(caseId: string): void {
  try {
    window.dispatchEvent(
      new CustomEvent(FREE_TEXT_BEFUND_CHANGED_EVENT, { detail: { caseId } }),
    )
  } catch {
    // not in browser
  }
}

function isValidRecord(value: unknown): value is FreeTextBefundRecord {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.caseId === 'string' &&
    (r.modality === 'eeg' || r.modality === 'cct' || r.modality === 'mrt') &&
    typeof r.text === 'string' &&
    (r.status === 'draft' || r.status === 'vidert') &&
    typeof r.examDate === 'string' &&
    typeof r.createdAt === 'string' &&
    typeof r.updatedAt === 'string'
  )
}

export function loadFreeTextBefunde(caseId: string): FreeTextBefundRecord[] {
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

export function loadFreeTextBefundeByModality(
  caseId: string,
  modality: FreeTextBefundModality,
): FreeTextBefundRecord[] {
  return loadFreeTextBefunde(caseId)
    .filter((r) => r.modality === modality)
    .sort((a, b) => b.examDate.localeCompare(a.examDate))
}

function saveAll(caseId: string, records: FreeTextBefundRecord[]): void {
  try {
    localStorage.setItem(archiveKey(caseId), JSON.stringify(records))
  } catch {
    // ignore quota errors
  }
  notifyChanged(caseId)
}

export function upsertFreeTextBefund(
  caseId: string,
  record: FreeTextBefundRecord,
): FreeTextBefundRecord {
  const existing = loadFreeTextBefunde(caseId)
  const idx = existing.findIndex((r) => r.id === record.id)
  const next =
    idx >= 0
      ? existing.map((r) => (r.id === record.id ? record : r))
      : [record, ...existing]
  saveAll(caseId, next)
  return record
}

export function deleteFreeTextBefund(caseId: string, id: string): void {
  const existing = loadFreeTextBefunde(caseId)
  saveAll(
    caseId,
    existing.filter((r) => r.id !== id),
  )
}

export function getFreeTextBefund(
  caseId: string,
  id: string,
): FreeTextBefundRecord | null {
  return loadFreeTextBefunde(caseId).find((r) => r.id === id) ?? null
}

export function hasFreeTextBefund(
  caseId: string,
  modality: FreeTextBefundModality,
): boolean {
  return loadFreeTextBefunde(caseId).some((r) => r.modality === modality)
}

export function createFreeTextBefundRecord(
  caseId: string,
  modality: FreeTextBefundModality,
  text: string,
  status: FreeTextBefundRecord['status'] = 'draft',
  examDate?: string,
): FreeTextBefundRecord {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    caseId,
    modality,
    text,
    status,
    examDate: examDate ?? now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    vidertAt: status === 'vidert' ? now : undefined,
  }
}
