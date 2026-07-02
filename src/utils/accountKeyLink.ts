/**
 * Tracks whether THIS browser's local key pair is the account's real encryption
 * key — i.e. the device either created the passphrase key backup or restored it.
 *
 * Why a dedicated marker (and not just "is there a local key pair?"):
 * `ensureKeyMaterial()` silently generates a fresh RSA pair the first time any
 * code path touches it on a new device. That means a "do we have local keys?"
 * probe flips to `true` within milliseconds of app start, before the user can
 * enter their passphrase — making it useless for deciding whether a new-device
 * unlock prompt is still required. This marker is only set after a deliberate
 * setup/restore, so it stays `false` on a fresh device even once a throwaway key
 * pair has been auto-generated.
 *
 * The stored value is the Supabase user id, so logging into a different account
 * on the same browser correctly re-triggers the unlock prompt. The id is not
 * patient data and is already present in the browser's auth token.
 */

import { safeGetItem, safeRemoveItem, safeSetItem } from './safeStorage'

export const ACCOUNT_KEY_LINK_STORAGE_KEY = 'psychiatry-ink:account-key-linked'

/** Record that this browser now holds the account's real private key. */
export function markAccountKeyLinked(userId: string | null | undefined): void {
  const id = userId?.trim()
  if (!id) return
  safeSetItem(ACCOUNT_KEY_LINK_STORAGE_KEY, id)
}

/** True when this browser's key pair is confirmed to belong to `userId`. */
export function isAccountKeyLinked(userId: string | null | undefined): boolean {
  const id = userId?.trim()
  if (!id) return false
  return safeGetItem(ACCOUNT_KEY_LINK_STORAGE_KEY) === id
}

/**
 * The user id this browser's key pair is linked to, or null when the local pair
 * is still an auto-generated throwaway. Lets non-React code (e.g. the account
 * registry upload) confirm the link without knowing the current user id.
 */
export function getLinkedAccountUserId(): string | null {
  return safeGetItem(ACCOUNT_KEY_LINK_STORAGE_KEY)?.trim() || null
}

/** Forget the link (used when the local key material is intentionally reset). */
export function clearAccountKeyLink(): void {
  safeRemoveItem(ACCOUNT_KEY_LINK_STORAGE_KEY)
}
