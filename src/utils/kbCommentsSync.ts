import {
  deleteRemoteKbPharmaComment,
  fetchRemoteKbPharmaComments,
  saveRemoteKbPharmaComment,
  type RemoteKbPharmaComment,
} from '../services/userNotesApi'
import type { UserComment } from '../types/knowledgeBaseAnnotations'

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

function remoteToComment(remote: RemoteKbPharmaComment, userId: string): UserComment {
  return {
    id: remote.id,
    userId,
    medicationId: remote.medicationId,
    sectionId: remote.sectionId,
    text: remote.text,
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
      await saveRemoteKbPharmaComment({
        medicationId: comment.medicationId,
        sectionId: comment.sectionId,
        text: comment.text,
        highlightId: comment.highlightId ?? null,
      })
    }
    try {
      localStorage.setItem(flagKey, '1')
    } catch {
      // ignore
    }
  }

  const remoteComments = remote.filter((r) => !r.deleted).map((r) => remoteToComment(r, userId))
  const remoteIds = new Set(remoteComments.map((c) => c.id))
  const preservedLocal = localComments.filter(
    (c) => c.userId === userId && !isUuid(c.id) && !remoteIds.has(c.id),
  )
  const otherUsers = localComments.filter((c) => c.userId !== userId)
  return [...otherUsers, ...preservedLocal, ...remoteComments]
}

export async function persistKbCommentToRemote(comment: UserComment): Promise<string> {
  const saved = await saveRemoteKbPharmaComment({
    id: isUuid(comment.id) ? comment.id : undefined,
    medicationId: comment.medicationId,
    sectionId: comment.sectionId,
    text: comment.text,
    highlightId: comment.highlightId ?? null,
  })
  return saved?.id ?? comment.id
}

export async function deleteKbCommentRemote(id: string): Promise<void> {
  if (isUuid(id)) await deleteRemoteKbPharmaComment(id)
}
