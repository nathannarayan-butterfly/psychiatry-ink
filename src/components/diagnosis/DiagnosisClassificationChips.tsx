import type { UiTranslationKey } from '../../data/uiTranslations'
import { useTranslation } from '../../context/TranslationContext'
import type {
  DiagnosisClinicalCategory,
  DiagnosisConfirmationStatus,
} from '../../types/diagnosisCatalogue'
import {
  categoryChipTone,
  categoryTranslationKey,
  confirmationChipTone,
  confirmationTranslationKey,
  DIAGNOSIS_CLINICAL_CATEGORIES,
  DIAGNOSIS_CONFIRMATION_STATUSES,
  resolveClinicalCategory,
  resolveConfirmationStatus,
  type DiagnosisChipTone,
} from '../../utils/diagnosisClassification'
import type { DiagnoseEntry } from '../../utils/diagnosenArchive'

interface DiagnosisClassificationChipsProps {
  entry: DiagnoseEntry
  compact?: boolean
}

function chipClass(tone: DiagnosisChipTone, compact?: boolean): string {
  return [
    'dx-class-chip',
    `dx-class-chip--${tone}`,
    compact ? 'dx-class-chip--compact' : '',
  ].join(' ').trim()
}

function selectClass(tone: DiagnosisChipTone, compact?: boolean): string {
  return [
    'dx-class-select',
    `dx-class-select--${tone}`,
    compact ? 'dx-class-select--compact' : '',
  ].join(' ').trim()
}

export function DiagnosisClassificationChips({ entry, compact }: DiagnosisClassificationChipsProps) {
  const { t } = useTranslation()
  const category = resolveClinicalCategory(entry)
  const confirmation = resolveConfirmationStatus(entry)

  return (
    <span className="dx-class-chips">
      <span className={chipClass(categoryChipTone(category), compact)}>
        {t(categoryTranslationKey(category) as UiTranslationKey)}
      </span>
      <span className={chipClass(confirmationChipTone(confirmation), compact)}>
        {t(confirmationTranslationKey(confirmation) as UiTranslationKey)}
      </span>
    </span>
  )
}

export interface DiagnosisClassificationEditorProps {
  category: DiagnosisClinicalCategory
  confirmation: DiagnosisConfirmationStatus
  onCategoryChange: (category: DiagnosisClinicalCategory) => void
  onConfirmationChange: (status: DiagnosisConfirmationStatus) => void
  compact?: boolean
}

export function DiagnosisClassificationEditor({
  category,
  confirmation,
  onCategoryChange,
  onConfirmationChange,
  compact,
}: DiagnosisClassificationEditorProps) {
  const { t } = useTranslation()

  return (
    <span className="dx-class-editor">
      <select
        className={selectClass(categoryChipTone(category), compact)}
        value={category}
        onChange={(e) => onCategoryChange(e.target.value as DiagnosisClinicalCategory)}
        aria-label={t('diagnosisCategoryLabel')}
      >
        {DIAGNOSIS_CLINICAL_CATEGORIES.map((value) => (
          <option key={value} value={value}>
            {t(categoryTranslationKey(value) as UiTranslationKey)}
          </option>
        ))}
      </select>
      <select
        className={selectClass(confirmationChipTone(confirmation), compact)}
        value={confirmation}
        onChange={(e) => onConfirmationChange(e.target.value as DiagnosisConfirmationStatus)}
        aria-label={t('diagnosisConfirmationLabel')}
      >
        {DIAGNOSIS_CONFIRMATION_STATUSES.map((value) => (
          <option key={value} value={value}>
            {t(confirmationTranslationKey(value) as UiTranslationKey)}
          </option>
        ))}
      </select>
    </span>
  )
}

interface DiagnosisClassificationEditorFromEntryProps {
  entry: DiagnoseEntry
  onCategoryChange: (category: DiagnosisClinicalCategory) => void
  onConfirmationChange: (status: DiagnosisConfirmationStatus) => void
  compact?: boolean
}

export function DiagnosisClassificationEditorFromEntry({
  entry,
  onCategoryChange,
  onConfirmationChange,
  compact,
}: DiagnosisClassificationEditorFromEntryProps) {
  return (
    <DiagnosisClassificationEditor
      category={resolveClinicalCategory(entry)}
      confirmation={resolveConfirmationStatus(entry)}
      onCategoryChange={onCategoryChange}
      onConfirmationChange={onConfirmationChange}
      compact={compact}
    />
  )
}
