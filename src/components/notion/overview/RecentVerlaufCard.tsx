import { History } from 'lucide-react'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { RecentVerlaufItem } from './types'

interface RecentVerlaufCardProps {
  items: RecentVerlaufItem[]
  onOpenVerlauf: () => void
}

export function RecentVerlaufCard({ items, onOpenVerlauf }: RecentVerlaufCardProps) {
  return (
    <OverviewCard
      title="Verlauf"
      icon={<History size={15} />}
      className="ov-col-6"
      action={{ label: 'Zum Verlauf', onClick: onOpenVerlauf }}
    >
      {items.length === 0 ? (
        <OverviewEmpty>Keine Verlaufseinträge vorhanden.</OverviewEmpty>
      ) : (
        <ul className="ov-feed">
          {items.map((item) => (
            <li key={item.id} className="ov-feed__item">
              <div className="ov-feed__head">
                <span className="ov-feed__date">{item.dateLabel}</span>
                {item.sourceLabel ? (
                  <span className="ov-feed__tag">{item.sourceLabel}</span>
                ) : null}
              </div>
              <p className="ov-feed__text">{item.text}</p>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  )
}
