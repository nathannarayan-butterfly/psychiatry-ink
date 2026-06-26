import type { HomepageContent } from '../../data/homepage'
import { localizedPath, type PublicLocale } from '../publicRoutes'
import { PublicLink, type PublicNavContext } from '../components/PublicLink'

interface FeaturesPageProps extends PublicNavContext {
  content: HomepageContent
  locale: PublicLocale
}

export function FeaturesPage({ content, locale, onNavigate }: FeaturesPageProps) {
  const { pillars, workflow, modules, finalCta } = content
  const loginPath = localizedPath('login', locale)

  return (
    <>
      <section className="hp-section ps-page-hero" aria-labelledby="ps-features-title">
        <header className="hp-section__header">
          <p className="hp-eyebrow">{pillars.eyebrow}</p>
          <h1 id="ps-features-title" className="hp-section__title">
            {pillars.title}
          </h1>
          <p className="hp-section__lead">{pillars.lead}</p>
        </header>
        <div className="hp-grid hp-grid--3">
          {pillars.cards.map((card) => (
            <article key={card.id} className="hp-card">
              <h2 className="hp-card__title">{card.title}</h2>
              <p className="hp-card__body">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="hp-section hp-section--muted" aria-labelledby="ps-features-workflow">
        <header className="hp-section__header">
          <p className="hp-eyebrow">{workflow.eyebrow}</p>
          <h2 id="ps-features-workflow" className="hp-section__title">
            {workflow.title}
          </h2>
          <p className="hp-section__lead">{workflow.lead}</p>
        </header>
        <ol className="hp-workflow">
          {workflow.steps.map((step, index) => (
            <li key={step.id} className="hp-workflow-step">
              <span className="hp-workflow-step__index" aria-hidden>
                {index + 1}
              </span>
              <div className="hp-workflow-step__content">
                <h3 className="hp-workflow-step__title">{step.title}</h3>
                <p className="hp-workflow-step__body">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="hp-section" aria-labelledby="ps-features-modules">
        <header className="hp-section__header">
          <p className="hp-eyebrow">{modules.eyebrow}</p>
          <h2 id="ps-features-modules" className="hp-section__title">
            {modules.title}
          </h2>
          <p className="hp-section__lead">{modules.lead}</p>
        </header>
        <div className="hp-grid hp-grid--modules">
          {modules.cards.map((card) => (
            <article key={card.id} className="hp-module-card">
              <div className="hp-module-card__header">
                <span className="hp-module-card__label" aria-hidden>
                  {card.label}
                </span>
              </div>
              <h3 className="hp-module-card__title">{card.title}</h3>
              <p className="hp-module-card__body">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="hp-cta" aria-labelledby="ps-features-cta">
        <h2 id="ps-features-cta" className="hp-cta__title">
          {finalCta.title}
        </h2>
        <p className="hp-cta__subtitle">{finalCta.subtitle}</p>
        <div className="hp-cta__actions">
          <PublicLink href={loginPath} className="hp-btn hp-btn--primary" onNavigate={onNavigate}>
            {finalCta.primaryCta}
          </PublicLink>
          <PublicLink
            href={localizedPath('pricing', locale)}
            className="hp-btn hp-btn--ghost"
            onNavigate={onNavigate}
          >
            {content.tiers.eyebrow}
          </PublicLink>
        </div>
      </section>
    </>
  )
}
