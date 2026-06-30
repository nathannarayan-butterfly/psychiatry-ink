/**
 * Sync user-global notes between localStorage (dokumente archive) and the
 * account-scoped Supabase table. Local remains the offline fallback; when the
 * API is available we hydrate from DB and push new/edited notes on save.
 *
 * Server-side encryption-at-rest (Design D quick win): the `{title, content}`
 * pair is encrypted client-side with the per-device RSA-wrapped AES-GCM key
 * before upload. Plaintext columns become `''` on the server. Pre-rollout
 * rows that still carry plaintext continue to be readable until everyone has
 * migrated. The server rejects mixed writes (ciphertext + non-empty
 * plaintext) — see `server/routes/userNotes.ts`.
 */
import {
  deleteRemoteUserNote,
  fetchRemoteUserNotes,
  saveRemoteUserNote,
  type RemoteUserNote,
} from '../services/userNotesApi'
import {
  decryptJsonPayload,
  encryptJsonPayload,
  hasLocalKeyMaterial,
} from './cryptoVault'
import type { DokumentCategory, DokumentEntry } from './dokumenteArchive'
import { deleteDokument, loadDokumente, upsertDokumentById } from './dokumenteArchive'
import {
  GLOBAL_NOTES_CASE_ID,
  STANDALONE_NOTE_PAGE_PREFIX,
  standaloneNotePageType,
  isStandaloneNote,
} from './standaloneNotes'

interface UserNoteCiphertextPayload {
  title: string
  content: string
}

/**
 * Decrypt the server payload if it is ciphertext; fall back to plaintext
 * columns for pre-rollout rows. If decryption fails (e.g. the user's key
 * pair has changed since the row was written) we treat the title/content as
 * empty rather than crashing the sync — the row is still surfaced so the
 * user can manually re-enter or delete it.
 */
async function decryptRemoteNote(note: RemoteUserNote): Promise<{ title: string; content: string }> {
  if (!note.ciphertext || !note.iv || !note.wrappedKey) {
    return { title: note.title, content: note.content }
  }
  try {
    const payload = await decryptJsonPayload<UserNoteCiphertextPayload>({
      version: note.payloadVersion,
      ciphertext: note.ciphertext,
      iv: note.iv,
      wrappedKey: note.wrappedKey,
    })
    return {
      title: typeof payload.title === 'string' ? payload.title : '',
      content: typeof payload.content === 'string' ? payload.content : '',
    }
  } catch (error) {
    console.warn('[user-notes] decrypt failed for note', note.id, (error as Error).message)
    return { title: '', content: '' }
  }
}

async function encryptNotePayload(
  payload: UserNoteCiphertextPayload,
): Promise<{ ciphertext: string; iv: string; wrappedKey: string; payloadVersion: number }> {
  const blob = await encryptJsonPayload(payload)
  return {
    ciphertext: blob.ciphertext,
    iv: blob.iv,
    wrappedKey: blob.wrappedKey,
    payloadVersion: blob.version,
  }
}

/**
 * One-time push flag for "local notes → DB" backfill. Scoped per-user so that a
 * different user signing in on the same browser cannot inherit user-A's "already
 * synced" state — which would silently skip pushing user-A's offline-saved notes
 * AND let remote-hydrated user-B notes overwrite the shared bucket. The active
 * cross-user purge in {@link reconcileActiveUser} already drops these keys when
 * a DIFFERENT user is detected; the per-user scoping is belt-and-braces.
 */
const SYNCED_FLAG_BASE = 'psychiatry-ink:user-notes-db-synced'

/**
 * Recorded owner of the standalone notes currently living in the shared dokumente
 * archive bucket (`dokumenteArchive::default`). When hydrate runs and this marker
 * disagrees with the just-resolved auth user id, the bucket is treated as stale
 * and its standalone notes are dropped BEFORE remote hydration writes user-B's
 * notes — closing the "shared key polluted with another account's data" leak even
 * if the auth-context purge has not (yet) run.
 */
const BUCKET_OWNER_KEY = 'psychiatry-ink:user-notes-bucket-owner'

function syncedFlagKey(userId: string): string {
  return `${SYNCED_FLAG_BASE}:${userId}`
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

function purgeStandaloneNotesFromBucket(): void {
  const standalone = loadDokumente(GLOBAL_NOTES_CASE_ID).filter(isStandaloneNote)
  for (const entry of standalone) {
    deleteDokument(GLOBAL_NOTES_CASE_ID, entry.id)
  }
}

function ensureBucketOwner(userId: string): void {
  let previous: string | null = null
  try {
    previous = localStorage.getItem(BUCKET_OWNER_KEY)
  } catch {
    previous = null
  }
  if (previous && previous !== userId) {
    purgeStandaloneNotesFromBucket()
  }
  try {
    localStorage.setItem(BUCKET_OWNER_KEY, userId)
  } catch {
    // ignore
  }
}

async function remoteToLocal(note: RemoteUserNote): Promise<DokumentEntry> {
  const { title, content } = await decryptRemoteNote(note)
  return {
    id: note.id,
    caseId: GLOBAL_NOTES_CASE_ID,
    category: (note.category as DokumentCategory) || 'formulare',
    title,
    content,
    date: note.updatedAt || note.createdAt,
    source: 'manual',
    pageType: note.pageType || standaloneNotePageType(note.kind || 'manual'),
    deleted: note.deleted,
  }
}

async function buildNotePayload(entry: {
  title: string
  content: string
  kind: string
  category: string
  pageType?: string
}): Promise<Parameters<typeof saveRemoteUserNote>[0]> {
  const base = {
    kind: entry.kind,
    category: entry.category,
    pageType: entry.pageType,
  }
  // The local key material is only present once the user has unlocked
  // (or generated) their per-device RSA pair. Until then, we fall back to
  // plaintext writes so first-run + offline scenarios keep working — the
  // server's mixed-write guard then protects against accidental dual writes.
  if (!(await hasLocalKeyMaterial())) {
    return { ...base, title: entry.title, content: entry.content }
  }
  const envelope = await encryptNotePayload({ title: entry.title, content: entry.content })
  return { ...base, ...envelope }
}

function localKindFromEntry(entry: DokumentEntry): string {
  const pageType = entry.pageType ?? ''
  if (pageType.startsWith(STANDALONE_NOTE_PAGE_PREFIX)) {
    return pageType.slice(STANDALONE_NOTE_PAGE_PREFIX.length) || 'manual'
  }
  return 'manual'
}

/**
 * Pull remote notes into the local archive (one-time migration + refresh).
 *
 * Scoped to the authenticated `userId` so that:
 *   1. The "already synced" flag is per-user — a previous user's flag never
 *      suppresses a new user's local→DB backfill.
 *   2. Stale standalone notes left in the shared dokumente bucket by another
 *      account are dropped before this user's remote notes are written to it.
 */
export async function hydrateGlobalNotesFromRemote(userId: string): Promise<boolean> {
  if (!userId) return false
  ensureBucketOwner(userId)

  const remote = await fetchRemoteUserNotes()
  if (!remote) return false

  const localNotes = loadDokumente(GLOBAL_NOTES_CASE_ID).filter(isStandaloneNote)
  const localById = new Map(localNotes.map((e) => [e.id, e]))
  const flagKey = syncedFlagKey(userId)
  const alreadySynced = localStorage.getItem(flagKey) === '1'

  if (!alreadySynced) {
    for (const entry of localNotes) {
      if (isUuid(entry.id) && remote.some((n) => n.id === entry.id)) continue
      const payload = await buildNotePayload({
        title: entry.title,
        content: entry.content,
        kind: localKindFromEntry(entry),
        category: entry.category,
        pageType: entry.pageType,
      })
      await saveRemoteUserNote(payload)
    }
    try {
      localStorage.setItem(flagKey, '1')
    } catch {
      // ignore
    }
  }

  for (const note of remote) {
    if (note.deleted) {
      if (localById.has(note.id)) deleteDokument(GLOBAL_NOTES_CASE_ID, note.id)
      continue
    }
    const mapped = await remoteToLocal(note)
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
  const payload = await buildNotePayload({
    title: entry.title,
    content: entry.content,
    kind: localKindFromEntry(entry),
    category: entry.category,
    pageType: entry.pageType,
  })
  const saved = await saveRemoteUserNote({
    id: isUuid(entry.id) ? entry.id : undefined,
    ...payload,
  })
  if (!saved || saved.id === entry.id) return
  deleteDokument(GLOBAL_NOTES_CASE_ID, entry.id)
  upsertDokumentById(GLOBAL_NOTES_CASE_ID, await remoteToLocal(saved))
}

export async function deleteGlobalNoteRemote(id: string): Promise<void> {
  if (isUuid(id)) await deleteRemoteUserNote(id)
}
