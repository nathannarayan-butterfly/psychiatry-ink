import { useTranslation } from '../../../context/TranslationContext'
import type { AufnahmeBefundInputMode } from '../../../types/anamneseBefund'

export interface AufnahmeBefundSectionToolbarProps {
  activeMode?: AufnahmeBefundInputMode
  readOnly?: boolean
  hasContent: boolean
  canRegenerate: boolean
  onShort: () => void
  onLong: () => void
  onGuided: () => void
  onRegenerate: () => void
  onEdit: () => void
  onRemove: () => void
}

export function AufnahmeBefundSectionToolbar({
  activeMode,
  readOnly = false,
  hasContent,
  canRegenerate,
  onShort,
  onLong,
  onGuided,
  onRegenerate,
  onEdit,
  onRemove,
}: AufnahmeBefundSectionToolbarProps) {
  const { t } = useTranslation()

  if (readOnly) return null

  return (
    <div className="aufnahme-befund-toolbar" role="toolbar" aria-label={t('aufnahmeBefundToolbarLabel')}>
      <button
        type="button"
        className={`aufnahme-befund-toolbar__btn ${activeMode === 'short' ? 'aufnahme-befund-toolbar__btn--active' : ''}`}
        onClick={onShort}
      >
        {t('aufnahmeBefundActionShort')}
      </button>
      <button
        type="button"
        className={`aufnahme-befund-toolbar__btn ${activeMode === 'long' ? 'aufnahme-befund-toolbar__btn--active' : ''}`}
        onClick={onLong}
      >
        {t('aufnahmeBefundActionLong')}
      </button>
      <button
        type="button"
        className={`aufnahme-befund-toolbar__btn ${activeMode === 'guided' ? 'aufnahme-befund-toolbar__btn--active' : ''}`}
        onClick={onGuided}
      >
        {t('aufnahmeBefundActionGuided')}
      </button>
      <span className="aufnahme-befund-toolbar__sep" aria-hidden />
      <button
        type="button"
        className="aufnahme-befund-toolbar__btn"
        onClick={onRegenerate}
        disabled={!canRegenerate}
      >
        {t('aufnahmeBefundActionRegenerate')}
      </button>
      <button type="button" className="aufnahme-befund-toolbar__btn" onClick={onEdit}>
        {t('aufnahmeBefundActionEdit')}
      </button>
      <button
        type="button"
        className="aufnahme-befund-toolbar__btn aufnahme-befund-toolbar__btn--danger"
        onClick={onRemove}
        disabled={!hasContent}
      >
        {t('aufnahmeBefundActionRemove')}
      </button>
    </div>
  )
}
