import { OverviewCard, OverviewEmpty } from './OverviewCard'
import { Sparkline } from './Sparkline'
import { useTranslation } from '../../../context/TranslationContext'
import type { RecentLabResultItem } from '../../../utils/overview/recentLabResults'
import type { DiagnosticExamSummary } from '../../../utils/overview/diagnosticSummaries'
import type { LaborOverviewData, LabDueItem } from './types'

interface LaborOverviewCardProps {
  data: LaborOverviewData
  onOpenLabor: () => void
  /** Latest ECG/EKG, EEG and imaging summaries — derived from real befund/order data. */
  ekg: DiagnosticExamSummary
  eeg: DiagnosticExamSummary
  imaging: DiagnosticExamSummary
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

function DiagnosticMini({ title, data }: { title: string; data: DiagnosticExamSummary }) {
  return (
    <div className={`ov-diag ov-diag--${data.status}`}>
      <div className="ov-diag__head">
        <span className="ov-diag__title">{title}</span>
        {data.conducted ? (
          <span className={`ov-diag__status ov-diag__status--${data.status}`}>
            {data.statusLabel}
          </span>
        ) : null}
      </div>
      {data.conducted ? (
        <>
          {data.dateLabel ? <span className="ov-diag__date">{data.dateLabel}</span> : null}
          {data.briefFinding ? <p className="ov-diag__finding">{data.briefFinding}</p> : null}
        </>
      ) : (
        <p className="ov-diag__empty">{data.statusLabel}</p>
      )}
    </div>
  )
}

export function LaborOverviewCard({ data, onOpenLabor, ekg, eeg, imaging }: LaborOverviewCardProps) {
  const { t } = useTranslation()
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
    data.recentAbnormal.length > 0

  return (
    <OverviewCard
      title="Labor"
      className="ov-col-12"
      badge={badge}
      action={{ label: 'Zum Labor', onClick: onOpenLabor }}
    >
      <div className="ov-labor__split">
        <div className="ov-labor__col ov-labor__col--labs">
          {!data.hasLabData ? (
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
        </div>

        <div className="ov-labor__col ov-labor__col--diagnostics">
          <p className="ov-subhead">{t('overviewLaborDiagnosticsTitle')}</p>
          <DiagnosticMini title={t('overviewLaborDiagEeg')} data={eeg} />
          <DiagnosticMini title={t('overviewLaborDiagEkg')} data={ekg} />
          <DiagnosticMini title={t('overviewLaborDiagImaging')} data={imaging} />
        </div>
      </div>
    </OverviewCard>
  )
}
