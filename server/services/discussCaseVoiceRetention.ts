import {
  parseDiscussCaseVoiceRetentionDays,
  resolveVoiceAttachmentExpiresAt,
} from '../../src/constants/discussCaseVoiceRetention'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'
import { deleteDiscussVoiceMessage } from './discussCaseVoiceStorage'

export {
  computeVoiceAttachmentExpiresAt,
  isVoiceAttachmentExpired,
  resolveVoiceAttachmentExpiresAt,
} from '../../src/constants/discussCaseVoiceRetention'

/** Resolved retention period in days (env override or default). */
export function resolveDiscussCaseVoiceRetentionDays(): number {
  const raw = process.env.DISCUSS_CASE_VOICE_RETENTION_DAYS
  const days = parseDiscussCaseVoiceRetentionDays(raw)
  if (raw !== undefined && raw.trim() !== '') {
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed < 1) {
      console.warn(
        `[discuss-case] Invalid DISCUSS_CASE_VOICE_RETENTION_DAYS="${raw}", using default ${days}`,
      )
    }
  }
  return days
}

interface VoiceMessageRow {
  id: string
  discussion_id: string
  created_at: string
  voice_attachment: { storagePath?: string; expiresAt?: string } | null
}

function isRowExpired(row: VoiceMessageRow, nowMs: number, retentionDays: number): boolean {
  const expiresAt = resolveVoiceAttachmentExpiresAt(row.voice_attachment, row.created_at, retentionDays)
  return new Date(expiresAt).getTime() <= nowMs
}

/**
 * Delete expired voice messages and their storage blobs.
 * Runs on message list load (scoped) and via `npm run discuss-case:purge-voice` (global).
 */
export async function purgeExpiredDiscussVoiceMessages(input?: {
  discussionId?: string
  dryRun?: boolean
}): Promise<{ purged: number }> {
  const supabase = getKbSupabaseAdmin()
  const retentionDays = resolveDiscussCaseVoiceRetentionDays()
  let query = supabase
    .from('dc_messages')
    .select('id, discussion_id, created_at, voice_attachment')
    .eq('message_kind', 'voice')

  if (input?.discussionId) {
    query = query.eq('discussion_id', input.discussionId)
  }

  const { data, error } = await query
  if (error) throw error

  const nowMs = Date.now()
  const expired = (data ?? []).filter((row) =>
    isRowExpired(row as VoiceMessageRow, nowMs, retentionDays),
  ) as VoiceMessageRow[]

  if (!input?.dryRun) {
    for (const row of expired) {
      const storagePath = row.voice_attachment?.storagePath
      if (storagePath) {
        await deleteDiscussVoiceMessage(storagePath).catch(() => undefined)
      }

      const { error: deleteError } = await supabase.from('dc_messages').delete().eq('id', row.id)
      if (deleteError) throw deleteError

      await supabase
        .from('dc_audit_logs')
        .insert({
          discussion_id: row.discussion_id,
          actor_user_id: null,
          action: 'voice_message_expired',
          details: { messageId: row.id },
        })
        .then(({ error: auditError }) => {
          if (auditError) console.warn('[discuss-case] voice expiry audit log failed:', auditError)
        })
    }
  }

  return { purged: expired.length }
}
