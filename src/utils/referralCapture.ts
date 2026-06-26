/**
 * Referral invite-code capture.
 *
 * When a visitor lands via an invite link (`?ref=CODE`) we stash the code in
 * localStorage so it survives the sign-up / e-mail-confirmation round-trip.
 * After the user is authenticated, `AuthContext` consumes it and calls the
 * attribution endpoint exactly once, then clears it.
 */

const STORAGE_KEY = 'psyink.referralCode'

/** Read `?ref=` from the current URL and persist it (call once on app boot). */
export function captureReferralCodeFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('ref')?.trim()
    if (code) {
      window.localStorage.setItem(STORAGE_KEY, code.toUpperCase())
    }
  } catch {
    // Non-fatal: private mode / no storage.
  }
}

export function getStoredReferralCode(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearStoredReferralCode(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
