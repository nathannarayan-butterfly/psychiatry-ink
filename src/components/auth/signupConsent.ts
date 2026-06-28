/**
 * Required-consent gate for the signup wizard's legal step.
 *
 * Signup must be blocked until the user accepts BOTH the Datenschutzerklärung /
 * AGB (`acceptedTerms`) and the Auftragsverarbeitungsvertrag / AVV
 * (`acceptedAvv`). The AVV is legally required for clinicians processing patient
 * data under the GDPR/DSGVO. Kept as a pure function (returns a translation key,
 * not a localized string) so it is trivially unit-testable and reused by both
 * the per-step validation and the final submit guard.
 */

export type SignupConsentErrorKey = 'authSignupTermsRequiredError' | 'authSignupAvvRequiredError'

export interface SignupConsentState {
  acceptedTerms: boolean
  acceptedAvv: boolean
}

/**
 * Returns the translation key of the first unmet required consent, or `null`
 * when every required consent has been accepted.
 */
export function validateSignupConsent(state: SignupConsentState): SignupConsentErrorKey | null {
  if (!state.acceptedTerms) return 'authSignupTermsRequiredError'
  if (!state.acceptedAvv) return 'authSignupAvvRequiredError'
  return null
}
