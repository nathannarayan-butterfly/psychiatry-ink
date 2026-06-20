import { PoweredByLine } from './PoweredByLine'

interface CTASectionProps {
  title: string
  subtitle: string
  primaryCta: string
  secondaryCta: string
  onPrimary: () => void
  onSecondary: () => void
}

export function CTASection({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  onPrimary,
  onSecondary,
}: CTASectionProps) {
  return (
    <section className="hp-cta" aria-labelledby="hp-final-cta-title">
      <h2 id="hp-final-cta-title" className="hp-cta__title">
        {title}
      </h2>
      <p className="hp-cta__subtitle">{subtitle}</p>
      <PoweredByLine className="hp-cta__powered-by" />
      <div className="hp-cta__actions">
        <button type="button" className="hp-btn hp-btn--primary" onClick={onPrimary}>
          {primaryCta}
        </button>
        <button type="button" className="hp-btn hp-btn--ghost" onClick={onSecondary}>
          {secondaryCta}
        </button>
      </div>
    </section>
  )
}
