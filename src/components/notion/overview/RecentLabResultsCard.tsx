import { FlaskConical } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { RecentLabResultItem } from '../../../utils/overview/recentLabResults'

interface RecentLabResultsCardProps {
  items: RecentLabResultItem[]
  onOpenLabor: () => void
}

export function RecentLabResultsCard({ items, onOpenLabor }: RecentLabResultsCardProps) {
  const { t } = useTranslation()
  const abnormalCount = items.filter((i) => i.abnormal).length
  const badge =
    abnormalCount > 0
      ? { label: `${abnormalCount} ${t('overviewLaborAbnormalBadge')}`, tone: 'high' as const }
      : undefined

  return (
    <OverviewCard
      title={t('overviewWidgetLabResults')}
      icon={<FlaskConical size={15} />}
      className="ov-col-6"
      badge={badge}
      action={{ label: t('overviewLaborToLabor'), onClick: onOpenLabor }}
    >
      {items.length === 0 ? (
        <OverviewEmpty>{t('overviewLaborEmptyNoData')}</OverviewEmpty>
      ) : (
        <ul className="ov-feed">
          {items.map((item) => (
            <li key={item.id} className={`ov-feed__item${item.abnormal ? ' ov-feed__item--abnormal' : ''}`}>
              <div className="ov-feed__head">
                <span className="ov-feed__date">{item.dateLabel}</span>
                {item.abnormal ? <span className="ov-feed__tag ov-feed__tag--warn">{t('overviewLaborAbnormalBadge')}</span> : null}
              </div>
              <p className="ov-feed__text">
                <strong>{item.name}</strong> {item.valueLabel}
                {item.refLabel ? <span className="ov-meta"> · Ref: {item.refLabel}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  )
}
