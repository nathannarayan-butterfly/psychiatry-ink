// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchRemoteUserNotes = vi.fn()
const saveRemoteUserNote = vi.fn()
const deleteRemoteUserNote = vi.fn()

vi.mock('../../services/userNotesApi', () => ({
  fetchRemoteUserNotes: (...args: unknown[]) => fetchRemoteUserNotes(...args),
  saveRemoteUserNote: (...args: unknown[]) => saveRemoteUserNote(...args),
  deleteRemoteUserNote: (...args: unknown[]) => deleteRemoteUserNote(...args),
}))

import { hydrateGlobalNotesFromRemote } from '../globalNotesSync'
import { saveGlobalNote, listGlobalNotes, GLOBAL_NOTES_CASE_ID } from '../standaloneNotes'

const SYNCED_FLAG_PREFIX = 'psychiatry-ink:user-notes-db-synced'
const BUCKET_OWNER_KEY = 'psychiatry-ink:user-notes-bucket-owner'

describe('hydrateGlobalNotesFromRemote — cross-user isolation', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchRemoteUserNotes.mockReset()
    saveRemoteUserNote.mockReset()
    deleteRemoteUserNote.mockReset()
    // saveStandaloneNote in `saveGlobalNote` triggers a non-awaited remote push;
    // make it a harmless no-op so the test focuses on the hydrate path.
    saveRemoteUserNote.mockResolvedValue(null)
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('uses a per-user synced flag so user-B does not inherit user-A "already synced"', async () => {
    // User A writes a local note that is NOT yet in their DB, then hydrate runs:
    // it backfills the local note to A's DB and stamps A's flag.
    saveGlobalNote({ kind: 'jot', title: 'A: lokale Notiz', content: 'Patient von A.' })
    fetchRemoteUserNotes.mockResolvedValueOnce([])

    await hydrateGlobalNotesFromRemote('user-a')

    expect(saveRemoteUserNote).toHaveBeenCalled()
    expect(localStorage.getItem(`${SYNCED_FLAG_PREFIX}:user-a`)).toBe('1')
    expect(localStorage.getItem(`${SYNCED_FLAG_PREFIX}:user-b`)).toBeNull()

    // Simulate logout (only auth session cleared) — clinical localStorage stays
    // in place because logout intentionally does not purge same-user data.
    // A's flag is therefore still '1'.

    // Now user-B signs in on the SAME browser. The auth-context cross-user
    // purge would normally fire here; we deliberately do NOT call it so the
    // test isolates the in-module defense. Under the global-flag bug, B would
    // see `flag === '1'` and skip the local→DB push. With the per-user flag,
    // B's flag is absent → B's backfill runs cleanly.
    saveRemoteUserNote.mockClear()
    fetchRemoteUserNotes.mockResolvedValueOnce([])

    // After cross-user switch the bucket owner check drops any standalone notes
    // left in the shared bucket BEFORE B's hydrate writes anything — so B never
    // pushes A's leftover note under B's account.
    await hydrateGlobalNotesFromRemote('user-b')

    expect(saveRemoteUserNote).not.toHaveBeenCalled()
    expect(localStorage.getItem(`${SYNCED_FLAG_PREFIX}:user-b`)).toBe('1')
  })

  it('drops a previous user’s standalone notes from the shared bucket before hydrating user-B', async () => {
    // User-A writes a local note that lives in dokumenteArchive::default.
    saveGlobalNote({ kind: 'jot', title: 'A: Notiz', content: 'Patient von A.' })
    fetchRemoteUserNotes.mockResolvedValueOnce([])
    await hydrateGlobalNotesFromRemote('user-a')
    expect(listGlobalNotes()).toHaveLength(1)
    expect(localStorage.getItem(BUCKET_OWNER_KEY)).toBe('user-a')

    // User-B signs in on the same browser. The bucket owner marker disagrees
    // with B's id → standalone notes from the shared bucket are dropped before
    // B's hydration writes B's notes.
    fetchRemoteUserNotes.mockResolvedValueOnce([
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'B: Eigene Notiz',
        content: 'Patient von B.',
        kind: 'manual',
        category: 'formulare',
        pageType: 'standalone:manual',
        deleted: false,
        createdAt: '2026-06-30T10:00:00.000Z',
        updatedAt: '2026-06-30T10:00:00.000Z',
      },
    ])

    await hydrateGlobalNotesFromRemote('user-b')

    const notesAfter = listGlobalNotes()
    expect(notesAfter).toHaveLength(1)
    expect(notesAfter[0]?.title).toBe('B: Eigene Notiz')
    expect(notesAfter.some((n) => /Patient von A/.test(n.content))).toBe(false)
    expect(localStorage.getItem(BUCKET_OWNER_KEY)).toBe('user-b')
  })

  it('does not push prior-user notes under the new user’s account once user-A has hydrated', async () => {
    // User-A's first hydrate establishes the bucket owner marker and stamps A's flag.
    saveGlobalNote({ kind: 'jot', title: 'A: nur lokal', content: 'A.' })
    fetchRemoteUserNotes.mockResolvedValueOnce([])
    await hydrateGlobalNotesFromRemote('user-a')
    saveRemoteUserNote.mockClear()

    // User-A logs out cleanly (session only — clinical data + flags + owner
    // marker are intentionally retained for same-user resumption). The
    // localStorage still contains A's note.
    expect(listGlobalNotes()).toHaveLength(1)

    // User-B signs in. The auth-context cross-user purge would normally fire
    // here — we deliberately do NOT call it to isolate the in-module defense.
    fetchRemoteUserNotes.mockResolvedValueOnce([])
    await hydrateGlobalNotesFromRemote('user-b')

    // The bucket owner gate detected the ownership change and dropped A's note
    // BEFORE the backfill loop ran, so the remote API never saw A's note under
    // B's auth header.
    expect(saveRemoteUserNote).not.toHaveBeenCalled()
    // And A's note is gone from the bucket — no leak into B's session.
    expect(listGlobalNotes()).toHaveLength(0)
    // B's flag is stamped independently of A's.
    expect(localStorage.getItem(`${SYNCED_FLAG_PREFIX}:user-b`)).toBe('1')
    expect(localStorage.getItem(`${SYNCED_FLAG_PREFIX}:user-a`)).toBe('1')
  })

  it('preserves same-user data across logout → re-login (no spurious purge)', async () => {
    saveGlobalNote({ kind: 'jot', title: 'A: Notiz', content: 'A.' })
    fetchRemoteUserNotes.mockResolvedValue([])

    await hydrateGlobalNotesFromRemote('user-a')
    expect(listGlobalNotes()).toHaveLength(1)

    // Same user signs in again — bucket owner matches, nothing is dropped.
    await hydrateGlobalNotesFromRemote('user-a')
    expect(listGlobalNotes()).toHaveLength(1)
  })

  it('ignores an empty user id', async () => {
    await expect(hydrateGlobalNotesFromRemote('')).resolves.toBe(false)
    expect(fetchRemoteUserNotes).not.toHaveBeenCalled()
  })

  it('writes hydrated notes under the active case bucket', async () => {
    // Sanity guard: the case id used by hydrate is the same bucket the dashboard
    // widget and floating popup read from, so user-B's hydrated notes are
    // actually visible to them.
    fetchRemoteUserNotes.mockResolvedValueOnce([
      {
        id: '22222222-2222-2222-2222-222222222222',
        title: 'remote',
        content: 'remote content',
        kind: 'manual',
        category: 'formulare',
        pageType: 'standalone:manual',
        deleted: false,
        createdAt: '2026-06-30T10:00:00.000Z',
        updatedAt: '2026-06-30T10:00:00.000Z',
      },
    ])
    await hydrateGlobalNotesFromRemote('user-c')
    expect(GLOBAL_NOTES_CASE_ID).toBeDefined()
    expect(listGlobalNotes().some((n) => n.title === 'remote')).toBe(true)
  })
})
