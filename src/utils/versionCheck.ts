/**
 * Detect when a newer deploy is available for a long-lived browser tab.
 *
 * The SPA ships with NO service worker, so a tab opened before a deploy keeps
 * running the stale JS bundle forever. At build time the bundle is stamped with
 * a build id (`LOADED_BUILD_ID`) and the same id is published to the static
 * `/version.json`. Polling that file and comparing the ids lets us surface a
 * non-intrusive "reload" prompt without ever auto-reloading (which could discard
 * unsaved clinical input).
 */

export interface VersionManifest {
  buildId?: unknown
}

/**
 * Pure comparison used by the polling hook (and unit-tested in isolation).
 *
 * Returns true ONLY when both ids are present, the loaded id is a real build
 * (not the `dev` sentinel), and they differ. Missing/empty values and the dev
 * sentinel never trigger a prompt, so local dev and fetch failures stay quiet.
 */
export function isNewVersion(
  loaded: string | null | undefined,
  fetched: string | null | undefined,
): boolean {
  if (!loaded || !fetched) return false
  if (loaded === 'dev') return false
  return loaded !== fetched
}

/** Extract a non-empty string `buildId` from a parsed version.json payload. */
export function parseBuildId(manifest: VersionManifest | null | undefined): string | null {
  if (!manifest || typeof manifest !== 'object') return null
  const { buildId } = manifest
  return typeof buildId === 'string' && buildId.length > 0 ? buildId : null
}

/**
 * Fetch the deployed build id from `/version.json`, bypassing every cache layer
 * (no-store + a cache-busting query). Fails silently — any network/parse error
 * or offline state resolves to null so the caller simply skips this check.
 */
export async function fetchRemoteBuildId(signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
      credentials: 'same-origin',
      signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as VersionManifest
    return parseBuildId(data)
  } catch {
    return null
  }
}
