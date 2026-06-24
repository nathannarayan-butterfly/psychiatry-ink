import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'

export interface AufnahmeBefundShortModalProps {
  open: boolean
  sectionId: string
  initialText: string
  onClose: () => void
  onSave: (text: string) => void
  onAiGenerate?: () => void
}

export function AufnahmeBefundShortModal({
  open,
  sectionId,
  initialText,
  onClose,
  onSave,
  onAiGenerate,
}: AufnahmeBefundShortModalProps) {
  const { t } = useTranslation()
  const [text, setText] = useState(initialText)

  useEffect(() => {
    if (open) setText(initialText)
  }, [initialText, open])

  if (!open) return null

  const titleKey =
    sectionId === 'neurologischer-befund'
      ? 'aufnahmeBefundNeuroShortTitle'
      : 'aufnahmeBefundSomaticShortTitle'

  return (
    <div className="aufnahme-befund-overlay" role="presentation" onClick={onClose}>
      <div
        className="aufnahme-befund-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aufnahme-befund-short-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="aufnahme-befund-modal__header">
          <div>
            <h2 id="aufnahme-befund-short-title" className="aufnahme-befund-modal__title">
              {t(titleKey)}
            </h2>
            <p className="aufnahme-befund-modal__desc">{t('aufnahmeBefundShortDesc')}</p>
          </div>
          <button type="button" className="aufnahme-befund-modal__close" onClick={onClose} aria-label={t('guidedEntryCancel')}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="aufnahme-befund-modal__body">
          <textarea
            className="aufnahme-befund-modal__textarea"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            spellCheck
          />
        </div>
        <footer className="aufnahme-befund-modal__footer">
          <button type="button" className="aufnahme-befund-btn aufnahme-befund-btn--ghost" onClick={onClose}>
            {t('guidedEntryCancel')}
          </button>
          {onAiGenerate ? (
            <button type="button" className="aufnahme-befund-btn aufnahme-befund-btn--ghost" onClick={onAiGenerate}>
              {t('aufnahmeBefundShortAiGenerate')}
            </button>
          ) : null}
          <button
            type="button"
            className="aufnahme-befund-btn aufnahme-befund-btn--primary"
            onClick={() => onSave(text.trim())}
            disabled={!text.trim()}
          >
            {t('aufnahmeBefundShortSave')}
          </button>
        </footer>
      </div>
    </div>
  )
}
