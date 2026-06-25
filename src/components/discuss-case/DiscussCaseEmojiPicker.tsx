import { useEffect, useRef } from 'react'
import {
  DISCUSS_COMPOSER_EMOJIS,
  DISCUSS_REACTION_EMOJIS,
} from '../../utils/discussCase/chatEmojis'

const PICKER_I18N = {
  de: { label: 'Emoji auswählen' },
  en: { label: 'Choose emoji' },
} as const

type PickerLocale = keyof typeof PICKER_I18N

interface DiscussCaseEmojiPickerProps {
  locale?: PickerLocale
  mode?: 'composer' | 'reaction'
  onSelect: (emoji: string) => void
  onClose: () => void
  align?: 'left' | 'right'
}

export function DiscussCaseEmojiPicker({
  locale = 'de',
  mode = 'composer',
  onSelect,
  onClose,
  align = 'left',
}: DiscussCaseEmojiPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const emojis = mode === 'reaction' ? DISCUSS_REACTION_EMOJIS : DISCUSS_COMPOSER_EMOJIS
  const t = PICKER_I18N[locale]

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return
      onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      ref={panelRef}
      className={[
        'discuss-case-emoji-picker',
        align === 'right' ? 'discuss-case-emoji-picker--align-right' : '',
      ].join(' ').trim()}
      role="dialog"
      aria-label={t.label}
    >
      <div className="discuss-case-emoji-picker__grid" role="listbox">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="discuss-case-emoji-picker__item"
            role="option"
            aria-label={emoji}
            onClick={() => {
              onSelect(emoji)
              onClose()
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
