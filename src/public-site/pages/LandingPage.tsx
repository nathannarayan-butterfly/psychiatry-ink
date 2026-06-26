import type { HomepageContent } from '../../data/homepage'
import { localizedPath, type PublicLocale } from '../publicRoutes'
import { PublicLink, type PublicNavContext } from '../components/PublicLink'
import { StaticPricingCard } from '../components/StaticPricingCard'

interface LandingPageProps extends PublicNavContext {
  content: HomepageContent
  locale: PublicLocale
}

export function LandingPage({ content, locale, onNavigate }: LandingPageProps) {
  const { hero, pillars, workflow, modules, security, tiers, demo, finalCta } = content
  const loginPath = localizedPath('login', locale)

  return (
    <>
      <section className="hp-hero" aria-labelledby="hp-hero-title">
        <div className="hp-hero__copy">
          <p className="hp-eyebrow">{hero.eyebrow}</p>
          <h1 id="hp-hero-title" className="hp-hero__title">
            {hero.headline}
          </h1>
          <p className="hp-hero__subtitle">{hero.subtitle}</p>
          <div className="hp-hero__actions">
            <PublicLink
              href={loginPath}
              className="hp-btn hp-btn--primary"
              onNavigate={onNavigate}
            >
              {hero.primaryCta}
            </PublicLink>
            <a href="#demo" className="hp-btn hp-btn--ghost">
              {hero.secondaryCta}
            </a>
          </div>
          <ul className="hp-trust-labels" aria-label={hero.trustLabelsAriaLabel}>
            {hero.trustLabels.map((label) => (
              <li key={label} className="hp-trust-labels__item">
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="hp-hero__visual" aria-hidden>
          <div className="hp-workspace-composition">
            <div className="hp-workspace-composition__paper">
              <div className="hp-workspace-composition__paper-header">
                <span className="hp-workspace-composition__paper-line hp-workspace-composition__paper-line--title" />
                <span className="hp-workspace-composition__paper-line hp-workspace-composition__paper-line--short" />
              </div>
              <div className="hp-workspace-composition__paper-body">
                <span className="hp-workspace-composition__paper-line" />
                <span className="hp-workspace-composition__paper-line" />
                <span className="hp-workspace-composition__paper-line hp-workspace-composition__paper-line--wide" />
              </div>
            </div>
            <div className="hp-workspace-composition__modules">
              {hero.workspaceModules.map((mod) => (
                <div key={mod} className="hp-workspace-composition__module">
                  {mod}
                </div>
              ))}
            </div>
            <span className="hp-workspace-composition__ink-fallback">.ink</span>
          </div>
        </div>
      </section>

      <section id={pillars.sectionId} className="hp-section" aria-labelledby="hp-pillars-title">
        <header className="hp-section__header">
          <p className="hp-eyebrow">{pillars.eyebrow}</p>
          <h2 id="hp-pillars-title" className="hp-section__title">
            {pillars.title}
          </h2>
          <p className="hp-section__lead">{pillars.lead}</p>
        </header>
        <div className="hp-grid hp-grid--3">
          {pillars.cards.map((card) => (
            <article key={card.id} className="hp-card">
              <h3 className="hp-card__title">{card.title}</h3>
              <p className="hp-card__body">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id={workflow.sectionId}
        className="hp-section hp-section--muted"
        aria-labelledby="hp-workflow-title"
      >
        <header className="hp-section__header">
          <p className="hp-eyebrow">{workflow.eyebrow}</p>
          <h2 id="hp-workflow-title" className="hp-section__title">
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

      <section id={modules.sectionId} className="hp-section" aria-labelledby="hp-modules-title">
        <header className="hp-section__header">
          <p className="hp-eyebrow">{modules.eyebrow}</p>
          <h2 id="hp-modules-title" className="hp-section__title">
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

      <section
        id={security.sectionId}
        className="hp-section hp-section--muted"
        aria-labelledby="hp-security-title"
      >
        <header className="hp-section__header">
          <p className="hp-eyebrow">{security.eyebrow}</p>
          <h2 id="hp-security-title" className="hp-section__title">
            {security.title}
          </h2>
          <p className="hp-section__lead">{security.lead}</p>
        </header>
        <div className="hp-grid hp-grid--4">
          {security.principles.map((principle) => (
            <article key={principle.id} className="hp-card hp-card--security">
              <h3 className="hp-card__title">{principle.title}</h3>
              <p className="hp-card__body">{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id={tiers.sectionId} className="hp-section" aria-labelledby="hp-pricing-title">
        <header className="hp-section__header">
          <p className="hp-eyebrow">{tiers.eyebrow}</p>
          <h2 id="hp-pricing-title" className="hp-section__title">
            {tiers.title}
          </h2>
          <p className="hp-section__lead">{tiers.lead}</p>
        </header>
        <div className="hp-pricing">
          <div className="hp-pricing__stack">
            <StaticPricingCard content={content} locale={locale} onNavigate={onNavigate} />
            <p className="hp-pricing__coming-soon">{tiers.comingSoonNote}</p>
          </div>
        </div>
      </section>

      <section
        id={demo.sectionId}
        className="hp-section hp-section--muted"
        aria-labelledby="hp-demo-title"
      >
        <header className="hp-section__header">
          <p className="hp-eyebrow">{demo.eyebrow}</p>
          <h2 id="hp-demo-title" className="hp-section__title">
            {demo.title}
          </h2>
          <p className="hp-section__lead">{demo.lead}</p>
        </header>
        <div className="hp-demo-panels">
          {demo.panels.map((panel) => (
            <article key={panel.id} className="hp-demo-panel">
              <span className="hp-demo-panel__label">{panel.label}</span>
              <div className="hp-demo-panel__screenshot-wrap">
                <img
                  className="hp-demo-panel__screenshot"
                  src={panel.imageSrc}
                  alt={panel.imageAlt}
                  loading="lazy"
                  decoding="async"
                />
                <span className="hp-demo-panel__screenshot-badge">
                  {content.ui.syntheticDemoBadge}
                </span>
              </div>
              <h3 className="hp-demo-panel__title">{panel.title}</h3>
              <p className="hp-demo-panel__description">{panel.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="hp-cta" aria-labelledby="hp-cta-title">
        <h2 id="hp-cta-title" className="hp-cta__title">
          {finalCta.title}
        </h2>
        <p className="hp-cta__subtitle">{finalCta.subtitle}</p>
        <div className="hp-cta__actions">
          <PublicLink href={loginPath} className="hp-btn hp-btn--primary" onNavigate={onNavigate}>
            {finalCta.primaryCta}
          </PublicLink>
          <a href="#demo" className="hp-btn hp-btn--ghost">
            {finalCta.secondaryCta}
          </a>
        </div>
      </section>
    </>
  )
}
