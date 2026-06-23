import { useState } from 'react'
import type { HomepageSingleUseTier } from '../../data/homepage'
import { useHomepageContent } from '../../hooks/useHomepageContent'
import { PricingToggle, type BillingPeriod } from './PricingToggle'

interface SingleUseTierCardProps {
  content: HomepageSingleUseTier
  onCta: () => void
}

export function SingleUseTierCard({ content, onCta }: SingleUseTierCardProps) {
  const { ui } = useHomepageContent()
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const billing = period === 'monthly' ? content.billing.monthly : content.billing.yearly

  return (
    <article className="hp-tier hp-tier--single">
      {period === 'monthly' ? (
        <p className="hp-tier__recommend" role="status">
          {content.yearlyRecommendation}
        </p>
      ) : (
        <p className="hp-tier__recommend hp-tier__recommend--active" role="status">
          {content.yearlyConfirmation}
        </p>
      )}
      <div className="hp-tier__header">
        <h3 className="hp-tier__name">{content.name}</h3>
        <span className="hp-tier__badge hp-tier__badge--available">{ui.availableNow}</span>
      </div>

      <div className="hp-tier__trial">
        <p className="hp-tier__trial-price">{content.trial.price}</p>
        <p className="hp-tier__trial-detail">{content.trial.detail}</p>
      </div>

      <p className="hp-tier__then-label">{content.thenLabel}</p>

      <PricingToggle
        monthlyLabel={content.toggle.monthly}
        yearlyLabel={content.toggle.yearly}
        billingPeriodAriaLabel={ui.billingPeriodAriaLabel}
        value={period}
        onChange={setPeriod}
      />

      <div className="hp-tier__billing" aria-live="polite">
        <p className="hp-tier__price">
          {billing.price}
          <span className="hp-tier__price-period">{billing.period}</span>
        </p>
        <p className="hp-tier__credits">{billing.credits}</p>
        {billing.savings ? <p className="hp-tier__savings">{billing.savings}</p> : null}
      </div>

      <p className="hp-tier__description">{content.description}</p>

      <ul className="hp-tier__features">
        {content.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <p className="hp-tier__credits-link">
        <a href={content.aiCreditsLink.href} className="hp-tier__credits-link-anchor">
          {content.aiCreditsLink.label}
        </a>
      </p>

      <button type="button" className="hp-btn hp-btn--primary hp-tier__cta" onClick={onCta}>
        {content.cta}
      </button>
    </article>
  )
}
