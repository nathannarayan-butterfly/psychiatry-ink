/**
 * Pending Datenschutz/AGB consent capture.
 *
 * A user accepts the legal terms via a required checkbox at sign-up, but in the
 * email-confirmation flow `supabase.auth.signUp` returns no session, so the
 * consent cannot be POSTed (no JWT) at that moment. We therefore stash the
 * accepted version + locale in localStorage so the intent survives the
 * confirmation round-trip. Once the user is authenticated, `AuthContext`
 * consumes it and calls the (idempotent) consent endpoint, then clears it.
 *
 * This mirrors the referral-code capture pattern in `referralCapture.ts`.
 */

const STORAGE_KEY = 'psyink.pendingLegalConsent'

export interface PendingLegalConsent {
  version: string
  locale: string
}

/** Persist the user's just-accepted legal consent so it survives email confirm. */
export function markPendingLegalConsent(version: string, locale: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, locale }))
  } catch {
    // Non-fatal: private mode / no storage. Consent still records immediately
    // when a session exists right after sign-up.
  }
}

export function getPendingLegalConsent(): PendingLegalConsent | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingLegalConsent>
    if (typeof parsed.version === 'string' && typeof parsed.locale === 'string') {
      return { version: parsed.version, locale: parsed.locale }
    }
    return null
  } catch {
    return null
  }
}

export function clearPendingLegalConsent(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
