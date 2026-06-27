import type { ZwangsmassnahmeSummary } from '../../../utils/overview/zwangsmassnahmeSummary'
import { useTranslation } from '../../../context/TranslationContext'
import { OverviewCard, OverviewEmpty } from './OverviewCard'

interface ZwangsmassnahmeCardProps {
  data: ZwangsmassnahmeSummary
}

export function ZwangsmassnahmeCard({ data }: ZwangsmassnahmeCardProps) {
  const { t } = useTranslation()
  return (
    <OverviewCard
      title={t('overviewWidgetZwangsmassnahme')}
      className="ov-col-6"
      badge={data.statusLabel ? { label: data.statusLabel, tone: 'moderate' } : undefined}
    >
      {data.placeholder ? (
        <div className="ov-stub">
          <p className="ov-stub__message">{t('overviewZwangPlaceholderMessage')}</p>
          <p className="ov-stub__detail">
            {t('overviewZwangPlaceholderDetail').replace('{status}', data.statusLabel ?? '')}
          </p>
        </div>
      ) : (
        <OverviewEmpty>{t('overviewZwangEmpty')}</OverviewEmpty>
      )}
    </OverviewCard>
  )
}
