import { ArrowRight, FileText, Mic, Shield, Sparkles } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { homepageFooter } from '../../data/homepageContent'
import { translateLandingUi } from '../../data/landingUiTranslations'
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
  const { language } = useTranslation()
  const free = PLAN_DEFINITIONS.free
  const pro = PLAN_DEFINITIONS.pro
  const isGerman = language === 'de'
  const freeName = isGerman ? free.nameDe : free.nameEn
  const proName = isGerman ? pro.nameDe : pro.nameEn
  const freeFeatures = isGerman ? free.featuresDe : free.featuresEn
  const proFeatures = isGerman ? pro.featuresDe : pro.featuresEn

  return (
    <div className="landing-page">
      <header className="landing-header">
        <AppLogo />
        <nav className="landing-header__nav">
          <a href="#features" className="landing-header__link">
            {translateLandingUi(language, 'navFeatures')}
          </a>
          <a href="#pricing" className="landing-header__link">
            {translateLandingUi(language, 'navPricing')}
          </a>
          <button type="button" className="landing-header__link" onClick={onLogin}>
            {translateLandingUi(language, 'navLogin')}
          </button>
          <button type="button" className="landing-btn landing-btn--primary" onClick={onSignup}>
            {translateLandingUi(language, 'navSignup')}
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="landing-hero__eyebrow">{translateLandingUi(language, 'heroEyebrow')}</p>
          <h1 className="landing-hero__title">
            {translateLandingUi(language, 'heroTitleLine1')}
            <br />
            {translateLandingUi(language, 'heroTitleLine2')}
          </h1>
          <p className="landing-hero__subtitle">{translateLandingUi(language, 'heroSubtitle')}</p>
          <div className="landing-hero__actions">
            <button type="button" className="landing-btn landing-btn--primary" onClick={onSignup}>
              {translateLandingUi(language, 'heroCtaPrimary')}
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
            <button type="button" className="landing-btn landing-btn--ghost" onClick={onLogin}>
              {translateLandingUi(language, 'heroCtaSecondary')}
            </button>
          </div>
          {showDevEntry && onEnterApp ? (
            <button type="button" className="landing-hero__dev-link" onClick={onEnterApp}>
              {translateLandingUi(language, 'heroDevEntry')}
            </button>
          ) : null}
        </div>
        <WorkspacePreview />
      </section>

      <section id="features" className="landing-section">
        <h2 className="landing-section__title">{translateLandingUi(language, 'navFeatures')}</h2>
        <div className="landing-features">
          <article className="landing-feature">
            <FileText className="landing-feature__icon" strokeWidth={1.5} aria-hidden />
            <h3>{translateLandingUi(language, 'featureEditorTitle')}</h3>
            <p>{translateLandingUi(language, 'featureEditorDesc')}</p>
          </article>
          <article className="landing-feature">
            <Sparkles className="landing-feature__icon" strokeWidth={1.5} aria-hidden />
            <h3>{translateLandingUi(language, 'featureAiTitle')}</h3>
            <p>{translateLandingUi(language, 'featureAiDesc')}</p>
          </article>
          <article className="landing-feature">
            <Mic className="landing-feature__icon" strokeWidth={1.5} aria-hidden />
            <h3>{translateLandingUi(language, 'featureDictationTitle')}</h3>
            <p>{translateLandingUi(language, 'featureDictationDesc')}</p>
          </article>
          <article className="landing-feature">
            <Shield className="landing-feature__icon" strokeWidth={1.5} aria-hidden />
            <h3>{translateLandingUi(language, 'featurePrivacyTitle')}</h3>
            <p>{translateLandingUi(language, 'featurePrivacyDesc')}</p>
          </article>
        </div>
      </section>

      <section id="pricing" className="landing-section">
        <h2 className="landing-section__title">{translateLandingUi(language, 'navPricing')}</h2>
        <p className="landing-section__lead">{translateLandingUi(language, 'pricingLead')}</p>
        <div className="landing-pricing">
          <article className="landing-plan">
            <h3>{freeName}</h3>
            <p className="landing-plan__price">
              0&nbsp;€<span>{translateLandingUi(language, 'pricingPerMonth')}</span>
            </p>
            <ul>
              {freeFeatures.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button type="button" className="landing-btn landing-btn--ghost landing-plan__cta" onClick={onSignup}>
              {translateLandingUi(language, 'navSignup')}
            </button>
          </article>
          <article className="landing-plan landing-plan--featured">
            <span className="landing-plan__badge">{translateLandingUi(language, 'pricingRecommended')}</span>
            <h3>{proName}</h3>
            <p className="landing-plan__price">
              {pro.priceEurMonthly}&nbsp;€<span>{translateLandingUi(language, 'pricingPerMonth')}</span>
            </p>
            <ul>
              {proFeatures.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button type="button" className="landing-btn landing-btn--primary landing-plan__cta" onClick={onSignup}>
              {translateLandingUi(language, 'pricingProCta')}
            </button>
            <p className="landing-plan__note">{translateLandingUi(language, 'pricingStripeNote')}</p>
          </article>
        </div>
      </section>

      <section className="landing-cta">
        <h2>{translateLandingUi(language, 'ctaTitle')}</h2>
        <p>
          {translateLandingUi(language, 'ctaSubtitle').replace(
            '{credits}',
            String(free.signupCredits),
          )}
        </p>
        <button type="button" className="landing-btn landing-btn--primary" onClick={onSignup}>
          {translateLandingUi(language, 'ctaButton')}
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
          {translateLandingUi(language, 'navLogin')}
        </button>
      </footer>
    </div>
  )
}
