import { Users } from 'lucide-react'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { KonsileTasksData } from './types'
import type { SemanticTone } from './OverviewCard'

interface CollaborationCardProps {
  data: KonsileTasksData
  onOpenDiscuss: () => void
  onOpenKonsil: () => void
}

function CollabRow({
  title,
  statusLabel,
  tone,
}: {
  title: string
  statusLabel: string
  tone: SemanticTone
}) {
  return (
    <li className="ov-feed__item">
      <div className="ov-feed__head">
        <span className="ov-feed__date">{title}</span>
        <span className={`ov-pill ov-pill--${tone}`}>{statusLabel}</span>
      </div>
    </li>
  )
}

export function CollaborationCard({ data, onOpenDiscuss, onOpenKonsil }: CollaborationCardProps) {
  const hasDiscuss = data.discussions.length > 0
  const hasKonsil = data.konsile.length > 0
  const hasAny = hasDiscuss || hasKonsil

  return (
    <OverviewCard
      title="Discuss & Konsil"
      icon={<Users size={15} />}
      className="ov-col-6"
      action={
        hasDiscuss
          ? { label: 'Zu Discuss', onClick: onOpenDiscuss }
          : hasKonsil
            ? { label: 'Zu Konsil', onClick: onOpenKonsil }
            : undefined
      }
    >
      {data.loading ? (
        <OverviewEmpty>Wird geladen…</OverviewEmpty>
      ) : !hasAny ? (
        <OverviewEmpty>Keine Besprechungen oder Konsile.</OverviewEmpty>
      ) : (
        <>
          {hasDiscuss ? (
            <>
              <p className="ov-subhead">Discuss</p>
              <ul className="ov-feed">
                {data.discussions.map((item) => (
                  <CollabRow key={item.id} title={item.title} statusLabel={item.statusLabel} tone={item.tone} />
                ))}
              </ul>
            </>
          ) : null}
          {hasKonsil ? (
            <>
              <p className="ov-subhead">Konsil</p>
              <ul className="ov-feed">
                {data.konsile.map((item) => (
                  <CollabRow key={item.id} title={item.title} statusLabel={item.statusLabel} tone={item.tone} />
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </OverviewCard>
  )
}
