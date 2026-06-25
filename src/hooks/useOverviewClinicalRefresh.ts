import { useEffect, useState } from 'react'
import { OVERVIEW_CLINICAL_REFRESH_EVENT } from '../utils/overview/overviewClinicalRefresh'

/** Bump when overview should re-read verlauf feed, document snapshots, etc. */
export function useOverviewClinicalRefresh(caseId: string): number {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ caseId?: string }>).detail
      if (detail?.caseId === caseId) setRevision((value) => value + 1)
    }
    window.addEventListener(OVERVIEW_CLINICAL_REFRESH_EVENT, handler)
    return () => window.removeEventListener(OVERVIEW_CLINICAL_REFRESH_EVENT, handler)
  }, [caseId])

  return revision
}
