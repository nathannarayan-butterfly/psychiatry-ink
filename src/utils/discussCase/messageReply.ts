import type {
  DiscussCaseMessage,
  DiscussCaseMessageKind,
  DiscussCaseReplyPreview,
} from '../../types/discussCase'

export const REPLY_PREVIEW_MAX_LENGTH = 120

/** Truncate text for the reply quote snippet shown in chat bubbles. */
export function truncateReplySnippet(text: string, maxLength = REPLY_PREVIEW_MAX_LENGTH): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`
}

function resolveSenderDisplayName(message: DiscussCaseMessage): string {
  return message.authorDisplayName?.trim() || message.authorUserId.slice(0, 8)
}

function resolveBodyText(message: DiscussCaseMessage): string {
  const body = message.body.trim()
  if (body) return body
  const quoteText = message.quoteExcerpt?.text?.trim()
  return quoteText ?? ''
}

/**
 * Build a denormalized reply preview snapshot from a target message.
 * Voice messages use an empty bodySnippet; clients show a voice indicator via messageKind.
 */
export function buildReplyPreview(message: DiscussCaseMessage): DiscussCaseReplyPreview {
  const messageKind: DiscussCaseMessageKind = message.messageKind ?? 'text'
  const senderDisplayName = resolveSenderDisplayName(message)

  if (messageKind === 'voice') {
    return {
      senderDisplayName,
      bodySnippet: '',
      messageKind: 'voice',
    }
  }

  return {
    senderDisplayName,
    bodySnippet: truncateReplySnippet(resolveBodyText(message)),
    messageKind: 'text',
  }
}

export function discussCaseMessageDomId(messageId: string): string {
  return `discuss-case-msg-${messageId}`
}
