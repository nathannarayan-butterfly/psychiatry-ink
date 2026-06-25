/** Quick reaction bar — WhatsApp/Telegram-style common reactions (visible without picker). */
export const DISCUSS_REACTION_EMOJIS = [
  '👍',
  '👎',
  '❤️',
  '😂',
  '😮',
  '😢',
  '🙏',
  '🔥',
  '👏',
  '🤔',
  '✅',
  '❤️‍🔥',
] as const

/** Common emojis for the composer picker — clinical-friendly, no heavy dependency. */
export const DISCUSS_COMPOSER_EMOJIS = [
  '😊',
  '🙂',
  '🙏',
  '👍',
  '👏',
  '✅',
  '❤️',
  '💡',
  '🤔',
  '😅',
  '😮',
  '😢',
  '🎉',
  '⭐',
  '📝',
  '🔍',
  '⚠️',
  '💬',
  '🏥',
  '🧠',
  '💊',
  '📋',
  '⏰',
  '🤝',
] as const

export function isEmojiCharacter(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 8) return false
  return /\p{Extended_Pictographic}/u.test(trimmed)
}

const EMOJI_GRAPHEME_RE = /\p{Extended_Pictographic}/u

/** True when the message body is only emoji (optional whitespace) — no letters/numbers. */
export function isEmojiOnlyMessage(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    let hasEmoji = false
    for (const { segment } of segmenter.segment(trimmed)) {
      if (/^\s+$/u.test(segment)) continue
      if (!EMOJI_GRAPHEME_RE.test(segment)) return false
      hasEmoji = true
    }
    return hasEmoji
  }

  const withoutEmoji = trimmed.replace(
    /[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D\s]/gu,
    '',
  )
  return withoutEmoji.length === 0 && EMOJI_GRAPHEME_RE.test(trimmed)
}
