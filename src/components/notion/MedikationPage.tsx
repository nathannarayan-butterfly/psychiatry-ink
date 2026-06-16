import { useEffect, useRef } from 'react'
import {
  MedicationWorkspace,
  type MedicationWorkspaceHandle,
} from '../medication/MedicationWorkspace'

interface MedikationPageProps {
  caseId: string
  /** When true on mount, the medication add dialog is opened automatically (cross-tab trigger from Übersicht). */
  autoOpenMedicationAdd?: boolean
  /** Called once the auto-open request has been consumed, so the parent can reset its flag. */
  onAutoOpenMedicationAddHandled?: () => void
}

export function MedikationPage({
  caseId,
  autoOpenMedicationAdd = false,
  onAutoOpenMedicationAddHandled,
}: MedikationPageProps) {
  const medicationRef = useRef<MedicationWorkspaceHandle>(null)

  useEffect(() => {
    if (!autoOpenMedicationAdd) return
    medicationRef.current?.openAdd()
    onAutoOpenMedicationAddHandled?.()
  }, [autoOpenMedicationAdd, onAutoOpenMedicationAddHandled])

  return (
    <div className="medication-page">
      <MedicationWorkspace ref={medicationRef} caseId={caseId} />
    </div>
  )
}
