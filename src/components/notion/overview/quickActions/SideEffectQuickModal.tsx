import { useTranslation } from '../../../../context/TranslationContext'
import { useMedicationPlan } from '../../../../hooks/useMedicationPlan'
import { SideEffectDialog } from '../../../medication/SideEffectDialog'
import { notifyOverviewClinicalRefresh } from '../../../../utils/overview/overviewClinicalRefresh'
import { showNotionToast } from '../../NotionToast'

interface SideEffectQuickModalProps {
  open: boolean
  caseId: string
  onClose: () => void
}

export function SideEffectQuickModal({ open, caseId, onClose }: SideEffectQuickModalProps) {
  const { t } = useTranslation()
  const { currentPlan, reportSideEffect } = useMedicationPlan(caseId)
  const medications = currentPlan?.medications ?? []

  return (
    <SideEffectDialog
      open={open}
      medications={medications}
      onClose={onClose}
      onSave={(report) => {
        reportSideEffect(report)
        notifyOverviewClinicalRefresh(caseId)
        showNotionToast(t('overviewQuickSideEffectSaved'))
        onClose()
      }}
    />
  )
}
