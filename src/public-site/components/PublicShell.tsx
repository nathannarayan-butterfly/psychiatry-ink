import type { ReactNode } from 'react'
import type { HomepageContent } from '../../data/homepage'
import { localizedPath, type PublicLocale, type PublicPageKey } from '../publicRoutes'
import { PublicLink, type PublicNavContext } from './PublicLink'

interface ShellLabels {
  features: string
  pricing: string
  security: string
  impressum: string
  privacy: string
  terms: string
  contact: string
  signIn: string
  skipToContent: string
}

const LABELS: Record<PublicLocale, ShellLabels> = {
  en: {
    features: 'Features',
    pricing: 'Pricing',
    security: 'Security',
    impressum: 'Legal notice',
    privacy: 'Privacy',
    terms: 'Terms',
    contact: 'Contact',
    signIn: 'Sign in',
    skipToContent: 'Skip to content',
  },
  de: {
    features: 'Funktionen',
    pricing: 'Preise',
    security: 'Sicherheit',
    impressum: 'Impressum',
    privacy: 'Datenschutz',
    terms: 'AGB',
    contact: 'Kontakt',
    signIn: 'Anmelden',
    skipToContent: 'Zum Inhalt springen',
  },
}

interface BrandWordmarkProps {
  brandName: string
}

/** Domain-aware text wordmark — `Psychiatrie.Ink` on DE, `Psychiatry.Ink` on EN. */
function BrandWordmark({ brandName }: BrandWordmarkProps) {
  const dot = brandName.lastIndexOf('.')
  const stem = dot > 0 ? brandName.slice(0, dot) : brandName
  const suffix = dot > 0 ? brandName.slice(dot) : ''
  return (
    <span className="ps-brand">
      <span className="ps-brand__stem">{stem}</span>
      {suffix ? <span className="ps-brand__ink">{suffix}</span> : null}
      <span className="ps-brand__beta" aria-label="Beta">
        BETA
      </span>
    </span>
  )
}

export interface PublicShellProps extends PublicNavContext {
  brandName: string
  locale: PublicLocale
  content: HomepageContent
  /** Active page, used to mark the current nav item. */
  currentKey: PublicPageKey
  children: ReactNode
}

export function PublicShell({
  brandName,
  locale,
  content,
  currentKey,
  onNavigate,
  children,
}: PublicShellProps) {
  const labels = LABELS[locale]
  const navItems: Array<{ key: PublicPageKey; label: string }> = [
    { key: 'features', label: labels.features },
    { key: 'pricing', label: labels.pricing },
    { key: 'security', label: labels.security },
  ]
  const legalItems: Array<{ key: PublicPageKey; label: string }> = [
    { key: 'impressum', label: labels.impressum },
    { key: 'privacy', label: labels.privacy },
    { key: 'terms', label: labels.terms },
    { key: 'contact', label: labels.contact },
  ]
  const year = new Date().getFullYear()
  const { footer } = content

  return (
    <div className="hp-page ps-site">
      <a className="ps-skip-link" href="#ps-main">
        {labels.skipToContent}
      </a>

      <header className="hp-nav">
        <div className="hp-nav__inner">
          <PublicLink
            href={localizedPath('landing', locale)}
            className="hp-nav__logo ps-brand-link"
            aria-label={content.nav.homeAriaLabel}
            onNavigate={onNavigate}
          >
            <BrandWordmark brandName={brandName} />
          </PublicLink>

          <nav className="hp-nav__links" aria-label={content.nav.mainNavAriaLabel}>
            {navItems.map((item) => (
              <PublicLink
                key={item.key}
                href={localizedPath(item.key, locale)}
                className="hp-nav__link"
                aria-current={item.key === currentKey ? 'page' : undefined}
                onNavigate={onNavigate}
              >
                {item.label}
              </PublicLink>
            ))}
          </nav>

          <PublicLink
            href={localizedPath('login', locale)}
            className="hp-btn hp-btn--primary hp-nav__cta"
            onNavigate={onNavigate}
          >
            {content.nav.openWorkspaceLabel}
          </PublicLink>
        </div>
      </header>

      <main id="ps-main">{children}</main>

      <footer className="hp-footer">
        <div className="hp-footer__inner">
          <div className="hp-footer__company">
            <p className="hp-footer__company-name">{footer.companyName}</p>
            <p className="hp-footer__line">{footer.companyRegistration}</p>
            <p className="hp-footer__line">{footer.companyNumber}</p>
            <p className="hp-footer__line">{footer.address}</p>
            <p className="hp-footer__line">
              © {year} {footer.companyName}. {footer.allRightsReserved}
            </p>
          </div>
          <nav className="hp-footer__links" aria-label={footer.footerNavAriaLabel}>
            {navItems.map((item) => (
              <PublicLink
                key={item.key}
                href={localizedPath(item.key, locale)}
                className="hp-footer__link"
                onNavigate={onNavigate}
              >
                {item.label}
              </PublicLink>
            ))}
            {legalItems.map((item) => (
              <PublicLink
                key={item.key}
                href={localizedPath(item.key, locale)}
                className="hp-footer__link"
                onNavigate={onNavigate}
              >
                {item.label}
              </PublicLink>
            ))}
            <PublicLink
              href={localizedPath('login', locale)}
              className="hp-footer__link"
              onNavigate={onNavigate}
            >
              {labels.signIn}
            </PublicLink>
          </nav>
        </div>
        <p className="hp-footer__powered-by">{content.poweredBy.label}</p>
        <p className="hp-footer__disclaimer">{footer.disclaimer}</p>
      </footer>
    </div>
  )
}
