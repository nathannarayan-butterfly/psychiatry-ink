// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RemoteUserNote } from '../../services/userNotesApi'

const fetchRemoteUserNotes = vi.fn()
const saveRemoteUserNote = vi.fn()
const deleteRemoteUserNote = vi.fn()

vi.mock('../../services/userNotesApi', () => ({
  fetchRemoteUserNotes: (...args: unknown[]) => fetchRemoteUserNotes(...args),
  saveRemoteUserNote: (...args: unknown[]) => saveRemoteUserNote(...args),
  deleteRemoteUserNote: (...args: unknown[]) => deleteRemoteUserNote(...args),
}))

import {
  hydrateGlobalNotesFromRemote,
  persistGlobalNoteToRemote,
} from '../globalNotesSync'
import { GLOBAL_NOTES_CASE_ID, listGlobalNotes, saveGlobalNote } from '../standaloneNotes'
import { encryptJsonPayload, hasLocalKeyMaterial, ensureKeyMaterial } from '../cryptoVault'

describe('user_notes encryption (Design D quick win)', () => {
  beforeEach(async () => {
    localStorage.clear()
    fetchRemoteUserNotes.mockReset()
    saveRemoteUserNote.mockReset()
    deleteRemoteUserNote.mockReset()
    saveRemoteUserNote.mockResolvedValue(null)
    // Make sure the per-device key pair exists so encryption is exercised
    // (mirrors the production code path once a user has set up their device).
    await ensureKeyMaterial()
    expect(await hasLocalKeyMaterial()).toBe(true)
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('persistGlobalNoteToRemote encrypts {title, content} client-side and never sends plaintext', async () => {
    // Save a local note (this also triggers the in-process remote push). We then
    // explicitly call persistGlobalNoteToRemote so we can capture the payload.
    saveGlobalNote({ kind: 'jot', title: 'Plaintext title', content: 'Plaintext PHI here.' })
    const local = listGlobalNotes()[0]!

    saveRemoteUserNote.mockClear()
    await persistGlobalNoteToRemote({
      id: local.id,
      caseId: GLOBAL_NOTES_CASE_ID,
      category: 'formulare',
      title: 'Plaintext title',
      content: 'Plaintext PHI here.',
      date: new Date().toISOString(),
      source: 'manual',
      pageType: local.pageType,
    })

    expect(saveRemoteUserNote).toHaveBeenCalled()
    const lastCall = saveRemoteUserNote.mock.calls[saveRemoteUserNote.mock.calls.length - 1]!
    const payload = lastCall[0] as Record<string, unknown>

    // Ciphertext envelope is set, plaintext is omitted.
    expect(payload.ciphertext).toBeTypeOf('string')
    expect(payload.iv).toBeTypeOf('string')
    expect(payload.wrappedKey).toBeTypeOf('string')
    expect(payload.payloadVersion).toBe(1)
    expect(payload.title).toBeUndefined()
    expect(payload.content).toBeUndefined()

    // The ciphertext must not contain the plaintext anywhere (defence-in-depth
    // assertion — AES-GCM is the actual guarantee).
    const cipherStr = String(payload.ciphertext)
    expect(cipherStr.includes('Plaintext PHI here.')).toBe(false)
    expect(cipherStr.includes('Plaintext title')).toBe(false)
  })

  it('hydrateGlobalNotesFromRemote decrypts ciphertext rows from the server', async () => {
    // Build a ciphertext payload exactly as the server would have stored it:
    const envelope = await encryptJsonPayload({
      title: 'Verschlüsselter Titel',
      content: 'Verschlüsselter Notizinhalt.',
    })

    const remote: RemoteUserNote = {
      id: '99999999-9999-9999-9999-999999999999',
      title: '',
      content: '',
      kind: 'manual',
      category: 'formulare',
      pageType: 'standalone:manual',
      deleted: false,
      createdAt: '2026-06-30T10:00:00.000Z',
      updatedAt: '2026-06-30T10:00:00.000Z',
      ciphertext: envelope.ciphertext,
      iv: envelope.iv,
      wrappedKey: envelope.wrappedKey,
      payloadVersion: envelope.version,
    }
    fetchRemoteUserNotes.mockResolvedValueOnce([remote])

    await hydrateGlobalNotesFromRemote('user-x')

    const decrypted = listGlobalNotes().find((n) => n.id === remote.id)
    expect(decrypted).toBeDefined()
    expect(decrypted?.title).toBe('Verschlüsselter Titel')
    expect(decrypted?.content).toBe('Verschlüsselter Notizinhalt.')
  })

  it('hydrate gracefully handles a ciphertext row that cannot be decrypted', async () => {
    const remote: RemoteUserNote = {
      id: '88888888-8888-8888-8888-888888888888',
      title: '',
      content: '',
      kind: 'manual',
      category: 'formulare',
      pageType: 'standalone:manual',
      deleted: false,
      createdAt: '2026-06-30T10:00:00.000Z',
      updatedAt: '2026-06-30T10:00:00.000Z',
      ciphertext: 'YmFkLWNpcGhlcg==',
      iv: 'YmFkLWl2',
      wrappedKey: 'YmFkLWtleQ==',
      payloadVersion: 1,
    }
    fetchRemoteUserNotes.mockResolvedValueOnce([remote])

    await hydrateGlobalNotesFromRemote('user-x')

    const decrypted = listGlobalNotes().find((n) => n.id === remote.id)
    expect(decrypted).toBeDefined()
    // Decryption failure → empty content surfaced, sync does not throw.
    expect(decrypted?.title).toBe('')
    expect(decrypted?.content).toBe('')
  })

  it('legacy plaintext rows still decrypt as plaintext (back-compat)', async () => {
    const remote: RemoteUserNote = {
      id: '77777777-7777-7777-7777-777777777777',
      title: 'Legacy plaintext title',
      content: 'Legacy plaintext content.',
      kind: 'manual',
      category: 'formulare',
      pageType: 'standalone:manual',
      deleted: false,
      createdAt: '2026-06-30T10:00:00.000Z',
      updatedAt: '2026-06-30T10:00:00.000Z',
      ciphertext: null,
      iv: null,
      wrappedKey: null,
      payloadVersion: 1,
    }
    fetchRemoteUserNotes.mockResolvedValueOnce([remote])

    await hydrateGlobalNotesFromRemote('user-x')

    const decrypted = listGlobalNotes().find((n) => n.id === remote.id)
    expect(decrypted?.title).toBe('Legacy plaintext title')
    expect(decrypted?.content).toBe('Legacy plaintext content.')
  })
})
