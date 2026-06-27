import { useEffect, useState } from 'react'
import { LOADED_BUILD_ID } from '../utils/buildVersion'
import { fetchRemoteBuildId, isNewVersion } from '../utils/versionCheck'

const POLL_INTERVAL_MS = 60_000

/**
 * Poll `/version.json` and report the build id of a newer deploy, or null while
 * the running bundle is current.
 *
 * Checks run on an interval AND whenever the tab regains attention
 * (`visibilitychange` → visible, window `focus`) — the moments a long-lived tab
 * is most likely to have outlived a deploy. The result is the newest *different*
 * build id seen; the consumer decides how to present (and dismiss) it. We never
 * reload automatically.
 *
 * Skips entirely in dev / when the bundle has no real build id, so it is inert
 * outside production builds.
 */
export function useVersionCheck(): string | null {
  const [newBuildId, setNewBuildId] = useState<string | null>(null)

  useEffect(() => {
    // No stamped build id (dev / unstamped) → nothing meaningful to compare.
    if (!LOADED_BUILD_ID || LOADED_BUILD_ID === 'dev') return

    let cancelled = false
    const controller = new AbortController()

    async function check() {
      const remote = await fetchRemoteBuildId(controller.signal)
      if (cancelled || remote === null) return
      if (isNewVersion(LOADED_BUILD_ID, remote)) {
        setNewBuildId(remote)
      }
    }

    void check()
    const timer = window.setInterval(() => void check(), POLL_INTERVAL_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check()
    }
    const onFocus = () => void check()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return newBuildId
}
