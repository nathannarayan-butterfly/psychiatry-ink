import type { HomepageContent } from '../../data/homepage'
import type { PublicLocale } from '../publicRoutes'
import { type PublicNavContext } from '../components/PublicLink'
import { StaticPricingCard } from '../components/StaticPricingCard'

interface PricingPageProps extends PublicNavContext {
  content: HomepageContent
  locale: PublicLocale
}

export function PricingPage({ content, locale, onNavigate }: PricingPageProps) {
  const { tiers } = content

  return (
    <section className="hp-section ps-page-hero" aria-labelledby="ps-pricing-title">
      <header className="hp-section__header">
        <p className="hp-eyebrow">{tiers.eyebrow}</p>
        <h1 id="ps-pricing-title" className="hp-section__title">
          {tiers.title}
        </h1>
        <p className="hp-section__lead">{tiers.lead}</p>
      </header>
      <div className="hp-pricing">
        <div className="hp-pricing__stack">
          <StaticPricingCard content={content} locale={locale} onNavigate={onNavigate} />
          <p className="hp-pricing__coming-soon">{tiers.comingSoonNote}</p>
        </div>
      </div>
    </section>
  )
}
