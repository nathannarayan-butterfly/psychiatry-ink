import { useCallback, useEffect, useState } from 'react'
import { fetchKbContributors } from '../services/kbContributionsApi'

/** Primary accepted contributor per substance (highest contribution count). */
export function useKbBulkContributors(substanceIds: string[]): {
  primaryBySubstanceId: ReadonlyMap<string, string>
  loading: boolean
} {
  const [primaryBySubstanceId, setPrimaryBySubstanceId] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  )
  const [loading, setLoading] = useState(false)

  const idsKey = substanceIds.filter(Boolean).sort().join('|')

  const load = useCallback(async () => {
    const uniqueIds = [...new Set(substanceIds.filter(Boolean))]
    if (uniqueIds.length === 0) {
      setPrimaryBySubstanceId(new Map())
      return
    }

    setLoading(true)
    try {
      const results = await Promise.all(
        uniqueIds.map(async (substanceId) => {
          try {
            const contributors = await fetchKbContributors(substanceId)
            if (contributors.length === 0) return null
            const primary = [...contributors].sort(
              (a, b) => b.contributionCount - a.contributionCount || a.displayName.localeCompare(b.displayName),
            )[0]
            return primary ? ([substanceId, primary.displayName] as const) : null
          } catch {
            return null
          }
        }),
      )
      const next = new Map<string, string>()
      for (const entry of results) {
        if (entry) next.set(entry[0], entry[1])
      }
      setPrimaryBySubstanceId(next)
    } finally {
      setLoading(false)
    }
  }, [idsKey, substanceIds])

  useEffect(() => {
    void load()
  }, [load])

  return { primaryBySubstanceId, loading }
}
