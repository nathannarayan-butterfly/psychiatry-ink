import { clearSessionOnLogout } from './devicePreferences'

/**
 * Device-local data wipe used after a confirmed account deletion. Reuses the
 * standard logout session-clear and additionally drops the encrypted vault
 * IndexedDB so no decryptable material lingers on the device. Best-effort: every
 * step swallows its own failure so a wipe never blocks sign-out.
 */

const CRYPTO_DB_NAME = 'psychiatry-ink-crypto'
const APP_LOCAL_STORAGE_PREFIX = 'psychiatry-ink'

function deleteCryptoDatabase(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve()
        return
      }
      const request = indexedDB.deleteDatabase(CRYPTO_DB_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    } catch {
      resolve()
    }
  })
}

function clearAppLocalStorage(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(APP_LOCAL_STORAGE_PREFIX)) keys.push(key)
    }
    for (const key of keys) {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore individual key failures
      }
    }
  } catch {
    // ignore — not in a browser
  }
}

/** Wipe all device-local app data (session + app localStorage + crypto IndexedDB). */
export async function wipeLocalDeviceData(): Promise<void> {
  clearSessionOnLogout()
  clearAppLocalStorage()
  await deleteCryptoDatabase()
}
