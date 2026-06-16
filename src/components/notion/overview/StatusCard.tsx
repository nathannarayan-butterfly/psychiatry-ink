import { CalendarClock } from 'lucide-react'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { PatientStatusData } from './types'

interface StatusCardProps {
  data: PatientStatusData
  onOpenCalendar?: () => void
}

/** Compact clinical status line: setting/phase/last contact + next appointment. */
export function StatusCard({ data, onOpenCalendar }: StatusCardProps) {
  const { entries, nextAppointment, appointmentsLoading } = data
  const hasContent = entries.length > 0 || nextAppointment !== null

  return (
    <OverviewCard
      title="Status & Termine"
      icon={<CalendarClock size={15} />}
      className="ov-col-3"
      action={onOpenCalendar ? { label: 'Kalender', onClick: onOpenCalendar } : undefined}
    >
      {!hasContent && !appointmentsLoading ? (
        <OverviewEmpty>Keine Status- oder Termindaten hinterlegt.</OverviewEmpty>
      ) : null}

      {nextAppointment ? (
        <div className="ov-risk">
          <span className="ov-risk__label">Nächster Termin</span>
          <span className="ov-risk__detail">
            {nextAppointment.title}
            {nextAppointment.relativeLabel ? (
              <>
                {' '}
                <span className="ov-feed__source">
                  {nextAppointment.dateLabel} · {nextAppointment.relativeLabel}
                </span>
              </>
            ) : (
              <>
                {' '}
                <span className="ov-feed__source">{nextAppointment.dateLabel}</span>
              </>
            )}
          </span>
        </div>
      ) : null}

      {entries.length > 0 ? (
        <div className="ov-list">
          {entries.map((entry) => (
            <div key={entry.id} className="ov-kv">
              <span className="ov-kv__label">{entry.label}</span>
              <span
                className={`ov-kv__value ${entry.emphasis ? 'ov-kv__value--emphasis' : ''}`.trim()}
              >
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </OverviewCard>
  )
}
