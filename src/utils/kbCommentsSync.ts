import {
  deleteRemoteKbPharmaComment,
  fetchRemoteKbPharmaComments,
  saveRemoteKbPharmaComment,
  type RemoteKbPharmaComment,
} from '../services/userNotesApi'
import {
  decryptJsonPayload,
  encryptJsonPayload,
  hasLocalKeyMaterial,
} from './cryptoVault'
import type { UserComment } from '../types/knowledgeBaseAnnotations'

interface KbCommentCiphertextPayload {
  text: string
}

async function decryptRemoteComment(remote: RemoteKbPharmaComment): Promise<string> {
  if (!remote.ciphertext || !remote.iv || !remote.wrappedKey) return remote.text
  try {
    const payload = await decryptJsonPayload<KbCommentCiphertextPayload>({
      version: remote.payloadVersion,
      ciphertext: remote.ciphertext,
      iv: remote.iv,
      wrappedKey: remote.wrappedKey,
    })
    return typeof payload.text === 'string' ? payload.text : ''
  } catch (error) {
    console.warn('[kb-pharma-comments] decrypt failed for', remote.id, error)
    return ''
  }
}

async function buildCommentPayload(
  text: string,
): Promise<{ text?: string; ciphertext?: string; iv?: string; wrappedKey?: string; payloadVersion?: number }> {
  if (!(await hasLocalKeyMaterial())) {
    return { text }
  }
  const blob = await encryptJsonPayload<KbCommentCiphertextPayload>({ text })
  return {
    ciphertext: blob.ciphertext,
    iv: blob.iv,
    wrappedKey: blob.wrappedKey,
    payloadVersion: blob.version,
  }
}

/**
 * One-time push flag for "local KB comments → DB" backfill, scoped per-user so
 * a previous user's flag cannot suppress a new user's backfill on the same
 * browser. The cross-user purge in {@link reconcileActiveUser} already drops
 * this key on a DIFFERENT user sign-in; the per-user scoping is defense in
 * depth.
 */
const SYNCED_FLAG_BASE = 'psychiatry-ink:kb-comments-db-synced'

function syncedFlagKey(userId: string): string {
  return `${SYNCED_FLAG_BASE}:${userId}`
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

async function remoteToComment(
  remote: RemoteKbPharmaComment,
  userId: string,
): Promise<UserComment> {
  return {
    id: remote.id,
    userId,
    medicationId: remote.medicationId,
    sectionId: remote.sectionId,
    text: await decryptRemoteComment(remote),
    createdAt: remote.createdAt,
    highlightId: remote.highlightId ?? undefined,
  }
}

export async function hydrateKbCommentsFromRemote(
  userId: string,
  localComments: UserComment[],
): Promise<UserComment[] | null> {
  if (!userId) return null
  const remote = await fetchRemoteKbPharmaComments()
  if (!remote) return null

  const flagKey = syncedFlagKey(userId)
  const alreadySynced = localStorage.getItem(flagKey) === '1'
  if (!alreadySynced) {
    for (const comment of localComments) {
      if (comment.userId !== userId) continue
      if (isUuid(comment.id) && remote.some((r) => r.id === comment.id)) continue
      const payload = await buildCommentPayload(comment.text)
      await saveRemoteKbPharmaComment({
        medicationId: comment.medicationId,
        sectionId: comment.sectionId,
        ...payload,
        highlightId: comment.highlightId ?? null,
      })
    }
    try {
      localStorage.setItem(flagKey, '1')
    } catch {
      // ignore
    }
  }

  const remoteComments = await Promise.all(
    remote.filter((r) => !r.deleted).map((r) => remoteToComment(r, userId)),
  )
  const remoteIds = new Set(remoteComments.map((c) => c.id))
  const preservedLocal = localComments.filter(
    (c) => c.userId === userId && !isUuid(c.id) && !remoteIds.has(c.id),
  )
  const otherUsers = localComments.filter((c) => c.userId !== userId)
  return [...otherUsers, ...preservedLocal, ...remoteComments]
}

export async function persistKbCommentToRemote(comment: UserComment): Promise<string> {
  const payload = await buildCommentPayload(comment.text)
  const saved = await saveRemoteKbPharmaComment({
    id: isUuid(comment.id) ? comment.id : undefined,
    medicationId: comment.medicationId,
    sectionId: comment.sectionId,
    ...payload,
    highlightId: comment.highlightId ?? null,
  })
  return saved?.id ?? comment.id
}

export async function deleteKbCommentRemote(id: string): Promise<void> {
  if (isUuid(id)) await deleteRemoteKbPharmaComment(id)
}
