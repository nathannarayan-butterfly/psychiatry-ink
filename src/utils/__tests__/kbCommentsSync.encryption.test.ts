// @vitest-environment jsdom
//
// Design D quick win — `kb_pharma_comments.text` is wrapped with the same
// per-device AES-GCM/RSA-OAEP envelope used for `user_notes.content` and
// the patient vault. This test exercises the client roundtrip:
//   1. persist: payload sent to the server is ciphertext, never plaintext.
//   2. hydrate: ciphertext rows come back decrypted; legacy plaintext rows
//      still surface as-is; broken ciphertext degrades to empty string
//      rather than crashing sync.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RemoteKbPharmaComment } from '../../services/userNotesApi'

const fetchRemoteKbPharmaComments = vi.fn()
const saveRemoteKbPharmaComment = vi.fn()
const deleteRemoteKbPharmaComment = vi.fn()

// The mock has to satisfy ALL exports from userNotesApi that the
// kbCommentsSync module reaches via its import statement; the real
// fetchRemoteUserNotes/saveRemoteUserNote are not used by these tests but
// must exist on the mocked module.
vi.mock('../../services/userNotesApi', () => ({
  fetchRemoteKbPharmaComments: (...a: unknown[]) => fetchRemoteKbPharmaComments(...a),
  saveRemoteKbPharmaComment: (...a: unknown[]) => saveRemoteKbPharmaComment(...a),
  deleteRemoteKbPharmaComment: (...a: unknown[]) => deleteRemoteKbPharmaComment(...a),
  fetchRemoteUserNotes: vi.fn(),
  saveRemoteUserNote: vi.fn(),
  deleteRemoteUserNote: vi.fn(),
}))

import {
  hydrateKbCommentsFromRemote,
  persistKbCommentToRemote,
} from '../kbCommentsSync'
import { encryptJsonPayload, ensureKeyMaterial, hasLocalKeyMaterial } from '../cryptoVault'

describe('kb_pharma_comments encryption (Design D quick win)', () => {
  beforeEach(async () => {
    localStorage.clear()
    fetchRemoteKbPharmaComments.mockReset()
    saveRemoteKbPharmaComment.mockReset()
    deleteRemoteKbPharmaComment.mockReset()
    saveRemoteKbPharmaComment.mockResolvedValue(null)
    await ensureKeyMaterial()
    expect(await hasLocalKeyMaterial()).toBe(true)
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('persistKbCommentToRemote encrypts the text client-side and never sends plaintext', async () => {
    saveRemoteKbPharmaComment.mockClear()
    await persistKbCommentToRemote({
      id: 'local-not-uuid',
      userId: 'user-x',
      medicationId: 'med-1',
      sectionId: 'section-1',
      text: 'Privater Kommentar mit PHI.',
      createdAt: new Date().toISOString(),
    })

    expect(saveRemoteKbPharmaComment).toHaveBeenCalledTimes(1)
    const payload = saveRemoteKbPharmaComment.mock.calls[0]![0] as Record<string, unknown>
    expect(payload.ciphertext).toBeTypeOf('string')
    expect(payload.iv).toBeTypeOf('string')
    expect(payload.wrappedKey).toBeTypeOf('string')
    expect(payload.payloadVersion).toBe(1)
    expect(payload.text).toBeUndefined()
    expect(String(payload.ciphertext).includes('Privater Kommentar mit PHI.')).toBe(false)
  })

  it('hydrateKbCommentsFromRemote decrypts ciphertext rows from the server', async () => {
    const envelope = await encryptJsonPayload({ text: 'Geheimer Kommentartext.' })
    const remote: RemoteKbPharmaComment = {
      id: '99999999-9999-9999-9999-999999999999',
      medicationId: 'med-2',
      sectionId: 'section-2',
      text: '',
      createdAt: '2026-06-30T10:00:00.000Z',
      updatedAt: '2026-06-30T10:00:00.000Z',
      highlightId: null,
      deleted: false,
      ciphertext: envelope.ciphertext,
      iv: envelope.iv,
      wrappedKey: envelope.wrappedKey,
      payloadVersion: envelope.version,
    }
    fetchRemoteKbPharmaComments.mockResolvedValueOnce([remote])

    const merged = await hydrateKbCommentsFromRemote('user-x', [])
    expect(merged).not.toBeNull()
    const decrypted = merged!.find((c) => c.id === remote.id)
    expect(decrypted?.text).toBe('Geheimer Kommentartext.')
  })

  it('legacy plaintext rows still decrypt as plaintext (back-compat)', async () => {
    const remote: RemoteKbPharmaComment = {
      id: '77777777-7777-7777-7777-777777777777',
      medicationId: 'med-3',
      sectionId: 'section-3',
      text: 'Legacy plaintext comment.',
      createdAt: '2026-06-30T10:00:00.000Z',
      updatedAt: '2026-06-30T10:00:00.000Z',
      highlightId: null,
      deleted: false,
      ciphertext: null,
      iv: null,
      wrappedKey: null,
      payloadVersion: 1,
    }
    fetchRemoteKbPharmaComments.mockResolvedValueOnce([remote])

    const merged = await hydrateKbCommentsFromRemote('user-x', [])
    const decrypted = merged!.find((c) => c.id === remote.id)
    expect(decrypted?.text).toBe('Legacy plaintext comment.')
  })

  it('gracefully handles a ciphertext row that cannot be decrypted', async () => {
    const remote: RemoteKbPharmaComment = {
      id: '88888888-8888-8888-8888-888888888888',
      medicationId: 'med-4',
      sectionId: 'section-4',
      text: '',
      createdAt: '2026-06-30T10:00:00.000Z',
      updatedAt: '2026-06-30T10:00:00.000Z',
      highlightId: null,
      deleted: false,
      ciphertext: 'YmFkLWNpcGhlcg==',
      iv: 'YmFkLWl2',
      wrappedKey: 'YmFkLWtleQ==',
      payloadVersion: 1,
    }
    fetchRemoteKbPharmaComments.mockResolvedValueOnce([remote])

    const merged = await hydrateKbCommentsFromRemote('user-x', [])
    const decrypted = merged!.find((c) => c.id === remote.id)
    expect(decrypted?.text).toBe('')
  })
})
