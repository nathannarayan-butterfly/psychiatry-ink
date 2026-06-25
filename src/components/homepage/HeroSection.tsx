import type { CSSProperties } from 'react'
import { ArrowRight } from 'lucide-react'
import { butterflyLogoSrc, hasButterflyLogo } from '../../data/butterflyLogo'
import { logoInkSrc, hasLogoInkMark } from '../../data/brandLogo'
import { useHomepageContent } from '../../hooks/useHomepageContent'
import { useTranslation } from '../../context/TranslationContext'

interface HeroSectionProps {
  onOpenWorkspace: () => void
  onViewDemo: () => void
  showDevEntry?: boolean
  onEnterApp?: () => void
}

export function HeroSection({
  onOpenWorkspace,
  onViewDemo,
  showDevEntry,
  onEnterApp,
}: HeroSectionProps) {
  const { hero } = useHomepageContent()
  const { t } = useTranslation()

  return (
    <section className="hp-hero" aria-labelledby="hp-hero-title">
      <div className="hp-hero__copy">
        <p className="hp-eyebrow">{hero.eyebrow}</p>
        <h1 id="hp-hero-title" className="hp-hero__title">
          {hero.headline}
        </h1>
        <p className="hp-hero__subtitle">{hero.subtitle}</p>
        <div className="hp-hero__actions">
          <button type="button" className="hp-btn hp-btn--primary" onClick={onOpenWorkspace}>
            {hero.primaryCta}
            <ArrowRight className="hp-btn__icon" strokeWidth={1.75} aria-hidden />
          </button>
          <button type="button" className="hp-btn hp-btn--ghost" onClick={onViewDemo}>
            {hero.secondaryCta}
          </button>
        </div>
        {showDevEntry && onEnterApp ? (
          <button type="button" className="hp-hero__dev-link" onClick={onEnterApp}>
            {hero.devModeLink}
          </button>
        ) : null}
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
            {hero.workspaceModules.map((mod, i) => (
              <div
                key={mod}
                className="hp-workspace-composition__module"
                style={{ '--module-delay': `${i * 40}ms` } as CSSProperties}
              >
                {mod}
              </div>
            ))}
          </div>

          {hasLogoInkMark && logoInkSrc ? (
            <img
              src={logoInkSrc}
              alt={t('brandLogoAlt')}
              className="hp-workspace-composition__ink"
              decoding="async"
            />
          ) : (
            <span className="hp-workspace-composition__ink-fallback">.ink</span>
          )}

          {hasButterflyLogo && butterflyLogoSrc ? (
            <img
              src={butterflyLogoSrc}
              alt={t('butterflyLogoAlt')}
              className="hp-workspace-composition__butterfly"
              decoding="async"
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
