export type BillingPeriod = 'monthly' | 'yearly'

interface PricingToggleProps {
  monthlyLabel: string
  yearlyLabel: string
  billingPeriodAriaLabel: string
  value: BillingPeriod
  onChange: (period: BillingPeriod) => void
}

export function PricingToggle({
  monthlyLabel,
  yearlyLabel,
  billingPeriodAriaLabel,
  value,
  onChange,
}: PricingToggleProps) {
  return (
    <div className="hp-pricing-toggle" role="group" aria-label={billingPeriodAriaLabel}>
      <button
        type="button"
        className={`hp-pricing-toggle__option${value === 'monthly' ? ' hp-pricing-toggle__option--active' : ''}`}
        aria-pressed={value === 'monthly'}
        onClick={() => onChange('monthly')}
      >
        {monthlyLabel}
      </button>
      <button
        type="button"
        className={`hp-pricing-toggle__option${value === 'yearly' ? ' hp-pricing-toggle__option--active' : ''}`}
        aria-pressed={value === 'yearly'}
        onClick={() => onChange('yearly')}
      >
        {yearlyLabel}
      </button>
    </div>
  )
}
