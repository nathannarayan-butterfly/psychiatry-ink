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
  /** When true on mount, jumps to the side-effect entry section (Übersicht quick action). */
  autoOpenSideEffectsSection?: boolean
  /** Called once the side-effect jump request has been consumed. */
  onAutoOpenSideEffectsSectionHandled?: () => void
}

export function MedikationPage({
  caseId,
  autoOpenMedicationAdd = false,
  onAutoOpenMedicationAddHandled,
  autoOpenSideEffectsSection = false,
  onAutoOpenSideEffectsSectionHandled,
}: MedikationPageProps) {
  const medicationRef = useRef<MedicationWorkspaceHandle>(null)

  useEffect(() => {
    if (!autoOpenMedicationAdd) return
    medicationRef.current?.openAdd()
    onAutoOpenMedicationAddHandled?.()
  }, [autoOpenMedicationAdd, onAutoOpenMedicationAddHandled])

  useEffect(() => {
    if (!autoOpenSideEffectsSection) return
    medicationRef.current?.openSideEffectsSection()
    onAutoOpenSideEffectsSectionHandled?.()
  }, [autoOpenSideEffectsSection, onAutoOpenSideEffectsSectionHandled])

  return (
    <div className="medication-page cm-workspace">
      <MedicationWorkspace ref={medicationRef} caseId={caseId} />
    </div>
  )
}
