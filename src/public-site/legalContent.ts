import type { PublicLocale } from './publicRoutes'

/**
 * Legal page content (privacy, terms, Impressum) for the public site.
 *
 * SOURCING RULE (see .cursor/rules/complete-data-no-samples.mdc): every concrete
 * legal/company detail is taken from data already present in the codebase
 * (the homepage footer in `src/data/homepage/content.*.ts`) or from details
 * confirmed by the Owner (see `CONTACT` and the legal note below). Nothing here
 * is fabricated; details that the Owner declined to publish (VAT, ICO number,
 * phone) are intentionally omitted rather than guessed.
 */

/** Company facts, sourced verbatim from `content.en.ts` / `content.de.ts` footer. */
export const COMPANY = {
  legalName: 'Psychiatry Ink Ltd',
  companyNumber: '17275704',
  registrationEn: 'Company registered in England and Wales.',
  registrationDe: 'Eingetragen in England und Wales (Vereinigtes Königreich).',
  addressEn: '71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom',
  addressDe: '71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, Vereinigtes Königreich',
} as const

/** Contact + responsible-person details (provided by the Owner). */
export const CONTACT = {
  generalEmail: 'hello@psychiatry.ink',
  privacyEmail: 'data-protection@psychiatry.ink',
  /** Data Protection Officer. */
  dpo: 'Nathan Narayan',
  /** Authorised representative ("Vertreten durch") + responsible for content (§ 18 MStV). */
  representative: 'Nathan Narayan',
  /** EU/EEA representative under Art. 27 GDPR (postal address pending). */
  euRepName: 'Nathan Narayan',
  euRepEmail: 'data-protection@psychiatry.ink',
  /** Interim published note for the (not-yet-finalised) postal address — shown to users verbatim. */
  euRepAddressEn: 'Postal address to be published.',
  euRepAddressDe: 'Postanschrift wird in Kürze veröffentlicht.',
} as const

/**
 * LEGAL NOTE — EU/EEA Article 27 GDPR representative: the Owner has elected to
 * act as the representative (Nathan Narayan, data-protection@psychiatry.ink).
 * The postal address is not yet finalised, so the public pages show an interim
 * "to be published" note (see CONTACT.euRepAddress*) — this is intentional
 * published copy, not an unfilled placeholder.
 *
 * The company is not VAT-registered, no ICO registration number is published,
 * and no contact phone number is published — those lines are intentionally
 * omitted from the Impressum / legal notice rather than shown as placeholders.
 */

/** Data-residency statement (verified against repo deploy config). */
const DATA_RESIDENCY_EN =
  'All production data is hosted in the European Union. The database (Supabase) and AI processing are located in the EU (Frankfurt); the application is hosted on Google Cloud Run in the EU (region europe-west1).'
const DATA_RESIDENCY_DE =
  'Alle Produktivdaten werden in der Europäischen Union gehostet. Die Datenbank (Supabase) und die KI-Verarbeitung befinden sich in der EU (Frankfurt); die Anwendung wird auf Google Cloud Run in der EU (Region europe-west1) gehostet.'

export type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'h3'; text: string }

export interface LegalSection {
  id: string
  heading: string
  blocks: LegalBlock[]
}

export interface LegalDoc {
  /** Page H1. */
  title: string
  /** Short lead paragraph under the H1. */
  lead: string
  /** Human "last updated" label rendered near the top. */
  lastUpdatedLabel: string
  sections: LegalSection[]
}

/** ISO date the legal copy was authored / last reviewed. */
export const LEGAL_LAST_UPDATED = '2026-06-26'

function lastUpdatedLabel(locale: PublicLocale): string {
  return locale === 'de'
    ? `Zuletzt aktualisiert: 26. Juni 2026`
    : `Last updated: 26 June 2026`
}

/* ───────────────────────────── PRIVACY ──────────────────────────────────── */

const privacyEn: LegalDoc = {
  title: 'Privacy policy',
  lead: 'This policy explains how Psychiatry Ink Ltd processes personal data when you use Psychiatry.Ink, and the rights you have under the UK GDPR and the EU GDPR.',
  lastUpdatedLabel: lastUpdatedLabel('en'),
  sections: [
    {
      id: 'controller',
      heading: '1. Who is responsible (data controller)',
      blocks: [
        {
          type: 'p',
          text: `The data controller for Psychiatry.Ink is ${COMPANY.legalName}, ${COMPANY.addressEn}. ${COMPANY.registrationEn} Company number: ${COMPANY.companyNumber}.`,
        },
        {
          type: 'p',
          text: `For privacy questions or to exercise your rights, contact us at ${CONTACT.privacyEmail}. Our Data Protection Officer is ${CONTACT.dpo}.`,
        },
      ],
    },
    {
      id: 'eu-representative',
      heading: 'EU/EEA representative (Art. 27 GDPR)',
      blocks: [
        {
          type: 'p',
          text: `Our representative in the EU/EEA under Article 27 GDPR is ${CONTACT.euRepName}, reachable at ${CONTACT.euRepEmail}. ${CONTACT.euRepAddressEn}`,
        },
      ],
    },
    {
      id: 'scope',
      heading: '2. Scope and clinical context',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink is a professional tool for clinicians. Where you use the workspace to document patient care, you typically act as the controller for that patient (clinical) data and we act as your processor under a separate data processing agreement. This policy describes our own processing of the personal data of clinicians and visitors (account, billing, support and website data).',
        },
        {
          type: 'p',
          text: 'You are responsible for de-identifying patient material before AI-assisted processing where required by your professional and legal obligations. Psychiatry.Ink provides de-identification workflows to support this, but the clinician remains responsible for what is entered.',
        },
      ],
    },
    {
      id: 'data',
      heading: '3. What personal data we process',
      blocks: [
        { type: 'h3', text: 'Account data' },
        { type: 'p', text: 'Email address, authentication credentials (stored hashed by our authentication provider), and account settings such as language and privacy preferences.' },
        { type: 'h3', text: 'Workspace and content data' },
        { type: 'p', text: 'Clinical documents, notes and case material you create or import. This may include special-category (health) data that you enter; you control what is stored and may use de-identification before AI processing.' },
        { type: 'h3', text: 'Billing data' },
        { type: 'p', text: 'Subscription status and payment metadata processed via our payment provider (Stripe). We do not store full card numbers.' },
        { type: 'h3', text: 'Technical and usage data' },
        { type: 'p', text: 'Log data necessary to operate and secure the service (e.g. request metadata, IP address, timestamps) and audit records of AI-assisted actions.' },
      ],
    },
    {
      id: 'purposes',
      heading: '4. Why we process it and the lawful basis',
      blocks: [
        {
          type: 'ul',
          items: [
            'To provide the workspace and your account — performance of a contract (Art. 6(1)(b) GDPR).',
            'To process payments and prevent abuse — contract and our legitimate interests (Art. 6(1)(b) and (f)).',
            'To secure the service, maintain audit logs and prevent fraud — legitimate interests (Art. 6(1)(f)).',
            'To comply with legal, tax and accounting obligations — legal obligation (Art. 6(1)(c)).',
            'For optional communications — consent, which you may withdraw at any time (Art. 6(1)(a)).',
          ],
        },
        {
          type: 'p',
          text: 'Where you enter special-category (health) data as a controller, you are responsible for the appropriate Article 9 condition; we process it on your documented instructions as your processor.',
        },
      ],
    },
    {
      id: 'ai',
      heading: '5. AI-assisted processing',
      blocks: [
        {
          type: 'p',
          text: 'Optional AI features send the content you submit to AI processing providers acting as our sub-processors to generate suggestions. AI output is never applied to the record automatically — clinician review and acceptance are always required. You can use the workspace without AI features.',
        },
      ],
    },
    {
      id: 'processors',
      heading: '6. Service providers (processors and sub-processors)',
      blocks: [
        { type: 'p', text: 'We use carefully selected providers to operate the service, bound by data processing terms:' },
        {
          type: 'ul',
          items: [
            'Supabase — database, authentication and storage.',
            'Google Cloud (Cloud Run) — application hosting and infrastructure.',
            'Stripe — payment processing.',
            'OpenAI and DeepSeek — AI processing for optional AI-assisted features.',
          ],
        },
        { type: 'p', text: `Hosting region / data residency: ${DATA_RESIDENCY_EN}` },
      ],
    },
    {
      id: 'transfers',
      heading: '7. International transfers',
      blocks: [
        {
          type: 'p',
          text: 'Some providers may process data outside the UK/EEA. Where they do, we rely on appropriate safeguards such as UK and EU Standard Contractual Clauses (and the UK International Data Transfer Addendum) together with supplementary measures.',
        },
      ],
    },
    {
      id: 'retention',
      heading: '8. Retention',
      blocks: [
        {
          type: 'p',
          text: 'We keep account and workspace data for as long as your account is active and then for the period needed to meet legal, tax and security obligations, after which it is deleted or anonymised. You can delete content within the workspace, and you can request account deletion.',
        },
      ],
    },
    {
      id: 'rights',
      heading: '9. Your rights',
      blocks: [
        {
          type: 'p',
          text: 'Subject to conditions in the UK/EU GDPR, you have the right to access, rectification, erasure, restriction, data portability, and objection, and the right to withdraw consent. Where we act as a processor for patient data, please direct those requests to the responsible clinician/controller.',
        },
        {
          type: 'p',
          text: `To exercise your rights, contact ${CONTACT.privacyEmail}. You also have the right to lodge a complaint with a supervisory authority — in the UK, the Information Commissioner's Office (ICO).`,
        },
      ],
    },
    {
      id: 'security',
      heading: '10. Security',
      blocks: [
        {
          type: 'p',
          text: 'We apply technical and organisational measures appropriate to the risk, including encryption in transit, access controls, de-identification workflows and audit logging of AI-assisted actions. No method of transmission or storage is completely secure, but we work to protect your data and review our measures regularly.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '11. Changes to this policy',
      blocks: [
        {
          type: 'p',
          text: 'We may update this policy to reflect changes to the service or the law. Material changes will be communicated through the service or by other appropriate means.',
        },
      ],
    },
  ],
}

const privacyDe: LegalDoc = {
  title: 'Datenschutzerklärung',
  lead: 'Diese Erklärung beschreibt, wie die Psychiatry Ink Ltd personenbezogene Daten bei der Nutzung von Psychiatrie.Ink verarbeitet, sowie Ihre Rechte nach der DSGVO und der UK GDPR.',
  lastUpdatedLabel: lastUpdatedLabel('de'),
  sections: [
    {
      id: 'controller',
      heading: '1. Verantwortlicher',
      blocks: [
        {
          type: 'p',
          text: `Verantwortlich für Psychiatrie.Ink ist die ${COMPANY.legalName}, ${COMPANY.addressDe}. ${COMPANY.registrationDe} Handelsregisternummer: ${COMPANY.companyNumber}.`,
        },
        {
          type: 'p',
          text: `Bei Datenschutzfragen oder zur Ausübung Ihrer Rechte erreichen Sie uns unter ${CONTACT.privacyEmail}. Unser Datenschutzbeauftragter ist ${CONTACT.dpo}.`,
        },
      ],
    },
    {
      id: 'eu-representative',
      heading: 'Vertreter in der EU/im EWR (Art. 27 DSGVO)',
      blocks: [
        {
          type: 'p',
          text: `Unser Vertreter in der EU/im EWR gemäß Art. 27 DSGVO ist ${CONTACT.euRepName}, erreichbar unter ${CONTACT.euRepEmail}. ${CONTACT.euRepAddressDe}`,
        },
      ],
    },
    {
      id: 'scope',
      heading: '2. Geltungsbereich und klinischer Kontext',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink ist ein professionelles Werkzeug für Behandelnde. Soweit Sie den Arbeitsbereich zur Dokumentation der Patientenversorgung nutzen, sind in der Regel Sie der Verantwortliche für diese (klinischen) Patientendaten und wir handeln auf Grundlage eines gesonderten Auftragsverarbeitungsvertrags als Auftragsverarbeiter. Diese Erklärung beschreibt unsere eigene Verarbeitung der Daten von Behandelnden und Besucherinnen und Besuchern (Konto-, Abrechnungs-, Support- und Website-Daten).',
        },
        {
          type: 'p',
          text: 'Sie sind dafür verantwortlich, Patientenmaterial vor einer KI-gestützten Verarbeitung zu de-identifizieren, soweit dies Ihre berufs- und datenschutzrechtlichen Pflichten verlangen. Psychiatrie.Ink stellt hierfür De-Identifikations-Workflows bereit; die Verantwortung für die Eingaben verbleibt bei der behandelnden Person.',
        },
      ],
    },
    {
      id: 'data',
      heading: '3. Welche personenbezogenen Daten wir verarbeiten',
      blocks: [
        { type: 'h3', text: 'Kontodaten' },
        { type: 'p', text: 'E-Mail-Adresse, Anmeldedaten (vom Authentifizierungsdienst gehasht gespeichert) sowie Kontoeinstellungen wie Sprache und Datenschutzpräferenzen.' },
        { type: 'h3', text: 'Arbeitsbereichs- und Inhaltsdaten' },
        { type: 'p', text: 'Klinische Dokumente, Notizen und Fallmaterial, die Sie erstellen oder importieren. Dies kann von Ihnen eingegebene besondere Kategorien personenbezogener Daten (Gesundheitsdaten) umfassen; Sie steuern, was gespeichert wird, und können vor der KI-Verarbeitung eine De-Identifikation nutzen.' },
        { type: 'h3', text: 'Abrechnungsdaten' },
        { type: 'p', text: 'Abonnementstatus und Zahlungsmetadaten, verarbeitet über unseren Zahlungsdienstleister (Stripe). Vollständige Kartennummern speichern wir nicht.' },
        { type: 'h3', text: 'Technische Daten und Nutzungsdaten' },
        { type: 'p', text: 'Protokolldaten, die für Betrieb und Sicherheit erforderlich sind (z. B. Anfrage-Metadaten, IP-Adresse, Zeitstempel), sowie Audit-Aufzeichnungen KI-gestützter Aktionen.' },
      ],
    },
    {
      id: 'purposes',
      heading: '4. Zwecke und Rechtsgrundlagen',
      blocks: [
        {
          type: 'ul',
          items: [
            'Bereitstellung des Arbeitsbereichs und Ihres Kontos — Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).',
            'Zahlungsabwicklung und Missbrauchsprävention — Vertrag und berechtigte Interessen (Art. 6 Abs. 1 lit. b und f).',
            'Absicherung des Dienstes, Audit-Protokolle und Betrugsprävention — berechtigte Interessen (Art. 6 Abs. 1 lit. f).',
            'Erfüllung rechtlicher, steuerlicher und buchhalterischer Pflichten — rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c).',
            'Optionale Kommunikation — Einwilligung, die Sie jederzeit widerrufen können (Art. 6 Abs. 1 lit. a).',
          ],
        },
        {
          type: 'p',
          text: 'Soweit Sie als Verantwortlicher Gesundheitsdaten eingeben, sind Sie für die einschlägige Bedingung nach Art. 9 DSGVO verantwortlich; wir verarbeiten diese Daten weisungsgebunden als Ihr Auftragsverarbeiter.',
        },
      ],
    },
    {
      id: 'ai',
      heading: '5. KI-gestützte Verarbeitung',
      blocks: [
        {
          type: 'p',
          text: 'Optionale KI-Funktionen übermitteln die von Ihnen übergebenen Inhalte an KI-Verarbeitungsdienste, die als unsere Unterauftragsverarbeiter Vorschläge erstellen. KI-Ergebnisse werden niemals automatisch in die Akte übernommen — eine ärztliche Prüfung und Freigabe ist stets erforderlich. Sie können den Arbeitsbereich auch ohne KI-Funktionen nutzen.',
        },
      ],
    },
    {
      id: 'processors',
      heading: '6. Dienstleister (Auftragsverarbeiter und Unterauftragsverarbeiter)',
      blocks: [
        { type: 'p', text: 'Wir setzen sorgfältig ausgewählte Dienstleister ein, die durch Auftragsverarbeitungsbedingungen gebunden sind:' },
        {
          type: 'ul',
          items: [
            'Supabase — Datenbank, Authentifizierung und Speicher.',
            'Google Cloud (Cloud Run) — Hosting der Anwendung und Infrastruktur.',
            'Stripe — Zahlungsabwicklung.',
            'OpenAI und DeepSeek — KI-Verarbeitung für optionale KI-gestützte Funktionen.',
          ],
        },
        { type: 'p', text: `Hosting-Region / Datenresidenz: ${DATA_RESIDENCY_DE}` },
      ],
    },
    {
      id: 'transfers',
      heading: '7. Internationale Datenübermittlung',
      blocks: [
        {
          type: 'p',
          text: 'Einige Dienstleister verarbeiten Daten möglicherweise außerhalb des EWR/Vereinigten Königreichs. In diesen Fällen stützen wir uns auf geeignete Garantien wie die EU- und UK-Standardvertragsklauseln (sowie das UK International Data Transfer Addendum) nebst ergänzenden Maßnahmen.',
        },
      ],
    },
    {
      id: 'retention',
      heading: '8. Speicherdauer',
      blocks: [
        {
          type: 'p',
          text: 'Wir speichern Konto- und Arbeitsbereichsdaten, solange Ihr Konto aktiv ist, und anschließend für den Zeitraum, der zur Erfüllung rechtlicher, steuerlicher und sicherheitsbezogener Pflichten erforderlich ist; danach werden sie gelöscht oder anonymisiert. Sie können Inhalte im Arbeitsbereich löschen und die Löschung Ihres Kontos verlangen.',
        },
      ],
    },
    {
      id: 'rights',
      heading: '9. Ihre Rechte',
      blocks: [
        {
          type: 'p',
          text: 'Nach Maßgabe der DSGVO/UK GDPR haben Sie das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie das Recht, eine Einwilligung zu widerrufen. Soweit wir Patientendaten als Auftragsverarbeiter verarbeiten, richten Sie diese Anliegen bitte an die verantwortliche behandelnde Person (Verantwortlicher).',
        },
        {
          type: 'p',
          text: `Zur Ausübung Ihrer Rechte wenden Sie sich an ${CONTACT.privacyEmail}. Sie haben zudem das Recht, sich bei einer Aufsichtsbehörde zu beschweren — in Deutschland bei der für Ihren Wohnsitz zuständigen Landesdatenschutzbehörde, im Vereinigten Königreich beim Information Commissioner's Office (ICO).`,
        },
      ],
    },
    {
      id: 'security',
      heading: '10. Sicherheit',
      blocks: [
        {
          type: 'p',
          text: 'Wir treffen dem Risiko angemessene technische und organisatorische Maßnahmen, darunter Verschlüsselung bei der Übertragung, Zugriffskontrollen, De-Identifikations-Workflows und Audit-Protokolle KI-gestützter Aktionen. Keine Übertragungs- oder Speichermethode ist vollständig sicher; wir arbeiten daran, Ihre Daten zu schützen, und überprüfen unsere Maßnahmen regelmäßig.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '11. Änderungen dieser Erklärung',
      blocks: [
        {
          type: 'p',
          text: 'Wir können diese Erklärung anpassen, um Änderungen des Dienstes oder der Rechtslage abzubilden. Über wesentliche Änderungen informieren wir über den Dienst oder auf andere geeignete Weise.',
        },
      ],
    },
  ],
}

/* ────────────────────────────── TERMS ───────────────────────────────────── */

const termsEn: LegalDoc = {
  title: 'Terms of service',
  lead: 'These terms govern your use of Psychiatry.Ink. By creating an account or using the service you agree to them.',
  lastUpdatedLabel: lastUpdatedLabel('en'),
  sections: [
    {
      id: 'provider',
      heading: '1. Provider',
      blocks: [
        {
          type: 'p',
          text: `Psychiatry.Ink is provided by ${COMPANY.legalName}, ${COMPANY.addressEn}. ${COMPANY.registrationEn} Company number: ${COMPANY.companyNumber}. Contact: ${CONTACT.generalEmail}.`,
        },
      ],
    },
    {
      id: 'service',
      heading: '2. The service',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink is a secure psychiatric workspace for documentation, case discussion, psychopharmacology reference, treatment planning, clinical tools and optional AI-assisted features. The service is intended for use by qualified healthcare professionals.',
        },
      ],
    },
    {
      id: 'clinical',
      heading: '3. Clinical responsibility (important)',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink supports, but does not replace, the judgement of a qualified clinician. It does not diagnose patients, does not make autonomous treatment decisions and is not a medical device for automated decision-making. AI-assisted suggestions require clinician review and acceptance before any use. All clinical decisions remain the sole responsibility of the treating clinician.',
        },
        {
          type: 'p',
          text: 'The service is not intended for emergency or crisis use. In an emergency, contact your local emergency services.',
        },
      ],
    },
    {
      id: 'accounts',
      heading: '4. Accounts and acceptable use',
      blocks: [
        {
          type: 'ul',
          items: [
            'You must provide accurate registration information and keep your credentials secure.',
            'You are responsible for activity under your account and for complying with your professional, legal and data-protection obligations, including lawful handling and de-identification of patient data.',
            'You must not misuse the service, attempt to breach its security, or use it unlawfully.',
          ],
        },
      ],
    },
    {
      id: 'billing',
      heading: '5. Subscriptions, trials and billing',
      blocks: [
        {
          type: 'p',
          text: 'Individual use includes a one-month free trial with 500 AI credits, after which paid subscription pricing applies (£24.99/month or £239.90/year, as shown on the pricing page). Payments are processed by Stripe. Prices may change with notice; changes do not affect the current paid period.',
        },
        { type: 'p', text: 'Statutory consumer cancellation/withdrawal rights, where applicable, are unaffected by these terms.' },
      ],
    },
    {
      id: 'ip',
      heading: '6. Your content and intellectual property',
      blocks: [
        {
          type: 'p',
          text: 'You retain all rights to the content you enter. You grant us the limited rights necessary to host and process that content to provide the service. We retain all rights in the Psychiatry.Ink software, brand and content we provide.',
        },
      ],
    },
    {
      id: 'availability',
      heading: '7. Availability',
      blocks: [
        {
          type: 'p',
          text: 'We work to keep the service available and secure but do not guarantee uninterrupted availability. We may modify or discontinue features with reasonable notice where practicable.',
        },
      ],
    },
    {
      id: 'liability',
      heading: '8. Disclaimers and limitation of liability',
      blocks: [
        {
          type: 'p',
          text: 'To the extent permitted by law, the service is provided "as is" without warranties. Nothing in these terms limits liability that cannot be limited by law (including for death or personal injury caused by negligence, or fraud). Subject to that, our aggregate liability is limited as set out in your subscription agreement. We are not liable for clinical decisions, which remain the responsibility of the treating clinician.',
        },
      ],
    },
    {
      id: 'law',
      heading: '9. Governing law',
      blocks: [
        {
          type: 'p',
          text: 'These terms are governed by the laws of England and Wales, without prejudice to mandatory consumer-protection rights you may have in your country of residence.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '10. Changes',
      blocks: [
        {
          type: 'p',
          text: 'We may update these terms; we will communicate material changes through the service. Continued use after changes take effect constitutes acceptance.',
        },
      ],
    },
  ],
}

const termsDe: LegalDoc = {
  title: 'Allgemeine Geschäftsbedingungen',
  lead: 'Diese Bedingungen regeln Ihre Nutzung von Psychiatrie.Ink. Mit der Erstellung eines Kontos oder der Nutzung des Dienstes stimmen Sie ihnen zu.',
  lastUpdatedLabel: lastUpdatedLabel('de'),
  sections: [
    {
      id: 'provider',
      heading: '1. Anbieter',
      blocks: [
        {
          type: 'p',
          text: `Psychiatrie.Ink wird bereitgestellt von der ${COMPANY.legalName}, ${COMPANY.addressDe}. ${COMPANY.registrationDe} Handelsregisternummer: ${COMPANY.companyNumber}. Kontakt: ${CONTACT.generalEmail}.`,
        },
      ],
    },
    {
      id: 'service',
      heading: '2. Der Dienst',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink ist ein sicherer psychiatrischer Arbeitsbereich für Dokumentation, Fallbesprechung, psychopharmakologische Referenz, Therapieplanung, klinische Tools und optionale KI-gestützte Funktionen. Der Dienst richtet sich an qualifizierte Angehörige der Gesundheitsberufe.',
        },
      ],
    },
    {
      id: 'clinical',
      heading: '3. Ärztliche Verantwortung (wichtig)',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink unterstützt die ärztliche Beurteilung, ersetzt sie aber nicht. Der Dienst stellt keine Diagnosen, trifft keine autonomen Therapieentscheidungen und ist kein Medizinprodukt zur automatisierten Entscheidungsfindung. KI-gestützte Vorschläge erfordern vor jeder Verwendung eine ärztliche Prüfung und Freigabe. Alle klinischen Entscheidungen liegen allein in der Verantwortung der behandelnden Person.',
        },
        {
          type: 'p',
          text: 'Der Dienst ist nicht für Notfall- oder Krisensituationen vorgesehen. Wenden Sie sich im Notfall an die örtlichen Rettungsdienste.',
        },
      ],
    },
    {
      id: 'accounts',
      heading: '4. Konten und zulässige Nutzung',
      blocks: [
        {
          type: 'ul',
          items: [
            'Sie machen bei der Registrierung zutreffende Angaben und halten Ihre Zugangsdaten geheim.',
            'Sie sind für die Aktivitäten unter Ihrem Konto verantwortlich und für die Einhaltung Ihrer berufs-, rechts- und datenschutzrechtlichen Pflichten, einschließlich des rechtmäßigen Umgangs mit und der De-Identifikation von Patientendaten.',
            'Sie dürfen den Dienst nicht missbräuchlich nutzen, seine Sicherheit nicht zu umgehen versuchen und ihn nicht rechtswidrig einsetzen.',
          ],
        },
      ],
    },
    {
      id: 'billing',
      heading: '5. Abonnements, Testphasen und Abrechnung',
      blocks: [
        {
          type: 'p',
          text: 'Die Einzelnutzung umfasst eine einmonatige kostenlose Testphase mit 500 KI-Credits; danach gilt die kostenpflichtige Abonnement-Preisgestaltung (£24,99/Monat oder £239,90/Jahr gemäß Preisseite). Zahlungen werden über Stripe abgewickelt. Preise können mit Vorankündigung geändert werden; Änderungen berühren den laufenden bezahlten Zeitraum nicht.',
        },
        { type: 'p', text: 'Gesetzliche Widerrufs-/Kündigungsrechte von Verbrauchern bleiben, soweit anwendbar, unberührt.' },
      ],
    },
    {
      id: 'ip',
      heading: '6. Ihre Inhalte und geistiges Eigentum',
      blocks: [
        {
          type: 'p',
          text: 'Alle Rechte an den von Ihnen eingegebenen Inhalten verbleiben bei Ihnen. Sie räumen uns die begrenzten Rechte ein, die zum Hosten und Verarbeiten dieser Inhalte für die Erbringung des Dienstes erforderlich sind. Alle Rechte an der Psychiatrie.Ink-Software, der Marke und den von uns bereitgestellten Inhalten verbleiben bei uns.',
        },
      ],
    },
    {
      id: 'availability',
      heading: '7. Verfügbarkeit',
      blocks: [
        {
          type: 'p',
          text: 'Wir bemühen uns, den Dienst verfügbar und sicher zu halten, garantieren jedoch keine ununterbrochene Verfügbarkeit. Wir können Funktionen mit angemessener Vorankündigung ändern oder einstellen, soweit praktikabel.',
        },
      ],
    },
    {
      id: 'liability',
      heading: '8. Haftung und Gewährleistung',
      blocks: [
        {
          type: 'p',
          text: 'Soweit gesetzlich zulässig, wird der Dienst „wie besehen" ohne Gewährleistung bereitgestellt. Eine Haftung, die nach geltendem Recht nicht beschränkt werden kann (insbesondere bei Verletzung von Leben, Körper und Gesundheit oder bei Vorsatz/grober Fahrlässigkeit), bleibt unberührt. Im Übrigen ist unsere Haftung gemäß Ihrem Abonnementvertrag begrenzt. Für klinische Entscheidungen, die in der Verantwortung der behandelnden Person verbleiben, haften wir nicht.',
        },
      ],
    },
    {
      id: 'law',
      heading: '9. Anwendbares Recht',
      blocks: [
        {
          type: 'p',
          text: 'Es gilt das Recht von England und Wales, unbeschadet zwingender verbraucherschützender Rechte, die Ihnen in Ihrem Wohnsitzstaat zustehen.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '10. Änderungen',
      blocks: [
        {
          type: 'p',
          text: 'Wir können diese Bedingungen anpassen; wesentliche Änderungen teilen wir über den Dienst mit. Die fortgesetzte Nutzung nach Inkrafttreten gilt als Zustimmung.',
        },
      ],
    },
  ],
}

/* ──────────────────────────── IMPRESSUM ─────────────────────────────────── */

const impressumDe: LegalDoc = {
  title: 'Impressum',
  lead: 'Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG).',
  lastUpdatedLabel: lastUpdatedLabel('de'),
  sections: [
    {
      id: 'provider',
      heading: 'Diensteanbieter',
      blocks: [
        {
          type: 'p',
          text: `${COMPANY.legalName}\n${COMPANY.addressDe}\n${COMPANY.registrationDe} Handelsregisternummer: ${COMPANY.companyNumber}.`,
        },
      ],
    },
    {
      id: 'represented',
      heading: 'Vertreten durch',
      blocks: [{ type: 'p', text: CONTACT.representative }],
    },
    {
      id: 'contact',
      heading: 'Kontakt',
      blocks: [{ type: 'p', text: `E-Mail: ${CONTACT.generalEmail}` }],
    },
    {
      id: 'responsible',
      heading: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV',
      blocks: [
        {
          type: 'p',
          text: `${CONTACT.representative} — Anschrift wie oben.`,
        },
      ],
    },
    {
      id: 'dispute',
      heading: 'Streitbeilegung',
      blocks: [
        {
          type: 'p',
          text: 'Wir sind nicht verpflichtet und grundsätzlich nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
        },
      ],
    },
  ],
}

const impressumEn: LegalDoc = {
  title: 'Legal notice',
  lead: 'Provider identification for Psychiatry.Ink.',
  lastUpdatedLabel: lastUpdatedLabel('en'),
  sections: [
    {
      id: 'provider',
      heading: 'Service provider',
      blocks: [
        {
          type: 'p',
          text: `${COMPANY.legalName}\n${COMPANY.addressEn}\n${COMPANY.registrationEn} Company number: ${COMPANY.companyNumber}.`,
        },
      ],
    },
    {
      id: 'represented',
      heading: 'Represented by',
      blocks: [{ type: 'p', text: CONTACT.representative }],
    },
    {
      id: 'contact',
      heading: 'Contact',
      blocks: [{ type: 'p', text: `Email: ${CONTACT.generalEmail}` }],
    },
  ],
}

export type LegalPageKey = 'privacy' | 'terms' | 'impressum'

const LEGAL_DOCS: Record<LegalPageKey, Record<PublicLocale, LegalDoc>> = {
  privacy: { en: privacyEn, de: privacyDe },
  terms: { en: termsEn, de: termsDe },
  impressum: { en: impressumEn, de: impressumDe },
}

export function getLegalDoc(key: LegalPageKey, locale: PublicLocale): LegalDoc {
  return LEGAL_DOCS[key][locale]
}
