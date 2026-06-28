import { X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { PLAN_DEFINITIONS, formatPlanMonthlyPrice } from '../../data/subscriptionPlans'

interface CreditsPurchaseDialogProps {
  onClose: () => void
  onUpgrade?: () => void
  onOpenCreditsPage?: () => void
  creditsExhausted?: boolean
}

export function CreditsPurchaseDialog({
  onClose,
  onUpgrade,
  onOpenCreditsPage,
  creditsExhausted = false,
}: CreditsPurchaseDialogProps) {
  const { t, language } = useTranslation()
  const pro = PLAN_DEFINITIONS.pro

  const openCreditsPage = () => {
    if (onOpenCreditsPage) {
      onOpenCreditsPage()
      onClose()
      return
    }
    window.location.href = '/dashboard/credits'
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
            ? `${t('creditsPurchaseBodyActive')} Pro: ${formatPlanMonthlyPrice(pro, language)}/Monat, ${pro.monthlyCredits} Credits.`
            : t('creditsPurchaseBodyActive')}
        </p>

        {onUpgrade ? (
          <button type="button" className="credits-purchase-dialog__action" onClick={onUpgrade}>
            {t('creditsUpgradeCta')}
          </button>
        ) : (
          <button type="button" className="credits-purchase-dialog__action" onClick={openCreditsPage}>
            {t('creditsPurchaseAdd')}
          </button>
        )}
      </div>
    </div>
  )
}
