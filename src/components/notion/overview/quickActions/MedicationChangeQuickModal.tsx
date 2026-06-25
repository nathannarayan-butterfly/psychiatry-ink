import { useTranslation } from '../../../../context/TranslationContext'
import { useMedicationPlan } from '../../../../hooks/useMedicationPlan'
import { MedicationEditDialog } from '../../../medication/MedicationEditDialog'
import { notifyOverviewClinicalRefresh } from '../../../../utils/overview/overviewClinicalRefresh'
import { showNotionToast } from '../../NotionToast'

interface MedicationChangeQuickModalProps {
  open: boolean
  caseId: string
  onClose: () => void
}

export function MedicationChangeQuickModal({
  open,
  caseId,
  onClose,
}: MedicationChangeQuickModalProps) {
  const { t } = useTranslation()
  const { addMedication } = useMedicationPlan(caseId)

  return (
    <MedicationEditDialog
      open={open}
      editingEntry={null}
      onClose={onClose}
      onSave={(draft) => {
        addMedication(draft)
        notifyOverviewClinicalRefresh(caseId)
        showNotionToast(t('overviewQuickMedicationSaved'))
        onClose()
      }}
    />
  )
}
