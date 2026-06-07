/**
 * Therapie archive — simple append-only store for therapy entries per case.
 * Stored in localStorage under `psychiatry-ink:therapieEintraege:{caseId}`.
 */

import { caseStorageKey } from './caseContext'

const THERAPIE_KEY = 'psychiatry-ink:therapieEintraege'

export interface TherapieEintrag {
  id: string
  date: string       // ISO 8601 date string (yyyy-mm-dd)
  text: string
  createdAt: string  // ISO 8601 full timestamp
}

function storageKey(caseId: string): string {
  return caseStorageKey(THERAPIE_KEY, caseId)
}

export function loadTherapieEintraege(caseId: string): TherapieEintrag[] {
  try {
    const raw = localStorage.getItem(storageKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as TherapieEintrag[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e) =>
        typeof e.id === 'string' &&
        typeof e.date === 'string' &&
        typeof e.text === 'string',
    )
  } catch {
    return []
  }
}

export function saveTherapieEintraege(caseId: string, entries: TherapieEintrag[]): void {
  try {
    localStorage.setItem(storageKey(caseId), JSON.stringify(entries))
  } catch {
    // ignore quota errors
  }
}

export function appendTherapieEintrag(
  caseId: string,
  entry: Omit<TherapieEintrag, 'id' | 'createdAt'>,
): TherapieEintrag {
  const newEntry: TherapieEintrag = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  }
  const existing = loadTherapieEintraege(caseId)
  saveTherapieEintraege(caseId, [newEntry, ...existing])
  return newEntry
}

export function deleteTherapieEintrag(caseId: string, id: string): void {
  const existing = loadTherapieEintraege(caseId)
  saveTherapieEintraege(caseId, existing.filter((e) => e.id !== id))
}
