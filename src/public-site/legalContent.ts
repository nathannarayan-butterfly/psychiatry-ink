import type { PublicLocale } from './publicRoutes'
import { localizedPath } from './publicRoutes'
import { LEGAL_LAST_UPDATED } from '../../shared/legalVersion'

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
  /** Authorised representative ("Vertreten durch") + responsible for content (§ 18 MStV). */
  representative: 'Nathan Narayan',
} as const

/**
 * LEGAL NOTE — kept deliberately conservative:
 * - EU/EEA Art. 27 GDPR representative: NOT named. The Privacy/Datenschutz pages
 *   state only that a representative will be appointed and published before the
 *   service is made available for processing EU/EEA personal data, where legally
 *   required. Do NOT name a person or a postal address here.
 * - Data Protection Officer: NOT named and NOT asserted to be appointed. Only the
 *   data-protection contact email (CONTACT.privacyEmail) is published.
 * - The Impressum representation / §18 Abs. 2 MStV responsibility intentionally
 *   still names CONTACT.representative (Nathan Narayan) — that is separate from
 *   the DPO/Art. 27 roles above.
 *
 * The company is not VAT-registered, no ICO registration number is published,
 * and no contact phone number is published — those lines are intentionally
 * omitted from the Impressum / legal notice rather than shown as placeholders.
 */

export type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'h3'; text: string }
  | { type: 'link'; text: string; href: string }

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

/**
 * ISO date the legal copy was authored / last reviewed. Re-exported from the
 * `shared/` module so the server-side consent recording imports the exact same
 * constant (see `shared/legalVersion.ts`).
 */
export { LEGAL_LAST_UPDATED }

function lastUpdatedLabel(locale: PublicLocale): string {
  return locale === 'de'
    ? `Zuletzt aktualisiert: 27. Juni 2026`
    : `Last updated: 27 June 2026`
}

/* ───────────────────────────── PRIVACY ──────────────────────────────────── */

const privacyEn: LegalDoc = {
  title: 'Privacy Notice',
  lead: 'This Privacy Notice explains how Psychiatry Ink Ltd collects, uses, stores, shares, and protects personal data when you visit our website, create an account, use Psychiatry.Ink, contact us, or interact with our services.',
  lastUpdatedLabel: lastUpdatedLabel('en'),
  sections: [
    {
      id: 'controller',
      heading: '1. Who we are',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd\n71–75 Shelton Street\nCovent Garden\nLondon, WC2H 9JQ\nUnited Kingdom',
        },
        {
          type: 'p',
          text: 'Registered in England and Wales.\nCompany number: 17275704.',
        },
        { type: 'p', text: 'General enquiries:' },
        { type: 'link', text: 'hello@psychiatry.ink', href: 'mailto:hello@psychiatry.ink' },
        { type: 'p', text: 'Data protection enquiries:' },
        { type: 'link', text: 'data-protection@psychiatry.ink', href: 'mailto:data-protection@psychiatry.ink' },
      ],
    },
    {
      id: 'eu-representative',
      heading: 'EU/EEA representative (Art. 27 GDPR)',
      blocks: [
        {
          type: 'p',
          text: 'Where required under Article 27 GDPR, Psychiatry Ink Ltd will appoint an EU/EEA representative, and the representative’s details will be published here once appointed.',
        },
        {
          type: 'p',
          text: 'No EU/EEA representative has been appointed at this time. Until an EU/EEA representative is appointed and published, Psychiatry Ink Ltd does not state that it has appointed one.',
        },
      ],
    },
    {
      id: 'scope',
      heading: '2. Scope of this notice',
      blocks: [
        { type: 'p', text: 'This notice applies to:' },
        {
          type: 'ul',
          items: [
            'visitors to our public websites, including psychiatry.ink and related country or language versions;',
            'users who create an account or use Psychiatry.Ink;',
            'organisations that subscribe to Psychiatry.Ink;',
            'people who contact us for support, billing, security, or legal enquiries;',
            'limited clinical or patient-related data processed inside the service on behalf of professional users or healthcare organisations.',
          ],
        },
        {
          type: 'p',
          text: 'This notice does not replace the privacy notice that a doctor, clinic, hospital, or healthcare organisation must provide to its own patients.',
        },
      ],
    },
    {
      id: 'roles',
      heading: '3. Our role: controller and processor',
      blocks: [
        {
          type: 'p',
          text: 'For website, account, billing, support, security, marketing, and business-administration data, Psychiatry Ink Ltd is usually the controller.',
        },
        {
          type: 'p',
          text: 'For patient-related clinical content entered by a professional user or organisation into the Psychiatry.Ink workspace, the customer is usually the controller and Psychiatry Ink Ltd is usually the processor. In that case, we process the data only on the customer’s documented instructions and under the applicable Data Processing Agreement.',
        },
        {
          type: 'p',
          text: 'Some product modes are designed to minimise server-side patient identifiers. For example, patient names, dates of birth, and patient-to-document mapping may remain in the clinician’s local encrypted vault where that configuration is enabled. Users remain responsible for using the privacy settings correctly and for avoiding unnecessary identifiers in AI prompts, dictation, support tickets, or free-text fields.',
        },
      ],
    },
    {
      id: 'data',
      heading: '4. Personal data we collect',
      blocks: [
        { type: 'p', text: 'Depending on how you use the service, we may process:' },
        { type: 'h3', text: 'Account and organisation data' },
        { type: 'p', text: 'Name, professional title, email address, organisation name, role, login information, subscription status, country, language, and account settings.' },
        { type: 'h3', text: 'Billing and payment data' },
        { type: 'p', text: 'Plan, invoice details, billing address, VAT or tax details where applicable, payment status, transaction identifiers, and limited payment metadata. Card details are normally processed by our payment provider and are not stored by Psychiatry Ink Ltd.' },
        { type: 'h3', text: 'Support and communication data' },
        { type: 'p', text: 'Emails, contact-form messages, support requests, security reports, attachments you provide, and related correspondence metadata.' },
        { type: 'h3', text: 'Technical and security data' },
        { type: 'p', text: 'IP address, device information, browser type, operating system, login times, error logs, audit logs, access logs, cookie identifiers, security events, and diagnostic telemetry.' },
        { type: 'h3', text: 'Product usage data' },
        { type: 'p', text: 'Feature usage, credit usage, AI model selected, token or API usage metadata, document type selected, generation status, error reports, and user preferences.' },
        { type: 'h3', text: 'Clinical workspace data' },
        { type: 'p', text: 'Clinical notes, dictated text, generated drafts, medication notes, laboratory values, templates, risk-assessment text, and other content entered or generated by the user. This data may include health data or other special category data if entered by the user.' },
        { type: 'h3', text: 'AI processing data' },
        { type: 'p', text: 'Text, prompts, instructions, clinical snippets, de-identified material, dictated content, audio snippets, generated outputs, and model metadata may be processed by AI providers when the user uses AI features.' },
      ],
    },
    {
      id: 'do-not-submit',
      heading: '5. Data we ask users not to submit unnecessarily',
      blocks: [
        {
          type: 'p',
          text: 'Users should not submit patient names, direct identifiers, unnecessary addresses, unnecessary legal identifiers, or other excessive personal data to AI features, support tickets, or contact forms unless this is permitted under their local law, professional obligations, patient information framework, and the applicable agreement with Psychiatry Ink Ltd.',
        },
      ],
    },
    {
      id: 'purposes',
      heading: '6. Purposes of processing',
      blocks: [
        { type: 'p', text: 'We process personal data to:' },
        {
          type: 'ul',
          items: [
            'provide, maintain, secure, and improve Psychiatry.Ink;',
            'create and manage user accounts and organisations;',
            'provide documentation, dictation, template, AI, medication, laboratory, and workflow functions;',
            'process subscriptions, invoices, payments, and credits;',
            'provide support and respond to enquiries;',
            'monitor security, prevent abuse, investigate incidents, and protect the service;',
            'comply with legal, regulatory, tax, accounting, and contractual obligations;',
            'send service notices, security notices, legal updates, and product communications;',
            'analyse aggregated or de-identified usage trends to improve performance and reliability.',
          ],
        },
      ],
    },
    {
      id: 'lawful-bases',
      heading: '7. Lawful bases',
      blocks: [
        {
          type: 'p',
          text: 'Where Psychiatry Ink Ltd acts as controller, we rely on one or more of the following lawful bases, depending on context:',
        },
        {
          type: 'ul',
          items: [
            'Contract: to provide the service, manage accounts, process subscriptions, and provide support.',
            'Legal obligation: to comply with tax, accounting, company, security, and regulatory obligations.',
            'Legitimate interests: to secure, maintain, improve, and administer the service, prevent fraud or misuse, and communicate with professional users.',
            'Consent: for non-essential cookies, optional marketing communications, or optional features where consent is required.',
          ],
        },
        {
          type: 'p',
          text: 'Where we process clinical or patient-related data as a processor, the customer is responsible for identifying the applicable lawful basis and any Article 9 or equivalent condition for special category health data.',
        },
      ],
    },
    {
      id: 'special-category',
      heading: '8. Special category data and clinical data',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink is intended for psychiatric documentation and may process health data if users enter it. Health data is sensitive. We apply technical and organisational measures intended to reduce unnecessary exposure, including encryption, access control, audit logging, minimisation, and de-identification features where available.',
        },
        {
          type: 'p',
          text: 'Users must ensure that real patient data is processed only where they have the required legal basis, professional authority, patient information framework, institutional approval, and data-processing agreement.',
        },
      ],
    },
    {
      id: 'ai',
      heading: '9. AI providers and model processing',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink may use external AI providers to provide dictation, transcription, summarisation, drafting, editing, document generation, and clinical text-support functions. Depending on the selected feature and model, providers may include:',
        },
        {
          type: 'ul',
          items: [
            'OpenAI;',
            'Google / Gemini;',
            'DeepSeek;',
            'Mistral;',
            'other providers listed in our sub-processor documentation.',
          ],
        },
        {
          type: 'p',
          text: 'The data sent to AI providers depends on the feature used, the model selected, and the user’s privacy settings. We aim to minimise identifiers and unnecessary clinical details. Users must review all AI-generated outputs before clinical use.',
        },
        {
          type: 'p',
          text: 'We do not authorise AI providers to use customer clinical content for unrelated purposes. Provider-specific retention, abuse-monitoring, and security controls are described in the applicable provider terms and contractual documents.',
        },
      ],
    },
    {
      id: 'cookies',
      heading: '10. Cookies and similar technologies',
      blocks: [
        {
          type: 'p',
          text: 'We use strictly necessary cookies to operate the website and service. We use non-essential cookies, such as analytics or marketing cookies, only where enabled and where required consent has been obtained.',
        },
      ],
    },
    {
      id: 'sharing',
      heading: '11. Sharing personal data',
      blocks: [
        { type: 'p', text: 'We may share personal data with:' },
        {
          type: 'ul',
          items: [
            'hosting and infrastructure providers;',
            'database and authentication providers;',
            'AI, transcription, and language-model providers;',
            'payment and billing providers;',
            'email and communication providers;',
            'security, logging, monitoring, and analytics providers;',
            'professional advisers, auditors, insurers, and legal representatives;',
            'public authorities where required by law.',
          ],
        },
        {
          type: 'p',
          text: 'A current list of sub-processors is available on request and in the applicable Data Processing Agreement.',
        },
      ],
    },
    {
      id: 'transfers',
      heading: '12. International transfers',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd is based in the United Kingdom. Some providers may process data in the UK, EEA, United States, or other countries. Where data is transferred internationally, we use appropriate safeguards where required, such as adequacy decisions, the UK International Data Transfer Agreement, the UK Addendum to EU Standard Contractual Clauses, EU Standard Contractual Clauses, or other legally recognised safeguards.',
        },
      ],
    },
    {
      id: 'retention',
      heading: '13. Retention',
      blocks: [
        {
          type: 'p',
          text: 'We retain personal data only for as long as necessary for the purposes described in this notice, unless a longer period is required by law or needed to establish, exercise, or defend legal claims.',
        },
        { type: 'p', text: 'Indicative retention periods by data category:' },
        {
          type: 'ul',
          items: [
            'Account and organisation data: for the life of the account, then deleted or anonymised after closure according to our retention schedule.',
            'Billing, invoice, and tax records: for the statutory tax and accounting retention periods.',
            'Support correspondence: kept only as long as needed to handle the enquiry, unless needed longer for legal or security reasons.',
            'Security and audit logs: kept for a limited period appropriate to security needs, unless needed longer for investigation.',
            'Clinical workspace data: controlled by the customer’s configuration, retention settings, deletion requests, and applicable Data Processing Agreement.',
            'Backups: overwritten or deleted on a rolling basis according to the backup retention schedule.',
            'Dictation or audio data: not stored by default where technically configured; if stored for processing or troubleshooting, deleted within a short, defined period.',
          ],
        },
        {
          type: 'p',
          text: 'Account closure and deletion windows: if you cancel your subscription, your account becomes dormant and you can reactivate it within 90 days; if you do not, your account and all associated personal data are permanently deleted at the end of that 90-day period. If you request account deletion directly, your subscription is cancelled immediately and your account enters a 30-day grace period during which you can cancel the deletion; after 30 days your account and all associated personal data are permanently deleted. Data shared into organisations you do not solely control, and records subject to statutory retention duties, are handled separately as described in this notice.',
        },
      ],
    },
    {
      id: 'security',
      heading: '14. Security',
      blocks: [
        {
          type: 'p',
          text: 'We use technical and organisational measures designed to protect personal data, including encryption in transit, access controls, audit logs, infrastructure security controls, role-based access, and product-level privacy settings. Some modes include client-side encrypted local storage so that direct patient identifiers and mappings remain on the user’s device.',
        },
        {
          type: 'p',
          text: 'No internet service is completely secure. Users must protect their own devices, passwords, local encryption keys, browser profiles, and institutional access controls.',
        },
      ],
    },
    {
      id: 'rights',
      heading: '15. Your rights',
      blocks: [
        { type: 'p', text: 'Depending on your location and the applicable law, you may have rights to:' },
        {
          type: 'ul',
          items: [
            'access your personal data;',
            'correct inaccurate data;',
            'delete data;',
            'restrict processing;',
            'object to processing;',
            'receive a portable copy of data;',
            'withdraw consent where processing is based on consent;',
            'complain to a data protection authority.',
          ],
        },
        { type: 'p', text: 'To exercise these rights, contact:' },
        { type: 'link', text: 'data-protection@psychiatry.ink', href: 'mailto:data-protection@psychiatry.ink' },
        {
          type: 'p',
          text: 'If we process patient-related data only as a processor, we may need to forward the request to the relevant doctor, clinic, or organisation acting as controller.',
        },
      ],
    },
    {
      id: 'supervisory',
      heading: '16. Supervisory authorities',
      blocks: [
        {
          type: 'p',
          text: 'For UK-related data protection matters, you may contact the Information Commissioner’s Office (ICO).',
        },
        {
          type: 'p',
          text: 'For EU/EEA-related matters, you may contact your local supervisory authority. If an EU/EEA representative is required and appointed, their details will be shown above.',
        },
      ],
    },
    {
      id: 'children',
      heading: '17. Children',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink is not directed at children and is intended for professional users. Clinical users may document care relating to minors only where legally and professionally authorised.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '18. Changes to this notice',
      blocks: [
        {
          type: 'p',
          text: 'We may update this Privacy Notice from time to time. The latest version will be published on this page with the updated date. Material changes may also be communicated by email, in-app notice, or account notice.',
        },
      ],
    },
  ],
}

const privacyDe: LegalDoc = {
  title: 'Datenschutzerklärung',
  lead: 'Diese Datenschutzerklärung beschreibt, wie die Psychiatry Ink Ltd personenbezogene Daten bei der Nutzung von Psychiatrie.Ink verarbeitet. Sie erläutert außerdem Ihre Rechte nach der Datenschutz-Grundverordnung (DSGVO), soweit anwendbar nach der UK GDPR, sowie nach ergänzenden datenschutzrechtlichen Vorschriften.\n\nPsychiatrie.Ink ist ein professionelles Dokumentations- und Assistenzsystem für Behandelnde. Die Anwendung ersetzt keine ärztliche Prüfung, keine medizinische Entscheidung und keine berufsrechtliche Verantwortung der behandelnden Person.',
  lastUpdatedLabel: lastUpdatedLabel('de'),
  sections: [
    {
      id: 'controller',
      heading: '1. Verantwortlicher und Datenschutzkontakt',
      blocks: [
        {
          type: 'p',
          text: 'Verantwortlich für die Verarbeitung personenbezogener Daten im Rahmen des Betriebs von Psychiatrie.Ink ist:',
        },
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd\n71–75 Shelton Street\nCovent Garden\nLondon, WC2H 9JQ\nVereinigtes Königreich',
        },
        {
          type: 'p',
          text: 'Eingetragen in England und Wales.\nCompany number: 17275704.',
        },
        {
          type: 'p',
          text: 'Für Datenschutzfragen, Betroffenenrechte und sonstige datenschutzbezogene Anliegen erreichen Sie uns unter:',
        },
        { type: 'link', text: 'data-protection@psychiatry.ink', href: 'mailto:data-protection@psychiatry.ink' },
      ],
    },
    {
      id: 'eu-representative',
      heading: '2. Vertreter in der EU/im EWR nach Art. 27 DSGVO',
      blocks: [
        {
          type: 'p',
          text: 'Da die Psychiatry Ink Ltd ihren Sitz im Vereinigten Königreich hat und Psychiatrie.Ink auch für Nutzerinnen und Nutzer in der Europäischen Union bzw. im Europäischen Wirtschaftsraum bereitgestellt werden kann, wird vor der produktiven Bereitstellung des Dienstes für die Verarbeitung personenbezogener Daten aus der EU/dem EWR ein Vertreter nach Art. 27 DSGVO benannt, soweit dies gesetzlich erforderlich ist.',
        },
        {
          type: 'p',
          text: 'EU-/EWR-Vertreter nach Art. 27 DSGVO:\n[Name/Firma einsetzen]\n[Anschrift einsetzen]\n[E-Mail-Adresse einsetzen]',
        },
        {
          type: 'p',
          text: 'Der EU-/EWR-Vertreter dient als zusätzliche Anlaufstelle für betroffene Personen und Datenschutzaufsichtsbehörden in der EU/im EWR. Die Benennung des Vertreters berührt nicht die Verantwortlichkeit der Psychiatry Ink Ltd.',
        },
        {
          type: 'p',
          text: 'Bis zur Benennung und Veröffentlichung des EU-/EWR-Vertreters sollte der Dienst nicht für eine produktive Verarbeitung personenbezogener Gesundheitsdaten aus der EU/dem EWR eingesetzt werden, soweit Art. 27 DSGVO anwendbar ist.',
        },
      ],
    },
    {
      id: 'roles',
      heading: '3. Rollenverteilung: Verantwortlicher und Auftragsverarbeiter',
      blocks: [
        {
          type: 'p',
          text: 'Für bestimmte Verarbeitungsvorgänge ist die Psychiatry Ink Ltd selbst Verantwortlicher. Dies betrifft insbesondere:',
        },
        {
          type: 'p',
          text: 'Kontoverwaltung, Registrierung und Login, Abrechnung, Vertragsverwaltung, Support-Kommunikation, Website-Betrieb, Sicherheitsprotokolle, Missbrauchsprävention und gesetzliche Aufbewahrungspflichten.',
        },
        {
          type: 'p',
          text: 'Soweit Behandelnde Psychiatrie.Ink zur Erstellung, Bearbeitung oder Speicherung klinischer Dokumentation verwenden, sind in der Regel die jeweilige behandelnde Person, Praxis, Klinik, Einrichtung oder Organisation der Verantwortliche für diese Patientendaten. In diesem Verhältnis handelt die Psychiatry Ink Ltd grundsätzlich als Auftragsverarbeiter nach Art. 28 DSGVO.',
        },
        {
          type: 'p',
          text: 'Vor der produktiven Verarbeitung personenbezogener Patientendaten muss ein Auftragsverarbeitungsvertrag bzw. Data Processing Agreement abgeschlossen werden. Dieser regelt insbesondere Gegenstand und Dauer der Verarbeitung, Art und Zweck der Verarbeitung, Kategorien personenbezogener Daten, Kategorien betroffener Personen, Weisungen des Verantwortlichen, technische und organisatorische Maßnahmen, Unterauftragsverarbeiter, Unterstützung bei Betroffenenrechten, Löschung und Rückgabe von Daten sowie Kontrollrechte.',
        },
        {
          type: 'p',
          text: 'Diese Datenschutzerklärung ersetzt keinen Auftragsverarbeitungsvertrag.',
        },
      ],
    },
    {
      id: 'clinical-context',
      heading: '4. Klinischer Kontext und besondere Kategorien personenbezogener Daten',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink kann zur Verarbeitung psychiatrischer, medizinischer und sonstiger klinischer Informationen verwendet werden. Diese Informationen können Gesundheitsdaten und damit besondere Kategorien personenbezogener Daten im Sinne von Art. 9 DSGVO enthalten.',
        },
        {
          type: 'p',
          text: 'Die Verantwortung für die Rechtmäßigkeit der Eingabe, Speicherung und Nutzung von Patientendaten liegt beim jeweiligen Verantwortlichen, also in der Regel bei der behandelnden Person oder Einrichtung. Dazu gehören insbesondere die Prüfung der einschlägigen Rechtsgrundlage, berufsrechtliche Pflichten, Schweigepflicht, Dokumentationspflichten, Aufbewahrungspflichten und Informationspflichten gegenüber Patientinnen und Patienten.',
        },
        {
          type: 'p',
          text: 'Psychiatrie.Ink stellt Funktionen zur Datenminimierung, Pseudonymisierung bzw. De-Identifikation bereit. Eine De-Identifikation ist jedoch nicht automatisch mit vollständiger Anonymisierung gleichzusetzen. Ob Daten tatsächlich anonym sind, hängt vom Einzelfall, vom Kontext und von verfügbaren Zusatzinformationen ab.',
        },
      ],
    },
    {
      id: 'data-categories',
      heading: '5. Kategorien personenbezogener Daten',
      blocks: [
        {
          type: 'p',
          text: 'Wir können folgende Kategorien personenbezogener Daten verarbeiten:',
        },
        { type: 'h3', text: '5.1 Konto- und Registrierungsdaten' },
        {
          type: 'p',
          text: 'Hierzu gehören insbesondere Name, E-Mail-Adresse, Login-Daten, Authentifizierungsinformationen, Kontoeinstellungen, Spracheinstellungen, Organisation, Rolle, Abonnementstatus und Sicherheitspräferenzen. Passwörter werden nicht im Klartext gespeichert.',
        },
        { type: 'h3', text: '5.2 Nutzungs- und Arbeitsbereichsdaten' },
        {
          type: 'p',
          text: 'Hierzu gehören Inhalte, die Sie in Psychiatrie.Ink erstellen, eingeben, diktieren, importieren oder bearbeiten. Dazu können klinische Notizen, Verlaufsdokumentationen, Anamnesen, psychopathologische Befunde, Arztbriefe, Medikationsinformationen, Laborwerte, Risikoeinschätzungen, Vorlagen, Anhänge und sonstige Falldaten gehören.',
        },
        {
          type: 'p',
          text: 'Soweit diese Inhalte Patientendaten enthalten, werden sie im Verhältnis zum jeweiligen Verantwortlichen grundsätzlich als Auftragsverarbeitung verarbeitet.',
        },
        { type: 'h3', text: '5.3 KI-Nutzungs- und Auditdaten' },
        {
          type: 'p',
          text: 'Bei Nutzung KI-gestützter Funktionen können technische und organisatorische Protokolle entstehen, etwa Zeitpunkt der Anfrage, verwendete Funktion, ausgewähltes KI-Modell, Token- oder Credit-Verbrauch, Fehlermeldungen, Sicherheitsereignisse, Freigabestatus und Audit-Einträge.',
        },
        {
          type: 'p',
          text: 'Soweit möglich, werden Audit- und Nutzungsprotokolle datenminimiert und ohne unnötige klinische Freitextinhalte geführt. Vollständige klinische Inhalte werden nur gespeichert, soweit dies zur Bereitstellung der Funktion, zur Dokumentation im Arbeitsbereich oder zur Erfüllung gesetzlicher bzw. vertraglicher Pflichten erforderlich ist.',
        },
        { type: 'h3', text: '5.4 Abrechnungs- und Zahlungsdaten' },
        {
          type: 'p',
          text: 'Wir verarbeiten Abonnementstatus, Rechnungsinformationen, Zahlungsstatus, Transaktionsmetadaten, Umsatzsteuerinformationen und ähnliche Vertragsdaten. Zahlungsdaten werden über unseren Zahlungsdienstleister Stripe verarbeitet. Vollständige Kreditkartennummern werden von uns nicht gespeichert.',
        },
        { type: 'h3', text: '5.5 Support- und Kommunikationsdaten' },
        {
          type: 'p',
          text: 'Wenn Sie uns kontaktieren, verarbeiten wir Ihre Kontaktdaten, den Inhalt Ihrer Anfrage, technische Informationen zur Fehleranalyse und unsere Antwort. Bitte übermitteln Sie im Support nur dann Patientendaten, wenn dies zwingend erforderlich ist, und möglichst in de-identifizierter Form.',
        },
        { type: 'h3', text: '5.6 Technische Daten, Sicherheitsdaten und Website-Daten' },
        {
          type: 'p',
          text: 'Beim Besuch der Website und bei Nutzung der Anwendung können technische Daten verarbeitet werden, etwa IP-Adresse, Zeitstempel, Geräte- und Browserinformationen, Logdaten, Session-Informationen, Fehlerprotokolle, Sicherheitsereignisse und Zugriffsdaten.',
        },
      ],
    },
    {
      id: 'purposes',
      heading: '6. Zwecke und Rechtsgrundlagen',
      blocks: [
        {
          type: 'p',
          text: 'Wir verarbeiten personenbezogene Daten zu folgenden Zwecken:',
        },
        { type: 'h3', text: '6.1 Bereitstellung des Kontos und des Dienstes' },
        {
          type: 'p',
          text: 'Wir verarbeiten Konto-, Vertrags- und Nutzungsdaten, um Psychiatrie.Ink bereitzustellen, Nutzerkonten zu verwalten, Funktionen auszuführen und den Dienst technisch zu betreiben.',
        },
        {
          type: 'p',
          text: 'Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur Vertragserfüllung oder zur Durchführung vorvertraglicher Maßnahmen erforderlich ist.',
        },
        { type: 'h3', text: '6.2 Verarbeitung klinischer Inhalte im Auftrag' },
        {
          type: 'p',
          text: 'Soweit wir Patientendaten im Auftrag einer behandelnden Person, Praxis, Klinik oder Organisation verarbeiten, erfolgt dies auf Grundlage eines Auftragsverarbeitungsvertrags nach Art. 28 DSGVO und nach Weisung des jeweiligen Verantwortlichen.',
        },
        {
          type: 'p',
          text: 'Die Rechtsgrundlage für die Verarbeitung beim Verantwortlichen, einschließlich einer Bedingung nach Art. 9 DSGVO für Gesundheitsdaten, ist vom jeweiligen Verantwortlichen festzulegen.',
        },
        { type: 'h3', text: '6.3 Abrechnung und Vertragsverwaltung' },
        {
          type: 'p',
          text: 'Wir verarbeiten Abrechnungs- und Zahlungsdaten zur Durchführung von Abonnements, Rechnungsstellung, Zahlungsabwicklung, Buchhaltung und Vertragsverwaltung.',
        },
        {
          type: 'p',
          text: 'Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO sowie, soweit gesetzliche Aufbewahrungspflichten bestehen, Art. 6 Abs. 1 lit. c DSGVO.',
        },
        { type: 'h3', text: '6.4 Sicherheit, Missbrauchsprävention und Auditierung' },
        {
          type: 'p',
          text: 'Wir verarbeiten technische Daten, Sicherheitsprotokolle und Auditdaten, um den Dienst abzusichern, unbefugte Zugriffe zu erkennen, Missbrauch zu verhindern, Fehler zu analysieren, KI-gestützte Verarbeitung nachvollziehbar zu machen und die Integrität klinischer Dokumentation zu unterstützen.',
        },
        {
          type: 'p',
          text: 'Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt im sicheren, stabilen und nachvollziehbaren Betrieb eines professionellen Dokumentationssystems.',
        },
        { type: 'h3', text: '6.5 Rechtliche Pflichten' },
        {
          type: 'p',
          text: 'Wir verarbeiten Daten, soweit dies zur Erfüllung gesetzlicher Pflichten erforderlich ist, insbesondere steuerlicher, handelsrechtlicher, buchhalterischer, aufsichtsrechtlicher oder datenschutzrechtlicher Pflichten.',
        },
        {
          type: 'p',
          text: 'Rechtsgrundlage ist Art. 6 Abs. 1 lit. c DSGVO.',
        },
        { type: 'h3', text: '6.6 Einwilligungsbasierte Verarbeitung' },
        {
          type: 'p',
          text: 'Soweit wir optionale Cookies, Tracking-Technologien, Newsletter, Marketing-Kommunikation oder bestimmte optionale Integrationen einsetzen, erfolgt dies nur auf Grundlage Ihrer Einwilligung, soweit eine Einwilligung erforderlich ist.',
        },
        {
          type: 'p',
          text: 'Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO sowie, für Zugriffe auf Endgeräte in Deutschland, § 25 TDDDG. Sie können eine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.',
        },
      ],
    },
    {
      id: 'ai',
      heading: '7. KI-gestützte Verarbeitung',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink bietet optionale KI-gestützte Funktionen an, zum Beispiel zur Formulierung, Strukturierung, Zusammenfassung, Umwandlung oder Prüfung klinischer Texte.',
        },
        {
          type: 'p',
          text: 'KI-Funktionen werden nur auf Grundlage einer aktiven Nutzung oder Konfiguration durch die berechtigte Nutzerin bzw. den berechtigten Nutzer ausgeführt. Inhalte werden nicht ohne Nutzeraktion an KI-Dienstleister übermittelt.',
        },
        {
          type: 'p',
          text: 'KI-Ergebnisse werden nicht automatisch als medizinische Entscheidung übernommen. Eine ärztliche bzw. fachliche Prüfung und Freigabe bleibt erforderlich. Die Verantwortung für die klinische Verwendung der Ergebnisse liegt bei der behandelnden Person.',
        },
        {
          type: 'p',
          text: 'Patientendaten sollen vor einer KI-gestützten Verarbeitung soweit möglich minimiert, pseudonymisiert oder de-identifiziert werden. Psychiatrie.Ink stellt hierfür unterstützende Workflows bereit. Die Verantwortung für die Zulässigkeit der Übermittlung an KI-Dienstleister verbleibt beim jeweiligen Verantwortlichen.',
        },
        {
          type: 'p',
          text: 'Von Nutzerinnen und Nutzern eingegebene klinische Inhalte werden von der Psychiatry Ink Ltd nicht zum Training eigener KI-Modelle verwendet. Eine Nutzung durch KI-Dienstleister zu Trainingszwecken wird vertraglich ausgeschlossen, soweit personenbezogene Patientendaten oder Gesundheitsdaten verarbeitet werden. KI-Dienstleister, bei denen ein solcher Ausschluss nicht hinreichend vertraglich gesichert ist, sollten nicht für personenbezogene Gesundheitsdaten eingesetzt werden.',
        },
      ],
    },
    {
      id: 'automated-decisions',
      heading: '8. Automatisierte Entscheidungen',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink trifft keine ausschließlich automatisierten Entscheidungen im Sinne von Art. 22 DSGVO, die gegenüber Patientinnen, Patienten oder Nutzerinnen und Nutzern rechtliche Wirkung entfalten oder sie in ähnlicher Weise erheblich beeinträchtigen.',
        },
        {
          type: 'p',
          text: 'KI-Funktionen dienen als Assistenzfunktionen. Sie ersetzen keine ärztliche, psychotherapeutische, pflegerische, juristische oder organisatorische Entscheidung.',
        },
      ],
    },
    {
      id: 'processors',
      heading: '9. Dienstleister und Unterauftragsverarbeiter',
      blocks: [
        {
          type: 'p',
          text: 'Wir setzen technische und organisatorische Dienstleister ein, die für den Betrieb von Psychiatrie.Ink erforderlich sind. Dazu können insbesondere gehören:',
        },
        {
          type: 'p',
          text: 'Supabase für Datenbank, Authentifizierung und Speicherfunktionen.',
        },
        {
          type: 'p',
          text: 'Google Cloud für Hosting, Cloud Run, Infrastruktur und technische Betriebsdienste.',
        },
        {
          type: 'p',
          text: 'Stripe für Zahlungsabwicklung, Abonnementverwaltung und abrechnungsbezogene Prozesse.',
        },
        {
          type: 'p',
          text: 'KI-Dienstleister wie OpenAI, Google Gemini, Mistral AI und DeepSeek für optionale KI-gestützte Funktionen, soweit diese durch den Nutzer bzw. die Organisation aktiviert und datenschutzrechtlich zulässig eingesetzt werden.',
        },
        {
          type: 'p',
          text: 'Eine aktuelle Liste der eingesetzten Unterauftragsverarbeiter, ihrer Funktionen, Standorte und Transfermechanismen wird im Auftragsverarbeitungsvertrag oder in einer separaten Unterauftragsverarbeiterliste bereitgestellt.',
        },
        {
          type: 'p',
          text: 'Unterauftragsverarbeiter werden nur eingesetzt, wenn sie vertraglich gebunden sind und geeignete technische und organisatorische Maßnahmen zusichern. Änderungen bei Unterauftragsverarbeitern werden nach Maßgabe des Auftragsverarbeitungsvertrags mitgeteilt; Verantwortliche erhalten eine Möglichkeit zum Widerspruch, soweit gesetzlich oder vertraglich vorgesehen.',
        },
      ],
    },
    {
      id: 'hosting',
      heading: '10. Hosting-Region und Datenresidenz',
      blocks: [
        {
          type: 'p',
          text: 'Die Kerninfrastruktur von Psychiatrie.Ink wird, soweit nicht anders vereinbart, in der Europäischen Union betrieben. Nach aktueller Konfiguration befinden sich die Datenbankdienste in der EU, insbesondere in Frankfurt, und die Anwendung wird in einer EU-Region von Google Cloud betrieben.',
        },
        {
          type: 'p',
          text: 'Die genaue Datenresidenz einzelner Dienste kann vom gewählten Dienst, der Konfiguration, dem eingesetzten Unterauftragsverarbeiter und der jeweiligen Funktion abhängen. Maßgeblich sind die im Auftragsverarbeitungsvertrag und in der Unterauftragsverarbeiterliste angegebenen Informationen.',
        },
        {
          type: 'p',
          text: 'KI-Dienstleister können Daten in der EU, im Vereinigten Königreich, in den USA oder in anderen Drittländern verarbeiten. Für personenbezogene Gesundheitsdaten sollten KI-Dienstleister außerhalb der EU/des EWR oder außerhalb eines Angemessenheitsbeschlusses nur nach gesonderter Prüfung, geeigneten Garantien und möglichst mit de-identifizierten oder minimierten Daten eingesetzt werden.',
        },
      ],
    },
    {
      id: 'transfers',
      heading: '11. Internationale Datenübermittlungen',
      blocks: [
        {
          type: 'p',
          text: 'Das Vereinigte Königreich gilt aus Sicht der EU derzeit als Drittland mit Angemessenheitsbeschluss. Soweit personenbezogene Daten aus der EU/dem EWR an die Psychiatry Ink Ltd im Vereinigten Königreich übermittelt werden, kann diese Übermittlung grundsätzlich auf einen Angemessenheitsbeschluss gestützt werden, solange dieser anwendbar ist.',
        },
        {
          type: 'p',
          text: 'Soweit Dienstleister Daten außerhalb der EU/des EWR oder außerhalb des Vereinigten Königreichs verarbeiten, stützen wir uns auf geeignete Transfermechanismen. Dazu können insbesondere Angemessenheitsbeschlüsse, das EU-US Data Privacy Framework für zertifizierte US-Unternehmen, EU-Standardvertragsklauseln, das UK International Data Transfer Addendum, Transfer Impact Assessments und ergänzende technische bzw. organisatorische Maßnahmen gehören.',
        },
        {
          type: 'p',
          text: 'Bei Drittlandübermittlungen ohne Angemessenheitsbeschluss ist vor allem bei Gesundheitsdaten eine besonders strenge Prüfung erforderlich.',
        },
      ],
    },
    {
      id: 'cookies',
      heading: '12. Cookies, lokale Speicherung und ähnliche Technologien',
      blocks: [
        {
          type: 'p',
          text: 'Wir verwenden technisch erforderliche Cookies, lokale Speichermechanismen oder vergleichbare Technologien, um Login, Sicherheit, Session-Verwaltung, Spracheinstellungen und grundlegende Funktionen des Dienstes bereitzustellen.',
        },
        {
          type: 'p',
          text: 'Technisch nicht erforderliche Cookies, Analyse-Tools, Marketing-Technologien oder vergleichbare Tracking-Mechanismen werden nur eingesetzt, soweit hierfür eine wirksame Einwilligung vorliegt. Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft ändern oder widerrufen.',
        },
        {
          type: 'p',
          text: 'Soweit in Deutschland auf Informationen in Endgeräten zugegriffen oder Informationen dort gespeichert werden, beachten wir zusätzlich die Vorgaben des TDDDG.',
        },
      ],
    },
    {
      id: 'retention',
      heading: '13. Speicherdauer und Löschung',
      blocks: [
        {
          type: 'p',
          text: 'Wir speichern personenbezogene Daten nur so lange, wie dies für die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.',
        },
        {
          type: 'p',
          text: 'Konto- und Vertragsdaten werden für die Dauer des Nutzerkontos und anschließend für die gesetzlich oder vertraglich erforderlichen Fristen gespeichert.',
        },
        {
          type: 'p',
          text: 'Abrechnungs- und Buchhaltungsdaten werden entsprechend den anwendbaren handels- und steuerrechtlichen Aufbewahrungspflichten gespeichert.',
        },
        {
          type: 'p',
          text: 'Arbeitsbereichs- und Patientendaten werden grundsätzlich für die Dauer des Vertragsverhältnisses bzw. nach Weisung des jeweiligen Verantwortlichen verarbeitet. Nach Vertragsende werden Daten nach Maßgabe des Auftragsverarbeitungsvertrags gelöscht, zurückgegeben oder anonymisiert.',
        },
        {
          type: 'p',
          text: 'Backups und Sicherheitskopien werden nach dem jeweils geltenden Backup-Zyklus gelöscht oder überschrieben. Die konkrete Frist wird im Auftragsverarbeitungsvertrag oder in den technischen Informationen zum Dienst angegeben.',
        },
        {
          type: 'p',
          text: 'Support-Daten werden nur so lange gespeichert, wie dies zur Bearbeitung der Anfrage, zur Fehleranalyse, zur Rechtsverteidigung oder zur Erfüllung gesetzlicher Pflichten erforderlich ist.',
        },
        {
          type: 'p',
          text: 'Kündigung und Löschfristen: Wenn Sie Ihr Abonnement kündigen, wird Ihr Konto ruhend gestellt und kann innerhalb von 90 Tagen reaktiviert werden; erfolgt keine Reaktivierung, werden Ihr Konto und alle zugehörigen personenbezogenen Daten nach Ablauf dieser 90 Tage dauerhaft gelöscht. Wenn Sie die Löschung Ihres Kontos direkt veranlassen, wird Ihr Abonnement sofort gekündigt und Ihr Konto tritt in eine 30-tägige Karenzzeit ein, innerhalb derer Sie die Löschung abbrechen können; nach 30 Tagen werden Ihr Konto und alle zugehörigen personenbezogenen Daten dauerhaft gelöscht. Daten, die in Organisationen geteilt wurden, die Sie nicht allein kontrollieren, sowie Daten, die gesetzlichen Aufbewahrungspflichten unterliegen, werden gesondert nach Maßgabe dieser Datenschutzhinweise behandelt.',
        },
      ],
    },
    {
      id: 'rights',
      heading: '14. Ihre Rechte',
      blocks: [
        {
          type: 'p',
          text: 'Sie haben nach Maßgabe der DSGVO bzw. der UK GDPR insbesondere folgende Rechte:',
        },
        {
          type: 'p',
          text: 'Recht auf Auskunft über die verarbeiteten personenbezogenen Daten.',
        },
        {
          type: 'p',
          text: 'Recht auf Berichtigung unrichtiger Daten.',
        },
        {
          type: 'p',
          text: 'Recht auf Löschung personenbezogener Daten.',
        },
        {
          type: 'p',
          text: 'Recht auf Einschränkung der Verarbeitung.',
        },
        {
          type: 'p',
          text: 'Recht auf Datenübertragbarkeit.',
        },
        {
          type: 'p',
          text: 'Recht auf Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen.',
        },
        {
          type: 'p',
          text: 'Recht auf Widerruf einer Einwilligung mit Wirkung für die Zukunft.',
        },
        {
          type: 'p',
          text: 'Wenn wir Patientendaten ausschließlich als Auftragsverarbeiter verarbeiten, können wir Betroffenenrechte grundsätzlich nicht eigenständig erfüllen. In diesem Fall leiten wir Anfragen, soweit möglich, an den zuständigen Verantwortlichen weiter oder unterstützen den Verantwortlichen nach Maßgabe des Auftragsverarbeitungsvertrags.',
        },
        {
          type: 'p',
          text: 'Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:',
        },
        { type: 'link', text: 'data-protection@psychiatry.ink', href: 'mailto:data-protection@psychiatry.ink' },
      ],
    },
    {
      id: 'complaint',
      heading: '15. Beschwerderecht bei einer Aufsichtsbehörde',
      blocks: [
        {
          type: 'p',
          text: 'Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren.',
        },
        {
          type: 'p',
          text: 'In Deutschland können Sie sich an die für Ihren Wohnsitz, Arbeitsplatz oder den Ort des mutmaßlichen Verstoßes zuständige Landesdatenschutzbehörde wenden.',
        },
        {
          type: 'p',
          text: 'Im Vereinigten Königreich ist die zuständige Aufsichtsbehörde:',
        },
        {
          type: 'p',
          text: "Information Commissioner's Office (ICO)",
        },
        {
          type: 'p',
          text: 'Soweit ein EU-/EWR-Vertreter benannt ist, können auch die am Ort des Vertreters zuständigen Aufsichtsbehörden relevant sein.',
        },
      ],
    },
    {
      id: 'security',
      heading: '16. Sicherheit',
      blocks: [
        {
          type: 'p',
          text: 'Wir treffen dem Risiko angemessene technische und organisatorische Maßnahmen zum Schutz personenbezogener Daten. Dazu gehören insbesondere Verschlüsselung bei der Übertragung, Zugriffskontrollen, rollenbasierte Berechtigungen, Protokollierung sicherheitsrelevanter Vorgänge, Audit-Funktionen für KI-gestützte Aktionen, Datenminimierung, Pseudonymisierungs- bzw. De-Identifikationsfunktionen, Mandantentrennung, Backup-Konzepte, Vertraulichkeitsverpflichtungen und Verfahren zur Behandlung von Sicherheitsvorfällen.',
        },
        {
          type: 'p',
          text: 'Der Zugriff auf klinische Inhalte durch Mitarbeitende oder Dienstleister erfolgt nur, soweit dies für Betrieb, Support, Sicherheit, Fehlerbehebung oder gesetzliche Pflichten erforderlich ist, und soweit möglich nur nach Autorisierung, rollenbasiert, protokolliert und nach dem Need-to-know-Prinzip.',
        },
        {
          type: 'p',
          text: 'Keine elektronische Übertragung oder Speicherung ist vollständig risikofrei. Wir überprüfen unsere Schutzmaßnahmen regelmäßig und passen sie dem Stand der Technik, dem Risiko und der Weiterentwicklung des Dienstes an.',
        },
      ],
    },
    {
      id: 'dpia',
      heading: '17. Datenschutz-Folgenabschätzung und Unterstützung der Verantwortlichen',
      blocks: [
        {
          type: 'p',
          text: 'Aufgrund des klinischen Kontexts und der möglichen Verarbeitung von Gesundheitsdaten kann für bestimmte Einsatzszenarien eine Datenschutz-Folgenabschätzung erforderlich sein. Die Pflicht zur Durchführung einer Datenschutz-Folgenabschätzung liegt grundsätzlich beim jeweiligen Verantwortlichen.',
        },
        {
          type: 'p',
          text: 'Wir stellen auf Anfrage angemessene Informationen zur Verfügung, die Verantwortliche bei ihrer Datenschutz-Folgenabschätzung unterstützen können. Dazu gehören insbesondere Informationen zu Verarbeitungsvorgängen, technischen und organisatorischen Maßnahmen, Unterauftragsverarbeitern, Datenflüssen, KI-Funktionen, Protokollierung, Löschung und Sicherheitsmaßnahmen.',
        },
      ],
    },
    {
      id: 'breach',
      heading: '18. Datenpannen und Sicherheitsvorfälle',
      blocks: [
        {
          type: 'p',
          text: 'Im Falle einer Verletzung des Schutzes personenbezogener Daten treffen wir die gesetzlich erforderlichen Maßnahmen. Soweit wir als Auftragsverarbeiter handeln, informieren wir den jeweiligen Verantwortlichen unverzüglich nach Maßgabe des Auftragsverarbeitungsvertrags, damit dieser seine Melde- und Benachrichtigungspflichten prüfen und erfüllen kann.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '19. Änderungen dieser Datenschutzerklärung',
      blocks: [
        {
          type: 'p',
          text: 'Wir können diese Datenschutzerklärung anpassen, wenn sich der Dienst, die technische Architektur, eingesetzte Dienstleister, gesetzliche Anforderungen oder unsere Verarbeitungsprozesse ändern.',
        },
        {
          type: 'p',
          text: 'Über wesentliche Änderungen informieren wir in geeigneter Weise, etwa über die Website, innerhalb des Dienstes oder per E-Mail. Die jeweils aktuelle Fassung ist über Psychiatrie.Ink abrufbar.',
        },
      ],
    },
  ],
}

/* ────────────────────────────── TERMS ───────────────────────────────────── */

const termsEn: LegalDoc = {
  title: 'Terms of Service',
  lead: 'These Terms of Service govern access to and use of Psychiatry.Ink, including the public website, logged-in application, AI features, dictation tools, documentation tools, templates, medication and laboratory tools, billing system, and related services.\n\nBy creating an account, using the service, or accepting an order form, you agree to these Terms.',
  lastUpdatedLabel: lastUpdatedLabel('en'),
  sections: [
    {
      id: 'provider',
      heading: '1. Provider',
      blocks: [
        { type: 'p', text: 'The service is provided by:' },
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd\n71–75 Shelton Street\nCovent Garden\nLondon, WC2H 9JQ\nUnited Kingdom',
        },
        {
          type: 'p',
          text: 'Registered in England and Wales.\nCompany number: 17275704.',
        },
        { type: 'p', text: 'Contact:' },
        { type: 'link', text: 'hello@psychiatry.ink', href: 'mailto:hello@psychiatry.ink' },
      ],
    },
    {
      id: 'professional-use',
      heading: '2. Professional-use service',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink is intended for authorised healthcare professionals, healthcare organisations, and related professional users. It is not intended for direct use by patients, consumers, children, or unqualified users.',
        },
        {
          type: 'p',
          text: 'You may use Psychiatry.Ink only if you have the legal and professional authority to process the data you enter and to use clinical documentation tools in your jurisdiction and workplace.',
        },
      ],
    },
    {
      id: 'emergency',
      heading: '3. No emergency use',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink is not an emergency, crisis, suicide-prevention, detention, or real-time safety service. Do not rely on Psychiatry.Ink for urgent clinical decisions, emergency communication, live patient monitoring, legal deadlines, or immediate risk management.',
        },
      ],
    },
    {
      id: 'clinical',
      heading: '4. No replacement for clinical judgement',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink supports drafting, organisation, documentation, and workflow. It does not replace:',
        },
        {
          type: 'ul',
          items: [
            'clinical assessment;',
            'psychiatric diagnosis;',
            'patient consent;',
            'legal capacity assessment;',
            'suicide or violence risk assessment;',
            'medication review;',
            'court, detention, or coercive-treatment legal review;',
            'local hospital governance;',
            'professional judgement.',
          ],
        },
        {
          type: 'p',
          text: 'You are responsible for reviewing, correcting, approving, and signing all generated or edited content before clinical or legal use.',
        },
      ],
    },
    {
      id: 'ai-output',
      heading: '5. AI-generated output',
      blocks: [
        {
          type: 'p',
          text: 'AI features may generate incomplete, inaccurate, biased, outdated, or clinically inappropriate content. You must verify every output against the source material, patient record, clinical examination, applicable law, and professional standards.',
        },
        {
          type: 'p',
          text: 'Psychiatry.Ink does not guarantee that AI output is correct, complete, lawful, safe, or suitable for a specific patient.',
        },
      ],
    },
    {
      id: 'availability-country',
      heading: '6. Country availability',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink may be available only in selected countries or pilot regions. Availability, features, templates, video functions, AI providers, and legal-document workflows may differ by country. You must not use country-specific templates or workflows unless they are appropriate for your jurisdiction and institution.',
        },
      ],
    },
    {
      id: 'registration',
      heading: '7. Account registration',
      blocks: [
        {
          type: 'p',
          text: 'You must provide accurate account, organisation, billing, and professional information. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.',
        },
        {
          type: 'p',
          text: 'You must notify us promptly if you suspect unauthorised access, credential compromise, or misuse.',
        },
      ],
    },
    {
      id: 'customer-responsibilities',
      heading: '8. Customer responsibilities for patient data',
      blocks: [
        { type: 'p', text: 'You are responsible for:' },
        {
          type: 'ul',
          items: [
            'having a lawful basis to process personal data and health data;',
            'providing required patient information notices where applicable;',
            'obtaining institutional approval where required;',
            'entering into a Data Processing Agreement where required;',
            'configuring privacy, de-identification, retention, and AI settings correctly;',
            'avoiding unnecessary patient identifiers in AI prompts and support requests;',
            'exporting, retaining, or deleting records according to your legal and professional duties;',
            'ensuring that final clinical records are stored in your official record system if required by your organisation.',
          ],
        },
      ],
    },
    {
      id: 'dpa',
      heading: '9. Data Processing Agreement',
      blocks: [
        {
          type: 'p',
          text: 'Where Psychiatry Ink Ltd processes personal data on behalf of a customer as processor, the Data Processing Agreement applies. If there is a conflict between these Terms and the DPA concerning processor obligations, the DPA controls for that processing.',
        },
      ],
    },
    {
      id: 'acceptable-use',
      heading: '10. Acceptable use',
      blocks: [
        { type: 'p', text: 'You must not:' },
        {
          type: 'ul',
          items: [
            'use the service unlawfully or outside your professional authority;',
            'use the service to provide emergency care or real-time patient monitoring;',
            'submit data that you have no right to process;',
            'attempt to bypass security, access controls, credit limits, or billing controls;',
            'reverse engineer, scrape, copy, resell, or misuse the service;',
            'introduce malware, abusive traffic, or automated attacks;',
            'use outputs without professional review;',
            'use the service to discriminate unlawfully or make automated decisions about patients without human review;',
            'upload excessive, irrelevant, or unnecessary personal data.',
          ],
        },
      ],
    },
    {
      id: 'billing',
      heading: '11. Plans, billing, and credits',
      blocks: [
        {
          type: 'p',
          text: 'Paid features may be provided through subscriptions, usage credits, AI credits, add-ons, or organisation plans. Prices, credit allowances, renewal periods, and included features are shown on the pricing page, in-app billing screen, or order form.',
        },
        {
          type: 'p',
          text: 'AI credits may be consumed when using AI features, including generation, dictation, summarisation, editing, translation, or model-based analysis. Different AI modes may consume different credit amounts.',
        },
        {
          type: 'p',
          text: 'Unused credits, refunds, trial periods, renewals, cancellations, and taxes are governed by the applicable pricing page, order form, or billing policy.',
        },
      ],
    },
    {
      id: 'beta',
      heading: '12. Trials and beta features',
      blocks: [
        {
          type: 'p',
          text: 'We may offer trial, beta, pilot, experimental, or preview features. These may be changed, suspended, limited, or discontinued at any time. Beta features may be less stable and should not be used for production clinical work unless expressly permitted.',
        },
      ],
    },
    {
      id: 'third-party',
      heading: '13. Third-party services',
      blocks: [
        {
          type: 'p',
          text: 'The service may rely on third-party providers for hosting, AI, transcription, authentication, database services, payment processing, email, security, analytics, or communication. Third-party services may be subject to separate terms, privacy notices, and availability limitations.',
        },
      ],
    },
    {
      id: 'availability',
      heading: '14. Service availability',
      blocks: [
        {
          type: 'p',
          text: 'We aim to provide a reliable service, but we do not guarantee uninterrupted availability, error-free operation, or permanent access. Maintenance, incidents, provider outages, legal changes, security issues, or misuse may affect availability.',
        },
      ],
    },
    {
      id: 'ip',
      heading: '15. Intellectual property',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd and its licensors retain all rights in the software, design, branding, documentation, templates, workflows, model orchestration, and service structure.',
        },
        {
          type: 'p',
          text: 'You retain rights in the content you enter, subject to the rights needed for us to provide the service and comply with these Terms and the DPA.',
        },
      ],
    },
    {
      id: 'feedback',
      heading: '16. Feedback',
      blocks: [
        {
          type: 'p',
          text: 'If you provide suggestions, feedback, corrections, ideas, or feature requests, we may use them to improve the service without obligation to compensate you.',
        },
      ],
    },
    {
      id: 'termination',
      heading: '17. Suspension and termination',
      blocks: [
        {
          type: 'p',
          text: 'We may suspend or terminate access if you breach these Terms, fail to pay, misuse the service, create security risk, violate law, or use the service outside professional or contractual limits.',
        },
        {
          type: 'p',
          text: 'You may cancel your subscription according to the applicable billing terms. You remain responsible for exporting required data before cancellation where export is available and legally necessary.',
        },
      ],
    },
    {
      id: 'disclaimers',
      heading: '18. Disclaimers',
      blocks: [
        {
          type: 'p',
          text: 'The service is provided on an “as is” and “as available” basis. To the maximum extent permitted by law, we disclaim implied warranties of accuracy, fitness for a particular purpose, merchantability, non-infringement, availability, and clinical suitability.',
        },
        { type: 'p', text: 'Nothing in these Terms limits liability that cannot legally be limited.' },
      ],
    },
    {
      id: 'liability',
      heading: '19. Limitation of liability',
      blocks: [
        {
          type: 'p',
          text: 'To the maximum extent permitted by law, Psychiatry Ink Ltd is not liable for indirect, incidental, consequential, special, punitive, or exemplary damages, including loss of profits, loss of business, loss of goodwill, loss of data, clinical error, regulatory penalties, or legal consequences arising from unreviewed or inappropriate use of the service.',
        },
        {
          type: 'p',
          text: 'Our total aggregate liability is limited to the amount paid by the customer for the service during the 12 months before the event giving rise to liability, unless a different limit is agreed in an order form or required by law.',
        },
      ],
    },
    {
      id: 'law',
      heading: '20. Governing law and jurisdiction',
      blocks: [
        {
          type: 'p',
          text: 'These Terms are governed by the laws of England and Wales, unless mandatory local law provides otherwise. The courts of England and Wales have jurisdiction, unless a different forum is required by mandatory law or agreed in writing.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '21. Changes to these Terms',
      blocks: [
        {
          type: 'p',
          text: 'We may update these Terms from time to time. The updated version will be published on this page. Material changes may be notified by email, in-app notice, or account notice. Continued use after the effective date means you accept the updated Terms.',
        },
      ],
    },
  ],
}

const termsDe: LegalDoc = {
  title: 'Allgemeine Geschäftsbedingungen',
  lead: 'Diese Allgemeinen Geschäftsbedingungen regeln die Nutzung von Psychiatrie.Ink. Psychiatrie.Ink ist ein professioneller digitaler Arbeitsbereich für psychiatrische Dokumentation und klinische Assistenzfunktionen. Der Dienst richtet sich ausschließlich an berufliche Nutzerinnen und Nutzer, insbesondere Ärztinnen und Ärzte, Psychotherapeutinnen und Psychotherapeuten, Praxen, Kliniken, Einrichtungen des Gesundheitswesens sowie sonstige qualifizierte Angehörige der Gesundheitsberufe.\n\nDurch Erstellung eines Kontos, Abschluss eines Abonnements oder Nutzung des Dienstes akzeptieren Sie diese Bedingungen.',
  lastUpdatedLabel: lastUpdatedLabel('de'),
  sections: [
    {
      id: 'provider',
      heading: '1. Anbieter und Vertragspartner',
      blocks: [
        { type: 'p', text: 'Psychiatrie.Ink wird bereitgestellt von:' },
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd\n71–75 Shelton Street\nCovent Garden\nLondon, WC2H 9JQ\nVereinigtes Königreich',
        },
        {
          type: 'p',
          text: 'Eingetragen in England und Wales.\nCompany number: 17275704.',
        },
        { type: 'p', text: 'Kontakt:' },
        { type: 'link', text: 'hello@psychiatry.ink', href: 'mailto:hello@psychiatry.ink' },
        { type: 'p', text: 'Datenschutzkontakt:' },
        { type: 'link', text: 'data-protection@psychiatry.ink', href: 'mailto:data-protection@psychiatry.ink' },
      ],
    },
    {
      id: 'scope',
      heading: '2. Geltungsbereich und Nutzerkreis',
      blocks: [
        {
          type: 'p',
          text: 'Diese Bedingungen gelten für alle Verträge über die Nutzung von Psychiatrie.Ink, soweit keine individuell vereinbarten Vertragsbedingungen vorrangig gelten.',
        },
        {
          type: 'p',
          text: 'Der Dienst richtet sich ausschließlich an Unternehmerinnen und Unternehmer bzw. berufliche Nutzerinnen und Nutzer im Sinne einer beruflichen, ärztlichen, therapeutischen, klinischen oder organisatorischen Tätigkeit. Eine Nutzung durch Verbraucherinnen und Verbraucher für private Zwecke ist nicht vorgesehen.',
        },
        {
          type: 'p',
          text: 'Mit der Registrierung bestätigen Sie, dass Sie den Dienst ausschließlich im Rahmen Ihrer beruflichen Tätigkeit nutzen und, soweit Sie klinische Funktionen verwenden, über die hierfür erforderliche berufliche Qualifikation, Berechtigung und Verantwortlichkeit verfügen.',
        },
      ],
    },
    {
      id: 'contract',
      heading: '3. Vertragsschluss und Vorrangregelung',
      blocks: [
        {
          type: 'p',
          text: 'Ein Vertrag kommt zustande, wenn Sie ein Konto erstellen, ein kostenpflichtiges Abonnement buchen, eine Testphase aktivieren oder den Dienst in sonstiger Weise nutzen und wir die Nutzung ermöglichen.',
        },
        {
          type: 'p',
          text: 'Soweit zwischen Ihnen bzw. Ihrer Organisation und der Psychiatry Ink Ltd ein individueller Vertrag, ein Auftragsverarbeitungsvertrag, ein Data Processing Agreement, ein Enterprise Agreement oder eine sonstige schriftliche Sondervereinbarung besteht, gehen diese Vereinbarungen diesen AGB vor, soweit sie abweichende Regelungen enthalten.',
        },
      ],
    },
    {
      id: 'service',
      heading: '4. Beschreibung des Dienstes',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink bietet digitale Funktionen für psychiatrische und klinische Dokumentation, strukturierte Arbeitsbereiche, Vorlagen, Fallnotizen, Verlaufsdokumentation, Anamnese, psychopathologische Befunde, Arztbriefe, Therapieplanung, Medikationsdokumentation, psychopharmakologische Referenzinhalte, klinische Hilfswerkzeuge und optionale KI-gestützte Funktionen.',
        },
        {
          type: 'p',
          text: 'Der konkrete Funktionsumfang hängt vom gewählten Abonnement, der technischen Verfügbarkeit, der Nutzerrolle, der Konfiguration und der fortlaufenden Produktentwicklung ab.',
        },
        {
          type: 'p',
          text: 'Wir können einzelne Funktionen weiterentwickeln, ändern, umbenennen, einschränken oder ersetzen, soweit dadurch der vertraglich vereinbarte Kernnutzen des Dienstes nicht unangemessen beeinträchtigt wird.',
        },
      ],
    },
    {
      id: 'emergency',
      heading: '5. Keine Notfallanwendung',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink ist nicht für Notfälle, Krisensituationen oder zeitkritische medizinische Entscheidungen bestimmt.',
        },
        {
          type: 'p',
          text: 'Der Dienst darf nicht als Ersatz für lokale Notfallstrukturen, ärztliche Akutbeurteilung, Krisenintervention, Rettungsdienst, persönliche Untersuchung oder unmittelbare klinische Versorgung verwendet werden.',
        },
        {
          type: 'p',
          text: 'In Notfällen sind die örtlich zuständigen Rettungsdienste, Notaufnahmen, Krisendienste oder sonstigen Notfallstrukturen zu kontaktieren.',
        },
      ],
    },
    {
      id: 'clinical',
      heading: '6. Ärztliche und fachliche Verantwortung',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink unterstützt die klinische Dokumentation und kann fachliche Arbeitsprozesse erleichtern. Der Dienst ersetzt keine ärztliche, psychotherapeutische, pflegerische, juristische oder sonstige fachliche Beurteilung.',
        },
        {
          type: 'p',
          text: 'Alle Diagnosen, Differentialdiagnosen, Risikoeinschätzungen, Therapieentscheidungen, Medikationsentscheidungen, rechtlichen Bewertungen, Einweisungsentscheidungen, Zwangsmaßnahmen, Entlassentscheidungen und sonstigen klinischen Maßnahmen liegen ausschließlich in der Verantwortung der behandelnden bzw. fachlich zuständigen Person.',
        },
        {
          type: 'p',
          text: 'KI-gestützte oder automatisiert erzeugte Inhalte sind Entwürfe, Formulierungsvorschläge oder Assistenzhinweise. Sie dürfen erst nach fachlicher Prüfung, Korrektur und Freigabe verwendet werden.',
        },
        {
          type: 'p',
          text: 'Sie sind verpflichtet, alle Ausgaben des Dienstes auf Plausibilität, Vollständigkeit, Aktualität, fachliche Richtigkeit, Kontextangemessenheit und rechtliche Zulässigkeit zu prüfen.',
        },
      ],
    },
    {
      id: 'not-medical-device',
      heading: '7. Kein Medizinprodukt und keine autonome Entscheidungsfindung',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink ist nach seiner vorgesehenen Nutzung ein Dokumentations- und Assistenzsystem. Der Dienst ist nicht dazu bestimmt, eigenständig Diagnosen zu stellen, Therapieentscheidungen zu treffen, Patientinnen oder Patienten zu überwachen, Risiken autonom zu klassifizieren oder automatisiert medizinische Entscheidungen mit unmittelbarer Wirkung zu treffen.',
        },
        {
          type: 'p',
          text: 'Psychiatrie.Ink ist, sofern nicht für einzelne Module ausdrücklich anders angegeben, nicht als Medizinprodukt zertifiziert und nicht als System zur automatisierten klinischen Entscheidungsfindung bestimmt.',
        },
        {
          type: 'p',
          text: 'Sie dürfen den Dienst nicht in einer Weise verwenden, die über diese Zweckbestimmung hinausgeht, insbesondere nicht als alleinige Grundlage für Diagnose, Therapie, Medikation, Krisenintervention, Zwangsmaßnahmen, Forensik, Entlassung oder sonstige klinische Entscheidungen.',
        },
        {
          type: 'p',
          text: 'Sollten einzelne Funktionen künftig als zertifizierte oder regulierte Module bereitgestellt werden, gelten hierfür gesonderte Bedingungen, Gebrauchsanweisungen, Zweckbestimmungen und regulatorische Hinweise.',
        },
      ],
    },
    {
      id: 'ai',
      heading: '8. KI-gestützte Funktionen',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink kann optionale KI-gestützte Funktionen anbieten. Diese können Texte strukturieren, zusammenfassen, umformulieren, klassifizieren oder Vorschläge generieren.',
        },
        {
          type: 'p',
          text: 'KI-Ausgaben können unvollständig, ungenau, missverständlich, veraltet, kontextfehlerhaft oder fachlich ungeeignet sein. Eine KI-Ausgabe ist kein medizinischer Befund, keine Diagnose, keine Therapieempfehlung und keine rechtliche Bewertung.',
        },
        {
          type: 'p',
          text: 'Sie sind verantwortlich dafür, welche Inhalte Sie an KI-Funktionen übergeben. Personenbezogene Patientendaten und Gesundheitsdaten dürfen nur verarbeitet werden, wenn hierfür eine rechtliche Grundlage besteht, ein erforderlicher Auftragsverarbeitungsvertrag abgeschlossen ist und die Verarbeitung mit Ihren berufs-, datenschutz- und organisationsrechtlichen Pflichten vereinbar ist.',
        },
        {
          type: 'p',
          text: 'Soweit möglich, sollen Patientendaten vor Nutzung von KI-Funktionen minimiert, pseudonymisiert oder de-identifiziert werden.',
        },
        {
          type: 'p',
          text: 'Wir verwenden Ihre klinischen Inhalte nicht zum Training eigener KI-Modelle. Eine Nutzung durch eingesetzte KI-Dienstleister zu Trainingszwecken wird vertraglich ausgeschlossen, soweit personenbezogene Patientendaten oder Gesundheitsdaten verarbeitet werden.',
        },
      ],
    },
    {
      id: 'reference',
      heading: '9. Psychopharmakologische und fachliche Referenzinhalte',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink kann psychopharmakologische, diagnostische, therapeutische oder sonstige fachliche Referenzinhalte bereitstellen. Diese Inhalte dienen der Orientierung und Arbeitsunterstützung.',
        },
        {
          type: 'p',
          text: 'Solche Inhalte können trotz sorgfältiger Erstellung unvollständig, veraltet oder fehlerhaft sein. Sie ersetzen keine Fachinformation, Leitlinie, Arzneimitteldatenbank, ärztliche Prüfung, pharmazeutische Prüfung, lokale SOP oder individuelle Nutzen-Risiko-Abwägung.',
        },
        {
          type: 'p',
          text: 'Vor jeder klinischen Verwendung sind insbesondere aktuelle Fachinformationen, Kontraindikationen, Interaktionen, Dosierungen, Laborwerte, Komorbiditäten, Schwangerschaft, Stillzeit, Alter, Organfunktionen, lokale Standards und individuelle Patientenumstände zu prüfen.',
        },
      ],
    },
    {
      id: 'accounts',
      heading: '10. Konto, Zugangsdaten und Nutzerverwaltung',
      blocks: [
        {
          type: 'p',
          text: 'Sie sind verpflichtet, bei Registrierung und Nutzung richtige, vollständige und aktuelle Angaben zu machen.',
        },
        {
          type: 'p',
          text: 'Zugangsdaten sind vertraulich zu behandeln. Eine Weitergabe von Zugangsdaten an andere Personen ist nicht gestattet. Jede Nutzerin und jeder Nutzer benötigt ein eigenes Konto, soweit nicht ausdrücklich etwas anderes vereinbart ist.',
        },
        {
          type: 'p',
          text: 'Sie sind für alle Aktivitäten verantwortlich, die über Ihr Konto erfolgen, soweit diese auf Ihrem Verschulden beruhen. Sie müssen uns unverzüglich informieren, wenn Sie eine unbefugte Nutzung, einen Sicherheitsvorfall oder einen Verlust von Zugangsdaten vermuten.',
        },
        {
          type: 'p',
          text: 'Bei Organisationskonten ist die jeweilige Organisation dafür verantwortlich, Nutzerrollen, Berechtigungen, Austritte, Zuständigkeiten und Zugriffsrechte ordnungsgemäß zu verwalten.',
        },
      ],
    },
    {
      id: 'acceptable-use',
      heading: '11. Zulässige Nutzung',
      blocks: [
        {
          type: 'p',
          text: 'Sie dürfen Psychiatrie.Ink nur rechtmäßig, vertragsgemäß und entsprechend der vorgesehenen Zweckbestimmung nutzen.',
        },
        { type: 'p', text: 'Unzulässig ist insbesondere:' },
        {
          type: 'ul',
          items: [
            'die Nutzung für rechtswidrige Zwecke;',
            'die Eingabe oder Verarbeitung personenbezogener Daten ohne ausreichende Rechtsgrundlage;',
            'die Umgehung oder Störung von Sicherheitsmechanismen;',
            'der Versuch, auf fremde Konten, Systeme oder Daten zuzugreifen;',
            'Reverse Engineering, Dekompilierung oder unbefugte Analyse des Quellcodes, soweit gesetzlich nicht zwingend erlaubt;',
            'die automatisierte Massenabfrage ohne Erlaubnis;',
            'die Überlastung, Manipulation oder Störung der Infrastruktur;',
            'die Nutzung zur Entwicklung eines konkurrierenden Dienstes durch Kopieren wesentlicher Funktionen, Inhalte oder Strukturen;',
            'die Übermittlung von Malware, Schadcode oder sicherheitsgefährdenden Inhalten;',
            'die Nutzung des Dienstes für unmittelbare Notfallsteuerung oder autonome klinische Entscheidungsfindung.',
          ],
        },
      ],
    },
    {
      id: 'privacy',
      heading: '12. Patientendaten, Datenschutz und Auftragsverarbeitung',
      blocks: [
        {
          type: 'p',
          text: 'Soweit Sie Patientendaten, Gesundheitsdaten oder sonstige besondere Kategorien personenbezogener Daten in Psychiatrie.Ink verarbeiten, sind Sie bzw. Ihre Organisation grundsätzlich Verantwortlicher im datenschutzrechtlichen Sinne. Die Psychiatry Ink Ltd handelt insoweit in der Regel als Auftragsverarbeiter.',
        },
        {
          type: 'p',
          text: 'Vor produktiver Verarbeitung personenbezogener Patientendaten muss ein Auftragsverarbeitungsvertrag bzw. Data Processing Agreement abgeschlossen werden.',
        },
        {
          type: 'p',
          text: 'Sie sind verantwortlich für die Rechtmäßigkeit der Erhebung, Eingabe, Verarbeitung, Speicherung, Nutzung, Übermittlung und Löschung der von Ihnen verarbeiteten Daten. Dies umfasst insbesondere Informationspflichten, Rechtsgrundlagen, Schweigepflicht, Berufsrecht, Dokumentationspflichten, Aufbewahrungspflichten, Rollen- und Berechtigungskonzepte sowie interne Datenschutzvorgaben Ihrer Organisation.',
        },
        {
          type: 'p',
          text: 'Die Datenschutzerklärung und der Auftragsverarbeitungsvertrag enthalten weitere Informationen zur Verarbeitung personenbezogener Daten.',
        },
      ],
    },
    {
      id: 'confidentiality',
      heading: '13. Vertraulichkeit',
      blocks: [
        {
          type: 'p',
          text: 'Wir behandeln vertrauliche Inhalte nach Maßgabe dieser Bedingungen, der Datenschutzerklärung, des Auftragsverarbeitungsvertrags und der anwendbaren Gesetze vertraulich.',
        },
        {
          type: 'p',
          text: 'Sie sind verpflichtet, vertrauliche Informationen, Zugangsdaten, technische Informationen, nicht öffentliche Produktinformationen und Patientendaten vertraulich zu behandeln und nur berechtigten Personen zugänglich zu machen.',
        },
        { type: 'p', text: 'Diese Pflicht gilt auch nach Beendigung des Vertrags fort.' },
      ],
    },
    {
      id: 'billing',
      heading: '14. Abonnements, Testphase und KI-Credits',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink kann kostenfreie Testphasen, kostenpflichtige Abonnements, nutzungsbasierte Abrechnung, KI-Credits oder Zusatzpakete anbieten.',
        },
        {
          type: 'p',
          text: 'Die Einzelnutzung umfasst, soweit auf der Preisseite nicht anders angegeben, eine einmonatige kostenlose Testphase mit 500 KI-Credits. Nach Ablauf der Testphase kann die Nutzung in ein kostenpflichtiges Abonnement übergehen, wenn Sie ein solches Abonnement aktiv buchen oder fortführen.',
        },
        {
          type: 'p',
          text: 'Die Preise richten sich nach der jeweils bei Vertragsschluss angezeigten Preisseite. Nach aktueller Planung beträgt der Preis für die Einzelnutzung £24,99 pro Monat oder £239,90 pro Jahr, jeweils vorbehaltlich der auf der Preisseite angegebenen Details, Steuern, Währungen, Rabatte und Leistungsgrenzen.',
        },
        {
          type: 'p',
          text: 'KI-Credits dienen der internen Nutzungs- und Verbrauchssteuerung. Sie haben keinen Geldwert, sind nicht auszahlbar, nicht übertragbar und können nicht außerhalb von Psychiatrie.Ink verwendet werden. Nicht genutzte Credits können verfallen, soweit dies auf der Preisseite oder im jeweiligen Plan angegeben ist.',
        },
        {
          type: 'p',
          text: 'Wir können angemessene technische Limits, Fair-Use-Regeln und Schutzmechanismen einsetzen, um Missbrauch, Überlastung oder unverhältnismäßige Nutzung zu verhindern.',
        },
      ],
    },
    {
      id: 'payment',
      heading: '15. Zahlung, Verlängerung und Steuern',
      blocks: [
        {
          type: 'p',
          text: 'Zahlungen werden über einen Zahlungsdienstleister, insbesondere Stripe, abgewickelt. Für die Zahlungsabwicklung können zusätzlich die Bedingungen und Datenschutzhinweise des Zahlungsdienstleisters gelten.',
        },
        {
          type: 'p',
          text: 'Abonnements verlängern sich automatisch um den jeweils gebuchten Zeitraum, sofern sie nicht vor Ende der laufenden Abrechnungsperiode gekündigt werden.',
        },
        {
          type: 'p',
          text: 'Gebühren sind im Voraus fällig, sofern nicht anders angegeben. Preise verstehen sich zuzüglich anwendbarer Steuern, Umsatzsteuer, Abgaben oder Gebühren, soweit diese gesetzlich anfallen.',
        },
        {
          type: 'p',
          text: 'Sie sind verpflichtet, Zahlungsinformationen aktuell zu halten. Wenn eine Zahlung fehlschlägt, können wir den Zugang nach angemessener Vorankündigung einschränken oder sperren, soweit der Zahlungsrückstand nicht behoben wird.',
        },
      ],
    },
    {
      id: 'termination',
      heading: '16. Kündigung',
      blocks: [
        {
          type: 'p',
          text: 'Sie können Ihr Abonnement nach Maßgabe der im Dienst bereitgestellten Kündigungsfunktion oder durch Mitteilung an uns kündigen. Die Kündigung wirkt zum Ende des laufenden Abrechnungszeitraums, sofern nicht ausdrücklich etwas anderes vereinbart ist.',
        },
        {
          type: 'p',
          text: 'Bereits gezahlte Gebühren werden nicht anteilig erstattet, soweit gesetzlich nicht zwingend etwas anderes vorgeschrieben ist oder wir im Einzelfall ausdrücklich eine Erstattung zusagen.',
        },
        {
          type: 'p',
          text: 'Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Ein wichtiger Grund liegt insbesondere vor, wenn eine Partei schwerwiegend gegen vertragliche Pflichten verstößt und den Verstoß trotz angemessener Fristsetzung nicht behebt, oder wenn eine Fortsetzung des Vertrags unzumutbar ist.',
        },
      ],
    },
    {
      id: 'suspension',
      heading: '17. Sperrung und Einschränkung des Zugangs',
      blocks: [
        { type: 'p', text: 'Wir können den Zugang ganz oder teilweise sperren, einschränken oder Funktionen deaktivieren, wenn:' },
        {
          type: 'ul',
          items: [
            'ein begründeter Verdacht auf Missbrauch, Sicherheitsgefährdung oder unbefugten Zugriff besteht;',
            'Sie gegen wesentliche Vertragspflichten verstoßen;',
            'Zahlungen trotz Mahnung ausbleiben;',
            'die Nutzung gegen Gesetze, Berufsrecht, Datenschutzrecht oder Rechte Dritter verstößt;',
            'die Sperrung zur Vermeidung von Schäden, Sicherheitsrisiken oder Rechtsverletzungen erforderlich ist.',
          ],
        },
        {
          type: 'p',
          text: 'Wir berücksichtigen dabei die berechtigten Interessen der Nutzerinnen und Nutzer und wählen, soweit möglich, das mildeste geeignete Mittel.',
        },
      ],
    },
    {
      id: 'data-export',
      heading: '18. Datenexport und Löschung nach Vertragsende',
      blocks: [
        {
          type: 'p',
          text: 'Nach Vertragsende können Sie Daten nach Maßgabe der im Dienst verfügbaren Exportfunktionen exportieren. Es liegt in Ihrer Verantwortung, vor Ablauf des Zugangs erforderliche Exporte vorzunehmen.',
        },
        {
          type: 'p',
          text: 'Patienten- und Arbeitsbereichsdaten werden nach Vertragsende nach Maßgabe des Auftragsverarbeitungsvertrags, der Datenschutzerklärung und der technischen Löschfristen gelöscht, zurückgegeben oder anonymisiert.',
        },
        {
          type: 'p',
          text: 'Gesetzliche Aufbewahrungspflichten, Sicherheitsprotokolle, Abrechnungsdaten und Backup-Zyklen bleiben unberührt.',
        },
      ],
    },
    {
      id: 'availability',
      heading: '19. Verfügbarkeit, Wartung und Support',
      blocks: [
        {
          type: 'p',
          text: 'Wir bemühen uns um einen sicheren und zuverlässigen Betrieb des Dienstes. Eine ununterbrochene oder fehlerfreie Verfügbarkeit wird jedoch nicht garantiert, sofern nicht ausdrücklich ein Service Level Agreement vereinbart wurde.',
        },
        {
          type: 'p',
          text: 'Der Dienst kann vorübergehend nicht verfügbar sein, insbesondere wegen Wartung, Updates, Sicherheitsmaßnahmen, technischer Störungen, Netzproblemen, höherer Gewalt, Ausfällen von Drittanbietern oder erforderlicher Schutzmaßnahmen.',
        },
        {
          type: 'p',
          text: 'Wir können planbare Wartungen nach Möglichkeit vorab ankündigen. Bei dringenden Sicherheits- oder Stabilitätsmaßnahmen kann eine Wartung ohne vorherige Ankündigung erforderlich sein.',
        },
        {
          type: 'p',
          text: 'Support wird nach Maßgabe des jeweiligen Plans und der verfügbaren Supportkanäle erbracht. Ein bestimmter Reaktions- oder Lösungszeitraum gilt nur, wenn er ausdrücklich vereinbart wurde.',
        },
      ],
    },
    {
      id: 'service-changes',
      heading: '20. Änderungen des Dienstes',
      blocks: [
        {
          type: 'p',
          text: 'Wir können den Dienst weiterentwickeln, verbessern, ändern oder einzelne Funktionen ersetzen. Dies gilt insbesondere für technische Anpassungen, Sicherheitsverbesserungen, regulatorische Anforderungen, Änderungen bei Drittanbietern, Modellwechsel, Fehlerbehebungen und Produktweiterentwicklung.',
        },
        {
          type: 'p',
          text: 'Wesentliche Änderungen, die den vertraglich vereinbarten Kernnutzen erheblich beeinträchtigen, werden wir angemessen ankündigen. In solchen Fällen können Ihnen nach Maßgabe des anwendbaren Rechts Kündigungsrechte zustehen.',
        },
      ],
    },
    {
      id: 'user-content',
      heading: '21. Inhalte der Nutzerinnen und Nutzer',
      blocks: [
        {
          type: 'p',
          text: 'Alle Rechte an den von Ihnen eingegebenen oder hochgeladenen Inhalten verbleiben bei Ihnen bzw. bei den jeweils Berechtigten.',
        },
        {
          type: 'p',
          text: 'Sie räumen uns für die Dauer des Vertrags die nicht ausschließlichen, zweckgebundenen Rechte ein, Ihre Inhalte zu speichern, zu verarbeiten, zu übertragen, anzuzeigen, technisch zu vervielfältigen und anderweitig zu nutzen, soweit dies zur Bereitstellung, Sicherung, Wartung und Verbesserung des Dienstes, zur Vertragserfüllung, zur Fehlerbehebung oder zur Erfüllung gesetzlicher Pflichten erforderlich ist.',
        },
        {
          type: 'p',
          text: 'Sie sichern zu, dass Sie über die erforderlichen Rechte und Rechtsgrundlagen verfügen, um Inhalte in Psychiatrie.Ink zu verarbeiten.',
        },
      ],
    },
    {
      id: 'ip',
      heading: '22. Rechte an Psychiatrie.Ink',
      blocks: [
        {
          type: 'p',
          text: 'Alle Rechte an Psychiatrie.Ink, einschließlich Software, Benutzeroberfläche, Design, Marken, Logos, Datenbanken, Vorlagen, Strukturen, Dokumentation, Workflows und sonstigen Inhalten, verbleiben bei der Psychiatry Ink Ltd oder den jeweiligen Rechteinhabern.',
        },
        {
          type: 'p',
          text: 'Sie erhalten ein beschränktes, nicht ausschließliches, nicht übertragbares, widerrufliches Recht, den Dienst während der Vertragslaufzeit nach Maßgabe dieser Bedingungen zu nutzen.',
        },
        { type: 'p', text: 'Eine Nutzung außerhalb dieser Bedingungen ist nicht gestattet.' },
      ],
    },
    {
      id: 'third-party',
      heading: '23. Drittanbieter und Integrationen',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink kann Dienste Dritter einbinden, etwa Zahlungsdienstleister, Cloud-Anbieter, Authentifizierungsdienste, KI-Anbieter oder sonstige technische Dienstleister.',
        },
        {
          type: 'p',
          text: 'Die Verfügbarkeit und Funktion solcher Drittanbieterleistungen kann von deren eigenen Systemen, Bedingungen, Datenschutzregelungen und technischen Änderungen abhängen. Wir haften nicht für Ausfälle oder Änderungen von Drittanbieterleistungen, soweit diese außerhalb unseres Verantwortungsbereichs liegen.',
        },
        {
          type: 'p',
          text: 'Soweit Drittanbieter als Auftragsverarbeiter oder Unterauftragsverarbeiter eingesetzt werden, gelten die Regelungen der Datenschutzerklärung und des Auftragsverarbeitungsvertrags.',
        },
      ],
    },
    {
      id: 'warranty',
      heading: '24. Gewährleistung',
      blocks: [
        {
          type: 'p',
          text: 'Wir stellen Psychiatrie.Ink mit angemessener Sorgfalt bereit und bemühen uns, wesentliche Mängel zu beheben.',
        },
        {
          type: 'p',
          text: 'Der Dienst wird jedoch nicht mit der Garantie bereitgestellt, dass er für jeden konkreten klinischen, organisatorischen, regulatorischen oder wirtschaftlichen Zweck geeignet ist. Sie sind verantwortlich zu prüfen, ob der Dienst für Ihren konkreten Einsatz, Ihre Organisation, Ihre Berufsordnung, Ihre Datenschutzpflichten und Ihre klinischen Workflows geeignet ist.',
        },
        { type: 'p', text: 'Zwingende gesetzliche Gewährleistungsrechte bleiben unberührt.' },
      ],
    },
    {
      id: 'liability',
      heading: '25. Haftung',
      blocks: [
        { type: 'p', text: 'Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit.' },
        {
          type: 'p',
          text: 'Wir haften ebenfalls unbeschränkt bei Verletzung von Leben, Körper oder Gesundheit, nach zwingenden gesetzlichen Haftungsvorschriften sowie im Umfang einer ausdrücklich übernommenen Garantie.',
        },
        {
          type: 'p',
          text: 'Bei leichter Fahrlässigkeit haften wir nur bei Verletzung wesentlicher Vertragspflichten. Wesentliche Vertragspflichten sind Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung Sie regelmäßig vertrauen dürfen. In diesen Fällen ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt.',
        },
        {
          type: 'p',
          text: 'Eine Haftung für mittelbare Schäden, entgangenen Gewinn, ausgebliebene Einsparungen, Betriebsunterbrechungen, Reputationsschäden oder Folgeschäden ist ausgeschlossen, soweit gesetzlich zulässig und soweit nicht einer der vorstehenden Fälle unbeschränkter Haftung vorliegt.',
        },
        {
          type: 'p',
          text: 'Für klinische Entscheidungen, Diagnosen, Medikationsentscheidungen, Risikoeinschätzungen, rechtliche Maßnahmen, Zwangsmaßnahmen, Entlassentscheidungen oder sonstige fachliche Entscheidungen haften wir nicht, soweit diese in der Verantwortung der behandelnden oder fachlich zuständigen Person liegen.',
        },
        {
          type: 'p',
          text: 'Die vorstehenden Haftungsbeschränkungen gelten auch zugunsten unserer gesetzlichen Vertreter, Mitarbeitenden, Erfüllungsgehilfen und Dienstleister.',
        },
      ],
    },
    {
      id: 'indemnity',
      heading: '26. Freistellung',
      blocks: [
        {
          type: 'p',
          text: 'Sie stellen uns von Ansprüchen Dritter frei, die daraus entstehen, dass Sie den Dienst schuldhaft rechtswidrig oder vertragswidrig nutzen, insbesondere durch unzulässige Verarbeitung personenbezogener Daten, Verletzung von Patientengeheimnissen, Verletzung von Rechten Dritter, rechtswidrige Inhalte oder Nutzung außerhalb der vorgesehenen Zweckbestimmung.',
        },
        {
          type: 'p',
          text: 'Die Freistellung umfasst angemessene Kosten der Rechtsverteidigung. Wir werden Sie über geltend gemachte Ansprüche informieren und Ihnen Gelegenheit zur Mitwirkung geben, soweit dem keine rechtlichen oder schutzwürdigen Interessen entgegenstehen.',
        },
      ],
    },
    {
      id: 'force-majeure',
      heading: '27. Höhere Gewalt',
      blocks: [
        {
          type: 'p',
          text: 'Wir haften nicht für Verzögerungen oder Leistungsausfälle, die durch Ereignisse außerhalb unseres zumutbaren Einflussbereichs verursacht werden. Dazu gehören insbesondere Naturereignisse, Krieg, Terror, Arbeitskämpfe, Stromausfälle, Internetausfälle, Ausfälle von Cloud- oder Infrastruktur-Dienstleistern, behördliche Maßnahmen, Pandemien, Cyberangriffe oder sonstige unvorhersehbare Ereignisse.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '28. Änderungen dieser Bedingungen',
      blocks: [
        {
          type: 'p',
          text: 'Wir können diese Bedingungen ändern, wenn dies aus sachlichen Gründen erforderlich ist, insbesondere wegen Änderungen des Dienstes, technischer Entwicklungen, Sicherheitsanforderungen, Änderungen der Rechtslage, regulatorischer Anforderungen, Änderungen der Zahlungsabwicklung oder Erweiterung des Funktionsumfangs.',
        },
        {
          type: 'p',
          text: 'Wesentliche Änderungen teilen wir Ihnen in angemessener Weise mit, etwa per E-Mail oder innerhalb des Dienstes. Die geänderten Bedingungen werden wir mit angemessener Frist vor Inkrafttreten bereitstellen.',
        },
        {
          type: 'p',
          text: 'Wenn Sie den geänderten Bedingungen nicht zustimmen möchten, können Sie den Vertrag vor Inkrafttreten der Änderungen kündigen. Setzen Sie die Nutzung nach Inkrafttreten fort, gelten die geänderten Bedingungen als akzeptiert, soweit dies nach anwendbarem Recht zulässig ist.',
        },
      ],
    },
    {
      id: 'assignment',
      heading: '29. Abtretung',
      blocks: [
        {
          type: 'p',
          text: 'Sie dürfen Rechte und Pflichten aus dem Vertrag nur mit unserer vorherigen schriftlichen Zustimmung übertragen.',
        },
        {
          type: 'p',
          text: 'Wir dürfen Rechte und Pflichten aus dem Vertrag auf ein verbundenes Unternehmen, einen Rechtsnachfolger oder einen Erwerber des Dienstes übertragen, sofern Ihre berechtigten Interessen dadurch nicht unangemessen beeinträchtigt werden.',
        },
      ],
    },
    {
      id: 'law',
      heading: '30. Anwendbares Recht und Gerichtsstand',
      blocks: [
        {
          type: 'p',
          text: 'Es gilt das Recht von England und Wales unter Ausschluss kollisionsrechtlicher Vorschriften, soweit dem keine zwingenden gesetzlichen Vorschriften entgegenstehen.',
        },
        {
          type: 'p',
          text: 'Für Verträge mit Kaufleuten, juristischen Personen des öffentlichen Rechts, öffentlich-rechtlichen Sondervermögen oder vergleichbaren beruflichen bzw. unternehmerischen Nutzern ist, soweit gesetzlich zulässig, der Gerichtsstand am Sitz der Psychiatry Ink Ltd.',
        },
        {
          type: 'p',
          text: 'Zwingende Rechte, Gerichtsstände oder Schutzvorschriften, die nach anwendbarem Recht nicht ausgeschlossen werden können, bleiben unberührt.',
        },
      ],
    },
    {
      id: 'language',
      heading: '31. Sprache',
      blocks: [
        {
          type: 'p',
          text: 'Diese Bedingungen können in deutscher und englischer Sprache bereitgestellt werden. Soweit nicht ausdrücklich anders vereinbart, ist bei Widersprüchen die englische Fassung maßgeblich. Für Nutzerinnen und Nutzer in Deutschland kann zusätzlich eine verbindliche deutsche Fassung bereitgestellt werden.',
        },
      ],
    },
    {
      id: 'final',
      heading: '32. Schlussbestimmungen',
      blocks: [
        {
          type: 'p',
          text: 'Sollte eine Bestimmung dieser Bedingungen ganz oder teilweise unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.',
        },
        {
          type: 'p',
          text: 'Die unwirksame Bestimmung gilt als durch eine wirksame Bestimmung ersetzt, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung möglichst nahekommt, soweit dies gesetzlich zulässig ist. Entsprechendes gilt für Regelungslücken.',
        },
        { type: 'p', text: 'Individuelle Vereinbarungen haben Vorrang vor diesen Bedingungen.' },
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
          text: `${COMPANY.legalName}\n71–75 Shelton Street\nCovent Garden\nLondon, WC2H 9JQ\nVereinigtes Königreich\n${COMPANY.registrationDe}\nRegister: Companies House, England and Wales\nHandelsregisternummer: ${COMPANY.companyNumber}`,
        },
      ],
    },
    {
      id: 'represented',
      heading: 'Vertretungsberechtigte Person',
      blocks: [
        { type: 'p', text: 'Vertreten durch den Director:' },
        { type: 'p', text: CONTACT.representative },
      ],
    },
    {
      id: 'contact',
      heading: 'Kontakt',
      blocks: [
        { type: 'p', text: `E-Mail: ${CONTACT.generalEmail}` },
        {
          type: 'link',
          text: `Kontaktformular: ${localizedPath('contact', 'de')}`,
          href: localizedPath('contact', 'de'),
        },
        { type: 'p', text: 'Bitte verwenden Sie für Datenschutzanfragen ausschließlich:' },
        { type: 'p', text: CONTACT.privacyEmail },
        {
          type: 'p',
          text: 'Bitte übermitteln Sie über E-Mail oder Kontaktformular keine Patientendaten, Gesundheitsdaten oder sonstigen vertraulichen klinischen Inhalte, sofern dies nicht ausdrücklich erforderlich und zuvor mit uns abgestimmt wurde.',
        },
      ],
    },
    {
      id: 'vat',
      heading: 'Umsatzsteuer',
      blocks: [
        { type: 'p', text: 'Eine Umsatzsteuer-Identifikationsnummer wurde noch nicht vergeben.' },
      ],
    },
    {
      id: 'responsible',
      heading: 'Verantwortlich für journalistisch-redaktionelle Inhalte nach § 18 Abs. 2 MStV',
      blocks: [
        {
          type: 'p',
          text: 'Derzeit werden über diese Website keine journalistisch-redaktionellen Angebote im Sinne von § 18 Abs. 2 MStV bereitgestellt.',
        },
        {
          type: 'p',
          text: 'Produktinformationen, Funktionsbeschreibungen, rechtliche Hinweise, Vertragsinformationen und technische Dokumentationen dienen der Beschreibung des Dienstes und stellen kein journalistisch-redaktionelles Angebot dar.',
        },
        {
          type: 'p',
          text: 'Soweit künftig journalistisch-redaktionelle Inhalte veröffentlicht werden, insbesondere periodische Fachbeiträge, Blogartikel, medizinische Kommentare oder öffentlich redaktionell kuratierte Inhalte, wird eine hierfür verantwortliche Person mit Name und ladungsfähiger Anschrift nach Maßgabe von § 18 Abs. 2 MStV benannt.',
        },
      ],
    },
    {
      id: 'professional',
      heading: 'Berufsrechtliche Angaben',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink ist ein Software- und Dokumentationsdienst für berufliche Nutzerinnen und Nutzer im Gesundheitswesen.',
        },
        {
          type: 'p',
          text: 'Über diese Website werden keine individuellen ärztlichen Behandlungen, Diagnosen, Therapien, Konsultationen oder patientenbezogenen medizinischen Leistungen angeboten.',
        },
        {
          type: 'p',
          text: 'Soweit auf der Website allgemeine ärztliche, psychiatrische, psychopharmakologische oder sonstige fachliche Informationen bereitgestellt werden, dienen diese ausschließlich der allgemeinen beruflichen Information. Sie ersetzen keine individuelle ärztliche Prüfung, keine Fachinformation, keine Leitlinie, keine lokale SOP und keine patientenbezogene medizinische Entscheidung.',
        },
        {
          type: 'p',
          text: 'Falls über diese Website künftig persönliche ärztliche Leistungen angeboten werden, werden die erforderlichen berufsrechtlichen Angaben ergänzt, insbesondere zuständige Ärztekammer, gesetzliche Berufsbezeichnung, Staat der Verleihung und einschlägige berufsrechtliche Regelungen.',
        },
      ],
    },
    {
      id: 'content-liability',
      heading: 'Haftung für Inhalte',
      blocks: [
        {
          type: 'p',
          text: 'Wir erstellen die Inhalte dieser Website mit angemessener Sorgfalt. Gleichwohl übernehmen wir keine Gewähr für Vollständigkeit, Richtigkeit, Aktualität oder Eignung der Inhalte für einen bestimmten klinischen, rechtlichen, technischen oder organisatorischen Zweck.',
        },
        {
          type: 'p',
          text: 'Klinische, psychopharmakologische oder sonstige fachliche Inhalte dienen ausschließlich der beruflichen Orientierung. Sie ersetzen keine ärztliche Prüfung, keine individuelle Nutzen-Risiko-Abwägung, keine Fachinformation, keine Leitlinie und keine lokale SOP.',
        },
        {
          type: 'p',
          text: 'Als Diensteanbieter sind wir für eigene Inhalte nach den allgemeinen Gesetzen verantwortlich. Für fremde Inhalte, auf die wir lediglich verweisen oder die von Dritten bereitgestellt werden, übernehmen wir keine Verantwortung, soweit keine gesetzliche Verantwortlichkeit besteht.',
        },
      ],
    },
    {
      id: 'link-liability',
      heading: 'Haftung für Links',
      blocks: [
        {
          type: 'p',
          text: 'Unsere Website kann Links zu externen Websites Dritter enthalten. Auf deren Inhalte haben wir keinen Einfluss. Für die Inhalte verlinkter Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.',
        },
        {
          type: 'p',
          text: 'Zum Zeitpunkt der Verlinkung wurden die verlinkten Seiten auf erkennbare Rechtsverstöße geprüft. Eine fortlaufende inhaltliche Kontrolle externer Links ist ohne konkrete Anhaltspunkte für eine Rechtsverletzung nicht zumutbar. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir betroffene Links entfernen.',
        },
      ],
    },
    {
      id: 'copyright',
      heading: 'Urheberrecht',
      blocks: [
        {
          type: 'p',
          text: 'Die auf dieser Website erstellten Inhalte, Texte, Strukturen, Designs, Grafiken, Logos, Marken, Softwarebestandteile und sonstigen Werke unterliegen dem Urheberrecht und sonstigen Schutzrechten.',
        },
        {
          type: 'p',
          text: 'Eine Vervielfältigung, Bearbeitung, Verbreitung oder sonstige Nutzung außerhalb der Grenzen des anwendbaren Rechts bedarf der vorherigen Zustimmung der jeweiligen Rechteinhaber. Downloads und Kopien dieser Seite sind nur für den eigenen beruflichen Gebrauch zulässig, soweit nicht ausdrücklich anders angegeben.',
        },
      ],
    },
    {
      id: 'dispute',
      heading: 'Streitbeilegung',
      blocks: [
        {
          type: 'p',
          text: 'Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
        },
        {
          type: 'p',
          text: 'Die frühere Online-Streitbeilegungsplattform der Europäischen Kommission wurde eingestellt. Ein Link auf diese Plattform wird daher nicht bereitgestellt.',
        },
      ],
    },
    {
      id: 'audience',
      heading: 'Hinweis zum Nutzerkreis',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink richtet sich ausschließlich an berufliche Nutzerinnen und Nutzer, insbesondere Ärztinnen und Ärzte, Psychotherapeutinnen und Psychotherapeuten, Praxen, Kliniken und sonstige Einrichtungen oder Angehörige des Gesundheitswesens.',
        },
        {
          type: 'p',
          text: 'Eine Nutzung durch Verbraucherinnen und Verbraucher zu privaten Zwecken ist nicht vorgesehen.',
        },
      ],
    },
  ],
}

const impressumEn: LegalDoc = {
  title: 'Legal notice',
  lead: 'Company and provider information for this website and the Psychiatry.Ink service.',
  lastUpdatedLabel: lastUpdatedLabel('en'),
  sections: [
    {
      id: 'operator',
      heading: 'Website operator',
      blocks: [
        { type: 'p', text: 'This website and the Psychiatry.Ink service are operated by:' },
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd\n71–75 Shelton Street\nCovent Garden\nLondon, WC2H 9JQ\nUnited Kingdom',
        },
        {
          type: 'p',
          text: 'Registered in England and Wales.\nCompany number: 17275704.\nLegal form: Private limited company.',
        },
      ],
    },
    {
      id: 'responsible',
      heading: 'Responsible person',
      blocks: [
        { type: 'p', text: 'Represented by the Director:' },
        { type: 'p', text: 'Dr Nathan Narayan' },
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      blocks: [
        { type: 'p', text: 'General enquiries:' },
        { type: 'link', text: 'hello@psychiatry.ink', href: 'mailto:hello@psychiatry.ink' },
        { type: 'p', text: 'Data protection enquiries:' },
        { type: 'link', text: 'data-protection@psychiatry.ink', href: 'mailto:data-protection@psychiatry.ink' },
        {
          type: 'link',
          text: `Contact form: ${localizedPath('contact', 'en')}`,
          href: localizedPath('contact', 'en'),
        },
        {
          type: 'p',
          text: 'Please use the data protection email address for privacy, GDPR, UK GDPR, data-processing, deletion, export, or access requests, and for security or vulnerability reports.',
        },
      ],
    },
    {
      id: 'eu-representative',
      heading: 'EU/EEA representative',
      blocks: [
        {
          type: 'p',
          text: 'Where required under Article 27 GDPR, Psychiatry Ink Ltd will appoint an EU/EEA representative, and the representative’s details will be published here once appointed.',
        },
        {
          type: 'p',
          text: 'No EU/EEA representative has been appointed at this time. Until this is completed, Psychiatry Ink Ltd does not state that it has appointed an EU/EEA representative.',
        },
      ],
    },
    {
      id: 'vat',
      heading: 'VAT',
      blocks: [
        { type: 'p', text: 'A VAT identification number has not yet been assigned.' },
      ],
    },
    {
      id: 'service',
      heading: 'Service description',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink provides clinician-facing psychiatric documentation, dictation, note-generation, template, medication, laboratory, and workflow tools. The service is intended for authorised healthcare professionals and healthcare organisations. Psychiatry.Ink does not provide medical care directly to patients.',
        },
      ],
    },
    {
      id: 'emergency',
      heading: 'No emergency service',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink is not an emergency medical service. Do not use this website or service for urgent medical, psychiatric, suicidal, forensic, or safety-critical emergencies. In an emergency, contact the local emergency number, crisis service, hospital, or responsible clinical team.',
        },
      ],
    },
    {
      id: 'professional-use',
      heading: 'Professional-use disclaimer',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink is a documentation and workflow-support tool. It does not replace professional judgement, local clinical governance, statutory duties, patient assessment, informed consent, risk assessment, or legally required documentation. Users remain responsible for reviewing, correcting, approving, and signing any output before clinical use.',
        },
      ],
    },
    {
      id: 'ip',
      heading: 'Intellectual property',
      blocks: [
        {
          type: 'p',
          text: 'Unless otherwise stated, the text, design, software, branding, workflows, templates, and other materials on this website and in the service are owned by or licensed to Psychiatry Ink Ltd. They may not be copied, redistributed, reverse engineered, or used to build a competing service without written permission.',
        },
      ],
    },
    {
      id: 'external-links',
      heading: 'External links',
      blocks: [
        {
          type: 'p',
          text: 'This website may contain links to third-party websites or services. Psychiatry Ink Ltd is not responsible for the content, security, availability, or privacy practices of third-party websites.',
        },
      ],
    },
    {
      id: 'complaints',
      heading: 'Complaints and legal correspondence',
      blocks: [
        {
          type: 'p',
          text: 'Legal notices and formal correspondence should be sent to the registered office address above and, where possible, copied to:',
        },
        { type: 'link', text: 'hello@psychiatry.ink', href: 'mailto:hello@psychiatry.ink' },
      ],
    },
  ],
}

/* ───────────────────────────── COOKIE POLICY ────────────────────────────── */

const cookiePolicyEn: LegalDoc = {
  title: 'Cookie Policy',
  lead: 'This Cookie Policy explains how Psychiatry Ink Ltd uses cookies and similar technologies on its websites and the Psychiatry.Ink service.',
  lastUpdatedLabel: lastUpdatedLabel('en'),
  sections: [
    {
      id: 'who-we-are',
      heading: '1. Who we are',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd\n71–75 Shelton Street\nCovent Garden\nLondon, WC2H 9JQ\nUnited Kingdom',
        },
        { type: 'p', text: 'General enquiries:' },
        { type: 'link', text: 'hello@psychiatry.ink', href: 'mailto:hello@psychiatry.ink' },
        { type: 'p', text: 'Data protection enquiries:' },
        { type: 'link', text: 'data-protection@psychiatry.ink', href: 'mailto:data-protection@psychiatry.ink' },
      ],
    },
    {
      id: 'what-cookies-are',
      heading: '2. What cookies are',
      blocks: [
        {
          type: 'p',
          text: 'Cookies are small files stored on your device. Similar technologies include local storage, session storage, pixels, tags, software development kits (SDKs), and device identifiers. In this policy we refer to all of these as “cookies”.',
        },
      ],
    },
    {
      id: 'how-we-use',
      heading: '3. How we use cookies',
      blocks: [
        { type: 'p', text: 'We use cookies and similar technologies to:' },
        {
          type: 'ul',
          items: [
            'operate the website and the logged-in service;',
            'keep users signed in securely;',
            'remember language, privacy, and cookie preferences;',
            'protect against fraud, abuse, and unauthorised access;',
            'process payments and subscriptions;',
            'understand aggregated website usage where analytics are enabled;',
            'improve performance, reliability, and user experience.',
          ],
        },
      ],
    },
    {
      id: 'strictly-necessary',
      heading: '4. Strictly necessary cookies',
      blocks: [
        {
          type: 'p',
          text: 'Strictly necessary cookies are required for the website or service to work. They may be set without consent where permitted by law. The main categories we use are:',
        },
        {
          type: 'ul',
          items: [
            'Authentication session — keeps logged-in users authenticated (duration: session or a limited signed-in period).',
            'CSRF / security token — protects forms and requests from abuse (duration: session or a limited period).',
            'Cookie consent record — stores your cookie preferences (duration: up to 12 months).',
            'Language preference — remembers your selected language (duration: up to 12 months).',
            'Payment security cookies — support secure payment processing (duration: controlled by the payment provider).',
          ],
        },
      ],
    },
    {
      id: 'analytics',
      heading: '5. Analytics cookies',
      blocks: [
        {
          type: 'p',
          text: 'Analytics cookies help us understand how visitors use the website and which pages or features need improvement. We would use analytics only where enabled and where any required consent has been obtained.',
        },
        {
          type: 'p',
          text: 'We currently do not use analytics cookies. If we introduce analytics in future, we will update this page and, where consent is required, request it before any non-essential analytics cookies are set.',
        },
      ],
    },
    {
      id: 'marketing',
      heading: '6. Marketing cookies',
      blocks: [
        {
          type: 'p',
          text: 'Marketing cookies are used for advertising, retargeting, campaign measurement, or profiling.',
        },
        {
          type: 'p',
          text: 'We currently do not use marketing cookies. We keep them disabled by default and would only enable them with a proper consent-management process in place.',
        },
      ],
    },
    {
      id: 'third-party',
      heading: '7. Third-party cookies',
      blocks: [
        {
          type: 'p',
          text: 'Third-party providers may set cookies when you use payment, authentication, security, or related features. These providers may include:',
        },
        {
          type: 'ul',
          items: [
            'Stripe, for payment processing;',
            'Google services, where Google Workspace, Google Cloud, or related services are used;',
            'other providers listed on our Sub-processors page.',
          ],
        },
        {
          type: 'link',
          text: 'View our Sub-processors',
          href: localizedPath('subprocessors', 'en'),
        },
      ],
    },
    {
      id: 'managing',
      heading: '8. Managing cookie preferences',
      blocks: [
        {
          type: 'p',
          text: 'You can manage non-essential cookie preferences through the cookie banner or cookie settings where these are available. You can also control cookies through your browser settings. Blocking some cookies may affect website or app functionality.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '9. Changes to this policy',
      blocks: [
        {
          type: 'p',
          text: 'We may update this Cookie Policy when our cookies, providers, or legal obligations change. The latest version will be published on this page.',
        },
      ],
    },
  ],
}

const cookiePolicyDe: LegalDoc = {
  title: 'Cookie-Richtlinie',
  lead: 'Diese Cookie-Richtlinie erläutert, wie die Psychiatry Ink Ltd Cookies und ähnliche Technologien auf ihren Websites und im Dienst Psychiatrie.Ink einsetzt.',
  lastUpdatedLabel: lastUpdatedLabel('de'),
  sections: [
    {
      id: 'who-we-are',
      heading: '1. Verantwortlicher',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd\n71–75 Shelton Street\nCovent Garden\nLondon, WC2H 9JQ\nVereinigtes Königreich',
        },
        { type: 'p', text: 'Allgemeine Anfragen:' },
        { type: 'link', text: 'hello@psychiatry.ink', href: 'mailto:hello@psychiatry.ink' },
        { type: 'p', text: 'Datenschutzanfragen:' },
        { type: 'link', text: 'data-protection@psychiatry.ink', href: 'mailto:data-protection@psychiatry.ink' },
      ],
    },
    {
      id: 'what-cookies-are',
      heading: '2. Was Cookies sind',
      blocks: [
        {
          type: 'p',
          text: 'Cookies sind kleine Dateien, die auf Ihrem Endgerät gespeichert werden. Zu den ähnlichen Technologien gehören lokale Speicherung (Local Storage), Sitzungsspeicher (Session Storage), Zählpixel, Tags, Software Development Kits (SDKs) und Geräteidentifikatoren. In dieser Richtlinie werden alle diese Technologien als „Cookies“ bezeichnet.',
        },
      ],
    },
    {
      id: 'how-we-use',
      heading: '3. Wie wir Cookies verwenden',
      blocks: [
        { type: 'p', text: 'Wir verwenden Cookies und ähnliche Technologien, um:' },
        {
          type: 'ul',
          items: [
            'die Website und den angemeldeten Dienst zu betreiben;',
            'Nutzerinnen und Nutzer sicher angemeldet zu halten;',
            'Sprach-, Datenschutz- und Cookie-Einstellungen zu speichern;',
            'vor Betrug, Missbrauch und unbefugtem Zugriff zu schützen;',
            'Zahlungen und Abonnements abzuwickeln;',
            'die aggregierte Nutzung der Website zu verstehen, soweit Analyse aktiviert ist;',
            'Leistung, Zuverlässigkeit und Nutzererlebnis zu verbessern.',
          ],
        },
      ],
    },
    {
      id: 'strictly-necessary',
      heading: '4. Technisch notwendige Cookies',
      blocks: [
        {
          type: 'p',
          text: 'Technisch notwendige Cookies sind für den Betrieb der Website oder des Dienstes erforderlich. Sie dürfen, soweit gesetzlich zulässig, ohne Einwilligung gesetzt werden. Wir verwenden insbesondere folgende Kategorien:',
        },
        {
          type: 'ul',
          items: [
            'Authentifizierungs-Sitzung — hält angemeldete Nutzer authentifiziert (Dauer: Sitzung oder begrenzter Anmeldezeitraum).',
            'CSRF-/Sicherheits-Token — schützt Formulare und Anfragen vor Missbrauch (Dauer: Sitzung oder begrenzter Zeitraum).',
            'Cookie-Einwilligungsnachweis — speichert Ihre Cookie-Einstellungen (Dauer: bis zu 12 Monate).',
            'Spracheinstellung — speichert die gewählte Sprache (Dauer: bis zu 12 Monate).',
            'Zahlungssicherheits-Cookies — unterstützen die sichere Zahlungsabwicklung (Dauer: durch den Zahlungsdienstleister festgelegt).',
          ],
        },
      ],
    },
    {
      id: 'analytics',
      heading: '5. Analyse-Cookies',
      blocks: [
        {
          type: 'p',
          text: 'Analyse-Cookies helfen zu verstehen, wie Besucherinnen und Besucher die Website nutzen und welche Seiten oder Funktionen verbessert werden sollten. Wir würden Analyse nur einsetzen, soweit sie aktiviert ist und eine etwaig erforderliche Einwilligung vorliegt.',
        },
        {
          type: 'p',
          text: 'Derzeit setzen wir keine Analyse-Cookies ein. Sollten wir künftig Analyse einführen, aktualisieren wir diese Seite und holen, soweit erforderlich, vor dem Setzen nicht notwendiger Analyse-Cookies eine Einwilligung ein.',
        },
      ],
    },
    {
      id: 'marketing',
      heading: '6. Marketing-Cookies',
      blocks: [
        {
          type: 'p',
          text: 'Marketing-Cookies dienen Werbung, Retargeting, Kampagnenmessung oder Profilbildung.',
        },
        {
          type: 'p',
          text: 'Derzeit setzen wir keine Marketing-Cookies ein. Sie sind standardmäßig deaktiviert und würden nur mit einem geeigneten Einwilligungs-Management aktiviert.',
        },
      ],
    },
    {
      id: 'third-party',
      heading: '7. Cookies von Drittanbietern',
      blocks: [
        {
          type: 'p',
          text: 'Drittanbieter können Cookies setzen, wenn Sie Zahlungs-, Authentifizierungs-, Sicherheits- oder zugehörige Funktionen nutzen. Dazu können gehören:',
        },
        {
          type: 'ul',
          items: [
            'Stripe für die Zahlungsabwicklung;',
            'Google-Dienste, soweit Google Workspace, Google Cloud oder verwandte Dienste genutzt werden;',
            'weitere Anbieter, die auf unserer Seite zu Unterauftragsverarbeitern aufgeführt sind.',
          ],
        },
        {
          type: 'link',
          text: 'Unsere Unterauftragsverarbeiter ansehen',
          href: localizedPath('subprocessors', 'de'),
        },
      ],
    },
    {
      id: 'managing',
      heading: '8. Cookie-Einstellungen verwalten',
      blocks: [
        {
          type: 'p',
          text: 'Sie können nicht notwendige Cookie-Einstellungen über das Cookie-Banner bzw. die Cookie-Einstellungen verwalten, soweit diese verfügbar sind. Zusätzlich können Sie Cookies über die Einstellungen Ihres Browsers steuern. Das Blockieren bestimmter Cookies kann die Funktionsfähigkeit der Website oder Anwendung beeinträchtigen.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '9. Änderungen dieser Richtlinie',
      blocks: [
        {
          type: 'p',
          text: 'Wir können diese Cookie-Richtlinie aktualisieren, wenn sich unsere Cookies, Anbieter oder gesetzlichen Pflichten ändern. Die jeweils aktuelle Fassung wird auf dieser Seite veröffentlicht.',
        },
      ],
    },
  ],
}

/* ──────────────────────── DATA PROCESSING AGREEMENT ─────────────────────── */

const dpaEn: LegalDoc = {
  title: 'Data Processing Agreement',
  lead: 'This Data Processing Agreement (“DPA”) forms part of the agreement between Psychiatry Ink Ltd and the customer using Psychiatry.Ink where Psychiatry Ink Ltd processes personal data on behalf of the customer.\n\nThis DPA is intended to be accepted during signup, organisation setup, or execution of an order form, and should be read together with the Privacy Notice and Terms of Service.',
  lastUpdatedLabel: lastUpdatedLabel('en'),
  sections: [
    {
      id: 'parties',
      heading: '1. Parties',
      blocks: [
        {
          type: 'p',
          text: 'Customer / Controller: the individual clinician, practice, clinic, hospital, organisation, or other legal entity using Psychiatry.Ink and determining the purposes and means of processing personal data.',
        },
        { type: 'p', text: 'Processor:' },
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd\n71–75 Shelton Street\nCovent Garden\nLondon, WC2H 9JQ\nUnited Kingdom\nCompany number: 17275704',
        },
      ],
    },
    {
      id: 'definitions',
      heading: '2. Definitions',
      blocks: [
        {
          type: 'p',
          text: '“Applicable Data Protection Law” means the UK GDPR, the Data Protection Act 2018, the EU GDPR, and any other data protection law applicable to the processing under the customer’s use of Psychiatry.Ink.',
        },
        {
          type: 'p',
          text: '“Personal Data”, “Processing”, “Controller”, “Processor”, “Data Subject”, “Personal Data Breach”, and “Special Category Data” have the meanings given in Applicable Data Protection Law.',
        },
        {
          type: 'p',
          text: '“Customer Data” means personal data submitted to Psychiatry.Ink by or on behalf of the customer, including clinical documentation, user account data, and related metadata.',
        },
      ],
    },
    {
      id: 'roles',
      heading: '3. Roles',
      blocks: [
        {
          type: 'p',
          text: 'For clinical and patient-related Customer Data, the customer is the controller and Psychiatry Ink Ltd is the processor, unless the parties agree otherwise in writing.',
        },
        {
          type: 'p',
          text: 'For Psychiatry Ink Ltd’s own account, billing, website, legal, and business-administration data, Psychiatry Ink Ltd may act as controller as described in the Privacy Notice.',
        },
      ],
    },
    {
      id: 'subject-matter',
      heading: '4. Subject matter and duration',
      blocks: [
        {
          type: 'p',
          text: 'The subject matter is the provision of Psychiatry.Ink, including psychiatric documentation, dictation, template, AI, medication, laboratory, workflow, account, support, billing, and security functions.',
        },
        {
          type: 'p',
          text: 'Processing continues for the duration of the customer’s subscription, trial, pilot, account, or order form, and afterwards only as needed for deletion, return, backup expiry, legal compliance, security, dispute resolution, or as otherwise agreed.',
        },
      ],
    },
    {
      id: 'nature-purpose',
      heading: '5. Nature and purpose of processing',
      blocks: [
        {
          type: 'p',
          text: 'Processing may include collection, recording, organisation, structuring, storage, retrieval, consultation, use, transmission to authorised sub-processors, output generation, deletion, and export.',
        },
        { type: 'p', text: 'Purposes include:' },
        {
          type: 'ul',
          items: [
            'providing the Psychiatry.Ink service;',
            'generating, editing, summarising, formatting, translating, or organising clinical documentation;',
            'processing dictation or transcription;',
            'managing medication, laboratory, risk, template, and workflow functions;',
            'providing AI-supported features selected by the user;',
            'providing support and troubleshooting;',
            'securing, monitoring, auditing, and improving the service;',
            'administering accounts, billing, subscriptions, and credits.',
          ],
        },
      ],
    },
    {
      id: 'data-subjects',
      heading: '6. Categories of data subjects',
      blocks: [
        { type: 'p', text: 'Depending on customer use, data subjects may include:' },
        {
          type: 'ul',
          items: [
            'professional users;',
            'employees, contractors, or staff of the customer;',
            'patients or service users documented by the customer;',
            'relatives, carers, legal representatives, prison staff, court contacts, or other third parties mentioned in clinical records;',
            'support contacts and billing contacts.',
          ],
        },
      ],
    },
    {
      id: 'data-categories',
      heading: '7. Categories of personal data',
      blocks: [
        { type: 'p', text: 'Depending on customer use, Customer Data may include:' },
        {
          type: 'ul',
          items: [
            'user identity and account data;',
            'professional role and organisation data;',
            'clinical notes, psychiatric history, mental-state examination, diagnosis, treatment, medication, laboratory, and risk-assessment data;',
            'dictated text, generated drafts, templates, correspondence, and document outputs;',
            'metadata such as timestamps, feature use, token usage, audit logs, and access logs;',
            'billing and subscription metadata.',
          ],
        },
      ],
    },
    {
      id: 'special-category',
      heading: '8. Special category data',
      blocks: [
        {
          type: 'p',
          text: 'Customer Data may include health data, psychiatric data, medication data, disability data, forensic or detention-related data, and other special category or sensitive data if entered by the customer.',
        },
        {
          type: 'p',
          text: 'The customer is responsible for ensuring that it has an appropriate legal basis and special-category condition for such processing.',
        },
      ],
    },
    {
      id: 'instructions',
      heading: '9. Customer instructions',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd will process Customer Data only on the customer’s documented instructions, including instructions in the main agreement, product settings, order form, this DPA, and lawful user actions inside the service.',
        },
        {
          type: 'p',
          text: 'If Psychiatry Ink Ltd believes an instruction infringes Applicable Data Protection Law, it will inform the customer unless prohibited by law.',
        },
      ],
    },
    {
      id: 'confidentiality',
      heading: '10. Confidentiality',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd will ensure that persons authorised to process Customer Data are bound by confidentiality obligations or are under an appropriate statutory duty of confidentiality.',
        },
      ],
    },
    {
      id: 'security',
      heading: '11. Security measures',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd will implement appropriate technical and organisational measures designed to protect Customer Data against unauthorised or unlawful processing and against accidental loss, destruction, damage, alteration, or disclosure. These measures include those listed in Annex 2.',
        },
      ],
    },
    {
      id: 'subprocessors',
      heading: '12. Sub-processors',
      blocks: [
        {
          type: 'p',
          text: 'The customer gives general authorisation for Psychiatry Ink Ltd to use sub-processors to provide the service, subject to the conditions in this DPA.',
        },
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd maintains a list of sub-processors on the Sub-processors page and will require sub-processors to provide data protection obligations substantially equivalent to those in this DPA where required by law.',
        },
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd will provide notice of material new sub-processors by updating the Sub-processors page, email, in-app notice, or another reasonable method. The customer may object on reasonable data-protection grounds within 30 days of that notice.',
        },
        {
          type: 'link',
          text: 'View our Sub-processors',
          href: localizedPath('subprocessors', 'en'),
        },
      ],
    },
    {
      id: 'transfers',
      heading: '13. International transfers',
      blocks: [
        {
          type: 'p',
          text: 'Where Customer Data is transferred internationally, Psychiatry Ink Ltd will use appropriate safeguards where required, such as adequacy regulations, EU Standard Contractual Clauses, the UK International Data Transfer Agreement, the UK Addendum to EU Standard Contractual Clauses, or other legally recognised safeguards.',
        },
        {
          type: 'p',
          text: 'For EU/EEA customers or EU/EEA data, the parties will complete the relevant SCC modules where required.',
        },
      ],
    },
    {
      id: 'data-subject-rights',
      heading: '14. Assistance with data subject rights',
      blocks: [
        {
          type: 'p',
          text: 'Taking into account the nature of processing, Psychiatry Ink Ltd will provide reasonable assistance to the customer in responding to data subject requests where required by law and where the request relates to Customer Data processed by Psychiatry Ink Ltd as processor.',
        },
        {
          type: 'p',
          text: 'If Psychiatry Ink Ltd receives a request directly from a data subject relating to Customer Data, it will, where legally permitted and reasonably identifiable, forward the request to the customer or advise the requester to contact the customer.',
        },
      ],
    },
    {
      id: 'compliance-assistance',
      heading: '15. Assistance with compliance',
      blocks: [
        {
          type: 'p',
          text: 'Taking into account the nature of processing and the information available to Psychiatry Ink Ltd, Psychiatry Ink Ltd will provide reasonable assistance with security, breach notification, data protection impact assessments, prior consultations, and related compliance obligations where required by Applicable Data Protection Law.',
        },
      ],
    },
    {
      id: 'breach',
      heading: '16. Personal data breach',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd will notify the customer without undue delay after becoming aware of a Personal Data Breach affecting Customer Data. The notification will include available information reasonably required to help the customer meet its breach notification obligations.',
        },
      ],
    },
    {
      id: 'deletion',
      heading: '17. Deletion and return',
      blocks: [
        {
          type: 'p',
          text: 'At the customer’s choice and subject to technical feasibility, legal retention duties, backup expiry, and payment obligations, Psychiatry Ink Ltd will delete or return Customer Data after the end of the service.',
        },
        {
          type: 'p',
          text: 'Backup copies may persist for a limited period until overwritten or deleted according to the backup retention schedule.',
        },
      ],
    },
    {
      id: 'audit',
      heading: '18. Audit and information rights',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd will make available information reasonably necessary to demonstrate compliance with this DPA. Audits must be reasonable, proportionate, subject to confidentiality, limited to data-protection controls relevant to the service, and must not compromise security, other customers, trade secrets, or third-party confidentiality.',
        },
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd may satisfy audit obligations through security documentation, questionnaires, third-party reports, certifications, or structured written responses.',
        },
      ],
    },
    {
      id: 'customer-obligations',
      heading: '19. Customer obligations',
      blocks: [
        { type: 'p', text: 'The customer must:' },
        {
          type: 'ul',
          items: [
            'use the service lawfully;',
            'configure privacy and retention settings appropriately;',
            'avoid unnecessary direct identifiers in AI features where possible;',
            'ensure end users are authorised and trained;',
            'maintain endpoint, password, and local-key security;',
            'provide required patient or staff privacy notices;',
            'ensure local clinical, institutional, and legal compliance;',
            'use production clinical data only when contractual and technical safeguards are in place.',
          ],
        },
      ],
    },
    {
      id: 'precedence',
      heading: '20. Order of precedence',
      blocks: [
        {
          type: 'p',
          text: 'If there is a conflict between this DPA and the Terms of Service concerning processing of Customer Data as processor, this DPA takes precedence. If Standard Contractual Clauses apply, they take precedence where required by law.',
        },
      ],
    },
    {
      id: 'annex-1',
      heading: 'Annex 1: Processing details',
      blocks: [
        {
          type: 'ul',
          items: [
            'Subject matter: provision of Psychiatry.Ink clinical documentation and workflow software.',
            'Duration: subscription, trial, pilot, account, or order-form period, and the deletion/retention wind-down.',
            'Nature: hosting, storage, retrieval, generation, transcription, editing, support, security, billing metadata, deletion/export.',
            'Purpose: providing and securing psychiatric documentation and workflow tools.',
            'Data subjects: professional users, customer staff, patients, relatives, carers, and third parties mentioned in clinical records.',
            'Personal data: account data, clinical notes, psychiatric documentation, medication/lab/risk data, user metadata, billing metadata.',
            'Special category data: health data and psychiatric data if entered by the customer.',
            'Frequency: continuous during use of the service.',
          ],
        },
      ],
    },
    {
      id: 'annex-2',
      heading: 'Annex 2: Technical and organisational measures',
      blocks: [
        { type: 'p', text: 'Measures include:' },
        {
          type: 'ul',
          items: [
            'encryption in transit using HTTPS/TLS;',
            'encryption at rest where supported by infrastructure providers;',
            'a client-side encrypted local vault for selected identifiers and mappings where enabled;',
            'role-based access control;',
            'authentication and session controls;',
            'audit logging of relevant access and actions;',
            'separation of customer organisations where applicable;',
            'minimisation and de-identification features;',
            'backup and recovery controls;',
            'vulnerability and dependency management;',
            'security monitoring and an incident response process;',
            'staff or contractor confidentiality obligations;',
            'sub-processor due diligence;',
            'restricted production access;',
            'deletion/export workflows where available.',
          ],
        },
      ],
    },
    {
      id: 'annex-3',
      heading: 'Annex 3: Sub-processors',
      blocks: [
        {
          type: 'p',
          text: 'The current sub-processor list is published on the Sub-processors page. The customer should review that page before using production clinical data.',
        },
        {
          type: 'link',
          text: 'View our Sub-processors',
          href: localizedPath('subprocessors', 'en'),
        },
      ],
    },
  ],
}

const dpaDe: LegalDoc = {
  title: 'Auftragsverarbeitungsvertrag (AVV)',
  lead: 'Dieser Auftragsverarbeitungsvertrag („AVV“) ist Bestandteil der Vereinbarung zwischen der Psychiatry Ink Ltd und dem Kunden, der Psychiatrie.Ink nutzt, soweit die Psychiatry Ink Ltd personenbezogene Daten im Auftrag des Kunden verarbeitet.\n\nDieser AVV ist dafür vorgesehen, bei der Registrierung, der Einrichtung der Organisation oder beim Abschluss eines Auftragsformulars akzeptiert zu werden, und ist zusammen mit der Datenschutzerklärung und den Allgemeinen Geschäftsbedingungen zu lesen.',
  lastUpdatedLabel: lastUpdatedLabel('de'),
  sections: [
    {
      id: 'parties',
      heading: '1. Parteien',
      blocks: [
        {
          type: 'p',
          text: 'Kunde / Verantwortlicher: die behandelnde Person, Praxis, Klinik, Einrichtung, Organisation oder sonstige juristische Person, die Psychiatrie.Ink nutzt und über die Zwecke und Mittel der Verarbeitung personenbezogener Daten entscheidet.',
        },
        { type: 'p', text: 'Auftragsverarbeiter:' },
        {
          type: 'p',
          text: 'Psychiatry Ink Ltd\n71–75 Shelton Street\nCovent Garden\nLondon, WC2H 9JQ\nVereinigtes Königreich\nCompany number: 17275704',
        },
      ],
    },
    {
      id: 'definitions',
      heading: '2. Begriffsbestimmungen',
      blocks: [
        {
          type: 'p',
          text: '„Anwendbares Datenschutzrecht“ bezeichnet die UK GDPR, den Data Protection Act 2018, die EU-DSGVO sowie jedes weitere Datenschutzrecht, das auf die Verarbeitung im Rahmen der Nutzung von Psychiatrie.Ink durch den Kunden anwendbar ist.',
        },
        {
          type: 'p',
          text: 'Die Begriffe „personenbezogene Daten“, „Verarbeitung“, „Verantwortlicher“, „Auftragsverarbeiter“, „betroffene Person“, „Verletzung des Schutzes personenbezogener Daten“ und „besondere Kategorien personenbezogener Daten“ haben die im anwendbaren Datenschutzrecht festgelegte Bedeutung.',
        },
        {
          type: 'p',
          text: '„Kundendaten“ bezeichnet personenbezogene Daten, die durch den Kunden oder in seinem Auftrag an Psychiatrie.Ink übermittelt werden, einschließlich klinischer Dokumentation, Kontodaten und zugehöriger Metadaten.',
        },
      ],
    },
    {
      id: 'roles',
      heading: '3. Rollen',
      blocks: [
        {
          type: 'p',
          text: 'Für klinische und patientenbezogene Kundendaten ist der Kunde der Verantwortliche und die Psychiatry Ink Ltd der Auftragsverarbeiter, sofern die Parteien nichts anderes schriftlich vereinbaren.',
        },
        {
          type: 'p',
          text: 'Für eigene Konto-, Abrechnungs-, Website-, Rechts- und Geschäftsverwaltungsdaten der Psychiatry Ink Ltd kann diese als Verantwortlicher handeln, wie in der Datenschutzerklärung beschrieben.',
        },
      ],
    },
    {
      id: 'subject-matter',
      heading: '4. Gegenstand und Dauer',
      blocks: [
        {
          type: 'p',
          text: 'Gegenstand ist die Bereitstellung von Psychiatrie.Ink, einschließlich Funktionen für psychiatrische Dokumentation, Diktat, Vorlagen, KI, Medikation, Labor, Workflow, Konto, Support, Abrechnung und Sicherheit.',
        },
        {
          type: 'p',
          text: 'Die Verarbeitung dauert für die Laufzeit des Abonnements, der Testphase, des Pilotbetriebs, des Kontos oder des Auftragsformulars des Kunden an und danach nur, soweit dies für Löschung, Rückgabe, Backup-Ablauf, Rechtskonformität, Sicherheit, Streitbeilegung oder nach gesonderter Vereinbarung erforderlich ist.',
        },
      ],
    },
    {
      id: 'nature-purpose',
      heading: '5. Art und Zweck der Verarbeitung',
      blocks: [
        {
          type: 'p',
          text: 'Die Verarbeitung kann das Erheben, Erfassen, Organisieren, Strukturieren, Speichern, Auslesen, Abfragen, Verwenden, Übermitteln an autorisierte Unterauftragsverarbeiter, Erzeugen von Ergebnissen, Löschen und Exportieren umfassen.',
        },
        { type: 'p', text: 'Die Zwecke umfassen:' },
        {
          type: 'ul',
          items: [
            'die Bereitstellung des Dienstes Psychiatrie.Ink;',
            'das Erstellen, Bearbeiten, Zusammenfassen, Formatieren, Übersetzen oder Organisieren klinischer Dokumentation;',
            'die Verarbeitung von Diktat oder Transkription;',
            'die Verwaltung von Medikations-, Labor-, Risiko-, Vorlagen- und Workflow-Funktionen;',
            'die Bereitstellung der vom Nutzer ausgewählten KI-gestützten Funktionen;',
            'die Bereitstellung von Support und Fehlerbehebung;',
            'das Absichern, Überwachen, Auditieren und Verbessern des Dienstes;',
            'die Verwaltung von Konten, Abrechnung, Abonnements und Credits.',
          ],
        },
      ],
    },
    {
      id: 'data-subjects',
      heading: '6. Kategorien betroffener Personen',
      blocks: [
        { type: 'p', text: 'Je nach Nutzung durch den Kunden können betroffene Personen sein:' },
        {
          type: 'ul',
          items: [
            'berufliche Nutzerinnen und Nutzer;',
            'Beschäftigte, Auftragnehmer oder Personal des Kunden;',
            'Patientinnen, Patienten oder von ihm dokumentierte Personen;',
            'Angehörige, Betreuende, gesetzliche Vertreter, Justizvollzugspersonal, Gerichtskontakte oder sonstige in klinischen Akten genannte Dritte;',
            'Support- und Abrechnungskontakte.',
          ],
        },
      ],
    },
    {
      id: 'data-categories',
      heading: '7. Kategorien personenbezogener Daten',
      blocks: [
        { type: 'p', text: 'Je nach Nutzung durch den Kunden können Kundendaten umfassen:' },
        {
          type: 'ul',
          items: [
            'Identitäts- und Kontodaten der Nutzer;',
            'Daten zu beruflicher Rolle und Organisation;',
            'klinische Notizen, psychiatrische Anamnese, psychopathologischer Befund, Diagnose, Behandlung, Medikation, Labor- und Risikoeinschätzungsdaten;',
            'diktierte Texte, erzeugte Entwürfe, Vorlagen, Korrespondenz und Dokumentenergebnisse;',
            'Metadaten wie Zeitstempel, Funktionsnutzung, Token-Verbrauch, Audit-Protokolle und Zugriffsprotokolle;',
            'Abrechnungs- und Abonnement-Metadaten.',
          ],
        },
      ],
    },
    {
      id: 'special-category',
      heading: '8. Besondere Kategorien personenbezogener Daten',
      blocks: [
        {
          type: 'p',
          text: 'Kundendaten können Gesundheitsdaten, psychiatrische Daten, Medikationsdaten, Daten zu Behinderungen, forensische oder haftbezogene Daten sowie sonstige besondere Kategorien oder sensible Daten enthalten, soweit sie vom Kunden eingegeben werden.',
        },
        {
          type: 'p',
          text: 'Der Kunde ist dafür verantwortlich sicherzustellen, dass für eine solche Verarbeitung eine geeignete Rechtsgrundlage sowie eine Bedingung nach Art. 9 DSGVO vorliegt.',
        },
      ],
    },
    {
      id: 'instructions',
      heading: '9. Weisungen des Kunden',
      blocks: [
        {
          type: 'p',
          text: 'Die Psychiatry Ink Ltd verarbeitet Kundendaten ausschließlich auf dokumentierte Weisung des Kunden, einschließlich der Weisungen im Hauptvertrag, in den Produkteinstellungen, im Auftragsformular, in diesem AVV sowie durch rechtmäßige Nutzerhandlungen innerhalb des Dienstes.',
        },
        {
          type: 'p',
          text: 'Ist die Psychiatry Ink Ltd der Auffassung, dass eine Weisung gegen anwendbares Datenschutzrecht verstößt, informiert sie den Kunden, sofern dies nicht gesetzlich untersagt ist.',
        },
      ],
    },
    {
      id: 'confidentiality',
      heading: '10. Vertraulichkeit',
      blocks: [
        {
          type: 'p',
          text: 'Die Psychiatry Ink Ltd stellt sicher, dass zur Verarbeitung von Kundendaten befugte Personen zur Vertraulichkeit verpflichtet sind oder einer entsprechenden gesetzlichen Verschwiegenheitspflicht unterliegen.',
        },
      ],
    },
    {
      id: 'security',
      heading: '11. Sicherheitsmaßnahmen',
      blocks: [
        {
          type: 'p',
          text: 'Die Psychiatry Ink Ltd setzt geeignete technische und organisatorische Maßnahmen um, um Kundendaten vor unbefugter oder unrechtmäßiger Verarbeitung sowie vor unbeabsichtigtem Verlust, Zerstörung, Schädigung, Veränderung oder Offenlegung zu schützen. Diese Maßnahmen umfassen die in Anlage 2 genannten Maßnahmen.',
        },
      ],
    },
    {
      id: 'subprocessors',
      heading: '12. Unterauftragsverarbeiter',
      blocks: [
        {
          type: 'p',
          text: 'Der Kunde erteilt der Psychiatry Ink Ltd die allgemeine Genehmigung, zur Erbringung des Dienstes Unterauftragsverarbeiter einzusetzen, vorbehaltlich der Bedingungen dieses AVV.',
        },
        {
          type: 'p',
          text: 'Die Psychiatry Ink Ltd führt auf der Seite zu Unterauftragsverarbeitern eine Liste der Unterauftragsverarbeiter und verpflichtet diese, soweit gesetzlich erforderlich, zu Datenschutzpflichten, die den Pflichten dieses AVV im Wesentlichen gleichwertig sind.',
        },
        {
          type: 'p',
          text: 'Die Psychiatry Ink Ltd informiert über wesentliche neue Unterauftragsverarbeiter durch Aktualisierung der Seite zu Unterauftragsverarbeitern, per E-Mail, durch In-App-Hinweis oder auf andere angemessene Weise. Der Kunde kann innerhalb von 30 Tagen nach dieser Mitteilung aus berechtigten datenschutzrechtlichen Gründen widersprechen.',
        },
        {
          type: 'link',
          text: 'Unsere Unterauftragsverarbeiter ansehen',
          href: localizedPath('subprocessors', 'de'),
        },
      ],
    },
    {
      id: 'transfers',
      heading: '13. Internationale Datenübermittlungen',
      blocks: [
        {
          type: 'p',
          text: 'Soweit Kundendaten international übermittelt werden, setzt die Psychiatry Ink Ltd geeignete Garantien ein, soweit erforderlich, etwa Angemessenheitsbeschlüsse, EU-Standardvertragsklauseln, das UK International Data Transfer Agreement, das UK-Addendum zu den EU-Standardvertragsklauseln oder andere gesetzlich anerkannte Garantien.',
        },
        {
          type: 'p',
          text: 'Für Kunden aus der EU/dem EWR oder für Daten aus der EU/dem EWR vervollständigen die Parteien die einschlägigen SCC-Module, soweit erforderlich.',
        },
      ],
    },
    {
      id: 'data-subject-rights',
      heading: '14. Unterstützung bei Betroffenenrechten',
      blocks: [
        {
          type: 'p',
          text: 'Unter Berücksichtigung der Art der Verarbeitung unterstützt die Psychiatry Ink Ltd den Kunden in angemessener Weise bei der Beantwortung von Anträgen betroffener Personen, soweit dies gesetzlich erforderlich ist und der Antrag Kundendaten betrifft, die die Psychiatry Ink Ltd als Auftragsverarbeiter verarbeitet.',
        },
        {
          type: 'p',
          text: 'Erhält die Psychiatry Ink Ltd einen Antrag direkt von einer betroffenen Person, der Kundendaten betrifft, leitet sie diesen, soweit rechtlich zulässig und zuordenbar, an den Kunden weiter oder verweist die anfragende Person an den Kunden.',
        },
      ],
    },
    {
      id: 'compliance-assistance',
      heading: '15. Unterstützung bei der Einhaltung von Pflichten',
      blocks: [
        {
          type: 'p',
          text: 'Unter Berücksichtigung der Art der Verarbeitung und der ihr zur Verfügung stehenden Informationen unterstützt die Psychiatry Ink Ltd in angemessener Weise bei Sicherheit, Meldung von Datenschutzverletzungen, Datenschutz-Folgenabschätzungen, vorherigen Konsultationen und damit zusammenhängenden Pflichten, soweit dies nach anwendbarem Datenschutzrecht erforderlich ist.',
        },
      ],
    },
    {
      id: 'breach',
      heading: '16. Verletzung des Schutzes personenbezogener Daten',
      blocks: [
        {
          type: 'p',
          text: 'Die Psychiatry Ink Ltd benachrichtigt den Kunden unverzüglich, nachdem ihr eine Verletzung des Schutzes personenbezogener Daten bekannt geworden ist, die Kundendaten betrifft. Die Benachrichtigung enthält die verfügbaren Informationen, die der Kunde zur Erfüllung seiner Meldepflichten benötigt.',
        },
      ],
    },
    {
      id: 'deletion',
      heading: '17. Löschung und Rückgabe',
      blocks: [
        {
          type: 'p',
          text: 'Nach Wahl des Kunden und vorbehaltlich technischer Machbarkeit, gesetzlicher Aufbewahrungspflichten, Backup-Ablauf und Zahlungspflichten löscht oder gibt die Psychiatry Ink Ltd die Kundendaten nach Beendigung des Dienstes zurück.',
        },
        {
          type: 'p',
          text: 'Sicherungskopien können für einen begrenzten Zeitraum bestehen bleiben, bis sie nach dem Backup-Aufbewahrungsplan überschrieben oder gelöscht werden.',
        },
      ],
    },
    {
      id: 'audit',
      heading: '18. Kontroll- und Informationsrechte',
      blocks: [
        {
          type: 'p',
          text: 'Die Psychiatry Ink Ltd stellt die Informationen bereit, die zum Nachweis der Einhaltung dieses AVV angemessen erforderlich sind. Kontrollen müssen angemessen, verhältnismäßig, vertraulich, auf dienstrelevante Datenschutzkontrollen beschränkt sein und dürfen Sicherheit, andere Kunden, Geschäftsgeheimnisse oder die Vertraulichkeit Dritter nicht beeinträchtigen.',
        },
        {
          type: 'p',
          text: 'Die Psychiatry Ink Ltd kann Kontrollpflichten durch Sicherheitsdokumentation, Fragebögen, Berichte Dritter, Zertifizierungen oder strukturierte schriftliche Antworten erfüllen.',
        },
      ],
    },
    {
      id: 'customer-obligations',
      heading: '19. Pflichten des Kunden',
      blocks: [
        { type: 'p', text: 'Der Kunde muss:' },
        {
          type: 'ul',
          items: [
            'den Dienst rechtmäßig nutzen;',
            'Datenschutz- und Aufbewahrungseinstellungen angemessen konfigurieren;',
            'unnötige direkte Identifikatoren in KI-Funktionen nach Möglichkeit vermeiden;',
            'sicherstellen, dass Endnutzer autorisiert und geschult sind;',
            'die Sicherheit von Endgeräten, Passwörtern und lokalen Schlüsseln gewährleisten;',
            'erforderliche Datenschutzhinweise gegenüber Patienten oder Personal bereitstellen;',
            'die lokale klinische, institutionelle und rechtliche Konformität sicherstellen;',
            'produktive klinische Daten nur verarbeiten, wenn vertragliche und technische Schutzmaßnahmen vorhanden sind.',
          ],
        },
      ],
    },
    {
      id: 'precedence',
      heading: '20. Rangfolge',
      blocks: [
        {
          type: 'p',
          text: 'Bei Widersprüchen zwischen diesem AVV und den Allgemeinen Geschäftsbedingungen hinsichtlich der Verarbeitung von Kundendaten als Auftragsverarbeiter geht dieser AVV vor. Soweit Standardvertragsklauseln anwendbar sind, gehen diese vor, soweit dies gesetzlich erforderlich ist.',
        },
      ],
    },
    {
      id: 'annex-1',
      heading: 'Anlage 1: Einzelheiten der Verarbeitung',
      blocks: [
        {
          type: 'ul',
          items: [
            'Gegenstand: Bereitstellung der Software Psychiatrie.Ink für klinische Dokumentation und Workflow.',
            'Dauer: Laufzeit von Abonnement, Testphase, Pilotbetrieb, Konto oder Auftragsformular sowie die anschließende Lösch-/Aufbewahrungsphase.',
            'Art: Hosting, Speicherung, Auslesen, Erzeugung, Transkription, Bearbeitung, Support, Sicherheit, Abrechnungs-Metadaten, Löschung/Export.',
            'Zweck: Bereitstellung und Absicherung von Werkzeugen für psychiatrische Dokumentation und Workflow.',
            'Betroffene Personen: berufliche Nutzer, Personal des Kunden, Patienten, Angehörige, Betreuende und in klinischen Akten genannte Dritte.',
            'Personenbezogene Daten: Kontodaten, klinische Notizen, psychiatrische Dokumentation, Medikations-/Labor-/Risikodaten, Nutzer-Metadaten, Abrechnungs-Metadaten.',
            'Besondere Kategorien: Gesundheitsdaten und psychiatrische Daten, soweit vom Kunden eingegeben.',
            'Häufigkeit: fortlaufend während der Nutzung des Dienstes.',
          ],
        },
      ],
    },
    {
      id: 'annex-2',
      heading: 'Anlage 2: Technische und organisatorische Maßnahmen',
      blocks: [
        { type: 'p', text: 'Die Maßnahmen umfassen:' },
        {
          type: 'ul',
          items: [
            'Verschlüsselung bei der Übertragung mittels HTTPS/TLS;',
            'Verschlüsselung im Ruhezustand, soweit von den Infrastrukturanbietern unterstützt;',
            'einen clientseitig verschlüsselten lokalen Tresor für ausgewählte Identifikatoren und Zuordnungen, soweit aktiviert;',
            'rollenbasierte Zugriffskontrolle;',
            'Authentifizierungs- und Sitzungskontrollen;',
            'Audit-Protokollierung relevanter Zugriffe und Aktionen;',
            'Trennung von Kundenorganisationen, soweit anwendbar;',
            'Funktionen zur Datenminimierung und De-Identifikation;',
            'Backup- und Wiederherstellungskontrollen;',
            'Schwachstellen- und Abhängigkeitsmanagement;',
            'Sicherheitsüberwachung und ein Verfahren zur Reaktion auf Vorfälle;',
            'Vertraulichkeitsverpflichtungen für Mitarbeitende oder Auftragnehmer;',
            'Sorgfaltsprüfung von Unterauftragsverarbeitern;',
            'beschränkter Produktivzugriff;',
            'Lösch-/Export-Workflows, soweit verfügbar.',
          ],
        },
      ],
    },
    {
      id: 'annex-3',
      heading: 'Anlage 3: Unterauftragsverarbeiter',
      blocks: [
        {
          type: 'p',
          text: 'Die aktuelle Liste der Unterauftragsverarbeiter wird auf der Seite zu Unterauftragsverarbeitern veröffentlicht. Der Kunde sollte diese Seite vor der Nutzung produktiver klinischer Daten prüfen.',
        },
        {
          type: 'link',
          text: 'Unsere Unterauftragsverarbeiter ansehen',
          href: localizedPath('subprocessors', 'de'),
        },
      ],
    },
  ],
}

/* ───────────────────────────── SUB-PROCESSORS ───────────────────────────── */

const subprocessorsEn: LegalDoc = {
  title: 'Sub-processors',
  lead: 'This page lists third-party providers that Psychiatry Ink Ltd uses, or may use, to provide Psychiatry.Ink. A sub-processor is a provider that processes personal data on behalf of Psychiatry Ink Ltd where Psychiatry Ink Ltd acts as processor for a customer.',
  lastUpdatedLabel: lastUpdatedLabel('en'),
  sections: [
    {
      id: 'context',
      heading: '1. Controller and processor context',
      blocks: [
        {
          type: 'p',
          text: 'For clinical workspace data, the customer is usually the controller and Psychiatry Ink Ltd is usually the processor. The providers below may act as sub-processors depending on which features the customer uses.',
        },
        {
          type: 'p',
          text: 'For account, billing, website, and business-administration data, some providers may act as independent controllers or processors depending on their role and contract.',
        },
      ],
    },
    {
      id: 'current',
      heading: '2. Current sub-processors',
      blocks: [
        {
          type: 'p',
          text: 'Google Cloud — hosting, infrastructure, logging, deployment, storage, and compute. Data categories: application data, logs, metadata, and encrypted content where applicable. Processing location: European Union (region-restricted deployment, e.g. Frankfurt, where configured). Safeguards: DPA in place; region-restricted deployment where configured.',
        },
        {
          type: 'p',
          text: 'Supabase — database, authentication, storage, and backend services. Data categories: account data, application data, metadata, and encrypted content where applicable. Processing location: European Union (Frankfurt). Safeguards: DPA in place; production region confirmed in the EU.',
        },
        {
          type: 'p',
          text: 'Stripe — payments, subscriptions, billing, invoices, and tax metadata. Data categories: billing contact data, payment metadata, and invoice data. Processing location: global / provider-controlled. Safeguards: Stripe may act as an independent controller for some payment processing.',
        },
        {
          type: 'p',
          text: 'Google Workspace — business email, support inbox, and administrative communication. Data categories: emails, contact messages, and attachments voluntarily provided. Processing location: European Union / provider-controlled. Safeguards: patient data should not be sent by email unless authorised.',
        },
        {
          type: 'p',
          text: 'Resend (operated by Resend, Inc.) — transactional and system email delivery (for example account confirmation, password reset, and notification emails). Data categories: recipient email addresses, email content and subject lines, and delivery metadata. Processing location: United States (third-country transfer); infrastructure operated on Amazon Web Services (AWS). Safeguards: DPA in place; transfers to the USA are safeguarded under the EU Standard Contractual Clauses (and the EU–US Data Privacy Framework where applicable).',
        },
      ],
    },
    {
      id: 'ai',
      heading: '3. Feature-specific AI sub-processors',
      blocks: [
        {
          type: 'p',
          text: 'These providers are used only when the relevant AI feature, model, or mode is enabled. In each case, the data categories are prompts, selected text, generated output, and model metadata, and identifiers should be minimised before processing.',
        },
        {
          type: 'p',
          text: 'OpenAI — AI drafting, summarisation, editing, transcription, and clinical text support. Processing location: EU, UK, US, or other countries depending on provider and configuration. Safeguards: used only under an appropriate API/DPA configuration.',
        },
        {
          type: 'p',
          text: 'Google / Gemini — AI drafting, generation, summarisation, and text support. Processing location: EU, UK, US, or other countries depending on provider and configuration. Safeguards: used only under an appropriate API/DPA configuration.',
        },
        {
          type: 'p',
          text: 'DeepSeek — AI drafting or economic-model mode. Processing location: depends on provider and configuration. Safeguards: not enabled for production clinical data unless transfer, DPA, and risk assessment are approved.',
        },
        {
          type: 'p',
          text: 'Mistral AI — AI model processing, where enabled. Processing location: EU, UK, US, or other countries depending on provider and configuration. Safeguards: optional provider, used only under an appropriate API/DPA configuration.',
        },
      ],
    },
    {
      id: 'optional',
      heading: '4. Optional or planned providers',
      blocks: [
        {
          type: 'p',
          text: 'The following categories are not currently active in production. We will move a provider into the “Current sub-processors” section only once it is active in production.',
        },
        {
          type: 'ul',
          items: [
            'Video consultation or voice-chat infrastructure: optional and country-specific; not currently active in production.',
            'Error monitoring and diagnostics: not currently active in production.',
            'Website analytics: none currently active in production.',
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '5. Changes to sub-processors',
      blocks: [
        {
          type: 'p',
          text: 'We may update this page when providers change. Where required by the Data Processing Agreement, we will provide notice of material new sub-processors and allow customers to object on reasonable data-protection grounds within the stated objection period.',
        },
      ],
    },
    {
      id: 'responsibility',
      heading: '6. Customer responsibility',
      blocks: [
        {
          type: 'p',
          text: 'Customers should review this list before using production clinical data and should ensure that use of Psychiatry.Ink, selected AI providers, country settings, and data-transfer safeguards are compatible with their own legal and institutional obligations.',
        },
      ],
    },
  ],
}

const subprocessorsDe: LegalDoc = {
  title: 'Unterauftragsverarbeiter',
  lead: 'Diese Seite listet Drittanbieter auf, die die Psychiatry Ink Ltd zur Bereitstellung von Psychiatrie.Ink einsetzt oder einsetzen kann. Ein Unterauftragsverarbeiter ist ein Anbieter, der personenbezogene Daten im Auftrag der Psychiatry Ink Ltd verarbeitet, soweit diese als Auftragsverarbeiter für einen Kunden handelt.',
  lastUpdatedLabel: lastUpdatedLabel('de'),
  sections: [
    {
      id: 'context',
      heading: '1. Rollenverteilung: Verantwortlicher und Auftragsverarbeiter',
      blocks: [
        {
          type: 'p',
          text: 'Für klinische Arbeitsbereichsdaten ist in der Regel der Kunde der Verantwortliche und die Psychiatry Ink Ltd der Auftragsverarbeiter. Die nachstehenden Anbieter können als Unterauftragsverarbeiter handeln, abhängig davon, welche Funktionen der Kunde nutzt.',
        },
        {
          type: 'p',
          text: 'Für Konto-, Abrechnungs-, Website- und Geschäftsverwaltungsdaten können einige Anbieter je nach ihrer Rolle und ihrem Vertrag als eigenständige Verantwortliche oder als Auftragsverarbeiter handeln.',
        },
      ],
    },
    {
      id: 'current',
      heading: '2. Aktuelle Unterauftragsverarbeiter',
      blocks: [
        {
          type: 'p',
          text: 'Google Cloud — Hosting, Infrastruktur, Protokollierung, Deployment, Speicher und Rechenleistung. Datenkategorien: Anwendungsdaten, Protokolle, Metadaten und, soweit zutreffend, verschlüsselte Inhalte. Verarbeitungsort: Europäische Union (regional beschränktes Deployment, z. B. Frankfurt, soweit konfiguriert). Garantien: AVV vorhanden; regional beschränktes Deployment, soweit konfiguriert.',
        },
        {
          type: 'p',
          text: 'Supabase — Datenbank, Authentifizierung, Speicher und Backend-Dienste. Datenkategorien: Kontodaten, Anwendungsdaten, Metadaten und, soweit zutreffend, verschlüsselte Inhalte. Verarbeitungsort: Europäische Union (Frankfurt). Garantien: AVV vorhanden; Produktivregion in der EU bestätigt.',
        },
        {
          type: 'p',
          text: 'Stripe — Zahlungen, Abonnements, Abrechnung, Rechnungen und Steuer-Metadaten. Datenkategorien: Rechnungskontaktdaten, Zahlungs-Metadaten und Rechnungsdaten. Verarbeitungsort: global / anbieterseitig gesteuert. Garantien: Stripe kann für bestimmte Zahlungsvorgänge als eigenständiger Verantwortlicher handeln.',
        },
        {
          type: 'p',
          text: 'Google Workspace — geschäftliche E-Mail, Support-Postfach und administrative Kommunikation. Datenkategorien: E-Mails, Kontaktnachrichten und freiwillig bereitgestellte Anhänge. Verarbeitungsort: Europäische Union / anbieterseitig gesteuert. Garantien: Patientendaten sollten nur bei entsprechender Befugnis per E-Mail übermittelt werden.',
        },
        {
          type: 'p',
          text: 'Resend (betrieben durch die Resend, Inc.) — Versand von Transaktions- und System-E-Mails (z. B. Kontobestätigung, Passwort-Zurücksetzung und Benachrichtigungs-E-Mails). Datenkategorien: E-Mail-Adressen der Empfänger, E-Mail-Inhalte und Betreffzeilen sowie Zustellungs-Metadaten. Verarbeitungsort: USA (Drittlandtransfer); Infrastruktur betrieben auf Amazon Web Services (AWS). Garantien: AVV vorhanden; Übermittlungen in die USA sind durch die EU-Standardvertragsklauseln abgesichert (sowie, soweit anwendbar, das EU-US Data Privacy Framework).',
        },
      ],
    },
    {
      id: 'ai',
      heading: '3. Funktionsspezifische KI-Unterauftragsverarbeiter',
      blocks: [
        {
          type: 'p',
          text: 'Diese Anbieter werden nur eingesetzt, wenn die jeweilige KI-Funktion, das Modell oder der Modus aktiviert ist. In allen Fällen sind die Datenkategorien Prompts, ausgewählter Text, erzeugte Ausgaben und Modell-Metadaten; Identifikatoren sollten vor der Verarbeitung minimiert werden.',
        },
        {
          type: 'p',
          text: 'OpenAI — KI-gestützte Formulierung, Zusammenfassung, Bearbeitung, Transkription und Unterstützung bei klinischen Texten. Verarbeitungsort: EU, Vereinigtes Königreich, USA oder andere Länder je nach Anbieter und Konfiguration. Garantien: Einsatz nur bei geeigneter API-/AVV-Konfiguration.',
        },
        {
          type: 'p',
          text: 'Google / Gemini — KI-gestützte Formulierung, Generierung, Zusammenfassung und Textunterstützung. Verarbeitungsort: EU, Vereinigtes Königreich, USA oder andere Länder je nach Anbieter und Konfiguration. Garantien: Einsatz nur bei geeigneter API-/AVV-Konfiguration.',
        },
        {
          type: 'p',
          text: 'DeepSeek — KI-gestützte Formulierung oder ökonomischer Modellmodus. Verarbeitungsort: abhängig von Anbieter und Konfiguration. Garantien: nicht für produktive klinische Daten aktiviert, sofern nicht Übermittlung, AVV und Risikoabschätzung genehmigt sind.',
        },
        {
          type: 'p',
          text: 'Mistral AI — KI-Modellverarbeitung, soweit aktiviert. Verarbeitungsort: EU, Vereinigtes Königreich, USA oder andere Länder je nach Anbieter und Konfiguration. Garantien: optionaler Anbieter, Einsatz nur bei geeigneter API-/AVV-Konfiguration.',
        },
      ],
    },
    {
      id: 'optional',
      heading: '4. Optionale oder geplante Anbieter',
      blocks: [
        {
          type: 'p',
          text: 'Die folgenden Kategorien sind derzeit nicht produktiv aktiv. Ein Anbieter wird erst dann in den Abschnitt „Aktuelle Unterauftragsverarbeiter“ aufgenommen, wenn er produktiv aktiv ist.',
        },
        {
          type: 'ul',
          items: [
            'Infrastruktur für Videosprechstunde oder Voice-Chat: optional und länderspezifisch; derzeit nicht produktiv aktiv.',
            'Fehlerüberwachung und Diagnose: derzeit nicht produktiv aktiv.',
            'Website-Analyse: derzeit keine produktiv aktiv.',
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '5. Änderungen bei Unterauftragsverarbeitern',
      blocks: [
        {
          type: 'p',
          text: 'Wir können diese Seite aktualisieren, wenn sich Anbieter ändern. Soweit im Auftragsverarbeitungsvertrag vorgesehen, informieren wir über wesentliche neue Unterauftragsverarbeiter und räumen Kunden die Möglichkeit ein, innerhalb der angegebenen Widerspruchsfrist aus berechtigten datenschutzrechtlichen Gründen zu widersprechen.',
        },
      ],
    },
    {
      id: 'responsibility',
      heading: '6. Verantwortung des Kunden',
      blocks: [
        {
          type: 'p',
          text: 'Kunden sollten diese Liste vor der Nutzung produktiver klinischer Daten prüfen und sicherstellen, dass die Nutzung von Psychiatrie.Ink, die ausgewählten KI-Anbieter, die Ländereinstellungen und die Garantien zur Datenübermittlung mit ihren eigenen rechtlichen und institutionellen Pflichten vereinbar sind.',
        },
      ],
    },
  ],
}

/* ──────────────────────────── SECURITY OVERVIEW ─────────────────────────── */

const securityOverviewEn: LegalDoc = {
  title: 'Security Overview',
  lead: 'Psychiatry.Ink is designed for psychiatric documentation and therefore treats confidentiality, minimisation, and controlled access as core product requirements.\n\nThis page provides a public overview. Detailed technical and organisational measures may be provided to customers under the Data Processing Agreement or a security review process.',
  lastUpdatedLabel: lastUpdatedLabel('en'),
  sections: [
    {
      id: 'principles',
      heading: '1. Security principles',
      blocks: [
        { type: 'p', text: 'Psychiatry.Ink is designed around the following principles:' },
        {
          type: 'ul',
          items: [
            'minimise direct patient identifiers;',
            'keep patient identity mapping local where possible;',
            'use encryption in transit and at rest;',
            'restrict access by role and organisation;',
            'log relevant security and audit events;',
            'separate customer data where applicable;',
            'avoid sending unnecessary identifiers to AI providers;',
            'keep clinicians responsible for final review and approval of outputs.',
          ],
        },
      ],
    },
    {
      id: 'vault',
      heading: '2. Local encrypted vault',
      blocks: [
        {
          type: 'p',
          text: 'Selected Psychiatry.Ink modes are designed so that patient names, dates of birth, and patient-to-document mapping can remain in a local encrypted browser vault on the clinician’s device.',
        },
        { type: 'p', text: 'Where this mode is enabled:' },
        {
          type: 'ul',
          items: [
            'the server should receive only case identifiers or pseudonymous references;',
            'the user’s device stores the identity mapping;',
            'loss of the local encryption key or vault may mean the data cannot be recovered;',
            'the customer remains responsible for endpoint security and backups where applicable.',
          ],
        },
      ],
    },
    {
      id: 'encryption',
      heading: '3. Encryption',
      blocks: [
        {
          type: 'p',
          text: 'We use HTTPS/TLS for data in transit. Infrastructure providers may provide encryption at rest for stored data. Some local product components may use client-side encryption for sensitive mappings or local storage.',
        },
        {
          type: 'p',
          text: 'Encryption controls depend on the selected product configuration, browser, device, and infrastructure environment.',
        },
      ],
    },
    {
      id: 'access',
      heading: '4. Access control',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatry.Ink uses account-based access controls. Organisation features may include roles such as owner, admin, clinician, assistant, viewer, external consultant, or other role types depending on plan and configuration.',
        },
        {
          type: 'p',
          text: 'Users are responsible for protecting credentials, using strong passwords, enabling available authentication protections, and promptly removing users who should no longer have access.',
        },
      ],
    },
    {
      id: 'audit',
      heading: '5. Audit logging',
      blocks: [
        {
          type: 'p',
          text: 'The service may record audit and security logs such as login events, document actions, AI generation events, credit usage, access events, error events, and administrative actions. Audit log availability depends on plan and configuration.',
        },
      ],
    },
    {
      id: 'ai-minimisation',
      heading: '6. AI data minimisation',
      blocks: [
        {
          type: 'p',
          text: 'AI features are designed to support drafting and documentation. Users should avoid unnecessary direct identifiers in prompts and source text. Where available, de-identification, privacy gates, or local-only modes should be used before sending clinical text to external AI providers.',
        },
        {
          type: 'p',
          text: 'AI output must always be reviewed by a qualified professional before clinical, legal, or administrative use.',
        },
      ],
    },
    {
      id: 'backups',
      heading: '7. Backups and recovery',
      blocks: [
        {
          type: 'p',
          text: 'Production infrastructure may include backups, snapshots, and recovery processes. Backup retention periods and recovery procedures depend on the final deployment configuration and customer plan.',
        },
        {
          type: 'p',
          text: 'Local encrypted vault data may not be recoverable by Psychiatry Ink Ltd if the user loses the local key, browser profile, or device storage.',
        },
      ],
    },
    {
      id: 'incident',
      heading: '8. Incident response',
      blocks: [
        {
          type: 'p',
          text: 'If we become aware of a security incident or personal data breach affecting customer data, we will investigate and notify affected customers where required by law and contract.',
        },
        { type: 'p', text: 'Security and data-protection contact:' },
        { type: 'link', text: 'data-protection@psychiatry.ink', href: 'mailto:data-protection@psychiatry.ink' },
      ],
    },
    {
      id: 'disclosure',
      heading: '9. Responsible disclosure',
      blocks: [
        {
          type: 'p',
          text: 'If you believe you have found a vulnerability, contact us before disclosing it publicly. Please include enough information to reproduce the issue. Do not access, modify, download, or disclose data that does not belong to you.',
        },
        { type: 'p', text: 'Report vulnerabilities to:' },
        { type: 'link', text: 'data-protection@psychiatry.ink', href: 'mailto:data-protection@psychiatry.ink' },
      ],
    },
    {
      id: 'limitations',
      heading: '10. Current limitations',
      blocks: [
        {
          type: 'p',
          text: 'No software system is completely secure. Psychiatry.Ink should not be used for production patient data until the relevant deployment, DPA, sub-processor list, data-transfer safeguards, retention settings, access controls, and privacy configuration have been approved for the intended jurisdiction and organisation.',
        },
      ],
    },
  ],
}

const securityOverviewDe: LegalDoc = {
  title: 'Sicherheitsübersicht',
  lead: 'Psychiatrie.Ink ist für die psychiatrische Dokumentation konzipiert und behandelt daher Vertraulichkeit, Datenminimierung und kontrollierten Zugriff als zentrale Produktanforderungen.\n\nDiese Seite bietet einen öffentlichen Überblick. Detaillierte technische und organisatorische Maßnahmen können Kunden im Rahmen des Auftragsverarbeitungsvertrags oder eines Sicherheitsprüfungsprozesses bereitgestellt werden.',
  lastUpdatedLabel: lastUpdatedLabel('de'),
  sections: [
    {
      id: 'principles',
      heading: '1. Sicherheitsgrundsätze',
      blocks: [
        { type: 'p', text: 'Psychiatrie.Ink ist nach folgenden Grundsätzen gestaltet:' },
        {
          type: 'ul',
          items: [
            'direkte Patientenidentifikatoren minimieren;',
            'die Zuordnung der Patientenidentität nach Möglichkeit lokal halten;',
            'Verschlüsselung bei der Übertragung und im Ruhezustand einsetzen;',
            'Zugriff nach Rolle und Organisation beschränken;',
            'relevante Sicherheits- und Audit-Ereignisse protokollieren;',
            'Kundendaten trennen, soweit anwendbar;',
            'die Übermittlung unnötiger Identifikatoren an KI-Anbieter vermeiden;',
            'die abschließende Prüfung und Freigabe der Ergebnisse in der Verantwortung der Behandelnden belassen.',
          ],
        },
      ],
    },
    {
      id: 'vault',
      heading: '2. Lokaler verschlüsselter Tresor',
      blocks: [
        {
          type: 'p',
          text: 'Ausgewählte Modi von Psychiatrie.Ink sind so gestaltet, dass Patientennamen, Geburtsdaten und die Zuordnung von Patient zu Dokument in einem lokal verschlüsselten Browser-Tresor auf dem Gerät der behandelnden Person verbleiben können.',
        },
        { type: 'p', text: 'Wenn dieser Modus aktiviert ist:' },
        {
          type: 'ul',
          items: [
            'sollte der Server nur Fall-Identifikatoren oder pseudonyme Referenzen erhalten;',
            'speichert das Gerät der Nutzerin oder des Nutzers die Identitätszuordnung;',
            'kann der Verlust des lokalen Schlüssels oder des Tresors dazu führen, dass die Daten nicht wiederhergestellt werden können;',
            'bleibt der Kunde für Endgerätesicherheit und Backups verantwortlich, soweit anwendbar.',
          ],
        },
      ],
    },
    {
      id: 'encryption',
      heading: '3. Verschlüsselung',
      blocks: [
        {
          type: 'p',
          text: 'Wir verwenden HTTPS/TLS für Daten bei der Übertragung. Infrastrukturanbieter können eine Verschlüsselung gespeicherter Daten im Ruhezustand bereitstellen. Einige lokale Produktkomponenten können eine clientseitige Verschlüsselung für sensible Zuordnungen oder lokale Speicherung verwenden.',
        },
        {
          type: 'p',
          text: 'Die Verschlüsselungskontrollen hängen von der gewählten Produktkonfiguration, dem Browser, dem Gerät und der Infrastrukturumgebung ab.',
        },
      ],
    },
    {
      id: 'access',
      heading: '4. Zugriffskontrolle',
      blocks: [
        {
          type: 'p',
          text: 'Psychiatrie.Ink verwendet kontobasierte Zugriffskontrollen. Organisationsfunktionen können je nach Tarif und Konfiguration Rollen wie Inhaber, Administrator, Behandelnde, Assistenz, Betrachter, externer Konsiliarius oder weitere Rollentypen umfassen.',
        },
        {
          type: 'p',
          text: 'Nutzerinnen und Nutzer sind dafür verantwortlich, Zugangsdaten zu schützen, sichere Passwörter zu verwenden, verfügbare Authentifizierungsschutzmaßnahmen zu aktivieren und Nutzer, die keinen Zugriff mehr haben sollen, zeitnah zu entfernen.',
        },
      ],
    },
    {
      id: 'audit',
      heading: '5. Audit-Protokollierung',
      blocks: [
        {
          type: 'p',
          text: 'Der Dienst kann Audit- und Sicherheitsprotokolle aufzeichnen, etwa Anmeldeereignisse, Dokumentaktionen, KI-Generierungsereignisse, Credit-Verbrauch, Zugriffsereignisse, Fehlerereignisse und administrative Aktionen. Die Verfügbarkeit der Audit-Protokolle hängt von Tarif und Konfiguration ab.',
        },
      ],
    },
    {
      id: 'ai-minimisation',
      heading: '6. Datenminimierung bei KI',
      blocks: [
        {
          type: 'p',
          text: 'KI-Funktionen sind zur Unterstützung von Entwurf und Dokumentation gedacht. Nutzerinnen und Nutzer sollten unnötige direkte Identifikatoren in Prompts und Ausgangstexten vermeiden. Soweit verfügbar, sollten De-Identifikation, Datenschutz-Gates oder rein lokale Modi verwendet werden, bevor klinische Texte an externe KI-Anbieter gesendet werden.',
        },
        {
          type: 'p',
          text: 'KI-Ergebnisse müssen vor jeder klinischen, rechtlichen oder administrativen Verwendung stets von einer qualifizierten Fachperson geprüft werden.',
        },
      ],
    },
    {
      id: 'backups',
      heading: '7. Backups und Wiederherstellung',
      blocks: [
        {
          type: 'p',
          text: 'Die Produktivinfrastruktur kann Backups, Snapshots und Wiederherstellungsprozesse umfassen. Aufbewahrungsfristen für Backups und Wiederherstellungsverfahren hängen von der endgültigen Deployment-Konfiguration und vom Kundentarif ab.',
        },
        {
          type: 'p',
          text: 'Daten im lokal verschlüsselten Tresor sind für die Psychiatry Ink Ltd möglicherweise nicht wiederherstellbar, wenn die Nutzerin oder der Nutzer den lokalen Schlüssel, das Browser-Profil oder den Gerätespeicher verliert.',
        },
      ],
    },
    {
      id: 'incident',
      heading: '8. Reaktion auf Vorfälle',
      blocks: [
        {
          type: 'p',
          text: 'Wenn uns ein Sicherheitsvorfall oder eine Verletzung des Schutzes personenbezogener Daten bekannt wird, die Kundendaten betrifft, untersuchen wir den Vorfall und benachrichtigen betroffene Kunden, soweit dies gesetzlich und vertraglich erforderlich ist.',
        },
        { type: 'p', text: 'Kontakt für Sicherheit und Datenschutz:' },
        { type: 'link', text: 'data-protection@psychiatry.ink', href: 'mailto:data-protection@psychiatry.ink' },
      ],
    },
    {
      id: 'disclosure',
      heading: '9. Verantwortungsvolle Offenlegung',
      blocks: [
        {
          type: 'p',
          text: 'Wenn Sie glauben, eine Schwachstelle gefunden zu haben, kontaktieren Sie uns bitte, bevor Sie diese öffentlich offenlegen. Bitte fügen Sie ausreichende Informationen bei, um das Problem nachvollziehen zu können. Greifen Sie nicht auf Daten zu, die Ihnen nicht gehören, und verändern, laden oder offenbaren Sie diese nicht.',
        },
        { type: 'p', text: 'Schwachstellen melden Sie bitte an:' },
        { type: 'link', text: 'data-protection@psychiatry.ink', href: 'mailto:data-protection@psychiatry.ink' },
      ],
    },
    {
      id: 'limitations',
      heading: '10. Aktuelle Einschränkungen',
      blocks: [
        {
          type: 'p',
          text: 'Kein Softwaresystem ist vollständig sicher. Psychiatrie.Ink sollte nicht für produktive Patientendaten eingesetzt werden, bevor das jeweilige Deployment, der Auftragsverarbeitungsvertrag, die Liste der Unterauftragsverarbeiter, die Garantien zur Datenübermittlung, die Aufbewahrungseinstellungen, die Zugriffskontrollen und die Datenschutzkonfiguration für die vorgesehene Rechtsordnung und Organisation freigegeben sind.',
        },
      ],
    },
  ],
}



export type LegalPageKey =
  | 'privacy'
  | 'terms'
  | 'impressum'
  | 'cookies'
  | 'dpa'
  | 'subprocessors'
  | 'securityOverview'

const LEGAL_DOCS: Record<LegalPageKey, Record<PublicLocale, LegalDoc>> = {
  privacy: { en: privacyEn, de: privacyDe },
  terms: { en: termsEn, de: termsDe },
  impressum: { en: impressumEn, de: impressumDe },
  cookies: { en: cookiePolicyEn, de: cookiePolicyDe },
  dpa: { en: dpaEn, de: dpaDe },
  subprocessors: { en: subprocessorsEn, de: subprocessorsDe },
  securityOverview: { en: securityOverviewEn, de: securityOverviewDe },
}

export function getLegalDoc(key: LegalPageKey, locale: PublicLocale): LegalDoc {
  return LEGAL_DOCS[key][locale]
}
