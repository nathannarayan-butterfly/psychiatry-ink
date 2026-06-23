import { CreditCard, Sparkles } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useCredits } from '../../hooks/useCredits'
import { SettingsField } from './SettingsField'

interface CreditsSettingsSectionProps {
  onOpenCredits: () => void
}

export function CreditsSettingsSection({ onOpenCredits }: CreditsSettingsSectionProps) {
  const { t, language } = useTranslation()
  const { balance, details, loading } = useCredits()
  const locale =
    language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB'

  const monthlyCredits = details?.monthlyCredits ?? 0
  const purchasedCredits = details?.purchasedCredits ?? 0

  return (
    <div className="settings-credits">
      <SettingsField label={t('settingsCreditsBalanceLabel')} description={t('settingsCreditsDescription')}>
        <div className="settings-credits__balance">
          <Sparkles className="settings-credits__balance-icon" strokeWidth={1.5} aria-hidden />
          {loading ? (
            <span className="settings-credits__balance-value">…</span>
          ) : (
            <span className="settings-credits__balance-value">{balance.toLocaleString(locale)}</span>
          )}
          <span className="settings-credits__balance-unit">{t('creditsDashboardCreditsUnit')}</span>
        </div>
      </SettingsField>

      {!loading && (monthlyCredits > 0 || purchasedCredits > 0) ? (
        <SettingsField label={t('settingsCreditsBreakdownLabel')}>
          <div className="settings-credits__breakdown">
            <span>
              {t('creditsDashboardMonthly')}: {monthlyCredits.toLocaleString(locale)}
            </span>
            <span>
              {t('creditsDashboardPurchased')}: {purchasedCredits.toLocaleString(locale)}
            </span>
          </div>
        </SettingsField>
      ) : null}

      <SettingsField label="">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="settings-credits__cta"
            onClick={onOpenCredits}
          >
            <CreditCard className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            {t('creditsPurchaseAdd')}
          </button>
          <button
            type="button"
            className="settings-credits__link"
            onClick={onOpenCredits}
          >
            {t('settingsCreditsOpenDashboard')}
          </button>
        </div>
      </SettingsField>
    </div>
  )
}
