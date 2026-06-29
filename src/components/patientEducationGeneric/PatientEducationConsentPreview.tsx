import type { UiLanguage } from '../../types/settings'
import { getEducationConsentStrings } from '../../utils/patientEducationGeneric/consentSection'

interface PatientEducationConsentPreviewProps {
  language: UiLanguage
}

/**
 * On-screen, read-only preview of the signature / consent block that gets
 * appended to the printed & exported (PDF / Word) Aufklärung document. It
 * mirrors {@link buildEducationConsentHtml} so clinicians see exactly what the
 * patient will sign before they export.
 */
export function PatientEducationConsentPreview({ language }: PatientEducationConsentPreviewProps) {
  const s = getEducationConsentStrings(language)
  return (
    <section className="pe-consent-preview" aria-label={s.heading}>
      <h3 className="pe-consent-preview__heading">{s.heading}</h3>
      <label className="pe-consent-preview__line">
        <span className="pe-consent-preview__box" aria-hidden="true" />
        <span>{s.understood}</span>
      </label>
      <p className="pe-consent-preview__subheading">{s.decisionHeading}</p>
      <label className="pe-consent-preview__line">
        <span className="pe-consent-preview__box" aria-hidden="true" />
        <span>{s.accept}</span>
      </label>
      <label className="pe-consent-preview__line">
        <span className="pe-consent-preview__box" aria-hidden="true" />
        <span>{s.reject}</span>
      </label>
      <div className="pe-consent-preview__sign">
        {[s.patientHeading, s.clinicianHeading].map((party) => (
          <div key={party} className="pe-consent-preview__party">
            <p className="pe-consent-preview__party-title">{party}</p>
            <p className="pe-consent-preview__field">{s.nameLabel}</p>
            <p className="pe-consent-preview__field">{s.dateLabel}</p>
            <p className="pe-consent-preview__field">{s.signatureLabel}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
