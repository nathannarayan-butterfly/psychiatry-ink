/**
 * Boot-time IndexedDB probe.
 *
 * Why this exists: see RECOVERY_REPORT.md §1 and §3. The 2026-06-30 outage was
 * triggered by the FIRST module to open `psychiatry-ink-crypto` deciding the
 * schema for the session. Since v2 of `openCryptoVaultDb` the schema is now
 * idempotent, but we still want to guarantee:
 *
 *  1. The shared opener is the very first opener — race-free.
 *  2. Any opener failure (corrupt DB, browser private-mode, OS quota) is
 *     surfaced to the UI immediately as a full-screen banner instead of
 *     manifesting later as feature-specific exceptions that look like data
 *     loss.
 *
 * The probe runs once per app boot and stores its result in module state so
 * the React root mount can render the banner declaratively.
 */

import { openCryptoVaultDb } from './cryptoVaultDb'
import { reportCryptoError } from './cryptoErrorReporter'

export type CryptoVaultProbeStatus =
  | { state: 'pending' }
  | { state: 'ok' }
  | { state: 'failed'; message: string }

let probeStatus: CryptoVaultProbeStatus = { state: 'pending' }
let probePromise: Promise<CryptoVaultProbeStatus> | null = null
const listeners = new Set<(status: CryptoVaultProbeStatus) => void>()

function notify(): void {
  for (const listener of listeners) {
    try {
      listener(probeStatus)
    } catch {
      // never let a subscriber error break boot
    }
  }
}

/**
 * Open the shared crypto IndexedDB eagerly. Idempotent — subsequent calls
 * return the cached probe result. The returned promise NEVER rejects; failures
 * are converted into a 'failed' status entry that the UI can inspect.
 */
export function probeCryptoVault(): Promise<CryptoVaultProbeStatus> {
  if (probePromise) return probePromise

  probePromise = (async () => {
    // jsdom + Node test runs don't have window.indexedDB unless `fake-indexeddb`
    // (or similar) has been loaded into the test harness. In that case the
    // probe stays pending — there's nothing meaningful to open.
    if (typeof indexedDB === 'undefined') {
      probeStatus = { state: 'ok' }
      notify()
      return probeStatus
    }

    try {
      const db = await openCryptoVaultDb()
      try {
        db.close()
      } catch {
        // closing twice (e.g. another module already closed it) is harmless
      }
      probeStatus = { state: 'ok' }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'IndexedDB open failed'
      reportCryptoError({
        scope: 'idb-bootstrap',
        code: 'open-failed',
        error,
      })
      probeStatus = { state: 'failed', message }
    }

    notify()
    return probeStatus
  })()

  return probePromise
}

export function getCryptoVaultProbeStatus(): CryptoVaultProbeStatus {
  return probeStatus
}

export function subscribeToCryptoVaultProbe(
  listener: (status: CryptoVaultProbeStatus) => void,
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Test-only — reset the probe so consecutive test cases don't share state. */
export function resetCryptoVaultProbeForTesting(): void {
  probeStatus = { state: 'pending' }
  probePromise = null
  listeners.clear()
}
