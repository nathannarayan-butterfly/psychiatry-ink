import { FlaskConical } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import { Sparkline } from './Sparkline'
import type { LabsDueData, LabDueItem } from './types'

interface LabsDueCardProps {
  data: LabsDueData
  onOpenLabor: () => void
}

/** Arrow glyph for the direction of the last step in the analyte's history. */
function trendArrow(trend: number[]): string | null {
  if (trend.length < 2) return null
  const delta = trend[trend.length - 1] - trend[trend.length - 2]
  if (delta === 0) return '→'
  return delta > 0 ? '↑' : '↓'
}

function LabRow({ item }: { item: LabDueItem }) {
  const abnormal = item.status === 'abnormal'
  const arrow = trendArrow(item.trend)
  return (
    <div className={`ov-lab ${abnormal ? 'ov-lab--abnormal' : ''}`.trim()}>
      <div className="ov-lab__content">
        <div className="ov-lab__reading">
          <span className="ov-lab__name">{item.name}</span>
          {item.valueLabel ? <span className="ov-lab__num">{item.valueLabel}</span> : null}
        </div>
        {item.rationale ? <span className="ov-lab__rationale">{item.rationale}</span> : null}
        {item.refLabel || item.dateLabel ? (
          <div className="ov-lab__meta">
            {item.refLabel ? <span className="ov-lab__ref">Ref: {item.refLabel}</span> : null}
            {item.dateLabel ? <span className="ov-lab__date">{item.dateLabel}</span> : null}
          </div>
        ) : null}
      </div>
      {item.trend.length >= 2 ? (
        <div className="ov-lab__spark">
          <Sparkline values={item.trend} abnormal={abnormal} />
          {arrow ? <span className="ov-lab__arrow" aria-hidden>{arrow}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

export function LabsDueCard({ data, onOpenLabor }: LabsDueCardProps) {
  const { t } = useTranslation()
  const badge =
    data.abnormal.length > 0
      ? { label: `${data.abnormal.length} ${t('overviewLaborAbnormalBadge')}`, tone: 'high' as const }
      : undefined

  const watched = data.watched.slice(0, 4)
  const missing = data.missingMonitoring.slice(0, 4)
  const hasGroups =
    data.abnormal.length > 0 || data.watched.length > 0 || data.missingMonitoring.length > 0
  const showSubheads = data.abnormal.length > 0 && data.watched.length > 0

  return (
    <OverviewCard
      title={t('overviewLaborMonitoringTitle')}
      icon={<FlaskConical size={15} />}
      className="ov-col-6"
      badge={badge}
      action={{ label: t('overviewLaborToLabor'), onClick: onOpenLabor }}
    >
      {!data.hasLabData ? (
        <OverviewEmpty>{t('overviewLaborEmptyNoData')}</OverviewEmpty>
      ) : !hasGroups ? (
        <OverviewEmpty>{t('overviewLaborEmptyNoRelevant')}</OverviewEmpty>
      ) : (
        <>
          {data.abnormal.length > 0 ? (
            <>
              {showSubheads ? <p className="ov-subhead">{t('overviewLaborAbnormalSubhead')}</p> : null}
              {data.abnormal.map((item) => (
                <LabRow key={item.id} item={item} />
              ))}
            </>
          ) : null}

          {watched.length > 0 ? (
            <>
              {showSubheads ? <p className="ov-subhead">{t('overviewLaborWatchedSubhead')}</p> : null}
              {watched.map((item) => (
                <LabRow key={item.id} item={item} />
              ))}
            </>
          ) : null}

          {missing.length > 0 ? (
            <>
              <p className="ov-subhead">{t('overviewLaborPendingMonitoring')}</p>
              <ul className="ov-list">
                {missing.map((m) => (
                  <li key={m.parameter} className="ov-task">
                    {m.parameter}
                    <span className="ov-task__area">{m.drugs.join(', ')}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </OverviewCard>
  )
}
