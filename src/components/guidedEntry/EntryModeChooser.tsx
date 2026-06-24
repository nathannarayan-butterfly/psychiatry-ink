import { PenLine, Sparkles } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { GuidedEntryItemType, GuidedEntryMode } from '../../types/guidedEntry'

interface EntryModeChooserProps {
  open: boolean
  itemType: GuidedEntryItemType
  onChoose: (mode: GuidedEntryMode) => void
  onCancel: () => void
}

export function EntryModeChooser({ open, itemType: _itemType, onChoose, onCancel }: EntryModeChooserProps) {
  const { t } = useTranslation()

  if (!open) return null

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="ge-modal ge-modal--chooser" onClick={(e) => e.stopPropagation()}>
        <header className="ge-modal__header">
          <div>
            <h2 className="ge-modal__title">{t('guidedEntryModeTitle')}</h2>
            <p className="ge-modal__desc">{t('guidedEntryModeDesc')}</p>
          </div>
        </header>

        <div className="ge-chooser-grid">
          <button type="button" className="ge-chooser-card" onClick={() => onChoose('direct')}>
            <PenLine className="ge-chooser-card__icon h-6 w-6" strokeWidth={1.75} aria-hidden />
            <span className="ge-chooser-card__title">{t('guidedEntryModeDirect')}</span>
            <span className="ge-chooser-card__desc">{t('guidedEntryModeDirectDesc')}</span>
          </button>
          <button type="button" className="ge-chooser-card ge-chooser-card--guided" onClick={() => onChoose('guided')}>
            <Sparkles className="ge-chooser-card__icon h-6 w-6" strokeWidth={1.75} aria-hidden />
            <span className="ge-chooser-card__title">{t('guidedEntryModeGuided')}</span>
            <span className="ge-chooser-card__desc">{t('guidedEntryModeGuidedDesc')}</span>
          </button>
        </div>

        <footer className="ge-modal__footer ge-modal__footer--chooser">
          <button type="button" className="ge-btn ge-btn--ghost" onClick={onCancel}>
            {t('guidedEntryCancel')}
          </button>
        </footer>
      </div>
    </div>
  )
}
