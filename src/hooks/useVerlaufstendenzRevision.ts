import { useEffect, useState } from 'react'
import { subscribeVerlaufstendenz } from '../utils/verlaufstendenz/storage'

/** Bump when Verlaufstendenz store changes so overview widgets re-read data. */
export function useVerlaufstendenzRevision(caseId: string): number {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    return subscribeVerlaufstendenz((changedCaseId) => {
      if (changedCaseId === caseId) setRevision((value) => value + 1)
    })
  }, [caseId])

  return revision
}
