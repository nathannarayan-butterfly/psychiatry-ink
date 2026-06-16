import { useEffect, useMemo, useState } from 'react'
import { getSiteZonedParts, nowSiteTime, SITE_TIMEZONE } from '../utils/siteTimezone'

interface AnalogClockProps {
  className?: string
  /** When set, display is fixed to this instant (no live clock). */
  date?: Date
}

function siteSecond(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SITE_TIMEZONE,
    second: 'numeric',
  }).formatToParts(date)
  return Number(parts.find((p) => p.type === 'second')?.value ?? 0)
}

function ClockHand({
  angle,
  className,
  x2,
  y2,
  y1 = 50,
}: {
  angle: number
  className: string
  x2: number
  y2: number
  y1?: number
}) {
  return (
    <g className={className} transform={`rotate(${angle} 50 50)`}>
      <line x1="50" y1={y1} x2={x2} y2={y2} />
    </g>
  )
}

export function AnalogClock({ className, date }: AnalogClockProps) {
  const [now, setNow] = useState(() => date ?? new Date())

  useEffect(() => {
    if (date) {
      setNow(date)
      return
    }

    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [date])

  const { hour, minute } = getSiteZonedParts(now)
  const second = siteSecond(now)
  const timeLabel = nowSiteTime(now)

  const angles = useMemo(() => {
    const secondAngle = (second / 60) * 360
    const minuteAngle = ((minute + second / 60) / 60) * 360
    const hourAngle = (((hour % 12) + minute / 60) / 12) * 360
    return { secondAngle, minuteAngle, hourAngle }
  }, [hour, minute, second])

  const ticks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const angle = index * 30 - 90
        const rad = (angle * Math.PI) / 180
        const major = index % 3 === 0
        const outer = 43
        const inner = 35
        return {
          key: index,
          major,
          x1: 50 + Math.cos(rad) * inner,
          y1: 50 + Math.sin(rad) * inner,
          x2: 50 + Math.cos(rad) * outer,
          y2: 50 + Math.sin(rad) * outer,
          dotX: 50 + Math.cos(rad) * 41,
          dotY: 50 + Math.sin(rad) * 41,
        }
      }),
    [],
  )

  return (
    <div
      className={['analog-clock', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={timeLabel}
    >
      <svg
        className="analog-clock__face"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <circle className="analog-clock__dial" cx="50" cy="50" r="45" />
        {ticks.map((tick) =>
          tick.major ? (
            <line
              key={tick.key}
              className="analog-clock__tick analog-clock__tick--major"
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
            />
          ) : (
            <circle
              key={tick.key}
              className="analog-clock__tick-dot"
              cx={tick.dotX}
              cy={tick.dotY}
              r={0.9}
            />
          ),
        )}
        <ClockHand
          angle={angles.hourAngle}
          className="analog-clock__hand analog-clock__hand--hour"
          x2={50}
          y2={31}
          y1={58}
        />
        <ClockHand
          angle={angles.minuteAngle}
          className="analog-clock__hand analog-clock__hand--minute"
          x2={50}
          y2={21}
          y1={60}
        />
        <g
          className="analog-clock__hand analog-clock__hand--second"
          transform={`rotate(${angles.secondAngle} 50 50)`}
        >
          <line x1="50" y1="62" x2="50" y2="16" />
          <circle className="analog-clock__second-weight" cx="50" cy="62" r="1.6" />
        </g>
        <circle className="analog-clock__hub" cx="50" cy="50" r="2.4" />
        <circle className="analog-clock__hub-ring" cx="50" cy="50" r="1" />
      </svg>
    </div>
  )
}
