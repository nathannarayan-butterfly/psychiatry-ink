import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { EncryptionDisclaimer } from '../EncryptionDisclaimer'

const localPatientDataHintKeys = [
  'dashboardHintLocalIdentifiers',
  'dashboardHintLocalCrypto',
  'dashboardHintLocalZeroKnowledge',
  'dashboardHintLocalPassphrase',
  'dashboardHintLocalNoRecovery',
] as const satisfies readonly UiTranslationKey[]

export function DashboardHinweise() {
  const { t } = useTranslation()

  return (
    <section className="dashboard-hinweise" aria-labelledby="dashboard-hinweise-title">
      <h2 id="dashboard-hinweise-title" className="dashboard-hinweise__title">
        {t('dashboardHinweiseTitle')}
      </h2>

      <EncryptionDisclaimer section="dashboard" bodyVariant="list" />

      <article className="dashboard-hinweis-block">
        <h3 className="dashboard-hinweis-block__title">{t('dashboardHintPseudonymTitle')}</h3>
        <p className="dashboard-hinweis-block__body">{t('dashboardHintPseudonymBody')}</p>
      </article>

      <article className="dashboard-hinweis-block">
        <h3 className="dashboard-hinweis-block__title">{t('dashboardHintLocalDataTitle')}</h3>
        <ul className="dashboard-hinweis-block__list">
          {localPatientDataHintKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </article>
    </section>
  )
}
