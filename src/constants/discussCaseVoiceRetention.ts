/**
 * DiscussCase voice attachment retention policy.
 *
 * Voice recordings are clinical collaboration artifacts with a bounded lifetime.
 * Default: 90 days. Override server-side via DISCUSS_CASE_VOICE_RETENTION_DAYS.
 */
export const DISCUSS_CASE_VOICE_RETENTION_DAYS_DEFAULT = 90

export function parseDiscussCaseVoiceRetentionDays(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') {
    return DISCUSS_CASE_VOICE_RETENTION_DAYS_DEFAULT
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DISCUSS_CASE_VOICE_RETENTION_DAYS_DEFAULT
  }
  return parsed
}

/** ISO8601 expiry timestamp for a voice attachment created at `from`. */
export function computeVoiceAttachmentExpiresAt(
  from: Date = new Date(),
  retentionDays: number = DISCUSS_CASE_VOICE_RETENTION_DAYS_DEFAULT,
): string {
  const expires = new Date(from.getTime())
  expires.setUTCDate(expires.getUTCDate() + retentionDays)
  return expires.toISOString()
}

export function isVoiceAttachmentExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= Date.now()
}

/** Resolve expiry for stored attachment (explicit expiresAt or legacy created_at + retention). */
export function resolveVoiceAttachmentExpiresAt(
  voiceAttachment: { expiresAt?: string } | null | undefined,
  createdAt: string,
  retentionDays: number = DISCUSS_CASE_VOICE_RETENTION_DAYS_DEFAULT,
): string {
  if (voiceAttachment?.expiresAt) return voiceAttachment.expiresAt
  return computeVoiceAttachmentExpiresAt(new Date(createdAt), retentionDays)
}
