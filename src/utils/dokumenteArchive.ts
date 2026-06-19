/**
 * Dokumente Archive — append-only archive of formally accepted / saved clinical documents.
 * Stored in localStorage under `psychiatry-ink:dokumenteArchive::{caseId}`.
 *
 * Separate from Verlauf feed: Dokumente holds formal output documents
 * (Arztbrief, Anamnese, lab results, examination findings, external records).
 * Verlauf holds chronological progress notes.
 */

import { caseStorageKey } from './caseContext'

const DOKUMENTE_ARCHIVE_KEY = 'psychiatry-ink:dokumenteArchive'

export type DokumentCategory =
  | 'anamnese'
  | 'arztbrief'
  | 'laborbefunde'
  | 'untersuchungsbefunde'
  | 'externe-befunde'
  | 'formulare'

export interface DokumentEntry {
  id: string
  caseId: string
  category: DokumentCategory
  title: string
  content: string
  /** ISO 8601 */
  date: string
  /** 'ai-accepted' = physician accepted AI output, 'manual' = explicit save, 'draft' = autosave / leave sync */
  source: 'ai-accepted' | 'manual' | 'draft'
  /** documentTypeId, e.g. 'therapie-verlauf', 'aufnahme' */
  pageType: string
  sectionLabel?: string
  /** Parsed or workspace section map (Anamnese categories). */
  sectionContents?: Record<string, string>
  /**
   * Stable id of the source record this document mirrors (e.g. a LaborBefund id).
   * Used to keep auto-mirrored documents (labs, etc.) idempotent: a source record
   * maps to exactly one document entry, so re-saving or backfilling never duplicates.
   */
  sourceRefId?: string
  /** Soft-delete flag — entries are never hard-deleted */
  deleted?: boolean
  /**
   * Binary attachment for imported PDFs / scans. Bytes live encrypted in the
   * imported-files IndexedDB store (`importedFileStore`); only metadata is kept
   * here. Present only for stored-only document imports.
   */
  attachment?: {
    storeId: string
    mimeType: string
    originalFileName: string
    sizeBytes: number
  }
  /** `stored_only` for imported PDFs/scans that were not parsed/OCR'd. */
  parsingMode?: 'stored_only'
  /** Links this entry to its Document Import provenance ledger record. */
  importProvenanceId?: string
}

function archiveKey(caseId: string): string {
  return caseStorageKey(DOKUMENTE_ARCHIVE_KEY, caseId)
}

/**
 * Infer a DokumentCategory from a documentTypeId.
 * Returns null if the doc type is not considered a formal document.
 */
export function inferDokumentCategory(pageType: string): DokumentCategory | null {
  const lower = pageType.toLowerCase()
  if (lower === 'aufnahme' || lower.includes('anamnese')) return 'anamnese'
  if (lower === 'therapie-verlauf') return 'arztbrief'
  if (lower.includes('labor')) return 'laborbefunde'
  return null
}

/** Load all non-deleted entries for a case, newest first. */
export function loadDokumente(caseId: string): DokumentEntry[] {
  return loadRawArchive(caseId)
    .filter((e) => !e.deleted && typeof e.id === 'string' && typeof e.content === 'string')
    .sort((a, b) => b.date.localeCompare(a.date))
}

function loadRawArchive(caseId: string): DokumentEntry[] {
  try {
    const raw = localStorage.getItem(archiveKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as DokumentEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Custom-event name for same-window listeners (storage events only fire cross-window). */
export const DOKUMENTE_ARCHIVE_CHANGED_EVENT = 'psychiatry-ink:dokumente-archive:changed'

function saveRawArchive(caseId: string, entries: DokumentEntry[]): void {
  try {
    localStorage.setItem(archiveKey(caseId), JSON.stringify(entries))
  } catch {
    // ignore storage quota errors
  }
  try {
    window.dispatchEvent(
      new CustomEvent(DOKUMENTE_ARCHIVE_CHANGED_EVENT, { detail: { caseId } }),
    )
  } catch {
    // not in a browser context
  }
}

/** Append a new document entry to the archive. */
export function appendDokument(
  caseId: string,
  entry: Omit<DokumentEntry, 'id' | 'caseId'>,
): DokumentEntry {
  const newEntry: DokumentEntry = {
    id: crypto.randomUUID(),
    caseId,
    ...entry,
  }
  const existing = loadRawArchive(caseId)
  saveRawArchive(caseId, [newEntry, ...existing])
  return newEntry
}

/**
 * Idempotently mirror source records (e.g. lab befunde) into the archive.
 *
 * Each candidate carries a `sourceRefId`. A candidate is appended only when no
 * existing entry — including soft-deleted ones — already references that source.
 * This makes both the initial backfill of pre-existing records and ongoing saves
 * safe to call repeatedly without ever creating duplicates, and respects the
 * user's intent when they deleted a previously mirrored document.
 *
 * Returns the number of entries actually created.
 */
export function syncSourceDokumente(
  caseId: string,
  candidates: Array<Omit<DokumentEntry, 'id' | 'caseId'> & { sourceRefId: string }>,
): number {
  if (candidates.length === 0) return 0
  const existing = loadRawArchive(caseId)
  const knownRefs = new Set(
    existing.map((e) => e.sourceRefId).filter((ref): ref is string => typeof ref === 'string'),
  )
  const toAdd: DokumentEntry[] = candidates
    .filter((c) => !knownRefs.has(c.sourceRefId))
    .map((c) => ({ id: crypto.randomUUID(), caseId, ...c }))
  if (toAdd.length === 0) return 0
  saveRawArchive(caseId, [...toAdd, ...existing])
  return toAdd.length
}

/**
 * Update the working draft for a document type, or create one.
 * Replaces an existing non-deleted draft with the same pageType.
 * Content-based dedup: if an existing draft already has identical content,
 * only the timestamp is refreshed — no new entry is created.
 */
export function upsertDokumentDraft(
  caseId: string,
  entry: Omit<DokumentEntry, 'id' | 'caseId'>,
): DokumentEntry {
  const existing = loadRawArchive(caseId)
  const draftIndex = existing.findIndex(
    (item) => !item.deleted && item.pageType === entry.pageType && item.source === 'draft',
  )

  if (draftIndex >= 0) {
    const currentDraft = existing[draftIndex]
    const normNew = entry.content.trim().replace(/\s+/g, ' ')
    const normOld = currentDraft.content.trim().replace(/\s+/g, ' ')
    if (entry.source === 'draft' && normNew === normOld) {
      // Same content — just refresh timestamp silently, no structural change
      const updated: DokumentEntry = { ...currentDraft, date: entry.date }
      const next = [...existing]
      next[draftIndex] = updated
      next.sort((a, b) => b.date.localeCompare(a.date))
      saveRawArchive(caseId, next)
      return updated
    }

    const updated: DokumentEntry = {
      ...currentDraft,
      ...entry,
      source: entry.source === 'manual' || entry.source === 'ai-accepted' ? entry.source : 'draft',
      date: entry.date,
    }
    const next = [...existing]
    next[draftIndex] = updated
    next.sort((a, b) => b.date.localeCompare(a.date))
    saveRawArchive(caseId, next)
    return updated
  }

  if (entry.source === 'manual' || entry.source === 'ai-accepted') {
    const withoutDraft = existing.filter(
      (item) => !( !item.deleted && item.pageType === entry.pageType && item.source === 'draft'),
    )
    const newEntry: DokumentEntry = {
      id: crypto.randomUUID(),
      caseId,
      ...entry,
    }
    saveRawArchive(caseId, [newEntry, ...withoutDraft])
    return newEntry
  }

  return appendDokument(caseId, { ...entry, source: 'draft' })
}

/** Update a specific document entry's editable fields by id. */
export function updateDokument(
  caseId: string,
  id: string,
  patch: Partial<Pick<DokumentEntry, 'content' | 'title' | 'sectionContents'>>,
): DokumentEntry | null {
  const existing = loadRawArchive(caseId)
  const idx = existing.findIndex((e) => e.id === id && !e.deleted)
  if (idx < 0) return null
  const updated: DokumentEntry = {
    ...existing[idx],
    ...patch,
    date: new Date().toISOString(),
  }
  // When content is manually edited, section breakdown is stale — clear it
  if ('content' in patch) {
    updated.sectionContents = undefined
  }
  const next = [...existing]
  next[idx] = updated
  next.sort((a, b) => b.date.localeCompare(a.date))
  saveRawArchive(caseId, next)
  return updated
}

/** Soft-delete a document entry by id. */
export function deleteDokument(caseId: string, id: string): void {
  const existing = loadRawArchive(caseId)
  if (existing.length === 0) return
  const next = existing.map((e) => (e.id === id ? { ...e, deleted: true } : e))
  saveRawArchive(caseId, next)
}
