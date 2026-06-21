import { X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { PLAN_DEFINITIONS } from '../../data/subscriptionPlans'
import { BuyCreditsButton } from '../credits/BuyCreditsButton'

interface CreditsPurchaseDialogProps {
  onClose: () => void
  onUpgrade?: () => void
  creditsExhausted?: boolean
}

export function CreditsPurchaseDialog({
  onClose,
  onUpgrade,
  creditsExhausted = false,
}: CreditsPurchaseDialogProps) {
  const { t } = useTranslation()
  const pro = PLAN_DEFINITIONS.pro

  const openBuyCredits = () => {
    onClose()
    if (typeof window !== 'undefined') {
      window.location.assign('/settings/ai-credits')
    }
  }

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
            {creditsExhausted ? t('creditsExhaustedHint') : t('creditsPurchaseTitle')}
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

        <p className="credits-purchase-dialog__body">
          {creditsExhausted
            ? `${t('creditsPurchaseBody')} Pro: ${pro.priceEurMonthly} €/Monat, ${pro.monthlyCredits} Credits.`
            : t('creditsPurchaseBody')}
        </p>

        <BuyCreditsButton
          variant="primary"
          size="md"
          fullWidth
          source="sidebar-credits-dialog"
          onOpenSettings={openBuyCredits}
        />

        {onUpgrade ? (
          <button
            type="button"
            className="credits-purchase-dialog__action credits-purchase-dialog__action--ghost"
            onClick={onUpgrade}
          >
            {t('creditsUpgradeCta')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
