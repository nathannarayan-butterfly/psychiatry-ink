import { useTranslation } from '../../context/TranslationContext'
import { THERAPY_DISCIPLINE_LABEL_KEYS } from '../../data/org/therapyDiscipline'
import type { TherapyEntryAttribution } from '../../types/therapy'

interface TherapyAttributionBadgeProps {
  attribution: TherapyEntryAttribution
}

export function TherapyAttributionBadge({ attribution }: TherapyAttributionBadgeProps) {
  const { t } = useTranslation()
  const labelKey = THERAPY_DISCIPLINE_LABEL_KEYS[attribution.therapyDiscipline]
  const label =
    attribution.therapyDiscipline === 'custom' && attribution.therapyDisciplineCustom
      ? attribution.therapyDisciplineCustom
      : t(labelKey)

  return (
    <span className="therapy-discipline-badge" title={t('therapyDisciplineBadge')}>
      {label}
    </span>
  )
}
