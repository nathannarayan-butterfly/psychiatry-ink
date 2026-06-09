import type { LocalCaseMeta } from '../hooks/useCaseRegistry'
import { safeSetItem } from './safeStorage'

export const REGISTRY_KEY = 'psychiatry-ink:case-registry'

export function loadRegistryMapFromStorage(): Record<string, LocalCaseMeta> {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, LocalCaseMeta>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveRegistryMapToStorage(map: Record<string, LocalCaseMeta>): void {
  safeSetItem(REGISTRY_KEY, JSON.stringify(map))
}
