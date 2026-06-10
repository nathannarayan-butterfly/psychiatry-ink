import { useTranslation } from '../../context/TranslationContext'
import { getIsdmSafetyDisclaimer } from '../../data/isdmLabels'

interface IsdmWorkspaceIndicatorProps {
  englishVariant: 'uk' | 'us'
}

export function IsdmWorkspaceIndicator({ englishVariant }: IsdmWorkspaceIndicatorProps) {
  const { t, language } = useTranslation()

  return (
    <div className="isdm-workspace-indicator" role="note" aria-label={t('isdmActiveBadge')}>
      <span className="isdm-workspace-indicator__badge">{t('isdmActiveBadge')}</span>
      <span className="isdm-workspace-indicator__text">
        {getIsdmSafetyDisclaimer(language, englishVariant)}
      </span>
    </div>
  )
}
