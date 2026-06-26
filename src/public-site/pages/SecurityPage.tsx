import type { HomepageContent } from '../../data/homepage'
import { localizedPath, type PublicLocale } from '../publicRoutes'
import { PublicLink, type PublicNavContext } from '../components/PublicLink'

interface SecurityPageProps extends PublicNavContext {
  content: HomepageContent
  locale: PublicLocale
}

interface SecurityCopy {
  complianceEyebrow: string
  complianceTitle: string
  complianceLead: string
  gdpr: { title: string; body: string }
  clinical: { title: string; body: string }
  privacyCta: string
}

const COPY: Record<PublicLocale, SecurityCopy> = {
  en: {
    complianceEyebrow: 'Data protection',
    complianceTitle: 'Built around GDPR and clinical confidentiality',
    complianceLead:
      'Psychiatry.Ink is designed to support data-protection compliance for psychiatric practice in the UK and EU. You stay in control of patient data and how it is processed.',
    gdpr: {
      title: 'GDPR-aligned data protection',
      body: 'Personal data is processed under the UK GDPR and EU GDPR on clearly defined lawful bases. When you document patient care you act as the controller and Psychiatry Ink Ltd acts as your processor under a data processing agreement. International transfers, where they occur, rely on Standard Contractual Clauses and supplementary safeguards.',
    },
    clinical: {
      title: 'Clinical responsibility stays with you',
      body: 'Psychiatry.Ink supports but does not replace clinician judgement. It does not diagnose patients or make autonomous treatment decisions. AI-assisted suggestions always require clinician review and acceptance, and the service is not intended for emergency or crisis use.',
    },
    privacyCta: 'Read the privacy policy',
  },
  de: {
    complianceEyebrow: 'Datenschutz',
    complianceTitle: 'Auf DSGVO und ärztliche Schweigepflicht ausgelegt',
    complianceLead:
      'Psychiatrie.Ink ist darauf ausgelegt, die Datenschutz-Compliance in der psychiatrischen Praxis in der EU und im Vereinigten Königreich zu unterstützen. Sie behalten die Kontrolle über Patientendaten und deren Verarbeitung.',
    gdpr: {
      title: 'DSGVO-konformer Datenschutz',
      body: 'Personenbezogene Daten werden nach DSGVO und UK GDPR auf klar definierten Rechtsgrundlagen verarbeitet. Bei der Dokumentation der Patientenversorgung sind Sie Verantwortlicher und die Psychiatry Ink Ltd handelt als Ihr Auftragsverarbeiter auf Grundlage eines Auftragsverarbeitungsvertrags. Drittlandübermittlungen stützen sich, soweit sie erfolgen, auf Standardvertragsklauseln und ergänzende Garantien.',
    },
    clinical: {
      title: 'Die ärztliche Verantwortung bleibt bei Ihnen',
      body: 'Psychiatrie.Ink unterstützt die ärztliche Beurteilung, ersetzt sie aber nicht. Der Dienst stellt keine Diagnosen und trifft keine autonomen Therapieentscheidungen. KI-gestützte Vorschläge erfordern stets eine ärztliche Prüfung und Freigabe; der Dienst ist nicht für Notfall- oder Krisensituationen vorgesehen.',
    },
    privacyCta: 'Datenschutzerklärung lesen',
  },
}

export function SecurityPage({ content, locale, onNavigate }: SecurityPageProps) {
  const { security } = content
  const copy = COPY[locale]

  return (
    <>
      <section className="hp-section ps-page-hero" aria-labelledby="ps-security-title">
        <header className="hp-section__header">
          <p className="hp-eyebrow">{security.eyebrow}</p>
          <h1 id="ps-security-title" className="hp-section__title">
            {security.title}
          </h1>
          <p className="hp-section__lead">{security.lead}</p>
        </header>
        <div className="hp-grid hp-grid--4">
          {security.principles.map((principle) => (
            <article key={principle.id} className="hp-card hp-card--security">
              <h2 className="hp-card__title">{principle.title}</h2>
              <p className="hp-card__body">{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="hp-section hp-section--muted" aria-labelledby="ps-security-compliance">
        <header className="hp-section__header">
          <p className="hp-eyebrow">{copy.complianceEyebrow}</p>
          <h2 id="ps-security-compliance" className="hp-section__title">
            {copy.complianceTitle}
          </h2>
          <p className="hp-section__lead">{copy.complianceLead}</p>
        </header>
        <div className="hp-grid hp-grid--2 ps-prose-grid">
          <article className="hp-card">
            <h3 className="hp-card__title">{copy.gdpr.title}</h3>
            <p className="hp-card__body">{copy.gdpr.body}</p>
            <p className="ps-card__action">
              <PublicLink
                href={localizedPath('privacy', locale)}
                className="hp-tier__credits-link-anchor"
                onNavigate={onNavigate}
              >
                {copy.privacyCta}
              </PublicLink>
            </p>
          </article>
          <article className="hp-card">
            <h3 className="hp-card__title">{copy.clinical.title}</h3>
            <p className="hp-card__body">{copy.clinical.body}</p>
          </article>
        </div>
      </section>
    </>
  )
}
