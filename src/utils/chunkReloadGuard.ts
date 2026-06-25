/**
 * Recover from stale dynamic-import (code-split chunk) failures.
 *
 * After a deploy, the freshly served `index.html` references new content-hashed
 * chunk filenames, but a browser tab opened before the deploy still holds the OLD
 * index in memory. When that old tab lazily imports a chunk whose hashed filename
 * no longer exists, the dynamic import rejects ("Failed to fetch dynamically
 * imported module" / "error loading dynamically imported module") and the feature —
 * or the whole view — can blank out.
 *
 * Because `index.html` is served no-cache (see `server/serveClient.ts`) while the
 * hashed assets are immutable, a full reload always pulls a consistent
 * index → chunk set. So on a detected chunk-load failure we trigger ONE reload.
 * A short cooldown (stored in `sessionStorage`) prevents a reload loop if the
 * failure persists (e.g. genuine network outage) rather than being a stale-deploy
 * mismatch.
 */

const RELOAD_TS_KEY = 'psychiatry-ink:chunk-reload-ts'
const RELOAD_COOLDOWN_MS = 10_000

function isChunkLoadError(message: string | undefined | null): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes('failed to fetch dynamically imported module') ||
    m.includes('error loading dynamically imported module') ||
    m.includes('importing a module script failed') ||
    m.includes('failed to load module script') ||
    m.includes('chunkloaderror') ||
    // A purged chunk URL that falls through to the SPA history fallback returns
    // index.html (HTML), which the module loader rejects while parsing as JS.
    m.includes("unexpected token '<'")
  )
}

function reloadOnceWithCooldown(): void {
  const now = Date.now()
  let last = 0
  try {
    last = Number(sessionStorage.getItem(RELOAD_TS_KEY) ?? '0')
  } catch {
    last = 0
  }

  // Reloaded very recently: the problem is not a stale-deploy mismatch a reload
  // can fix, so stop here instead of looping.
  if (Number.isFinite(last) && now - last < RELOAD_COOLDOWN_MS) return

  try {
    sessionStorage.setItem(RELOAD_TS_KEY, String(now))
  } catch {
    // best effort — without sessionStorage we still reload once per tab below
  }

  window.location.reload()
}

let installed = false

/** Idempotently install global listeners that reload once on a chunk-load failure. */
export function installChunkReloadGuard(): void {
  if (typeof window === 'undefined' || installed) return
  installed = true

  window.addEventListener('error', (event) => {
    const message = event.message || (event.error instanceof Error ? event.error.message : '')
    if (isChunkLoadError(message)) reloadOnceWithCooldown()
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message =
      typeof reason === 'string'
        ? reason
        : reason instanceof Error
          ? reason.message
          : undefined
    if (isChunkLoadError(message)) reloadOnceWithCooldown()
  })
}
