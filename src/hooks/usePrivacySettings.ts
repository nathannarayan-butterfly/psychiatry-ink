import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
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

  return {
    countryCode: settings.countryCode,
    identifierStorage: settings.identifierStorage,
    tier: tier as PrivacyTier,
    setCountryCode,
    setIdentifierStorage,
  }
}
