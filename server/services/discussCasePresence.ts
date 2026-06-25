/**
 * Ephemeral typing-presence tracking for DiscussCase chat.
 *
 * Deliberately in-memory and process-local: typing state is transient UI sugar
 * ("X is typing…") with a short TTL, never persisted and never security
 * sensitive. A clinician's typing heartbeat is recorded here and read back by
 * other participants' presence polls. No PHI is stored — only `discussionId`
 * and `userId` plus a timestamp.
 *
 * LIMITATION: because the map lives in a single Node process, typing indicators
 * only propagate between participants served by the same instance. In a
 * multi-instance deployment a shared store (Redis / Supabase Realtime presence)
 * would be required; everything else (messages) already syncs via the DB poll,
 * so this is an intentionally low-risk, easily-replaceable layer.
 */

/** A typing heartbeat is considered live for this long after the last ping. */
export const TYPING_TTL_MS = 6_000

type DiscussionTypingMap = Map<string, number>

const typingByDiscussion = new Map<string, DiscussionTypingMap>()

/** Record that `userId` is currently typing in `discussionId`. */
export function markParticipantTyping(discussionId: string, userId: string, now = Date.now()): void {
  let discussionMap = typingByDiscussion.get(discussionId)
  if (!discussionMap) {
    discussionMap = new Map()
    typingByDiscussion.set(discussionId, discussionMap)
  }
  discussionMap.set(userId, now)
}

/**
 * Return user ids currently typing in `discussionId`, excluding `excludeUserId`
 * (the caller) and any stale entries past the TTL. Expired entries are pruned
 * opportunistically on read so the map cannot grow unbounded.
 */
export function listTypingParticipants(
  discussionId: string,
  excludeUserId?: string,
  now = Date.now(),
): string[] {
  const discussionMap = typingByDiscussion.get(discussionId)
  if (!discussionMap) return []

  const active: string[] = []
  for (const [userId, lastPing] of discussionMap) {
    if (now - lastPing > TYPING_TTL_MS) {
      discussionMap.delete(userId)
      continue
    }
    if (userId !== excludeUserId) active.push(userId)
  }
  if (discussionMap.size === 0) typingByDiscussion.delete(discussionId)
  return active
}

/** Test/maintenance helper to drop all tracked presence. */
export function resetDiscussCasePresence(): void {
  typingByDiscussion.clear()
}
