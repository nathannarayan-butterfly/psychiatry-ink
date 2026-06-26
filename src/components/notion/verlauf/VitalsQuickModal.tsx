import { useCallback } from 'react'
import { getGuidedEntrySchema } from '../../../data/guidedEntry/schemas'
import { saveVitalsEntry } from '../../../utils/verlauf/saveVitalsEntry'
import { OverviewQuickGuidedModal } from '../overview/quickActions/OverviewQuickGuidedModal'

export interface VitalsQuickModalProps {
  open: boolean
  caseId: string
  userId?: string
  onClose: () => void
  onSaved: () => void
}

/** Quick Vitalwerte entry for the Verlauf feed — reuses the guided-entry modal. */
export function VitalsQuickModal({ open, caseId, userId, onClose, onSaved }: VitalsQuickModalProps) {
  const schema = getGuidedEntrySchema('vitalwerte-quick')

  const handleSave = useCallback(
    (payload: {
      text: string
      answers: import('../../../types/guidedEntry').GuidedEntryAnswer[]
      instanceId: string
    }) => {
      saveVitalsEntry({
        caseId,
        text: payload.text,
        answers: payload.answers,
        instanceId: payload.instanceId,
        userId,
      })
      onSaved()
      onClose()
    },
    [caseId, onClose, onSaved, userId],
  )

  return (
    <OverviewQuickGuidedModal
      open={open}
      caseId={caseId}
      schema={schema}
      userId={userId}
      onClose={onClose}
      onSave={handleSave}
    />
  )
}
