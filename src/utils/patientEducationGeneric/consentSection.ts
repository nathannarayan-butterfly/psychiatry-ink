import type { UiLanguage } from '../../types/settings'

/**
 * Localized signature / consent block appended to printed & exported patient
 * education (Aufklärung) documents. This is a *printed, wet-signature* consent:
 * the patient ticks "understood" plus accept/decline and both patient and
 * clinician sign on the blank lines. No e-signature backend is involved.
 *
 * Wording is original and licensing-safe (not copied from any specific consent
 * form), and intentionally generic so it fits any subject (drug, condition,
 * therapy, topic).
 */
export interface EducationConsentStrings {
  heading: string
  understood: string
  decisionHeading: string
  accept: string
  reject: string
  patientHeading: string
  clinicianHeading: string
  nameLabel: string
  dateLabel: string
  signatureLabel: string
}

const CONSENT_STRINGS: Record<UiLanguage, EducationConsentStrings> = {
  de: {
    heading: 'Einwilligung und Bestätigung',
    understood:
      'Ich wurde über die oben genannten Inhalte aufgeklärt und habe sie verstanden. Meine Fragen wurden ausreichend beantwortet.',
    decisionHeading: 'Meine Entscheidung',
    accept: 'Ich willige in die besprochene Behandlung bzw. Maßnahme ein.',
    reject: 'Ich lehne die besprochene Behandlung bzw. Maßnahme ab.',
    patientHeading: 'Patientin / Patient',
    clinicianHeading: 'Ärztin / Arzt',
    nameLabel: 'Name',
    dateLabel: 'Datum',
    signatureLabel: 'Unterschrift',
  },
  en: {
    heading: 'Consent and acknowledgment',
    understood:
      'I have been informed about the points above and have understood them. My questions were answered to my satisfaction.',
    decisionHeading: 'My decision',
    accept: 'I consent to the discussed treatment or procedure.',
    reject: 'I decline the discussed treatment or procedure.',
    patientHeading: 'Patient',
    clinicianHeading: 'Physician',
    nameLabel: 'Name',
    dateLabel: 'Date',
    signatureLabel: 'Signature',
  },
  fr: {
    heading: 'Consentement et confirmation',
    understood:
      "J'ai été informé(e) des points ci-dessus et je les ai compris. Mes questions ont reçu une réponse satisfaisante.",
    decisionHeading: 'Ma décision',
    accept: "Je consens au traitement ou à l'intervention présentés.",
    reject: "Je refuse le traitement ou l'intervention présentés.",
    patientHeading: 'Patient(e)',
    clinicianHeading: 'Médecin',
    nameLabel: 'Nom',
    dateLabel: 'Date',
    signatureLabel: 'Signature',
  },
  es: {
    heading: 'Consentimiento y confirmación',
    understood:
      'He sido informado/a sobre los puntos anteriores y los he comprendido. Mis preguntas han sido respondidas satisfactoriamente.',
    decisionHeading: 'Mi decisión',
    accept: 'Doy mi consentimiento al tratamiento o procedimiento expuesto.',
    reject: 'Rechazo el tratamiento o procedimiento expuesto.',
    patientHeading: 'Paciente',
    clinicianHeading: 'Médico/a',
    nameLabel: 'Nombre',
    dateLabel: 'Fecha',
    signatureLabel: 'Firma',
  },
}

export function getEducationConsentStrings(locale: UiLanguage | string): EducationConsentStrings {
  if (locale === 'en' || locale === 'fr' || locale === 'es' || locale === 'de') {
    return CONSENT_STRINGS[locale]
  }
  return CONSENT_STRINGS.de
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * CSS for the consent block. Kept separate so it can be injected once into the
 * print document's <style> element.
 */
export const EDUCATION_CONSENT_PRINT_CSS = `
.pe-consent { margin-top: 2.2rem; padding-top: 0.8rem; border-top: 2px solid #111; page-break-inside: avoid; break-inside: avoid; }
.pe-consent h2 { font-size: 12pt; font-weight: 700; margin: 0 0 0.6rem; }
.pe-consent__line { display: flex; align-items: flex-start; gap: 0.5rem; margin: 0.35rem 0; font-size: 11pt; }
.pe-consent__box { flex: 0 0 auto; width: 0.95em; height: 0.95em; border: 1.5px solid #111; border-radius: 2px; margin-top: 0.15em; }
.pe-consent__subheading { font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #333; margin: 1rem 0 0.3rem; }
.pe-consent__sign { display: flex; gap: 2rem; margin-top: 1.8rem; }
.pe-consent__party { flex: 1 1 0; min-width: 0; }
.pe-consent__party-title { font-size: 10pt; font-weight: 700; margin: 0 0 1.4rem; }
.pe-consent__field { border-top: 1px solid #111; padding-top: 0.2rem; margin-top: 1.6rem; font-size: 9pt; color: #444; }
@media print { .pe-consent { page-break-inside: avoid; break-inside: avoid; } }
`

/** Builds the inner HTML (no <style>) for the consent block. */
export function buildEducationConsentHtml(locale: UiLanguage | string): string {
  const s = getEducationConsentStrings(locale)
  return `<section class="pe-consent" aria-label="${escapeHtml(s.heading)}">
  <h2>${escapeHtml(s.heading)}</h2>
  <div class="pe-consent__line"><span class="pe-consent__box" aria-hidden="true"></span><span>${escapeHtml(s.understood)}</span></div>
  <p class="pe-consent__subheading">${escapeHtml(s.decisionHeading)}</p>
  <div class="pe-consent__line"><span class="pe-consent__box" aria-hidden="true"></span><span>${escapeHtml(s.accept)}</span></div>
  <div class="pe-consent__line"><span class="pe-consent__box" aria-hidden="true"></span><span>${escapeHtml(s.reject)}</span></div>
  <div class="pe-consent__sign">
    <div class="pe-consent__party">
      <p class="pe-consent__party-title">${escapeHtml(s.patientHeading)}</p>
      <div class="pe-consent__field">${escapeHtml(s.nameLabel)}</div>
      <div class="pe-consent__field">${escapeHtml(s.dateLabel)}</div>
      <div class="pe-consent__field">${escapeHtml(s.signatureLabel)}</div>
    </div>
    <div class="pe-consent__party">
      <p class="pe-consent__party-title">${escapeHtml(s.clinicianHeading)}</p>
      <div class="pe-consent__field">${escapeHtml(s.nameLabel)}</div>
      <div class="pe-consent__field">${escapeHtml(s.dateLabel)}</div>
      <div class="pe-consent__field">${escapeHtml(s.signatureLabel)}</div>
    </div>
  </div>
</section>`
}
