import { safeGetItem, safeSetItem } from '../safeStorage'
import type { GuidedEntryItemType, GuidedEntryMode } from '../../types/guidedEntry'

const STORAGE_KEY = 'psychiatry-ink:guided-entry-mode-preferences'

type StoredPrefs = Partial<Record<GuidedEntryItemType, GuidedEntryMode>>

function loadPrefs(): StoredPrefs {
  try {
    const raw = safeGetItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoredPrefs
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function savePrefs(prefs: StoredPrefs): void {
  safeSetItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function getPreferredEntryMode(itemType: GuidedEntryItemType): GuidedEntryMode | null {
  const prefs = loadPrefs()
  const mode = prefs[itemType]
  return mode === 'direct' || mode === 'guided' ? mode : null
}

export function setPreferredEntryMode(itemType: GuidedEntryItemType, mode: GuidedEntryMode): void {
  const prefs = loadPrefs()
  prefs[itemType] = mode
  savePrefs(prefs)
}

export function clearPreferredEntryMode(itemType: GuidedEntryItemType): void {
  const prefs = loadPrefs()
  delete prefs[itemType]
  savePrefs(prefs)
}
