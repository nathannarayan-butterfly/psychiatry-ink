/**
 * Standalone notes — saved outputs of the patient-less ("standalone") workspace
 * widgets (guided Befund text, AI rewrites, etc.).
 *
 * These are NOT a new store: they reuse the existing Dokumente archive
 * (`dokumenteArchive`), which already provides per-case localStorage
 * persistence, soft-delete, in-place edit and a same-window change event. We
 * simply tag standalone notes with a `pageType` prefix so they can be listed
 * separately in the standalone workspace side panel, and never collide with the
 * patient-bound documents a real case would hold.
 */

import { DEFAULT_CASE_ID } from './caseContext'
import {
  appendDokument,
  deleteDokument,
  loadDokumente,
  updateDokument,
  type DokumentCategory,
  type DokumentEntry,
} from './dokumenteArchive'

/** `pageType` prefix that marks an archive entry as a standalone workspace note. */
export const STANDALONE_NOTE_PAGE_PREFIX = 'standalone:'

/**
 * Single user-global container for standalone notes. The patient-less workspace
 * tools already persist under the default (non-patient) case, so reusing it as
 * the global notes bucket keeps every existing note readable with no migration —
 * and lets the floating Notizen popup + the dashboard widget read/write the same
 * list from any route. Notes here are never patient-bound (the default case holds
 * no PHI), so surfacing them globally is safe.
 */
export const GLOBAL_NOTES_CASE_ID = DEFAULT_CASE_ID

export interface StandaloneNoteInput {
  /** Stable kind, e.g. `'somatic-befund'`, `'rewrite'`. Stored as `standalone:{kind}`. */
  kind: string
  title: string
  content: string
  /** Archive category used for grouping; defaults to examination findings. */
  category?: DokumentCategory
}

/** Build the prefixed pageType for a standalone note kind. */
export function standaloneNotePageType(kind: string): string {
  return `${STANDALONE_NOTE_PAGE_PREFIX}${kind}`
}

/** Is this archive entry a standalone workspace note? */
export function isStandaloneNote(entry: DokumentEntry): boolean {
  return typeof entry.pageType === 'string' && entry.pageType.startsWith(STANDALONE_NOTE_PAGE_PREFIX)
}

/** Persist a generated standalone output as a note on the (default) case. */
export function saveStandaloneNote(caseId: string, input: StandaloneNoteInput): DokumentEntry {
  return appendDokument(caseId, {
    category: input.category ?? 'untersuchungsbefunde',
    title: input.title,
    content: input.content,
    date: new Date().toISOString(),
    source: 'manual',
    pageType: standaloneNotePageType(input.kind),
  })
}

/** List the standalone notes for a case, newest first. */
export function listStandaloneNotes(caseId: string): DokumentEntry[] {
  return loadDokumente(caseId).filter(isStandaloneNote)
}

/** Edit a standalone note's title and/or content in place. */
export function updateStandaloneNote(
  caseId: string,
  id: string,
  patch: { title?: string; content?: string },
): DokumentEntry | null {
  return updateDokument(caseId, id, patch)
}

/** Soft-delete a standalone note. */
export function deleteStandaloneNote(caseId: string, id: string): void {
  deleteDokument(caseId, id)
}

/* —— User-global notes (floating Notizen popup + dashboard widget) —— */

/**
 * Persist a user-global note. Content may be rich HTML (from the Notizen
 * rich-text editor) or plain text (tool output / legacy) — both are stored in
 * `content` and rendered gracefully via the rich-text helpers. Defaults to the
 * `formulare` category so free notes group with the other non-clinical jots.
 */
export function saveGlobalNote(input: StandaloneNoteInput): DokumentEntry {
  return saveStandaloneNote(GLOBAL_NOTES_CASE_ID, {
    ...input,
    category: input.category ?? 'formulare',
  })
}

/** List every user-global note, newest first. */
export function listGlobalNotes(): DokumentEntry[] {
  return listStandaloneNotes(GLOBAL_NOTES_CASE_ID)
}

/** Edit a user-global note's title and/or content in place. */
export function updateGlobalNote(
  id: string,
  patch: { title?: string; content?: string },
): DokumentEntry | null {
  return updateStandaloneNote(GLOBAL_NOTES_CASE_ID, id, patch)
}

/** Soft-delete a user-global note. */
export function deleteGlobalNote(id: string): void {
  deleteStandaloneNote(GLOBAL_NOTES_CASE_ID, id)
}
