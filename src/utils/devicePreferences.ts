/**
 * Device-level UI preferences — survive logout/login on the same browser.
 *
 * Clinical ciphertext (IndexedDB vault, encrypted localStorage caches) and auth
 * session material are cleared separately via `clearSessionOnLogout`.
 */

import {
  applyAppearanceSettings,
  migrateFontFamily,
  migratePageType,
  migratePaperColor,
  migratePreferredAccentColor,
} from '../data/appearancePresets'
import {
  defaultAppearanceSettings,
  type AppearanceSettings,
} from '../types/settings'
import { clearAccountBackupUnlock } from './accountBackupSession'
import { LANGUAGE_STORAGE_KEY } from './clinicalLanguage'
import { AI_MODEL_PREFERENCES_KEY } from './resolveAiModel'
import { safeGetItem, safeRemoveItem, safeSetItem } from './safeStorage'

export const DEVICE_PREFERENCES_KEY = 'psychiatry-ink:device-preferences'
export const APPEARANCE_LEGACY_KEY = 'psychiatry-ink-appearance'

type StoredAppearance = AppearanceSettings & { colorScheme?: string }

export interface DevicePreferencesV1 {
  version: 1
  appearance?: AppearanceSettings
}

const DEVICE_PREFERENCE_LOCAL_STORAGE_PREFIXES = [
  DEVICE_PREFERENCES_KEY,
  APPEARANCE_LEGACY_KEY,
  LANGUAGE_STORAGE_KEY,
  'psychiatry-ink-english-variant',
  'psychiatry-ink-privacy',
  'psychiatry-ink-workspace',
  'psychiatry-ink-lab-import',
  'psychiatry-ink-assessment-standard',
  'psychiatry-ink:ki-instructions',
  AI_MODEL_PREFERENCES_KEY,
  'psychiatry-ink:ai-model-tier',
  'psychiatry-ink:ai-auto-mode',
  'psychiatry-ink:ask-butterfly-',
  'psychiatry-ink:sidebar-collapsed',
  'psychiatry-ink:overview-layout',
  'psychiatry-ink:parser-profile:',
  'psychiatry-ink:kb-anonymous-user-id',
  'psychiatry-ink-device-id',
  'psychiatry-ink:defaultPrescribingCountry',
  'psychiatry-ink:receptorConfig',
  'psychiatry-ink:knowledgeBase',
  'psychiatry-ink:knowledgeBaseDrugs',
  'psychiatry-ink:knowledgeBaseNotes',
  'psychiatry-ink:knowledgeBaseCollections',
  'psychiatry-ink:knowledgeBaseAnnotations',
  'psychiatry-ink:medicationMarketAvailability',
  'psychiatry-ink:identifier-storage-mode',
  'psychiatry-ink:identifier-storage-acknowledged',
  'psychiatry-ink-privacy',
] as const

const SESSION_LOCAL_STORAGE_PREFIXES = ['dc:e2ee:', 'ks:e2ee:'] as const

function normalizeAppearance(raw: Partial<StoredAppearance> | null | undefined): AppearanceSettings {
  const parsed = { ...defaultAppearanceSettings, ...raw } as StoredAppearance
  parsed.preferredAccentColor = migratePreferredAccentColor(
    parsed.preferredAccentColor,
    parsed.colorScheme,
  )
  parsed.fontFamily = migrateFontFamily(parsed.fontFamily)
  parsed.pageType = migratePageType(parsed.pageType)
  parsed.paperColor = migratePaperColor(parsed.paperColor)
  return parsed
}

function loadDevicePreferencesBundle(): DevicePreferencesV1 {
  try {
    const raw = safeGetItem(DEVICE_PREFERENCES_KEY)
    if (!raw) return { version: 1 }
    const parsed = JSON.parse(raw) as Partial<DevicePreferencesV1>
    if (parsed.version !== 1) return { version: 1 }
    return {
      version: 1,
      appearance: parsed.appearance ? normalizeAppearance(parsed.appearance) : undefined,
    }
  } catch {
    return { version: 1 }
  }
}

function saveDevicePreferencesBundle(bundle: DevicePreferencesV1): void {
  safeSetItem(DEVICE_PREFERENCES_KEY, JSON.stringify(bundle))
}

function loadLegacyAppearanceSettings(): AppearanceSettings | null {
  try {
    const raw = safeGetItem(APPEARANCE_LEGACY_KEY)
    if (!raw) return null
    return normalizeAppearance(JSON.parse(raw) as StoredAppearance)
  } catch {
    return null
  }
}

export function loadAppearanceSettings(): AppearanceSettings {
  const bundle = loadDevicePreferencesBundle()
  if (bundle.appearance) return bundle.appearance

  const legacy = loadLegacyAppearanceSettings()
  if (legacy) {
    persistAppearanceSettings(legacy, { syncLegacyKey: true })
    return legacy
  }

  return defaultAppearanceSettings
}

export function persistAppearanceSettings(
  settings: AppearanceSettings,
  options?: { syncLegacyKey?: boolean },
): void {
  const bundle = loadDevicePreferencesBundle()
  bundle.appearance = settings
  saveDevicePreferencesBundle(bundle)

  if (options?.syncLegacyKey !== false) {
    safeSetItem(APPEARANCE_LEGACY_KEY, JSON.stringify(settings))
  }

  applyAppearanceSettings(settings)
  emitAppearanceChange()
}

export function reapplyDevicePreferences(): void {
  applyAppearanceSettings(loadAppearanceSettings())
}

export function isPreservedDevicePreferenceKey(key: string): boolean {
  return DEVICE_PREFERENCE_LOCAL_STORAGE_PREFIXES.some((prefix) => {
    if (key === prefix) return true
    if (prefix.endsWith(':') || prefix.endsWith('-')) return key.startsWith(prefix)
    return key.startsWith(`${prefix}:`) || key.startsWith(`${prefix}::`)
  })
}

function clearEphemeralLocalStorageKeys(): void {
  if (typeof localStorage === 'undefined') return

  const keysToRemove: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || isPreservedDevicePreferenceKey(key)) continue
    if (key.startsWith('sb-') && key.includes('-auth-token')) {
      keysToRemove.push(key)
      continue
    }
    if (SESSION_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    safeRemoveItem(key)
  }
}

/** Clears auth/session material on logout while preserving device UI preferences. */
export function clearSessionOnLogout(): void {
  clearAccountBackupUnlock()

  try {
    sessionStorage.clear()
  } catch {
    // ignore
  }

  clearEphemeralLocalStorageKeys()
  reapplyDevicePreferences()
}

let cachedAppearance = loadAppearanceSettings()
const appearanceListeners = new Set<() => void>()

function emitAppearanceChange(): void {
  for (const listener of appearanceListeners) {
    listener()
  }
}

export function getAppearanceSettingsSnapshot(): AppearanceSettings {
  return cachedAppearance
}

export function subscribeAppearanceSettings(listener: () => void): () => void {
  appearanceListeners.add(listener)
  return () => appearanceListeners.delete(listener)
}

export function setAppearanceSettings(
  updater: AppearanceSettings | ((current: AppearanceSettings) => AppearanceSettings),
): void {
  const next =
    typeof updater === 'function' ? updater(cachedAppearance) : updater
  cachedAppearance = next
  persistAppearanceSettings(next)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== DEVICE_PREFERENCES_KEY && event.key !== APPEARANCE_LEGACY_KEY) return
    cachedAppearance = loadAppearanceSettings()
    applyAppearanceSettings(cachedAppearance)
    emitAppearanceChange()
  })
}

// Bootstrap module cache from storage at import time.
cachedAppearance = loadAppearanceSettings()
