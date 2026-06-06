import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../context/TranslationContext'
import type { UiLanguage } from '../types/settings'

function localeForLanguage(language: UiLanguage): string {
  return language === 'en' ? 'en-GB' : 'de-DE'
}

/** ISO 8601 calendar week (Kalenderwoche). */
function getISOWeek(date: Date): number {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

interface PanelDateCardProps {
  /** When set, display is fixed to this instant (no live clock). */
  date?: Date
  /** Sidebar layout: content-sized card without bottom-panel stretch behavior. */
  layout?: 'panel' | 'sidebar' | 'vertical'
}

export function PanelDateCard({ date, layout = 'panel' }: PanelDateCardProps) {
  const { language, t } = useTranslation()
  const [now, setNow] = useState(() => date ?? new Date())

  useEffect(() => {
    if (date) {
      setNow(date)
      return
    }

    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [date])

  const parts = useMemo(() => {
    const locale = localeForLanguage(language)
    const dayNumber = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(now)
    const month = new Intl.DateTimeFormat(locale, { month: 'short' })
      .format(now)
      .replace(/\.$/, '')
      .toUpperCase()
    const time = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(now)
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now)
    const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: 'short' })
      .format(now)
      .replace(/\.$/, '')
      .toUpperCase()
    const week = getISOWeek(now)

    return { dayNumber, month, time, weekday, weekdayShort, week }
  }, [now, language])

  const isSidebar = layout === 'sidebar'

  if (layout === 'vertical') {
    return (
      <div
        className="panel-date-card panel-date-card--vertical"
        aria-label={`${parts.weekday}, ${parts.dayNumber} ${parts.month}, ${parts.time}, ${t('calendarWeek')} ${parts.week}`}
      >
        <span className="panel-date-card__vertical-line">{parts.weekdayShort}</span>
        <span className="panel-date-card__vertical-line panel-date-card__vertical-line--day">
          {parts.dayNumber}
        </span>
        <span className="panel-date-card__vertical-line">{parts.month}</span>
        <span className="panel-date-card__vertical-line panel-date-card__vertical-line--time">
          {parts.time}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`panel-date-card workspace-float-block flex flex-col justify-between px-1.5 py-1.5 text-center sm:px-2 sm:py-2 ${
        isSidebar
          ? 'panel-date-card--sidebar w-full shrink-0'
          : 'w-[var(--bottom-panel-calendar-width)] shrink-0 self-stretch'
      }`}
      aria-label={`${parts.weekday}, ${parts.dayNumber} ${parts.month}, ${parts.time}, ${t('calendarWeek')} ${parts.week}`}
    >
      <div
        className={`panel-date-card__primary flex flex-col items-center justify-center leading-none ${
          isSidebar ? 'shrink-0' : 'min-h-0 flex-1'
        }`}
      >
        <div className="flex items-baseline gap-1">
          <span className="panel-date-card__day tabular-nums text-ink">{parts.dayNumber}</span>
          <span className="panel-date-card__month font-semibold uppercase tracking-wide text-ink">
            {parts.month}
          </span>
        </div>
      </div>

      <div className="panel-date-card__meta flex shrink-0 flex-col items-center gap-0.5">
        <p className="panel-date-card__time tabular-nums leading-none text-ink">{parts.time}</p>
        <p className="panel-date-card__weekday max-w-full truncate text-[9px] leading-tight text-secondary sm:text-[10px]">
          {parts.weekday}
        </p>
        <p className="panel-date-card__week text-[8px] font-medium tabular-nums uppercase tracking-wider text-muted sm:text-[9px]">
          {t('calendarWeek')} {parts.week}
        </p>
      </div>
    </div>
  )
}
