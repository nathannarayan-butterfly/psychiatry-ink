/**
 * Pending signup passphrase — survives the email-confirmation path.
 */

const STORAGE_KEY = 'psyink.pendingSignupPassphrase'

export function markPendingSignupPassphrase(passphrase: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, passphrase)
  } catch {
    // Non-fatal: private mode / no storage.
  }
}

export function getPendingSignupPassphrase(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw || !raw.trim()) return null
    return raw
  } catch {
    return null
  }
}

export function clearPendingSignupPassphrase(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
