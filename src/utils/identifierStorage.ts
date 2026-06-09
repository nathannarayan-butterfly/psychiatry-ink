import {
  detectBrowserCountry,
  resolvePrivacyTier,
} from '../data/privacyRegions'
import { safeGetItem, safeSetItem } from './safeStorage'

/** Where full name + date of birth are stored beyond this browser session. */
export type IdentifierStorageMode = 'device' | 'account'

const STORAGE_KEY = 'psychiatry-ink:identifier-storage-mode'
const PRIVACY_STORAGE_KEY = 'psychiatry-ink-privacy'
const ACK_KEY = 'psychiatry-ink:identifier-storage-acknowledged'

/** DACH / local_only regions default to device-only identifiers; full tier defaults to account. */
export function resolveDefaultIdentifierStorage(countryCode: string | null | undefined): IdentifierStorageMode {
  return resolvePrivacyTier(countryCode) === 'full' ? 'account' : 'device'
}

function readStoredCountryCode(): string | null {
  try {
    const raw = safeGetItem(PRIVACY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { countryCode?: string }
    const code = parsed.countryCode?.trim().toUpperCase()
    return code || null
  } catch {
    return null
  }
}

export function loadIdentifierStorageMode(): IdentifierStorageMode {
  try {
    const privacyRaw = safeGetItem(PRIVACY_STORAGE_KEY)
    if (privacyRaw) {
      const parsed = JSON.parse(privacyRaw) as { identifierStorage?: string; countryCode?: string }
      if (parsed.identifierStorage === 'account' || parsed.identifierStorage === 'device') {
        return parsed.identifierStorage
      }
    }

    const raw = safeGetItem(STORAGE_KEY)
    if (raw === 'account' || raw === 'device') return raw
  } catch {
    // ignore
  }

  const countryCode = readStoredCountryCode() ?? detectBrowserCountry() ?? 'DE'
  return resolveDefaultIdentifierStorage(countryCode)
}

export function saveIdentifierStorageMode(mode: IdentifierStorageMode): void {
  safeSetItem(STORAGE_KEY, mode)
}

export function usesAccountIdentifierSync(mode?: IdentifierStorageMode): boolean {
  return (mode ?? loadIdentifierStorageMode()) === 'account'
}

export function hasExplicitIdentifierStorageChoice(): boolean {
  try {
    const raw = safeGetItem(PRIVACY_STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { identifierStorage?: string }
    return parsed.identifierStorage === 'account' || parsed.identifierStorage === 'device'
  } catch {
    return false
  }
}

export function isIdentifierStorageAcknowledged(): boolean {
  try {
    return safeGetItem(ACK_KEY) === 'true'
  } catch {
    return false
  }
}

export function markIdentifierStorageAcknowledged(): void {
  safeSetItem(ACK_KEY, 'true')
}

/** Show onboarding only when the user has neither dismissed/confirmed nor saved an explicit choice. */
export function needsIdentifierStorageOnboarding(): boolean {
  return !isIdentifierStorageAcknowledged() && !hasExplicitIdentifierStorageChoice()
}
