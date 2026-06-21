import { useAiCreditsHinweiseContent } from '../../hooks/useHomepageContent'
import { useTranslation } from '../../context/TranslationContext'
import { BuyCreditsButton } from '../credits/BuyCreditsButton'
import { HomepageFooter } from './HomepageFooter'
import { HomepageNav } from './HomepageNav'

export interface AiCreditsHinweisePageProps {
  onLogin: () => void
  onNavigate: (path: string) => void
  isAuthenticated: boolean
  showDevEntry?: boolean
  onEnterApp?: () => void
}

export function AiCreditsHinweisePage({
  onLogin,
  onNavigate,
  isAuthenticated,
  showDevEntry,
  onEnterApp,
}: AiCreditsHinweisePageProps) {
  const content = useAiCreditsHinweiseContent()
  const { t } = useTranslation()

  const openBuyCredits = () => {
    if (isAuthenticated) {
      onNavigate('/settings/ai-credits')
      return
    }
    onNavigate(`/login?redirect=${encodeURIComponent('/settings/ai-credits')}`)
  }

  const openWorkspace = () => {
    if (isAuthenticated) {
      onNavigate('/dashboard')
      return
    }
    if (showDevEntry && onEnterApp) {
      onEnterApp()
      return
    }
    onNavigate('/login?redirect=/dashboard')
  }

  return (
    <div className="hp-page">
      <HomepageNav onOpenWorkspace={openWorkspace} />

      <main className="hp-hinweise">
        <div className="hp-container">
          <a href={content.nav.backHref} className="hp-hinweise__back">
            ← {content.nav.backLabel}
          </a>

          <header className="hp-hinweise__header">
            <p className="hp-eyebrow">{content.meta.subtitle}</p>
            <h1 className="hp-hinweise__title">{content.meta.title}</h1>
          </header>

          <section className="hp-hinweise__section" aria-labelledby="hp-hinweise-warnings">
            <h2 id="hp-hinweise-warnings" className="hp-hinweise__section-title">
              {content.warnings.title}
            </h2>
            <ul className="hp-hinweise__warnings">
              {content.warnings.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="hp-hinweise__section" aria-labelledby="hp-hinweise-actions">
            <h2 id="hp-hinweise-actions" className="hp-hinweise__section-title">
              {content.actionTable.title}
            </h2>
            <p className="hp-hinweise__section-lead">{content.actionTable.subtitle}</p>
            <div className="hp-hinweise__table-wrap">
              <table className="hp-hinweise__table">
                <thead>
                  <tr>
                    {content.actionTable.columns.map((col) => (
                      <th key={col} scope="col">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {content.actionTable.rows.map((row) => (
                    <tr key={row.action}>
                      <th scope="row">{row.action}</th>
                      <td>{row.economic}</td>
                      <td>{row.standard}</td>
                      <td>{row.gruendlich}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section
            className="hp-hinweise__buy"
            aria-labelledby="hp-hinweise-buy-title"
          >
            <div>
              <p id="hp-hinweise-buy-title" className="hp-hinweise__buy-title">
                {t('aiCreditsHinweiseBuySection')}
              </p>
              <p className="hp-hinweise__buy-lead">{t('aiCreditsHinweiseBuyLead')}</p>
            </div>
            <BuyCreditsButton
              variant="primary"
              size="md"
              source="hinweise-page"
              onOpenSettings={openBuyCredits}
            />
          </section>

          <section className="hp-hinweise__section" aria-labelledby="hp-hinweise-capacity">
            <h2 id="hp-hinweise-capacity" className="hp-hinweise__section-title">
              {content.capacityTable.title}
            </h2>
            <p className="hp-hinweise__section-lead">{content.capacityTable.subtitle}</p>
            <div className="hp-hinweise__table-wrap">
              <table className="hp-hinweise__table hp-hinweise__table--two-col">
                <thead>
                  <tr>
                    {content.capacityTable.columns.map((col) => (
                      <th key={col} scope="col">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {content.capacityTable.rows.map((row) => (
                    <tr key={row.pattern}>
                      <th scope="row">{row.pattern}</th>
                      <td>{row.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <HomepageFooter onLogin={onLogin} />
    </div>
  )
}
