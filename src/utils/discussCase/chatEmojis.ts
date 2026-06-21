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
