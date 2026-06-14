import { useCallback, useEffect, useState } from 'react'
import type { KbRelease } from '../types/kbReleases'
import { fetchCurrentKbRelease, isKbReleasesSupabaseReady } from '../services/kbReleasesApi'

export function useKbCurrentRelease(): {
  release: KbRelease | null
  loading: boolean
  error: string | null
  refresh: () => void
} {
  const [release, setRelease] = useState<KbRelease | null>(null)
  const [loading, setLoading] = useState(isKbReleasesSupabaseReady())
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isKbReleasesSupabaseReady()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const current = await fetchCurrentKbRelease()
      setRelease(current)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { release, loading, error, refresh: load }
}
