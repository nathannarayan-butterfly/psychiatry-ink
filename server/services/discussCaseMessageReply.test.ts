import { describe, expect, it } from 'vitest'
import type { DiscussCaseMessage } from '../../src/types/discussCase'
import {
  buildReplyPreview,
  REPLY_PREVIEW_MAX_LENGTH,
  truncateReplySnippet,
} from '../../src/utils/discussCase/messageReply'

function sampleMessage(overrides: Partial<DiscussCaseMessage> = {}): DiscussCaseMessage {
  return {
    id: 'msg-1',
    discussionId: 'disc-1',
    authorUserId: 'user-abc12345',
    authorDisplayName: 'Dr. Schmidt',
    body: 'Hello team',
    messageKind: 'text',
    voiceAttachment: null,
    transcript: null,
    quoteExcerpt: null,
    replyToMessageId: null,
    replyPreview: null,
    reactions: [],
    pinned: false,
    pinnedAt: null,
    pinnedBy: null,
    createdAt: '2026-06-01T12:00:00.000Z',
    editedAt: null,
    ...overrides,
  }
}

describe('truncateReplySnippet', () => {
  it('returns short text unchanged', () => {
    expect(truncateReplySnippet('Hi')).toBe('Hi')
  })

  it('truncates long text with ellipsis', () => {
    const long = 'a'.repeat(REPLY_PREVIEW_MAX_LENGTH + 10)
    const result = truncateReplySnippet(long)
    expect(result.length).toBeLessThanOrEqual(REPLY_PREVIEW_MAX_LENGTH)
    expect(result.endsWith('…')).toBe(true)
  })
})

describe('buildReplyPreview', () => {
  it('snapshots text message body and sender', () => {
    const preview = buildReplyPreview(sampleMessage({ body: '  Needs review  ' }))
    expect(preview).toEqual({
      senderDisplayName: 'Dr. Schmidt',
      bodySnippet: 'Needs review',
      messageKind: 'text',
    })
  })

  it('uses author user id prefix when display name missing', () => {
    const preview = buildReplyPreview(
      sampleMessage({ authorDisplayName: null, authorUserId: 'user-xyz98765' }),
    )
    expect(preview.senderDisplayName).toBe('user-xyz')
  })

  it('marks voice messages with empty snippet', () => {
    const preview = buildReplyPreview(
      sampleMessage({ messageKind: 'voice', body: '', voiceAttachment: null }),
    )
    expect(preview).toEqual({
      senderDisplayName: 'Dr. Schmidt',
      bodySnippet: '',
      messageKind: 'voice',
    })
  })

  it('falls back to document quote excerpt when body empty', () => {
    const preview = buildReplyPreview(
      sampleMessage({
        body: '',
        quoteExcerpt: {
          sectionId: 's1',
          sectionLabel: 'Diagnose',
          text: 'F32.1 Major depression',
        },
      }),
    )
    expect(preview.bodySnippet).toBe('F32.1 Major depression')
    expect(preview.messageKind).toBe('text')
  })
})
