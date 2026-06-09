/**
 * Crash-safe localStorage wrappers.
 *
 * Direct `localStorage.setItem` can throw (Safari private mode, quota
 * exceeded, storage disabled). These helpers swallow such failures so a
 * persistence error never crashes the UI.
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.warn(`[storage] write failed for "${key}"`, error)
    return false
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
