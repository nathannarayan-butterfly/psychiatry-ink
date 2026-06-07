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

export interface DokumentEntry {
  id: string
  caseId: string
  category: DokumentCategory
  title: string
  content: string
  /** ISO 8601 */
  date: string
  /** 'ai-accepted' = physician accepted AI output, 'manual' = physician typed and saved */
  source: 'ai-accepted' | 'manual'
  /** documentTypeId, e.g. 'therapie-verlauf', 'aufnahme' */
  pageType: string
  sectionLabel?: string
  /** Soft-delete flag — entries are never hard-deleted */
  deleted?: boolean
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
  try {
    const raw = localStorage.getItem(archiveKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as DokumentEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((e) => !e.deleted && typeof e.id === 'string' && typeof e.content === 'string')
      .sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
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
  try {
    const key = archiveKey(caseId)
    const raw = localStorage.getItem(key)
    const existing: DokumentEntry[] = raw ? (JSON.parse(raw) as DokumentEntry[]) : []
    const next = [newEntry, ...existing]
    localStorage.setItem(key, JSON.stringify(next))
  } catch {
    // ignore storage quota errors
  }
  return newEntry
}

/** Soft-delete a document entry by id. */
export function deleteDokument(caseId: string, id: string): void {
  try {
    const key = archiveKey(caseId)
    const raw = localStorage.getItem(key)
    if (!raw) return
    const existing = JSON.parse(raw) as DokumentEntry[]
    const next = existing.map((e) => (e.id === id ? { ...e, deleted: true } : e))
    localStorage.setItem(key, JSON.stringify(next))
  } catch {
    // ignore
  }
}
