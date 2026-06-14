import { useCallback, useEffect, useState } from 'react'
import { fetchKbContributors } from '../services/kbContributionsApi'
import type { KbSubstanceContributor } from '../types/kbContributions'

export function useKbContributors(substanceId: string | null): {
  contributors: KbSubstanceContributor[]
  loading: boolean
} {
  const [contributors, setContributors] = useState<KbSubstanceContributor[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!substanceId) {
      setContributors([])
      return
    }
    setLoading(true)
    try {
      setContributors(await fetchKbContributors(substanceId))
    } catch {
      setContributors([])
    } finally {
      setLoading(false)
    }
  }, [substanceId])

  useEffect(() => {
    void load()
  }, [load])

  return { contributors, loading }
}
