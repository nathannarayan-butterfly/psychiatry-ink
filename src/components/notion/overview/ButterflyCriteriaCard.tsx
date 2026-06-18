import { Sparkles } from 'lucide-react'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { ButterflySummaryItem } from '../../../utils/overview/butterflySummary'

interface ButterflyCriteriaCardProps {
  items: ButterflySummaryItem[]
  onOpenDiagnose: () => void
}

const VERDICT_LABEL: Record<ButterflySummaryItem['verdict'], string> = {
  criteria_met: 'Kriterien erfüllt',
  not_met: 'Kriterien nicht erfüllt',
  insufficient_data: 'Daten unvollständig',
  unavailable: 'Keine Kriterien',
}

export function ButterflyCriteriaCard({ items, onOpenDiagnose }: ButterflyCriteriaCardProps) {
  const openCount = items.reduce((sum, item) => sum + item.openCriteriaCount, 0)
  const badge =
    openCount > 0 ? { label: `${openCount} offen`, tone: 'info' as const } : undefined

  return (
    <OverviewCard
      title="Butterfly-Kriterien"
      icon={<Sparkles size={15} />}
      className="ov-col-6"
      badge={badge}
      action={{ label: 'Zur Diagnose', onClick: onOpenDiagnose }}
    >
      {items.length === 0 ? (
        <OverviewEmpty>Keine Diagnosen mit Kriterienunterstützung.</OverviewEmpty>
      ) : (
        <ul className="ov-feed">
          {items.map((item) => (
            <li key={item.id} className="ov-feed__item">
              <div className="ov-feed__head">
                <span className="ov-feed__date">
                  {item.code ? `${item.code} · ` : ''}
                  {item.label}
                </span>
                <span className={`ov-pill ov-pill--${item.tone}`}>
                  {VERDICT_LABEL[item.verdict]}
                </span>
              </div>
              {item.headline ? <p className="ov-feed__text">{item.headline}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  )
}
