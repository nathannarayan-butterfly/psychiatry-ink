import { useHomepageContent } from '../../hooks/useHomepageContent'
import { PoweredByLine } from './PoweredByLine'

interface HomepageFooterProps {
  onLogin: () => void
}

export function HomepageFooter({ onLogin }: HomepageFooterProps) {
  const { footer } = useHomepageContent()

  return (
    <footer className="hp-footer">
      <div className="hp-footer__inner">
        <div className="hp-footer__company">
          <p className="hp-footer__company-name">{footer.companyName}</p>
          <p className="hp-footer__line">{footer.companyRegistration}</p>
          <p className="hp-footer__line">{footer.companyNumber}</p>
          <p className="hp-footer__line">{footer.address}</p>
          <p className="hp-footer__line">
            © {new Date().getFullYear()} {footer.companyName}. {footer.allRightsReserved}
          </p>
        </div>
        <nav className="hp-footer__links" aria-label={footer.footerNavAriaLabel}>
          {footer.links.map((link) =>
            link.href.startsWith('#') ? (
              <a key={link.id} href={link.href} className="hp-footer__link">
                {link.label}
              </a>
            ) : (
              <button
                key={link.id}
                type="button"
                className="hp-footer__link"
                onClick={onLogin}
              >
                {link.label}
              </button>
            ),
          )}
        </nav>
      </div>
      <PoweredByLine className="hp-footer__powered-by" />
      <p className="hp-footer__disclaimer">{footer.disclaimer}</p>
    </footer>
  )
}
