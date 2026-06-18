import { CalendarClock } from 'lucide-react'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { CalendarItem } from '../../../types/calendar'
import { formatAppointmentRowLabel } from '../../../hooks/useOverviewCollaboration'

interface AppointmentsCardProps {
  upcoming: CalendarItem[]
  loading: boolean
}

export function AppointmentsCard({ upcoming, loading }: AppointmentsCardProps) {
  const shown = upcoming.slice(0, 4)

  return (
    <OverviewCard
      title="Termine"
      icon={<CalendarClock size={15} />}
      className="ov-col-6"
    >
      {loading ? (
        <OverviewEmpty>Termine werden geladen…</OverviewEmpty>
      ) : shown.length === 0 ? (
        <OverviewEmpty>Keine anstehenden Termine.</OverviewEmpty>
      ) : (
        <ul className="ov-feed">
          {shown.map((item) => {
            const { dateLabel, timeLabel } = formatAppointmentRowLabel(item.startTime)
            return (
              <li key={item.id} className="ov-feed__item">
                <div className="ov-feed__head">
                  <span className="ov-feed__date">
                    {dateLabel} · {timeLabel}
                  </span>
                </div>
                <p className="ov-feed__text">{item.title}</p>
              </li>
            )
          })}
        </ul>
      )}
    </OverviewCard>
  )
}
