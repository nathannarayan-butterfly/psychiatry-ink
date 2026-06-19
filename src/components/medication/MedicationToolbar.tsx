import {
  ArrowDown,
  ArrowUp,
  Check,
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
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import type { MedicationChangeType } from '../../types/medicationPlan'

interface MedicationToolbarProps {
  disabled?: boolean
  hasMedications?: boolean
  showAdd?: boolean
  onAdd: () => void
  onEdit?: () => void
  onExport: () => void
  onPrint: () => void
  onCopyPlan: () => void
  editDisabled?: boolean
  /** When true, the plan-history toggle joins the toolbar icon group. */
  hasPlanHistory?: boolean
  /** Whether the plan-history view is currently active (toggle pressed). */
  historyMode?: boolean
  /** Flip between the live plan and the plan-history view. */
  onToggleHistory?: () => void
}

export function MedicationToolbar({
  disabled = false,
  hasMedications = false,
  showAdd = true,
  onAdd,
  onEdit,
  onExport,
  onPrint,
  onCopyPlan,
  editDisabled = true,
  hasPlanHistory = false,
  historyMode = false,
  onToggleHistory,
}: MedicationToolbarProps) {
  const { language } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    }
  }, [])

  const handleCopyPlan = useCallback(() => {
    onCopyPlan()
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 1800)
  }, [onCopyPlan])

  const showHistoryToggle = hasPlanHistory && !!onToggleHistory

  // Hide the toolbar when there are no utility actions and no add trigger.
  if (!showAdd && !hasMedications && !showHistoryToggle) {
    return null
  }

  const historyLabel = translateMedicationUi(language, historyMode ? 'medLastPlan' : 'medPlanHistoryOpen')
  const editLabel = translateMedicationUi(language, 'medEdit')
  const exportLabel = translateMedicationUi(language, 'medExport')
  const printLabel = translateMedicationUi(language, 'medPrint')
  const copyLabel = translateMedicationUi(language, copied ? 'medCopied' : 'medCopyPlan')

  return (
    <div className={`medication-toolbar${hasMedications ? '' : ' medication-toolbar--empty'}`}>
      <div className="medication-toolbar__actions">
        {showHistoryToggle ? (
          <button
            type="button"
            className={`icon-action-btn icon-action-btn--bordered${historyMode ? ' icon-action-btn--success' : ''}`}
            onClick={onToggleHistory}
            aria-pressed={historyMode}
            title={historyLabel}
            aria-label={historyLabel}
          >
            <History strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}
        {hasMedications ? (
          <>
            <button
              type="button"
              className="icon-action-btn icon-action-btn--bordered"
              disabled={disabled || editDisabled}
              onClick={onEdit}
              title={editLabel}
              aria-label={editLabel}
            >
              <Pencil strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className="icon-action-btn icon-action-btn--bordered"
              disabled={disabled}
              onClick={onExport}
              title={exportLabel}
              aria-label={exportLabel}
            >
              <Download strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className="icon-action-btn icon-action-btn--bordered"
              disabled={disabled}
              onClick={onPrint}
              title={printLabel}
              aria-label={printLabel}
            >
              <Printer strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className={`icon-action-btn icon-action-btn--bordered${copied ? ' icon-action-btn--success' : ''}`}
              disabled={disabled}
              onClick={handleCopyPlan}
              title={copyLabel}
              aria-label={copyLabel}
            >
              {copied ? <Check strokeWidth={1.75} aria-hidden /> : <Copy strokeWidth={1.75} aria-hidden />}
            </button>
          </>
        ) : null}
      </div>
      {showAdd ? (
        <button
          type="button"
          className="medication-plan__add"
          disabled={disabled}
          onClick={onAdd}
        >
          <Plus size={15} strokeWidth={2.2} aria-hidden />
          {translateMedicationUi(language, 'medAddMedication')}
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
