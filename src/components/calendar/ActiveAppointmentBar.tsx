import {
  CalendarPlus,
  ClipboardList,
  FlaskConical,
  Phone,
  Pill,
  StickyNote,
} from 'lucide-react'
import type { CalendarItem, CalendarItemType, CreateCalendarItemInput } from '../../types/calendar'
import {
  CALENDAR_STATUS_LABELS,
  CALENDAR_TYPE_LABELS,
  formatCalendarTime,
  statusDotClass,
} from '../../utils/calendarLabels'
import type { NotionPageId } from '../notion/notionPages'

interface ActiveAppointmentBarProps {
  appointment: CalendarItem
  onNavigateTab?: (tab: 'verlauf' | 'labor' | 'therapie' | 'workspace', page?: NotionPageId) => void
  onCreateFollowUp?: (prefill: Partial<CreateCalendarItemInput>) => void
  onAddNote?: (notes: string) => void
  onComplete?: () => void
  onCompleteAndNext?: () => void
}

function defaultEndFromStart(startIso: string): string {
  const end = new Date(startIso)
  end.setMinutes(end.getMinutes() + 30)
  return end.toISOString()
}

export function ActiveAppointmentBar({
  appointment,
  onNavigateTab,
  onCreateFollowUp,
  onAddNote,
  onComplete,
  onCompleteAndNext,
}: ActiveAppointmentBarProps) {
  const planType = (type: CalendarItemType, title: string): Partial<CreateCalendarItemInput> => ({
    type,
    title,
    caseId: appointment.caseId,
    startTime: defaultEndFromStart(appointment.endTime),
    endTime: defaultEndFromStart(defaultEndFromStart(appointment.endTime)),
    reason: appointment.reason,
  })

  return (
    <div className="active-appointment-bar" role="region" aria-label="Aktiver Termin">
      <div className="active-appointment-bar__main">
        <span className={`calendar-status-dot ${statusDotClass(appointment.status)}`} aria-hidden />
        <span className="active-appointment-bar__time">
          {formatCalendarTime(appointment.startTime)} – {formatCalendarTime(appointment.endTime)}
        </span>
        <span className="active-appointment-bar__type">{CALENDAR_TYPE_LABELS[appointment.type]}</span>
        {appointment.reason ? (
          <span className="active-appointment-bar__reason">{appointment.reason}</span>
        ) : null}
        <span className="active-appointment-bar__status">{CALENDAR_STATUS_LABELS[appointment.status]}</span>
      </div>

      <div className="active-appointment-bar__actions">
        <button type="button" className="active-appointment-bar__action" onClick={() => onNavigateTab?.('verlauf')}>
          <ClipboardList className="h-3.5 w-3.5" aria-hidden />
          Verlauf-Eintrag
        </button>
        <button
          type="button"
          className="active-appointment-bar__action"
          onClick={() => onCreateFollowUp?.(planType('follow_up', 'Folgetermin'))}
        >
          <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
          Folgetermin
        </button>
        <button
          type="button"
          className="active-appointment-bar__action"
          onClick={() => onCreateFollowUp?.(planType('lab_test', 'Laboruntersuchung'))}
        >
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />
          Labor planen
        </button>
        <button
          type="button"
          className="active-appointment-bar__action"
          onClick={() => onCreateFollowUp?.(planType('phone_call', 'Telefonat'))}
        >
          <Phone className="h-3.5 w-3.5" aria-hidden />
          Telefonat
        </button>
        <button
          type="button"
          className="active-appointment-bar__action"
          onClick={() => onNavigateTab?.('workspace', 'medikation')}
        >
          <Pill className="h-3.5 w-3.5" aria-hidden />
          Medikationsreview
        </button>
        <button
          type="button"
          className="active-appointment-bar__action"
          onClick={() => {
            const note = window.prompt('Terminnotiz:', appointment.notes ?? '')
            if (note != null) onAddNote?.(note)
          }}
        >
          <StickyNote className="h-3.5 w-3.5" aria-hidden />
          Notiz
        </button>
        {onComplete ? (
          <button type="button" className="calendar-btn calendar-btn--xs" onClick={onComplete}>
            Abschließen
          </button>
        ) : null}
        {onCompleteAndNext ? (
          <button type="button" className="calendar-btn calendar-btn--xs calendar-btn--accent" onClick={onCompleteAndNext}>
            Nächster Patient
          </button>
        ) : null}
      </div>
    </div>
  )
}
