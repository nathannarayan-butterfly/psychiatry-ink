import { useEffect, useLayoutEffect } from 'react'
import { DemoPanel } from '../../components/homepage/DemoPanel'
import type { HomepageContent } from '../../data/homepage'
import { localizedPath, type PublicLocale } from '../publicRoutes'
import { PublicLink, type PublicNavContext } from '../components/PublicLink'
import { StaticPricingCard } from '../components/StaticPricingCard'

interface LandingPageProps extends PublicNavContext {
  content: HomepageContent
  locale: PublicLocale
}

/**
 * `useLayoutEffect` on the client (the SPA re-renders #root with `createRoot`),
 * `useEffect` during prerender so `renderToStaticMarkup` stays warning-free.
 */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Progressive scroll-reveal. Prerendered/no-JS HTML keeps `data-reveal` at its
 * default empty value (always visible). Only when JS runs — and the user has not
 * requested reduced motion — do we arm elements and reveal them on scroll.
 */
function useScrollReveal() {
  useIsomorphicLayoutEffect(() => {
    if (typeof document === 'undefined') return
    const scope = document.getElementById('ps-main') ?? document
    const els = Array.from(scope.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (els.length === 0) return

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.setAttribute('data-reveal', 'shown'))
      return
    }

    els.forEach((el) => el.setAttribute('data-reveal', 'armed'))
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-reveal', 'shown')
            io.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/** Render the hero headline, wrapping the optional accent phrase for the ink underline. */
function HeroHeadline({ headline, accent }: { headline: string; accent?: string }) {
  if (!accent || !headline.includes(accent)) {
    return <>{headline}</>
  }
  const index = headline.indexOf(accent)
  const before = headline.slice(0, index)
  const after = headline.slice(index + accent.length)
  return (
    <>
      {before}
      <span className="hp-hero__accent">{accent}</span>
      {after}
    </>
  )
}

export function LandingPage({ content, locale, onNavigate }: LandingPageProps) {
  const { hero, pillars, workflow, modules, security, tiers, demo, finalCta, ui } = content
  const loginPath = localizedPath('login', locale)

  useScrollReveal()

  return (
    <>
      <section className="hp-hero" aria-labelledby="hp-hero-title">
        <div className="hp-hero__copy">
          <p className="hp-eyebrow">{hero.eyebrow}</p>
          <h1 id="hp-hero-title" className="hp-hero__title">
            <HeroHeadline headline={hero.headline} accent={hero.headlineAccent} />
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

        <div className="hp-hero__visual">
          <figure className="hp-hero__frame">
            <div className="hp-appframe">
              <div className="hp-appframe__bar" aria-hidden="true">
                <span className="hp-appframe__dots">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="hp-appframe__label">{ui.syntheticDemoBadge}</span>
              </div>
              <img
                className="hp-hero__shot"
                src="/homepage/demo-overview.png"
                alt={hero.heroShotAlt ?? hero.headline}
                width={1024}
                height={640}
                loading="eager"
                decoding="async"
              />
            </div>
            {hero.heroShotCaption ? (
              <figcaption className="hp-hero__caption">{hero.heroShotCaption}</figcaption>
            ) : null}
          </figure>
        </div>
      </section>

      <section id={pillars.sectionId} className="hp-section" aria-labelledby="hp-pillars-title">
        <header className="hp-section__header" data-reveal>
          <p className="hp-eyebrow">{pillars.eyebrow}</p>
          <h2 id="hp-pillars-title" className="hp-section__title">
            {pillars.title}
          </h2>
          <p className="hp-section__lead">{pillars.lead}</p>
        </header>
        <div className="hp-grid hp-grid--3" data-reveal>
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
        <header className="hp-section__header" data-reveal>
          <p className="hp-eyebrow">{workflow.eyebrow}</p>
          <h2 id="hp-workflow-title" className="hp-section__title">
            {workflow.title}
          </h2>
          <p className="hp-section__lead">{workflow.lead}</p>
        </header>
        <ol className="hp-workflow" data-reveal>
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
        <header className="hp-section__header" data-reveal>
          <p className="hp-eyebrow">{modules.eyebrow}</p>
          <h2 id="hp-modules-title" className="hp-section__title">
            {modules.title}
          </h2>
          <p className="hp-section__lead">{modules.lead}</p>
        </header>
        <div className="hp-grid hp-grid--modules" data-reveal>
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
        <header className="hp-section__header" data-reveal>
          <p className="hp-eyebrow">{security.eyebrow}</p>
          <h2 id="hp-security-title" className="hp-section__title">
            {security.title}
          </h2>
          <p className="hp-section__lead">{security.lead}</p>
        </header>
        <div className="hp-grid hp-grid--4" data-reveal>
          {security.principles.map((principle) => (
            <article key={principle.id} className="hp-card hp-card--security">
              <h3 className="hp-card__title">{principle.title}</h3>
              <p className="hp-card__body">{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id={tiers.sectionId} className="hp-section" aria-labelledby="hp-pricing-title">
        <header className="hp-section__header" data-reveal>
          <p className="hp-eyebrow">{tiers.eyebrow}</p>
          <h2 id="hp-pricing-title" className="hp-section__title">
            {tiers.title}
          </h2>
          <p className="hp-section__lead">{tiers.lead}</p>
        </header>
        <div className="hp-pricing" data-reveal>
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
        <header className="hp-section__header" data-reveal>
          <p className="hp-eyebrow">{demo.eyebrow}</p>
          <h2 id="hp-demo-title" className="hp-section__title">
            {demo.title}
          </h2>
          <p className="hp-section__lead">{demo.lead}</p>
        </header>
        <div className="hp-demo-panels" data-reveal>
          {demo.panels.map((panel) => (
            <DemoPanel key={panel.id} panel={panel} ui={content.ui} />
          ))}
        </div>
      </section>

      <section className="hp-cta" aria-labelledby="hp-cta-title" data-reveal>
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
