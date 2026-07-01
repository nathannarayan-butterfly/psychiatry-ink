import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  allowsWorkspaceDbSnapshot,
  detectBrowserCountry,
  resolvePrivacyTier,
  type PrivacyTier,
} from '../data/privacyRegions'
import {
  loadIdentifierStorageMode,
  markIdentifierStorageAcknowledged,
  resolveDefaultIdentifierStorage,
  saveIdentifierStorageMode,
  type IdentifierStorageMode,
} from '../utils/identifierStorage'
import { safeGetItem, safeSetItem } from '../utils/safeStorage'

const STORAGE_KEY = 'psychiatry-ink-privacy'

interface PrivacySettings {
  countryCode: string
  identifierStorage: IdentifierStorageMode
  /**
   * Explicit, user-chosen decision to back up the encrypted case file
   * (Fallakte) to the server, enabling cross-device restore via passphrase.
   * `undefined` means "no explicit choice yet" — the country-derived tier
   * default applies (see `resolveEffectiveCaseFileCloudSync`). Once set, this
   * is the SOLE gate for case-file server sync — country/jurisdiction only
   * ever supplies the default, never a hard lock (see privacyRegions.ts).
   */
  caseFileCloudSync?: boolean
}

/** Effective case-file sync value: explicit choice wins, else the tier default. */
function resolveEffectiveCaseFileCloudSync(settings: PrivacySettings, tier: PrivacyTier): boolean {
  return settings.caseFileCloudSync ?? allowsWorkspaceDbSnapshot(tier)
}

function loadPrivacySettings(): PrivacySettings {
  try {
    const raw = safeGetItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PrivacySettings>
      if (parsed.countryCode?.trim()) {
        const countryCode = parsed.countryCode.trim().toUpperCase()
        return {
          countryCode,
          identifierStorage:
            parsed.identifierStorage === 'account' || parsed.identifierStorage === 'device'
              ? parsed.identifierStorage
              : loadIdentifierStorageMode(),
          caseFileCloudSync:
            typeof parsed.caseFileCloudSync === 'boolean' ? parsed.caseFileCloudSync : undefined,
        }
      }
    }
  } catch {
    // ignore
  }

  const countryCode = detectBrowserCountry() ?? 'DE'
  return {
    countryCode,
    identifierStorage: resolveDefaultIdentifierStorage(countryCode),
  }
}

function persistPrivacySettings(settings: PrivacySettings): void {
  safeSetItem(STORAGE_KEY, JSON.stringify(settings))
  saveIdentifierStorageMode(settings.identifierStorage)
}

let cachedSettings = loadPrivacySettings()
const listeners = new Set<() => void>()

function getSnapshot(): PrivacySettings {
  return cachedSettings
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emitChange(): void {
  for (const listener of listeners) {
    listener()
  }
}

function setPrivacySettings(
  updater: PrivacySettings | ((current: PrivacySettings) => PrivacySettings),
): void {
  const next = typeof updater === 'function' ? updater(cachedSettings) : updater
  cachedSettings = next
  persistPrivacySettings(next)
  emitChange()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== 'psychiatry-ink:identifier-storage-mode') return
    cachedSettings = loadPrivacySettings()
    emitChange()
  })
}

/** Sync identifier storage from server-side state (e.g. account registry backup exists). */
export function syncPrivacyIdentifierStorage(mode: IdentifierStorageMode): void {
  setPrivacySettings((current) => {
    if (current.identifierStorage === mode) return current
    return { ...current, identifierStorage: mode }
  })
  markIdentifierStorageAcknowledged()
}

export function usePrivacySettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const tier = useMemo(
    () => resolvePrivacyTier(settings.countryCode),
    [settings.countryCode],
  )

  const setCountryCode = useCallback((countryCode: string) => {
    setPrivacySettings((current) => ({
      ...current,
      countryCode: countryCode.trim().toUpperCase(),
    }))
  }, [])

  const setIdentifierStorage = useCallback((identifierStorage: IdentifierStorageMode) => {
    setPrivacySettings((current) => ({ ...current, identifierStorage }))
    markIdentifierStorageAcknowledged()
  }, [])

  const setCaseFileCloudSync = useCallback((caseFileCloudSync: boolean) => {
    setPrivacySettings((current) => ({ ...current, caseFileCloudSync }))
  }, [])

  const caseFileCloudSync = useMemo(
    () => resolveEffectiveCaseFileCloudSync(settings, tier),
    [settings, tier],
  )

  return {
    countryCode: settings.countryCode,
    identifierStorage: settings.identifierStorage,
    tier: tier as PrivacyTier,
    /** Effective (explicit-choice-or-tier-default) case-file cloud sync state. */
    caseFileCloudSync,
    /** True once the user has explicitly picked a case-file storage mode (vs. the tier default). */
    hasExplicitCaseFileCloudSyncChoice: settings.caseFileCloudSync !== undefined,
    setCountryCode,
    setIdentifierStorage,
    setCaseFileCloudSync,
  }
}
