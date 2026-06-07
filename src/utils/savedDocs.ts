/**
 * Saved Docs — lightweight sidebar list of documents explicitly saved by the physician.
 * Stored in localStorage under `psychiatry-ink:savedDocs::{caseId}`.
 *
 * Separate from the vault and archive: this is purely a UI convenience list
 * showing recently saved documents so the doctor can re-open them quickly.
 * Newest entry first (index 0).
 */

import { caseStorageKey } from './caseContext'

const SAVED_DOCS_KEY = 'psychiatry-ink:savedDocs'

export interface SavedDoc {
  id: string
  typeId: string
  typeLabel: string
  /** ISO 8601 */
  date: string
  /** Combined flat content (for display and non-multistage restore) */
  content: string
  /** Section-keyed content map (for multistage restore); empty for non-multistage docs */
  sectionContents: Record<string, string>
}

function storageKey(caseId: string): string {
  return caseStorageKey(SAVED_DOCS_KEY, caseId)
}

export function loadSavedDocs(caseId: string): SavedDoc[] {
  try {
    const raw = localStorage.getItem(storageKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedDoc[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e) =>
        typeof e.id === 'string' &&
        typeof e.typeId === 'string' &&
        typeof e.date === 'string',
    )
  } catch {
    return []
  }
}

/** Prepend a new entry (newest first) and persist. Returns the updated list. */
export function appendSavedDoc(
  caseId: string,
  entry: Omit<SavedDoc, 'id'>,
): SavedDoc[] {
  const newEntry: SavedDoc = {
    id: crypto.randomUUID(),
    ...entry,
  }
  try {
    const existing = loadSavedDocs(caseId)
    const next = [newEntry, ...existing].slice(0, 50) // cap at 50 entries
    localStorage.setItem(storageKey(caseId), JSON.stringify(next))
    return next
  } catch {
    return [newEntry]
  }
}
