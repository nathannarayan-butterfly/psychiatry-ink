import { OverviewCard, OverviewEmpty } from './OverviewCard'
import { Sparkline } from './Sparkline'
import type { RecentLabResultItem } from '../../../utils/overview/recentLabResults'
import type { LaborOverviewData, LabDueItem, MedicationMonitoringGroup } from './types'

interface LaborOverviewCardProps {
  data: LaborOverviewData
  onOpenLabor: () => void
}

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
      <div className="ov-lab__main">
        <span className="ov-lab__name">{item.name}</span>
        {item.rationale ? <span className="ov-lab__rationale">{item.rationale}</span> : null}
      </div>
      {item.trend.length >= 2 ? (
        <div className="ov-lab__spark">
          <Sparkline values={item.trend} abnormal={abnormal} />
          {arrow ? <span className="ov-lab__arrow" aria-hidden>{arrow}</span> : null}
        </div>
      ) : null}
      <div className="ov-lab__value">
        {item.valueLabel ? <span className="ov-lab__num">{item.valueLabel}</span> : null}
        {item.refLabel ? <span className="ov-lab__ref">Ref: {item.refLabel}</span> : null}
        {item.dateLabel ? <span className="ov-lab__date">{item.dateLabel}</span> : null}
      </div>
    </div>
  )
}

function MonitoringSection({
  groups,
  notDocumentedLabel,
}: {
  groups: MedicationMonitoringGroup[]
  notDocumentedLabel: string
}) {
  if (groups.length === 0) return null
  return (
    <div className="ov-labor__monitoring">
      <p className="ov-subhead">Überwachen</p>
      {groups.map((group) => (
        <div key={group.medicationId} className="ov-safety__med-group">
          <div className="ov-safety__med-name">{group.medicationName}</div>
          {group.parameters.map((param) => (
            <div key={param.key} className="ov-safety__param-row">
              <span className="ov-safety__param-label">{param.label}</span>
              <span
                className={`ov-safety__param-value${param.missing ? ' ov-safety__param-value--missing' : ''}`}
              >
                {param.missing
                  ? notDocumentedLabel
                  : [param.valueLabel, param.dateLabel].filter(Boolean).join(' · ')}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function RecentAbnormalList({ items }: { items: RecentLabResultItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="ov-labor__recent-abnormal">
      <p className="ov-subhead">Auffällig (jüngstes Labor)</p>
      <ul className="ov-feed">
        {items.slice(0, 4).map((item) => (
          <li key={item.id} className="ov-feed__item ov-feed__item--abnormal">
            <div className="ov-feed__head">
              <span className="ov-feed__date">{item.dateLabel}</span>
              <span className="ov-feed__tag ov-feed__tag--warn">auffällig</span>
            </div>
            <p className="ov-feed__text">
              <strong>{item.name}</strong> {item.valueLabel}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LaborOverviewCard({ data, onOpenLabor }: LaborOverviewCardProps) {
  const badge =
    data.abnormal.length > 0 || data.recentAbnormal.length > 0
      ? {
          label: `${data.abnormal.length + data.recentAbnormal.length} auffällig`,
          tone: 'high' as const,
        }
      : undefined

  const watched = data.watched.slice(0, 4)
  const missing = data.missingMonitoring.slice(0, 4)
  const hasGroups =
    data.abnormal.length > 0 ||
    data.watched.length > 0 ||
    data.missingMonitoring.length > 0 ||
    data.medicationMonitoring.length > 0 ||
    data.recentAbnormal.length > 0

  return (
    <OverviewCard
      title="Labor"
      className="ov-col-6"
      badge={badge}
      action={{ label: 'Zum Labor', onClick: onOpenLabor }}
    >
      {!data.hasLabData && data.medicationMonitoring.length === 0 ? (
        <OverviewEmpty>Keine Laborbefunde vorhanden.</OverviewEmpty>
      ) : !hasGroups ? (
        <OverviewEmpty>Keine medikationsrelevanten Laborwerte.</OverviewEmpty>
      ) : (
        <>
          {data.abnormal.length > 0 ? (
            <>
              <p className="ov-subhead">Auffällig</p>
              {data.abnormal.map((item) => (
                <LabRow key={item.id} item={item} />
              ))}
            </>
          ) : null}

          <MonitoringSection groups={data.medicationMonitoring} notDocumentedLabel="nicht dokumentiert" />

          {watched.length > 0 ? (
            <>
              <p className="ov-subhead">Überwacht</p>
              {watched.map((item) => (
                <LabRow key={item.id} item={item} />
              ))}
            </>
          ) : null}

          <RecentAbnormalList items={data.recentAbnormal} />

          {missing.length > 0 ? (
            <>
              <p className="ov-subhead">Ausstehendes Monitoring</p>
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
