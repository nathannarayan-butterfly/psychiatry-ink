import { useEffect, useRef } from 'react'
import { registerIsdmChecklistGetter, scheduleIsdmRebuild } from '../utils/isdm'

interface UseIsdmEngineOptions {
  caseId: string
  enabled: boolean
  vaultReady: boolean
  checklistSelections: Record<string, Record<string, boolean>>
  sectionContents: Record<string, string>
}

export function useIsdmEngine({
  caseId,
  enabled,
  vaultReady,
  checklistSelections,
  sectionContents,
}: UseIsdmEngineOptions): void {
  const checklistRef = useRef(checklistSelections)
  checklistRef.current = checklistSelections

  useEffect(() => {
    registerIsdmChecklistGetter(caseId, () => checklistRef.current)
    return () => registerIsdmChecklistGetter(caseId, null)
  }, [caseId])

  useEffect(() => {
    if (!vaultReady) return
    scheduleIsdmRebuild(caseId, 'vault')
  }, [caseId, vaultReady])

  useEffect(() => {
    if (!enabled || !vaultReady) return
    scheduleIsdmRebuild(caseId, 'profile')
  }, [caseId, enabled, vaultReady])

  useEffect(() => {
    if (!vaultReady) return
    scheduleIsdmRebuild(caseId, 'checklist')
  }, [caseId, checklistSelections, vaultReady])

  useEffect(() => {
    if (!vaultReady) return
    scheduleIsdmRebuild(caseId, 'verlauf')
  }, [caseId, sectionContents, vaultReady])
}
