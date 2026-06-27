import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { ContentCategory } from '../../utils/pasteContentDetector'
import type { UiTranslationKey } from '../../data/uiTranslations'

const CATEGORY_LABEL_KEY: Record<ContentCategory, UiTranslationKey> = {
  aufnahme: 'pasteDetectedCategoryAufnahme',
  verlauf: 'pasteDetectedCategoryVerlauf',
  labor: 'pasteDetectedCategoryLabor',
  medikation: 'pasteDetectedCategoryMedikation',
  note: 'pasteDetectedCategoryNote',
}

const ALL_CATEGORIES: ContentCategory[] = [
  'aufnahme',
  'verlauf',
  'labor',
  'medikation',
  'note',
]

const AUTO_DISMISS_MS = 5000

interface PasteDetectionChipProps {
  category: ContentCategory
  onChangeCategory: (category: ContentCategory) => void
  onDismiss: () => void
}

export function PasteDetectionChip({
  category,
  onChangeCategory,
  onDismiss,
}: PasteDetectionChipProps) {
  const { t } = useTranslation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chipRef = useRef<HTMLDivElement>(null)

  const resetDismissTimer = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    dismissTimerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS)
  }

  useEffect(() => {
    resetDismissTimer()
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (event: MouseEvent) => {
      if (chipRef.current && !chipRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const label = t('pasteDetectedAs').replace(
    '{category}',
    t(CATEGORY_LABEL_KEY[category]),
  )

  const handleChangeClick = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    setDropdownOpen((open) => !open)
  }

  const handleSelectCategory = (cat: ContentCategory) => {
    setDropdownOpen(false)
    onChangeCategory(cat)
  }

  return (
    <div
      ref={chipRef}
      className="paste-detection-chip"
      onMouseEnter={() => {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
      }}
      onMouseLeave={resetDismissTimer}
    >
      <span className="paste-detection-chip__label">{label}</span>
      <span className="paste-detection-chip__sep" aria-hidden>·</span>
      <div className="paste-detection-chip__change-wrapper">
        <button
          type="button"
          className="paste-detection-chip__btn"
          onClick={handleChangeClick}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
        >
          {t('pasteDetectedChange')}
        </button>
        {dropdownOpen && (
          <ul
            className="paste-detection-chip__dropdown"
            role="listbox"
            aria-label={t('pasteDetectedChange')}
          >
            {ALL_CATEGORIES.map((cat) => (
              <li key={cat} role="option" aria-selected={cat === category}>
                <button
                  type="button"
                  className={`paste-detection-chip__dropdown-item${cat === category ? ' paste-detection-chip__dropdown-item--active' : ''}`}
                  onClick={() => handleSelectCategory(cat)}
                >
                  {t(CATEGORY_LABEL_KEY[cat])}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        className="paste-detection-chip__dismiss"
        onClick={onDismiss}
        aria-label={t('pasteDetectionDismiss')}
      >
        <X className="h-3 w-3" strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}
