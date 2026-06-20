import { AppLogo } from '../AppLogo'
import { useHomepageContent } from '../../hooks/useHomepageContent'

interface HomepageNavProps {
  onOpenWorkspace: () => void
}

export function HomepageNav({ onOpenWorkspace }: HomepageNavProps) {
  const { nav } = useHomepageContent()

  return (
    <header className="hp-nav">
      <div className="hp-nav__inner">
        <a href="/" className="hp-nav__logo" aria-label={nav.homeAriaLabel}>
          <AppLogo />
        </a>
        <nav className="hp-nav__links" aria-label={nav.mainNavAriaLabel}>
          {nav.links.map((link) => (
            <a key={link.id} href={link.href} className="hp-nav__link">
              {link.label}
            </a>
          ))}
        </nav>
        <button type="button" className="hp-btn hp-btn--primary hp-nav__cta" onClick={onOpenWorkspace}>
          {nav.openWorkspaceLabel}
        </button>
      </div>
    </header>
  )
}
