import { useTranslation } from '../../../context/TranslationContext'

/** Compact AI-hypothesis disclaimer for overview widgets — clinical content stays dominant. */
export function OverviewAiBadge() {
  const { t } = useTranslation()
  return (
    <span className="ov-ai-badge" role="note">
      {t('overviewAiHypothesisBadge')}
    </span>
  )
}
