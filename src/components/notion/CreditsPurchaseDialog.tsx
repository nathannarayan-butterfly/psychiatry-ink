import { X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

interface CreditsPurchaseDialogProps {
  onClose: () => void
}

export function CreditsPurchaseDialog({ onClose }: CreditsPurchaseDialogProps) {
  const { t } = useTranslation()

  return (
    <div
      className="credits-purchase-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="credits-purchase-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-purchase-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="credits-purchase-dialog__header">
          <h2 id="credits-purchase-title" className="credits-purchase-dialog__title">
            {t('creditsPurchaseTitle')}
          </h2>
          <button
            type="button"
            className="credits-purchase-dialog__close"
            onClick={onClose}
            aria-label={t('settingsClose')}
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        <p className="credits-purchase-dialog__body">{t('creditsPurchaseBody')}</p>

        <button type="button" className="credits-purchase-dialog__action" onClick={onClose}>
          {t('creditsPurchaseAdd')}
        </button>
      </div>
    </div>
  )
}
