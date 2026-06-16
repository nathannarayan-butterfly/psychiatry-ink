import { ClipboardList } from 'lucide-react'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { KonsileTasksData, KonsilCardItem } from './types'

interface KonsileTasksCardProps {
  data: KonsileTasksData
  onOpenKonsil?: () => void
}

function KonsilRow({ item }: { item: KonsilCardItem }) {
  return (
    <div className="ov-konsil">
      <span className="ov-konsil__title">{item.title}</span>
      <span className={`ov-pill ov-pill--${item.tone}`}>{item.statusLabel}</span>
    </div>
  )
}

/** Pending Konsile + case discussions + open social-work tasks. */
export function KonsileTasksCard({ data, onOpenKonsil }: KonsileTasksCardProps) {
  const total = data.konsile.length + data.discussions.length + data.tasks.length
  const hasContent = total > 0

  return (
    <OverviewCard
      title="Konsile & Aufgaben"
      icon={<ClipboardList size={15} />}
      className="ov-col-5"
      badge={hasContent ? { label: String(total) + ' offen', tone: 'info' } : undefined}
      action={onOpenKonsil ? { label: 'Konsile', onClick: onOpenKonsil } : undefined}
    >
      {data.loading ? <span className="ov-meta">Lädt…</span> : null}

      {!data.loading && !hasContent ? (
        <OverviewEmpty>Keine offenen Konsile oder Aufgaben.</OverviewEmpty>
      ) : null}

      {data.konsile.length > 0 ? (
        <>
          <p className="ov-subhead">Konsile</p>
          <div className="ov-list">
            {data.konsile.map((item) => (
              <KonsilRow key={item.id} item={item} />
            ))}
          </div>
        </>
      ) : null}

      {data.discussions.length > 0 ? (
        <>
          <p className="ov-subhead">Fallbesprechungen</p>
          <div className="ov-list">
            {data.discussions.map((item) => (
              <KonsilRow key={item.id} item={item} />
            ))}
          </div>
        </>
      ) : null}

      {data.tasks.length > 0 ? (
        <>
          <p className="ov-subhead">Offene Aufgaben</p>
          <ul className="ov-list">
            {data.tasks.map((task) => (
              <li key={task.id} className="ov-task">
                {task.text}
                {task.area ? <span className="ov-task__area">{task.area}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </OverviewCard>
  )
}
