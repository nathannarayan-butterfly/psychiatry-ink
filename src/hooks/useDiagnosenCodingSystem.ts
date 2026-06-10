import { useCallback, useEffect, useState } from 'react'
import type { CodingSystem } from '../utils/diagnosenArchive'
import {
  DEFAULT_DIAGNOSEN_CODING_SYSTEM,
  DIAGNOSEN_CODING_SYSTEM_EVENT,
  dispatchDiagnosenCodingSystemChange,
  loadDiagnosenCodingSystem,
  saveDiagnosenCodingSystem,
} from '../utils/diagnosenCodingSystem'

export function useDiagnosenCodingSystem(caseId: string) {
  const [activeSystem, setActiveSystemState] = useState<CodingSystem>(
    () => loadDiagnosenCodingSystem(caseId) ?? DEFAULT_DIAGNOSEN_CODING_SYSTEM,
  )

  useEffect(() => {
    setActiveSystemState(loadDiagnosenCodingSystem(caseId))
  }, [caseId])

  useEffect(() => {
    function handleChange(event: Event) {
      const detail = (event as CustomEvent<{ caseId: string; system: CodingSystem }>).detail
      if (detail?.caseId === caseId) {
        setActiveSystemState(detail.system)
      }
    }

    window.addEventListener(DIAGNOSEN_CODING_SYSTEM_EVENT, handleChange)
    return () => window.removeEventListener(DIAGNOSEN_CODING_SYSTEM_EVENT, handleChange)
  }, [caseId])

  const setActiveSystem = useCallback(
    (system: CodingSystem) => {
      setActiveSystemState(system)
      saveDiagnosenCodingSystem(caseId, system)
      dispatchDiagnosenCodingSystemChange(caseId, system)
    },
    [caseId],
  )

  return { activeSystem, setActiveSystem }
}
