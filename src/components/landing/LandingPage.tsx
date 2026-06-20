import { ArrowRight, FileText, Mic, Shield, Sparkles } from 'lucide-react'
import { homepageFooter } from '../../data/homepageContent'
import { PLAN_DEFINITIONS } from '../../data/subscriptionPlans'
import { AppLogo } from '../AppLogo'

interface LandingPageProps {
  onLogin: () => void
  onSignup: () => void
  onEnterApp?: () => void
  showDevEntry?: boolean
}

function WorkspacePreview() {
  return (
    <div className="landing-preview" aria-hidden>
      <div className="landing-preview__chrome">
        <span className="landing-preview__dot" />
        <span className="landing-preview__dot" />
        <span className="landing-preview__dot" />
      </div>
      <div className="landing-preview__body">
        <aside className="landing-preview__sidebar">
          <div className="landing-preview__line landing-preview__line--short" />
          <div className="landing-preview__line" />
          <div className="landing-preview__line" />
          <div className="landing-preview__line landing-preview__line--muted" />
        </aside>
        <main className="landing-preview__editor">
          <div className="landing-preview__title" />
          <div className="landing-preview__line" />
          <div className="landing-preview__line" />
          <div className="landing-preview__line landing-preview__line--wide" />
          <div className="landing-preview__line" />
          <div className="landing-preview__line landing-preview__line--short" />
        </main>
      </div>
    </div>
  )
}

export function LandingPage({ onLogin, onSignup, onEnterApp, showDevEntry }: LandingPageProps) {
  const free = PLAN_DEFINITIONS.free
  const pro = PLAN_DEFINITIONS.pro

  return (
    <div className="landing-page">
      <header className="landing-header">
        <AppLogo />
        <nav className="landing-header__nav">
          <a href="#features" className="landing-header__link">
            Funktionen
          </a>
          <a href="#pricing" className="landing-header__link">
            Preise
          </a>
          <button type="button" className="landing-header__link" onClick={onLogin}>
            Anmelden
          </button>
          <button type="button" className="landing-btn landing-btn--primary" onClick={onSignup}>
            Registrieren
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="landing-hero__eyebrow">Psychiatrische Dokumentation</p>
          <h1 className="landing-hero__title">
            Ruhig schreiben.
            <br />
            Klinisch präzise bleiben.
          </h1>
          <p className="landing-hero__subtitle">
            Psychiatry.ink ist ein minimaler Arbeitsbereich für Verlaufsdokumentation — mit
            optionaler KI-Unterstützung, Diktat und lokalem Datenschutz nach Region.
          </p>
          <div className="landing-hero__actions">
            <button type="button" className="landing-btn landing-btn--primary" onClick={onSignup}>
              Kostenlos starten
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
            <button type="button" className="landing-btn landing-btn--ghost" onClick={onLogin}>
              Bereits registriert?
            </button>
          </div>
          {showDevEntry && onEnterApp ? (
            <button type="button" className="landing-hero__dev-link" onClick={onEnterApp}>
              Entwicklermodus — ohne Anmeldung fortfahren
            </button>
          ) : null}
        </div>
        <WorkspacePreview />
      </section>

      <section id="features" className="landing-section">
        <h2 className="landing-section__title">Funktionen</h2>
        <div className="landing-features">
          <article className="landing-feature">
            <FileText className="landing-feature__icon" strokeWidth={1.5} aria-hidden />
            <h3>Notion-artiger Editor</h3>
            <p>
              Strukturierte Abschnitte für Aufnahme, Verlauf, Psychopathologie und Therapie — ohne
              visuelles Rauschen.
            </p>
          </article>
          <article className="landing-feature">
            <Sparkles className="landing-feature__icon" strokeWidth={1.5} aria-hidden />
            <h3>KI-Assistent</h3>
            <p>
              Schnell, standard oder gründlich — nutzbar mit verfügbarem Credit-Guthaben. Bei
              erschöpftem Guthaben bleiben Bearbeitung und Export nutzbar.
            </p>
          </article>
          <article className="landing-feature">
            <Mic className="landing-feature__icon" strokeWidth={1.5} aria-hidden />
            <h3>Diktat</h3>
            <p>
              Aufnahme und Transkription direkt im Dokument — mit verfügbarem Credit-Guthaben.
            </p>
          </article>
          <article className="landing-feature">
            <Shield className="landing-feature__icon" strokeWidth={1.5} aria-hidden />
            <h3>Regionaler Datenschutz</h3>
            <p>
              DACH: lokale Patientenfelder. Volle Sync-Stufe nur in erlaubten Regionen — Pro-Plan
              für Patienten-Dashboard.
            </p>
          </article>
        </div>
      </section>

      <section id="pricing" className="landing-section">
        <h2 className="landing-section__title">Preise</h2>
        <p className="landing-section__lead">
          KI und Diktat laufen über eine optimierte API-Infrastruktur mit führenden
          LLM-Anbietern — zuverlässig, skalierbar und auf psychiatrische Dokumentation
          ausgelegt.
        </p>
        <div className="landing-pricing">
          <article className="landing-plan">
            <h3>{free.nameDe}</h3>
            <p className="landing-plan__price">
              0&nbsp;€<span>/Monat</span>
            </p>
            <ul>
              {free.featuresDe.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button type="button" className="landing-btn landing-btn--ghost landing-plan__cta" onClick={onSignup}>
              Registrieren
            </button>
          </article>
          <article className="landing-plan landing-plan--featured">
            <span className="landing-plan__badge">Empfohlen</span>
            <h3>{pro.nameDe}</h3>
            <p className="landing-plan__price">
              {pro.priceEurMonthly}&nbsp;€<span>/Monat</span>
            </p>
            <ul>
              {pro.featuresDe.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button type="button" className="landing-btn landing-btn--primary landing-plan__cta" onClick={onSignup}>
              Pro testen
            </button>
            <p className="landing-plan__note">Abrechnung via Stripe — demnächst verfügbar</p>
          </article>
        </div>
      </section>

      <section className="landing-cta">
        <h2>Bereit für den ersten Eintrag?</h2>
        <p>Registrieren Sie sich und erhalten Sie {free.signupCredits} Credits zum Ausprobieren.</p>
        <button type="button" className="landing-btn landing-btn--primary" onClick={onSignup}>
          Jetzt registrieren
        </button>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer__company">
          <p className="landing-footer__company-name">{homepageFooter.companyName}</p>
          <p className="landing-footer__line">{homepageFooter.companyRegistration}</p>
          <p className="landing-footer__line">{homepageFooter.companyNumber}</p>
          <p className="landing-footer__line">{homepageFooter.address}</p>
          <p className="landing-footer__line">
            © {new Date().getFullYear()} {homepageFooter.companyName}. All rights reserved.
          </p>
        </div>
        <button type="button" className="landing-footer__link" onClick={onLogin}>
          Anmelden
        </button>
      </footer>
    </div>
  )
}
