import { describe, expect, it } from 'vitest'
import {
  computeVoiceAttachmentExpiresAt,
  DISCUSS_CASE_VOICE_RETENTION_DAYS_DEFAULT,
  isVoiceAttachmentExpired,
  parseDiscussCaseVoiceRetentionDays,
  resolveVoiceAttachmentExpiresAt,
} from '../../src/constants/discussCaseVoiceRetention'

describe('discussCaseVoiceRetention constants', () => {
  it('defaults to 90 days', () => {
    expect(DISCUSS_CASE_VOICE_RETENTION_DAYS_DEFAULT).toBe(90)
    expect(parseDiscussCaseVoiceRetentionDays(undefined)).toBe(90)
  })

  it('parses env override', () => {
    expect(parseDiscussCaseVoiceRetentionDays('120')).toBe(120)
    expect(parseDiscussCaseVoiceRetentionDays('0')).toBe(90)
    expect(parseDiscussCaseVoiceRetentionDays('abc')).toBe(90)
  })

  it('computes expiresAt from created date and retention days', () => {
    const from = new Date('2026-01-01T12:00:00.000Z')
    const expiresAt = computeVoiceAttachmentExpiresAt(from, 90)
    expect(expiresAt).toBe('2026-04-01T12:00:00.000Z')
  })

  it('resolves legacy attachments from created_at', () => {
    const createdAt = '2026-01-01T12:00:00.000Z'
    const expiresAt = resolveVoiceAttachmentExpiresAt(null, createdAt, 30)
    expect(expiresAt).toBe('2026-01-31T12:00:00.000Z')
  })

  it('detects expired attachments', () => {
    expect(isVoiceAttachmentExpired('2000-01-01T00:00:00.000Z')).toBe(true)
    expect(isVoiceAttachmentExpired('2099-01-01T00:00:00.000Z')).toBe(false)
    expect(isVoiceAttachmentExpired(null)).toBe(false)
  })
})
