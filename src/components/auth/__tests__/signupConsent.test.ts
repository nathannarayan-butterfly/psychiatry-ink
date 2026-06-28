import { describe, expect, it } from 'vitest'
import { validateSignupConsent } from '../signupConsent'

/**
 * The signup wizard's legal step must block until BOTH the Datenschutz/AGB and
 * the AVV (Auftragsverarbeitungsvertrag / DPA) consents are accepted. The AVV is
 * legally required for clinicians processing patient data under the GDPR/DSGVO.
 */
describe('validateSignupConsent', () => {
  it('blocks signup when nothing is accepted (terms gate reported first)', () => {
    expect(validateSignupConsent({ acceptedTerms: false, acceptedAvv: false })).toBe(
      'authSignupTermsRequiredError',
    )
  })

  it('blocks signup when terms are accepted but the AVV is not', () => {
    expect(validateSignupConsent({ acceptedTerms: true, acceptedAvv: false })).toBe(
      'authSignupAvvRequiredError',
    )
  })

  it('blocks signup when the AVV is accepted but terms are not', () => {
    expect(validateSignupConsent({ acceptedTerms: false, acceptedAvv: true })).toBe(
      'authSignupTermsRequiredError',
    )
  })

  it('allows signup only when terms AND the AVV are accepted', () => {
    expect(validateSignupConsent({ acceptedTerms: true, acceptedAvv: true })).toBeNull()
  })
})
