import { useCallback, useEffect, useState } from 'react'
import type { IsdmDomainInput, IsdmInputState, IsdmPhenomenologyDomain } from '../types/isdm'
import { createEmptyIsdmInputState } from '../types/isdm'
import { loadIsdmInput, saveIsdmInput } from '../utils/isdm/inputStorage'

export function useIsdmInput(caseId: string): {
  input: IsdmInputState
  updateDomain: (domain: IsdmPhenomenologyDomain, patch: Partial<IsdmDomainInput>) => void
} {
  const [input, setInput] = useState<IsdmInputState>(
    () => loadIsdmInput(caseId) ?? createEmptyIsdmInputState(),
  )

  useEffect(() => {
    setInput(loadIsdmInput(caseId) ?? createEmptyIsdmInputState())
  }, [caseId])

  const updateDomain = useCallback(
    (domain: IsdmPhenomenologyDomain, patch: Partial<IsdmDomainInput>) => {
      setInput((current) => {
        const next: IsdmInputState = {
          ...current,
          updatedAt: new Date().toISOString(),
          domains: {
            ...current.domains,
            [domain]: { ...current.domains[domain], ...patch },
          },
        }
        saveIsdmInput(next, caseId)
        return next
      })
    },
    [caseId],
  )

  return { input, updateDomain }
}
