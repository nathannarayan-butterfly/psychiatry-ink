import type { HomepageContent } from '../../data/homepage'
import { localizedPath, type PublicLocale } from '../publicRoutes'
import { PublicLink, type PublicNavContext } from './PublicLink'

interface StaticPricingCardProps extends PublicNavContext {
  content: HomepageContent
  locale: PublicLocale
}

/**
 * No-JS pricing card: the interactive monthly/yearly toggle of the SPA card is
 * replaced by showing BOTH billing options statically, so the prerendered page
 * is complete and meaningful without JavaScript.
 */
export function StaticPricingCard({ content, locale, onNavigate }: StaticPricingCardProps) {
  const tier = content.tiers.singleUse
  const { ui } = content

  return (
    <article className="hp-tier hp-tier--single">
      <div className="hp-tier__header">
        <h3 className="hp-tier__name">{tier.name}</h3>
        <span className="hp-tier__badge hp-tier__badge--available">{ui.availableNow}</span>
      </div>

      <div className="hp-tier__trial">
        <p className="hp-tier__trial-price">{tier.trial.price}</p>
        <p className="hp-tier__trial-detail">{tier.trial.detail}</p>
      </div>

      <p className="hp-tier__then-label">{tier.thenLabel}</p>

      <div className="ps-price-options">
        <div className="ps-price-option">
          <p className="hp-tier__price">
            {tier.billing.monthly.price}
            <span className="hp-tier__price-period">{tier.billing.monthly.period}</span>
          </p>
          <p className="hp-tier__credits">{tier.billing.monthly.credits}</p>
        </div>
        <div className="ps-price-option">
          <p className="hp-tier__price">
            {tier.billing.yearly.price}
            <span className="hp-tier__price-period">{tier.billing.yearly.period}</span>
          </p>
          <p className="hp-tier__credits">{tier.billing.yearly.credits}</p>
          {tier.billing.yearly.savings ? (
            <p className="hp-tier__savings">{tier.billing.yearly.savings}</p>
          ) : null}
        </div>
      </div>

      <p className="hp-tier__description">{tier.description}</p>

      <ul className="hp-tier__features">
        {tier.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <p className="hp-tier__credits-link">
        <PublicLink
          href={tier.aiCreditsLink.href}
          className="hp-tier__credits-link-anchor"
          onNavigate={onNavigate}
        >
          {tier.aiCreditsLink.label}
        </PublicLink>
      </p>

      <PublicLink
        href={localizedPath('login', locale)}
        className="hp-btn hp-btn--primary hp-tier__cta"
        onNavigate={onNavigate}
      >
        {tier.cta}
      </PublicLink>
    </article>
  )
}
