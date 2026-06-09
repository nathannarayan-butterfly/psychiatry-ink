import { useTranslation } from '../../context/TranslationContext'
import { getIsdmSafetyDisclaimer } from '../../data/isdmLabels'

interface IsdmWorkspaceIndicatorProps {
  englishVariant: 'uk' | 'us'
}

export function IsdmWorkspaceIndicator({ englishVariant }: IsdmWorkspaceIndicatorProps) {
  const { t, language } = useTranslation()

  return (
    <div
      className="border-b border-border bg-surface px-4 py-2 text-xs text-muted"
      role="note"
      aria-label={t('isdmActiveBadge')}
    >
      <span className="mr-2 rounded-sm border border-border bg-surface-active px-1.5 py-0.5 font-medium text-ink">
        {t('isdmActiveBadge')}
      </span>
      <span>{getIsdmSafetyDisclaimer(language, englishVariant)}</span>
    </div>
  )
}
