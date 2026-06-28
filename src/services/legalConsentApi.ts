import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'

export interface LegalConsentResult {
  ok: boolean
  recorded: boolean
  version: string
}

/**
 * Record the authenticated user's Datenschutz/AGB/AVV acceptance. The server
 * pins the privacy/terms/AVV versions to the deployed `LEGAL_LAST_UPDATED`; the
 * client only supplies the locale and the explicit AVV attestation. This is
 * only ever called once the user has passed the signup consent gate (which
 * requires both the Datenschutz/AGB and the AVV checkboxes), so `acceptedAvv`
 * is always true here — the server still enforces it as defence-in-depth.
 * Idempotent server-side per (user_id, version), so this may be called both
 * immediately after sign-up and again on the first authenticated load
 * (email-confirmation path).
 *
 * Throws when not authenticated or on a non-2xx response — callers treat
 * failures as non-fatal and retry on the next authenticated load.
 */
export async function recordLegalConsent(locale: string): Promise<LegalConsentResult> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/api/account/legal-consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ locale, acceptedAvv: true }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Consent request failed (${response.status})`)
  }
  return response.json() as Promise<LegalConsentResult>
}
