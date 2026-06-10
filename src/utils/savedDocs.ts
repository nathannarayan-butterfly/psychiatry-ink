/**
 * Saved Docs — lightweight sidebar list of documents explicitly saved by the physician.
 * Stored in localStorage under `psychiatry-ink:savedDocs::{caseId}`.
 *
 * Separate from the vault and archive: this is purely a UI convenience list
 * showing recently saved documents so the doctor can re-open them quickly.
 * Newest entry first (index 0).
 *
 * Deduplication: only one entry per typeId is kept (the most recent one).
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

function persist(caseId: string, docs: SavedDoc[]): void {
  localStorage.setItem(storageKey(caseId), JSON.stringify(docs))
}

export function loadSavedDocs(caseId: string): SavedDoc[] {
  try {
    const raw = localStorage.getItem(storageKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedDoc[]
    if (!Array.isArray(parsed)) return []
    const valid = parsed.filter(
      (e) =>
        typeof e.id === 'string' &&
        typeof e.typeId === 'string' &&
        typeof e.date === 'string',
    )
    // Deduplicate by typeId — keep only the first (newest) occurrence per typeId
    const seen = new Set<string>()
    const deduped = valid.filter((e) => {
      if (seen.has(e.typeId)) return false
      seen.add(e.typeId)
      return true
    })
    // Persist deduplicated list back if it changed (one-time migration)
    if (deduped.length !== valid.length) {
      persist(caseId, deduped)
    }
    return deduped
  } catch {
    return []
  }
}

/**
 * Upsert an entry (newest first) and persist.
 * If an entry with the same typeId already exists it is removed first so the
 * new one moves to the top — no duplicates are created.
 * Returns the updated list.
 */
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
    // Remove any existing entry with the same typeId to prevent duplicates
    const deduplicated = existing.filter((e) => e.typeId !== entry.typeId)
    const next = [newEntry, ...deduplicated].slice(0, 50)
    persist(caseId, next)
    return next
  } catch {
    return [newEntry]
  }
}

/** Remove a single entry by its UUID. Returns the updated list. */
export function removeSavedDoc(caseId: string, id: string): SavedDoc[] {
  try {
    const existing = loadSavedDocs(caseId)
    const next = existing.filter((e) => e.id !== id)
    persist(caseId, next)
    return next
  } catch {
    return []
  }
}

/**
 * Remove all entries whose typeId matches the given documentTypeId.
 * Called when the corresponding document is deleted from the archive.
 * Returns the updated list.
 */
export function removeSavedDocsByTypeId(caseId: string, typeId: string): SavedDoc[] {
  try {
    const existing = loadSavedDocs(caseId)
    const next = existing.filter((e) => e.typeId !== typeId)
    persist(caseId, next)
    return next
  } catch {
    return []
  }
}
