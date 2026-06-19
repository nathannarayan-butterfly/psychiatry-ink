import { useEffect, useState } from 'react'
import { subscribePsychopathFinding } from '../utils/overview/psychopathFindingStorage'

/** Bump when overview psychopathology store changes so widgets re-read data. */
export function usePsychopathFindingRevision(caseId: string): number {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    return subscribePsychopathFinding((changedCaseId) => {
      if (changedCaseId === caseId) setRevision((value) => value + 1)
    })
  }, [caseId])

  return revision
}
