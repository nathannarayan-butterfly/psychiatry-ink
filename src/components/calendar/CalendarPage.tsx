import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Printer,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { usePrivacySettings } from '../../hooks/usePrivacySettings'
import { isListedPatientCase, useCaseRegistry } from '../../hooks/useCaseRegistry'
import { NOTION_PAGES } from '../notion/notionPages'
import { useCalendar } from '../../hooks/useCalendar'
import type { CalendarItem, CalendarViewMode } from '../../types/calendar'
import {
  addDays,
  CALENDAR_STATUS_LABELS,
  CALENDAR_TYPE_LABELS,
  CALENDAR_VIEW_LABELS,
  endOfDayIso,
  formatCalendarDate,
  formatCalendarTime,
  isSameDay,
  startOfDayIso,
  startOfWeek,
  statusDotClass,
} from '../../utils/calendarLabels'
import { printDaySchedule } from '../../utils/calendar/printDaySchedule'
import { CalendarItemModal, CalendarRescheduleModal } from './CalendarItemModal'
import { ClinicalLoading } from '../ui/ClinicalLoading'

interface CalendarPageProps {
  onBack: () => void
  onOpenCase?: (caseId: string, appointmentId?: string) => void
}

function resolvePatientName(cases: ReturnType<typeof useCaseRegistry>['cases'], caseId?: string): string {
  if (!caseId) return '—'
  const match = cases.find((c) => c.caseId === caseId)
  return match?.displayTitle ?? caseId.slice(0, 8)
}

export function CalendarPage({ onBack, onOpenCase }: CalendarPageProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<CalendarItem | null>(null)
  const [rescheduleItem, setRescheduleItem] = useState<CalendarItem | null>(null)
  const [printIncludeNotes, setPrintIncludeNotes] = useState(false)

  const range = useMemo(() => {
    if (viewMode === 'day') {
      return { from: startOfDayIso(anchorDate), to: endOfDayIso(anchorDate) }
    }
    if (viewMode === 'week') {
      const weekStart = startOfWeek(anchorDate)
      const weekEnd = addDays(weekStart, 6)
      return { from: startOfDayIso(weekStart), to: endOfDayIso(weekEnd) }
    }
    if (viewMode === 'month') {
      const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
      const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0)
      return { from: startOfDayIso(monthStart), to: endOfDayIso(monthEnd) }
    }
    const listStart = addDays(anchorDate, -14)
    const listEnd = addDays(anchorDate, 30)
    return { from: startOfDayIso(listStart), to: endOfDayIso(listEnd) }
  }, [anchorDate, viewMode])

  const { items, loading, error, create, update, reschedule, complete, cancel } = useCalendar(range)
  const privacy = usePrivacySettings()
  const { t } = useTranslation()
  const documentTypeLabel = useCallback(
    (typeId: string | undefined) => {
      if (!typeId) return ''
      const page = NOTION_PAGES.find((item) => item.documentTypeId === typeId)
      return page ? t(page.labelKey) : typeId
    },
    [t],
  )
  const registry = useCaseRegistry({
    tier: privacy.tier,
    countryCode: privacy.countryCode,
    documentTypeLabel,
    fallbackTitle: (id) => t('dashboardCaseFallback').replace('{id}', id),
  })
  const patientCases = useMemo(() => registry.cases.filter(isListedPatientCase), [registry.cases])

  const dayItems = useMemo(
    () => items.filter((item) => isSameDay(new Date(item.startTime), anchorDate)),
    [items, anchorDate],
  )

  const handlePrintDay = useCallback(() => {
    printDaySchedule(dayItems, anchorDate, {
      includeNotes: printIncludeNotes,
      resolvePatientName: (caseId) => resolvePatientName(patientCases, caseId),
    })
  }, [anchorDate, dayItems, patientCases, printIncludeNotes])

  const shiftAnchor = useCallback(
    (delta: number) => {
      setAnchorDate((prev) => {
        const next = new Date(prev)
        if (viewMode === 'day') next.setDate(next.getDate() + delta)
        else if (viewMode === 'week') next.setDate(next.getDate() + delta * 7)
        else if (viewMode === 'month') next.setMonth(next.getMonth() + delta)
        else next.setDate(next.getDate() + delta * 7)
        return next
      })
    },
    [viewMode],
  )

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [anchorDate])

  const monthCells = useMemo(() => {
    const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    const start = startOfWeek(first)
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [anchorDate])

  const renderItemActions = (item: CalendarItem) => (
    <div className="calendar-item-actions">
      {item.caseId && onOpenCase ? (
        <button type="button" className="calendar-btn calendar-btn--xs" onClick={() => onOpenCase(item.caseId!, item.id)}>
          Fall öffnen
        </button>
      ) : null}
      <button type="button" className="calendar-btn calendar-btn--xs" onClick={() => { setEditItem(item); setModalOpen(true) }}>
        Bearbeiten
      </button>
      <button type="button" className="calendar-btn calendar-btn--xs" onClick={() => setRescheduleItem(item)}>
        Verschieben
      </button>
      {item.status !== 'completed' && item.status !== 'cancelled' ? (
        <>
          <button type="button" className="calendar-btn calendar-btn--xs" onClick={() => void complete(item.id)}>
            Abschließen
          </button>
          <button type="button" className="calendar-btn calendar-btn--xs calendar-btn--danger" onClick={() => void cancel(item.id)}>
            Stornieren
          </button>
        </>
      ) : null}
    </div>
  )

  const renderItemRow = (item: CalendarItem) => (
    <li key={item.id} className={`calendar-list-row calendar-list-row--${item.status}`}>
      <span className={`calendar-status-dot ${statusDotClass(item.status)}`} aria-hidden />
      <span className="calendar-list-row__time">{formatCalendarTime(item.startTime)}</span>
      <span className="calendar-list-row__title">{item.title}</span>
      <span className="calendar-list-row__meta">
        {CALENDAR_TYPE_LABELS[item.type]}
        {item.caseId ? ` · ${resolvePatientName(patientCases, item.caseId)}` : ''}
      </span>
      <span className="calendar-list-row__status">{CALENDAR_STATUS_LABELS[item.status]}</span>
      {renderItemActions(item)}
    </li>
  )

  return (
    <div className="calendar-page text-ink">
      <header className="calendar-page__header">
        <button type="button" className="clinical-back-link" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Dashboard
        </button>
        <h1 className="calendar-page__title">Kalender</h1>
        <button type="button" className="calendar-btn calendar-btn--primary" onClick={() => { setEditItem(null); setModalOpen(true) }}>
          <Plus className="h-4 w-4" aria-hidden />
          Termin
        </button>
      </header>

      <div className="calendar-toolbar">
        <div className="calendar-view-toggle" role="group" aria-label="Ansicht">
          {(Object.keys(CALENDAR_VIEW_LABELS) as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`calendar-view-toggle__btn${viewMode === mode ? ' calendar-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
            >
              {CALENDAR_VIEW_LABELS[mode]}
            </button>
          ))}
        </div>
        <div className="calendar-nav">
          <button type="button" className="calendar-nav__btn" onClick={() => shiftAnchor(-1)} aria-label="Zurück">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="calendar-nav__label">{formatCalendarDate(anchorDate.toISOString())}</span>
          <button type="button" className="calendar-nav__btn" onClick={() => shiftAnchor(1)} aria-label="Weiter">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" className="calendar-btn calendar-btn--ghost calendar-btn--xs" onClick={() => setAnchorDate(new Date())}>
            Heute
          </button>
          {(viewMode === 'day' || viewMode === 'list') && !loading ? (
            <>
              <label className="calendar-print-notes-toggle">
                <input
                  type="checkbox"
                  checked={printIncludeNotes}
                  onChange={(event) => setPrintIncludeNotes(event.target.checked)}
                />
                Notizen
              </label>
              <button
                type="button"
                className="calendar-btn calendar-btn--ghost calendar-btn--xs"
                onClick={handlePrintDay}
                disabled={dayItems.length === 0}
              >
                <Printer className="h-3.5 w-3.5" aria-hidden />
                Drucken
              </button>
            </>
          ) : null}
        </div>
      </div>

      {loading ? <ClinicalLoading variant="compact" label="Kalender wird geladen…" /> : null}
      {error ? <p className="calendar-page__error" role="alert">{error}</p> : null}

      {!loading && viewMode === 'day' ? (
        <ul className="calendar-list">{dayItems.map(renderItemRow)}</ul>
      ) : null}

      {!loading && viewMode === 'list' ? (
        <ul className="calendar-list">{items.map(renderItemRow)}</ul>
      ) : null}

      {!loading && viewMode === 'week' ? (
        <div className="calendar-week-grid">
          {weekDays.map((day) => {
            const dayItems = items.filter((i) => isSameDay(new Date(i.startTime), day))
            return (
              <div key={day.toISOString()} className={`calendar-week-col${isSameDay(day, new Date()) ? ' calendar-week-col--today' : ''}`}>
                <div className="calendar-week-col__head">{formatCalendarDate(day.toISOString())}</div>
                <ul className="calendar-week-col__list">
                  {dayItems.map((item) => (
                    <li key={item.id} className={`calendar-week-chip calendar-week-chip--${item.status}`}>
                      <span className={`calendar-status-dot ${statusDotClass(item.status)}`} />
                      <span className="calendar-week-chip__time">{formatCalendarTime(item.startTime)}</span>
                      <span className="calendar-week-chip__title">{item.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      ) : null}

      {!loading && viewMode === 'month' ? (
        <div className="calendar-month-grid">
          {monthCells.map((day) => {
            const dayItems = items.filter((i) => isSameDay(new Date(i.startTime), day))
            const inMonth = day.getMonth() === anchorDate.getMonth()
            return (
              <div
                key={day.toISOString()}
                className={[
                  'calendar-month-cell',
                  inMonth ? '' : 'calendar-month-cell--outside',
                  isSameDay(day, new Date()) ? 'calendar-month-cell--today' : '',
                ].join(' ').trim()}
              >
                <span className="calendar-month-cell__day">{day.getDate()}</span>
                {dayItems.slice(0, 3).map((item) => (
                  <span key={item.id} className="calendar-month-cell__event">
                    <span className={`calendar-status-dot ${statusDotClass(item.status)}`} />
                    {formatCalendarTime(item.startTime)} {item.title}
                  </span>
                ))}
                {dayItems.length > 3 ? (
                  <span className="calendar-month-cell__more">+{dayItems.length - 3}</span>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      <CalendarItemModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null) }}
        cases={patientCases}
        initial={editItem}
        defaultStart={anchorDate}
        onSave={async (input) => {
          if (editItem?.id) await update(editItem.id, input)
          else await create(input)
        }}
      />

      <CalendarRescheduleModal
        open={Boolean(rescheduleItem)}
        item={rescheduleItem}
        onClose={() => setRescheduleItem(null)}
        onReschedule={async (start, end, reason) => {
          if (!rescheduleItem) return
          await reschedule(rescheduleItem.id, { startTime: start, endTime: end, reason })
        }}
      />
    </div>
  )
}
