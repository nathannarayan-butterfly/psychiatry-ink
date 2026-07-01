import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Printer,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { usePrivacySettings } from '../../hooks/usePrivacySettings'
import { isListedPatientCase, useCaseRegistry } from '../../hooks/useCaseRegistry'
import { NOTION_PAGES } from '../notion/notionPages'
import { useCalendar } from '../../hooks/useCalendar'
import type { CalendarItem, CalendarViewMode } from '../../types/calendar'
import {
  addDays,
  addMonths,
  CALENDAR_STATUS_LABELS,
  CALENDAR_TYPE_LABELS,
  endOfDayIso,
  formatCalendarDate,
  formatCalendarTime,
  formatMonthYear,
  getWeekdayLabels,
  isSameDay,
  localeForUiLanguage,
  startOfDayIso,
  startOfWeek,
  statusDotClass,
  typeAccentClass,
} from '../../utils/calendarLabels'
import { printDaySchedule } from '../../utils/calendar/printDaySchedule'
import { CalendarItemModal, CalendarRescheduleModal } from './CalendarItemModal'
import { CalendarMonthGrid } from './CalendarMonthGrid'
import { CalendarSidePanels } from './CalendarSidePanels'
import type { NewPatientData } from '../dashboard/NewPatientDialog'
import { ClinicalLoading } from '../ui/ClinicalLoading'

interface CalendarPageProps {
  onBack: () => void
  onOpenCase?: (caseId: string, appointmentId?: string) => void
}

const VIEW_MODE_KEYS: Record<CalendarViewMode, 'calendarViewDay' | 'calendarViewWeek' | 'calendarViewMonth' | 'calendarViewList'> = {
  day: 'calendarViewDay',
  week: 'calendarViewWeek',
  month: 'calendarViewMonth',
  list: 'calendarViewList',
}

function resolvePatientName(cases: ReturnType<typeof useCaseRegistry>['cases'], caseId?: string): string {
  if (!caseId) return '—'
  const match = cases.find((c) => c.caseId === caseId)
  return match?.displayTitle ?? caseId.slice(0, 8)
}

export function CalendarPage({ onBack, onOpenCase }: CalendarPageProps) {
  const today = new Date()
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<CalendarItem | null>(null)
  const [rescheduleItem, setRescheduleItem] = useState<CalendarItem | null>(null)
  const [printIncludeNotes, setPrintIncludeNotes] = useState(false)

  const { language, t } = useTranslation()
  const locale = localeForUiLanguage(language)
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale])

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
      const prevMonthStart = addMonths(anchorDate, -1)
      const nextMonthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 2, 0)
      return { from: startOfDayIso(prevMonthStart), to: endOfDayIso(nextMonthEnd) }
    }
    const listStart = addDays(anchorDate, -14)
    const listEnd = addDays(anchorDate, 30)
    return { from: startOfDayIso(listStart), to: endOfDayIso(listEnd) }
  }, [anchorDate, viewMode])

  const { items, loading, error, create, update, reschedule, complete, cancel } = useCalendar(range)
  const privacy = usePrivacySettings()
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
    caseFileCloudSync: privacy.caseFileCloudSync,
    documentTypeLabel,
    fallbackTitle: (id) => t('dashboardCaseFallback').replace('{id}', id),
  })
  const patientCases = useMemo(() => registry.cases.filter(isListedPatientCase), [registry.cases])

  const handleCreatePatientForCalendar = useCallback(
    async (patient: NewPatientData) => {
      const newCaseId = registry.addCase()
      if (patient.name || patient.vorname || patient.nachname || patient.geburtsdatum || patient.geschlecht) {
        registry.upsertCaseMeta(newCaseId, {
          localName: patient.name || undefined,
          localVorname: patient.vorname || undefined,
          localNachname: patient.nachname || undefined,
          localGeburtsdatum: patient.geburtsdatum || undefined,
          localGeschlecht: patient.geschlecht || undefined,
        })
      }
      await registry.refresh()
      return newCaseId
    },
    [registry],
  )

  const dayItems = useMemo(
    () => items.filter((item) => isSameDay(new Date(item.startTime), anchorDate)),
    [items, anchorDate],
  )

  const selectedDayItems = useMemo(
    () => items.filter((item) => isSameDay(new Date(item.startTime), selectedDay)),
    [items, selectedDay],
  )

  const handlePrintDay = useCallback(() => {
    const printItems = viewMode === 'month' ? selectedDayItems : dayItems
    const printDate = viewMode === 'month' ? selectedDay : anchorDate
    printDaySchedule(printItems, printDate, {
      includeNotes: printIncludeNotes,
      resolvePatientName: (caseId) => resolvePatientName(patientCases, caseId),
    })
  }, [anchorDate, dayItems, patientCases, printIncludeNotes, selectedDay, selectedDayItems, viewMode])

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

  const handleSelectDay = useCallback((day: Date) => {
    setSelectedDay(day)
    setAnchorDate((prev) => {
      if (day.getMonth() === prev.getMonth() && day.getFullYear() === prev.getFullYear()) return prev
      return new Date(day.getFullYear(), day.getMonth(), 1)
    })
  }, [])

  const goToToday = useCallback(() => {
    const now = new Date()
    setAnchorDate(now)
    setSelectedDay(now)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (modalOpen || rescheduleItem) return
      const target = event.target
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      let delta = 0
      if (event.key === 'ArrowLeft') delta = -1
      else if (event.key === 'ArrowRight') delta = 1
      else if (event.key === 'ArrowUp') delta = -7
      else if (event.key === 'ArrowDown') delta = 7
      else return
      event.preventDefault()
      setSelectedDay((prev) => {
        const next = addDays(prev, delta)
        setAnchorDate((anchor) => {
          if (next.getMonth() === anchor.getMonth() && next.getFullYear() === anchor.getFullYear()) return anchor
          return new Date(next.getFullYear(), next.getMonth(), 1)
        })
        return next
      })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, rescheduleItem])

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [anchorDate])

  const prevMonthAnchor = useMemo(() => addMonths(anchorDate, -1), [anchorDate])
  const nextMonthAnchor = useMemo(() => addMonths(anchorDate, 1), [anchorDate])

  const openQuickAdd = useCallback(() => {
    setEditItem(null)
    setModalOpen(true)
  }, [])

  const renderItemActions = (item: CalendarItem) => (
    <div className="calendar-item-actions">
      {item.caseId && onOpenCase ? (
        <button type="button" className="calendar-btn calendar-btn--xs" onClick={() => onOpenCase(item.caseId!, item.id)}>
          {t('calendarOpenCase')}
        </button>
      ) : null}
      <button type="button" className="calendar-btn calendar-btn--xs" onClick={() => { setEditItem(item); setModalOpen(true) }}>
        {t('calendarEdit')}
      </button>
      <button type="button" className="calendar-btn calendar-btn--xs" onClick={() => setRescheduleItem(item)}>
        {t('calendarReschedule')}
      </button>
      {item.status !== 'completed' && item.status !== 'cancelled' ? (
        <>
          <button type="button" className="calendar-btn calendar-btn--xs" onClick={() => void complete(item.id)}>
            {t('calendarComplete')}
          </button>
          <button type="button" className="calendar-btn calendar-btn--xs calendar-btn--danger" onClick={() => void cancel(item.id)}>
            {t('calendarCancel')}
          </button>
        </>
      ) : null}
    </div>
  )

  const renderItemRow = (item: CalendarItem) => (
    <li key={item.id} className={`calendar-list-row calendar-list-row--${item.status} ${typeAccentClass(item.type)}`}>
      <span className={`calendar-status-dot ${statusDotClass(item.status)}`} aria-hidden />
      <span className="calendar-list-row__time">{formatCalendarTime(item.startTime)}</span>
      <span className="calendar-list-row__title">{item.title}</span>
      <span className="calendar-list-row__meta">
        <span className="calendar-type-badge">{CALENDAR_TYPE_LABELS[item.type]}</span>
        {item.caseId ? ` · ${resolvePatientName(patientCases, item.caseId)}` : ''}
      </span>
      <span className="calendar-list-row__status">{CALENDAR_STATUS_LABELS[item.status]}</span>
      {renderItemActions(item)}
    </li>
  )

  const monthTitle = formatMonthYear(anchorDate, locale)

  return (
    <div className="calendar-page cm-workspace text-ink">
      <header className="calendar-page__header">
        <button type="button" className="clinical-back-link" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Dashboard
        </button>
        <div className="cm-page-eyebrow calendar-page__eyebrow">
          <h1 className="cm-page-eyebrow__label">{t('calendarTitle')}</h1>
          <hr className="cm-page-eyebrow__rule" />
        </div>
        <button type="button" className="calendar-btn calendar-btn--primary" onClick={openQuickAdd}>
          <Plus className="h-4 w-4" aria-hidden />
          {t('calendarNewAppointment')}
        </button>
      </header>

      <div className="calendar-toolbar">
        <div className="calendar-view-toggle" role="group" aria-label={t('calendarViewLabel')}>
          {(Object.keys(VIEW_MODE_KEYS) as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`calendar-view-toggle__btn${viewMode === mode ? ' calendar-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
            >
              {t(VIEW_MODE_KEYS[mode])}
            </button>
          ))}
        </div>
        <div className="calendar-nav">
          <button type="button" className="calendar-nav__btn" onClick={() => shiftAnchor(-1)} aria-label={t('calendarNavBack')}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="calendar-nav__label">{viewMode === 'month' ? monthTitle : formatCalendarDate(anchorDate.toISOString())}</span>
          <button type="button" className="calendar-nav__btn" onClick={() => shiftAnchor(1)} aria-label={t('calendarNavForward')}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" className="calendar-btn calendar-btn--ghost calendar-btn--xs" onClick={goToToday}>
            {t('calendarToday')}
          </button>
          {(viewMode === 'day' || viewMode === 'list' || viewMode === 'month') && !loading ? (
            <>
              <label className="calendar-print-notes-toggle">
                <input
                  type="checkbox"
                  checked={printIncludeNotes}
                  onChange={(event) => setPrintIncludeNotes(event.target.checked)}
                />
                {t('calendarPrintNotes')}
              </label>
              <button
                type="button"
                className="calendar-btn calendar-btn--ghost calendar-btn--xs"
                onClick={handlePrintDay}
                disabled={(viewMode === 'month' ? selectedDayItems : dayItems).length === 0}
              >
                <Printer className="h-3.5 w-3.5" aria-hidden />
                {t('calendarPrint')}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {loading ? <ClinicalLoading variant="compact" label={t('calendarLoading')} /> : null}
      {error ? <p className="calendar-page__error" role="alert">{error}</p> : null}

      {!loading && viewMode === 'month' ? (
        <div className="calendar-layout">
          <aside className="calendar-layout__side calendar-layout__side--left" aria-label={t('calendarSidePanelsLabel')}>
            <CalendarMonthGrid
              monthAnchor={prevMonthAnchor}
              items={items}
              variant="mini"
              selectedDay={selectedDay}
              today={today}
              onSelectDay={handleSelectDay}
              weekdayLabels={weekdayLabels}
              monthLabel={formatMonthYear(prevMonthAnchor, locale)}
              ariaLabel={t('calendarPreviousMonth')}
            />
            <CalendarMonthGrid
              monthAnchor={nextMonthAnchor}
              items={items}
              variant="mini"
              selectedDay={selectedDay}
              today={today}
              onSelectDay={handleSelectDay}
              weekdayLabels={weekdayLabels}
              monthLabel={formatMonthYear(nextMonthAnchor, locale)}
              ariaLabel={t('calendarNextMonthLabel')}
            />
          </aside>

          <div className="calendar-layout__main">
            <CalendarMonthGrid
              monthAnchor={anchorDate}
              items={items}
              variant="main"
              selectedDay={selectedDay}
              today={today}
              onSelectDay={handleSelectDay}
              weekdayLabels={weekdayLabels}
              monthLabel={monthTitle}
              ariaLabel={monthTitle}
            />
          </div>

          <CalendarSidePanels
            items={items}
            selectedDay={selectedDay}
            today={today}
            cases={patientCases}
            onSelectDay={handleSelectDay}
            onQuickAdd={openQuickAdd}
            onOpenCase={onOpenCase}
          />
        </div>
      ) : null}

      {!loading && viewMode === 'day' ? (
        <ul className="calendar-list">{dayItems.map(renderItemRow)}</ul>
      ) : null}

      {!loading && viewMode === 'list' ? (
        <ul className="calendar-list">{items.map(renderItemRow)}</ul>
      ) : null}

      {!loading && viewMode === 'week' ? (
        <div className="calendar-week-grid">
          {weekDays.map((day) => {
            const colItems = items.filter((i) => isSameDay(new Date(i.startTime), day))
            return (
              <div key={day.toISOString()} className={`calendar-week-col${isSameDay(day, today) ? ' calendar-week-col--today' : ''}`}>
                <div className="calendar-week-col__head">{formatCalendarDate(day.toISOString())}</div>
                <ul className="calendar-week-col__list">
                  {colItems.map((item) => (
                    <li key={item.id} className={`calendar-week-chip calendar-week-chip--${item.status} ${typeAccentClass(item.type)}`}>
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

      <CalendarItemModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null) }}
        cases={patientCases}
        initial={editItem}
        defaultStart={selectedDay}
        onCreatePatient={handleCreatePatientForCalendar}
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
