/**
 * Pending signup passphrase — survives the email-confirmation path.
 *
 * When sign-up requires email confirmation there is no session yet, so the
 * chosen encryption passphrase is parked here until the first authenticated
 * session can set up the key backup (see AuthContext). To minimise how long
 * passphrase material lingers in localStorage we:
 *  - stamp it with a creation time and expire it after {@link PENDING_PASSPHRASE_TTL_MS};
 *  - lightly obfuscate the stored value (base64 — NOT encryption, just avoids a
 *    casually-readable plaintext passphrase in devtools/storage dumps);
 *  - delete it on expiry, on consume, and on setup failure (handled by callers).
 */

const STORAGE_KEY = 'psyink.pendingSignupPassphrase'

/**
 * 24 hours. Supabase email-confirmation links default to a ~24h validity
 * window, so this covers the realistic confirm-then-first-login flow while
 * bounding how long the passphrase can sit in storage. Anything older almost
 * certainly means the confirmation link expired; the user then sets up the
 * backup later via the normal passphrase unlock/restore path.
 */
export const PENDING_PASSPHRASE_TTL_MS = 24 * 60 * 60 * 1000

interface StoredPendingPassphrase {
  /** Base64-obfuscated passphrase. */
  v: string
  /** Creation timestamp (ms since epoch). */
  t: number
}

function encodeValue(passphrase: string): string {
  const bytes = new TextEncoder().encode(passphrase)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeValue(encoded: string): string {
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function isStoredRecord(raw: unknown): raw is StoredPendingPassphrase {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    typeof (raw as StoredPendingPassphrase).v === 'string' &&
    typeof (raw as StoredPendingPassphrase).t === 'number'
  )
}

export function markPendingSignupPassphrase(passphrase: string): void {
  if (!passphrase.trim()) return
  try {
    const record: StoredPendingPassphrase = {
      v: encodeValue(passphrase),
      t: Date.now(),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Non-fatal: private mode / no storage.
  }
}

/**
 * Returns the parked passphrase, or null when absent, blank, or expired.
 * Expired (or otherwise unusable) records are deleted as a side effect so a
 * stale value never lingers and is never re-read on the next session.
 */
export function getPendingSignupPassphrase(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw || !raw.trim()) return null

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Legacy format: a bare passphrase string with no timestamp. Accept it so
      // sign-ups already in flight across this deploy are not broken; it will be
      // cleared by the consume path immediately after use.
      return raw.trim() ? raw : null
    }

    if (!isStoredRecord(parsed)) {
      clearPendingSignupPassphrase()
      return null
    }

    if (Date.now() - parsed.t > PENDING_PASSPHRASE_TTL_MS) {
      clearPendingSignupPassphrase()
      return null
    }

    let value: string
    try {
      value = decodeValue(parsed.v)
    } catch {
      clearPendingSignupPassphrase()
      return null
    }

    return value.trim() ? value : null
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
