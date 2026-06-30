/**
 * Sync user-global notes between localStorage (dokumente archive) and the
 * account-scoped Supabase table. Local remains the offline fallback; when the
 * API is available we hydrate from DB and push new/edited notes on save.
 */
import {
  deleteRemoteUserNote,
  fetchRemoteUserNotes,
  saveRemoteUserNote,
  type RemoteUserNote,
} from '../services/userNotesApi'
import type { DokumentCategory, DokumentEntry } from './dokumenteArchive'
import { appendDokument, deleteDokument, loadDokumente, upsertDokumentById } from './dokumenteArchive'
import {
  GLOBAL_NOTES_CASE_ID,
  STANDALONE_NOTE_PAGE_PREFIX,
  standaloneNotePageType,
  isStandaloneNote,
} from './standaloneNotes'

const SYNCED_FLAG_KEY = 'psychiatry-ink:user-notes-db-synced'

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

function remoteToLocal(note: RemoteUserNote): DokumentEntry {
  return {
    id: note.id,
    caseId: GLOBAL_NOTES_CASE_ID,
    category: (note.category as DokumentCategory) || 'formulare',
    title: note.title,
    content: note.content,
    date: note.updatedAt || note.createdAt,
    source: 'manual',
    pageType: note.pageType || standaloneNotePageType(note.kind || 'manual'),
    deleted: note.deleted,
  }
}

function localKindFromEntry(entry: DokumentEntry): string {
  const pageType = entry.pageType ?? ''
  if (pageType.startsWith(STANDALONE_NOTE_PAGE_PREFIX)) {
    return pageType.slice(STANDALONE_NOTE_PAGE_PREFIX.length) || 'manual'
  }
  return 'manual'
}

/** Pull remote notes into the local archive (one-time migration + refresh). */
export async function hydrateGlobalNotesFromRemote(): Promise<boolean> {
  const remote = await fetchRemoteUserNotes()
  if (!remote) return false

  const localNotes = loadDokumente(GLOBAL_NOTES_CASE_ID).filter(isStandaloneNote)
  const localById = new Map(localNotes.map((e) => [e.id, e]))
  const alreadySynced = localStorage.getItem(SYNCED_FLAG_KEY) === '1'

  if (!alreadySynced) {
    for (const entry of localNotes) {
      if (isUuid(entry.id) && remote.some((n) => n.id === entry.id)) continue
      await saveRemoteUserNote({
        title: entry.title,
        content: entry.content,
        kind: localKindFromEntry(entry),
        category: entry.category,
        pageType: entry.pageType,
      })
    }
    try {
      localStorage.setItem(SYNCED_FLAG_KEY, '1')
    } catch {
      // ignore
    }
  }

  for (const note of remote) {
    if (note.deleted) {
      if (localById.has(note.id)) deleteDokument(GLOBAL_NOTES_CASE_ID, note.id)
      continue
    }
    const mapped = remoteToLocal(note)
    const existing = localById.get(note.id)
    if (
      !existing ||
      existing.date < mapped.date ||
      existing.content !== mapped.content ||
      existing.title !== mapped.title
    ) {
      upsertDokumentById(GLOBAL_NOTES_CASE_ID, mapped)
    }
  }

  return true
}

export async function persistGlobalNoteToRemote(entry: DokumentEntry): Promise<void> {
  const saved = await saveRemoteUserNote({
    id: isUuid(entry.id) ? entry.id : undefined,
    title: entry.title,
    content: entry.content,
    kind: localKindFromEntry(entry),
    category: entry.category,
    pageType: entry.pageType,
  })
  if (!saved || saved.id === entry.id) return
  deleteDokument(GLOBAL_NOTES_CASE_ID, entry.id)
  upsertDokumentById(GLOBAL_NOTES_CASE_ID, remoteToLocal(saved))
}

export async function deleteGlobalNoteRemote(id: string): Promise<void> {
  if (isUuid(id)) await deleteRemoteUserNote(id)
}
