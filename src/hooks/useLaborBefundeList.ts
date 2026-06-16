import { useCallback, useEffect, useState } from 'react'
import { loadBefunde, type LaborBefund } from '../utils/laborArchive'

function sortBefunde(befunde: LaborBefund[]): LaborBefund[] {
  return [...befunde].sort((a, b) => b.date.localeCompare(a.date))
}

/** Shared labor-befund list + selection state for Labor tab sidebar and main content. */
export function useLaborBefundeList(caseId: string) {
  const [befunde, setBefunde] = useState<LaborBefund[]>(() => sortBefunde(loadBefunde(caseId)))
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const sorted = sortBefunde(loadBefunde(caseId))
    return sorted[0]?.id ?? null
  })

  const refresh = useCallback(() => {
    const next = sortBefunde(loadBefunde(caseId))
    setBefunde(next)
    setSelectedId((current) => {
      if (current && next.some((b) => b.id === current)) return current
      return next[0]?.id ?? null
    })
  }, [caseId])

  useEffect(() => {
    refresh()
  }, [caseId, refresh])

  return {
    befunde,
    setBefunde,
    selectedId,
    setSelectedId,
    refresh,
  }
}
