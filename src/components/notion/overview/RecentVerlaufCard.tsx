import { ScrollText } from 'lucide-react'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { RecentVerlaufItem } from './types'

interface RecentVerlaufCardProps {
  items: RecentVerlaufItem[]
  onOpenVerlauf: () => void
}

/** Last few course entries (left-aligned), linking to the full Verlauf feed. */
export function RecentVerlaufCard({ items, onOpenVerlauf }: RecentVerlaufCardProps) {
  return (
    <OverviewCard
      title="Letzter Verlauf"
      icon={<ScrollText size={15} />}
      className="ov-col-7"
      action={{ label: 'Verlauf', onClick: onOpenVerlauf }}
    >
      {items.length === 0 ? (
        <OverviewEmpty>Noch keine Verlaufseinträge.</OverviewEmpty>
      ) : (
        <ul className="ov-feed">
          {items.map((item) => (
            <li key={item.id} className="ov-feed__item">
              <div className="ov-feed__head">
                <span className="ov-feed__date">{item.dateLabel}</span>
                {item.sourceLabel ? (
                  <span className="ov-feed__source">{item.sourceLabel}</span>
                ) : null}
              </div>
              <span className="ov-feed__text">{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  )
}
