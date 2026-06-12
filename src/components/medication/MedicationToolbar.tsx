import {
  ArrowDown,
  ArrowUp,
  Circle,
  CircleDot,
  Copy,
  Download,
  History,
  Pause,
  Pencil,
  Plus,
  Printer,
  Square,
} from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import type { MedicationChangeType } from '../../types/medicationPlan'

interface MedicationToolbarProps {
  disabled?: boolean
  hasMedications?: boolean
  hasPlanHistory?: boolean
  showAdd?: boolean
  onAdd: () => void
  onEdit?: () => void
  onExport: () => void
  onPrint: () => void
  onCopyPlan: () => void
  onViewHistory: () => void
  editDisabled?: boolean
}

export function MedicationToolbar({
  disabled = false,
  hasMedications = false,
  hasPlanHistory = false,
  showAdd = true,
  onAdd,
  onEdit,
  onExport,
  onPrint,
  onCopyPlan,
  onViewHistory,
  editDisabled = true,
}: MedicationToolbarProps) {
  const { language } = useTranslation()

  // When the add trigger has been promoted to the section header, the toolbar
  // only holds secondary utility actions; render nothing if there are none.
  if (!showAdd && !hasMedications && !hasPlanHistory) {
    return null
  }

  return (
    <div className={`medication-toolbar${hasMedications ? '' : ' medication-toolbar--empty'}`}>
      {showAdd ? (
        <button
          type="button"
          className="therapy-add-btn"
          disabled={disabled}
          onClick={onAdd}
        >
          <Plus size={14} aria-hidden />
          {translateMedicationUi(language, 'medAdd')}
        </button>
      ) : null}
      {hasMedications ? (
        <>
          <button
            type="button"
            className="medication-toolbar__btn"
            disabled={disabled || editDisabled}
            onClick={onEdit}
          >
            <Pencil size={14} aria-hidden />
            {translateMedicationUi(language, 'medEdit')}
          </button>
          <button type="button" className="medication-toolbar__btn" disabled={disabled} onClick={onExport}>
            <Download size={14} aria-hidden />
            {translateMedicationUi(language, 'medExport')}
          </button>
          <button type="button" className="medication-toolbar__btn" disabled={disabled} onClick={onPrint}>
            <Printer size={14} aria-hidden />
            {translateMedicationUi(language, 'medPrint')}
          </button>
          <button type="button" className="medication-toolbar__btn" disabled={disabled} onClick={onCopyPlan}>
            <Copy size={14} aria-hidden />
            {translateMedicationUi(language, 'medCopyPlan')}
          </button>
        </>
      ) : null}
      {hasPlanHistory ? (
        <button type="button" className="medication-toolbar__btn" disabled={disabled} onClick={onViewHistory}>
          <History size={14} aria-hidden />
          {translateMedicationUi(language, 'medViewHistory')}
        </button>
      ) : null}
    </div>
  )
}

export function ChangeTypeIcon({ changeType }: { changeType: MedicationChangeType }) {
  const size = 13
  switch (changeType) {
    case 'increase':
      return <ArrowUp size={size} aria-hidden className="medication-row__change-icon medication-row__change-icon--up" />
    case 'decrease':
      return <ArrowDown size={size} aria-hidden className="medication-row__change-icon medication-row__change-icon--down" />
    case 'pause':
      return <Pause size={size} aria-hidden className="medication-row__change-icon medication-row__change-icon--pause" />
    case 'discontinue':
      return <Square size={size} aria-hidden className="medication-row__change-icon medication-row__change-icon--stop" />
    case 'start':
    case 'restart':
      return <CircleDot size={size} aria-hidden className="medication-row__change-icon" />
    default:
      return <Circle size={size} aria-hidden className="medication-row__change-icon" />
  }
}
