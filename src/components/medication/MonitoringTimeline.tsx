import { useState } from 'react'
import { getDrugsForSubstance } from '../../data/psychDrugReference/index'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import type { MedicationEntry } from '../../types/medicationPlan'
import type { UiLanguage } from '../../types/settings'

// Fixed week checkpoints on the X-axis
const WEEK_CHECKPOINTS = [1, 2, 4, 8, 13, 26, 39, 52]

// Muted hue palette — one slot per parameter row (up to 8)
const PARAM_COLORS = [
  'hsl(210 45% 52%)',
  'hsl(152 38% 44%)',
  'hsl(27  55% 52%)',
  'hsl(280 35% 52%)',
  'hsl(355 40% 50%)',
  'hsl(195 42% 48%)',
  'hsl(45  50% 48%)',
  'hsl(330 38% 50%)',
]

/** Map a frequency string to the subset of WEEK_CHECKPOINTS where a check falls. */
function frequencyToWeeks(freq: string | undefined): number[] {
  if (!freq) return [13, 26, 39, 52] // default: quarterly

  const f = freq.toLowerCase()

  const isWeekly =
    (f.includes('wöchentlich') && !f.includes('zwei') && !f.includes('2')) ||
    f.includes('every week') ||
    f.includes('jede woche')

  if (isWeekly) return WEEK_CHECKPOINTS

  if (
    f.includes('zweiwöchentlich') ||
    f.includes('biweekly') ||
    f.includes('alle 2 wochen') ||
    f.includes('every 2 week')
  ) {
    return [2, 4, 8, 26, 52]
  }

  if (
    f.includes('monatlich') ||
    f.includes('monthly') ||
    f.includes('alle 4 wochen') ||
    f.includes('jeden monat') ||
    f.includes('every month')
  ) {
    return [4, 8, 13, 26, 39, 52]
  }

  if (
    f.includes('vierteljährlich') ||
    f.includes('quarterly') ||
    f.includes('alle 3 monate') ||
    f.includes('every 3 month') ||
    (f.includes('3') && f.includes('monat'))
  ) {
    return [13, 26, 39, 52]
  }

  if (
    f.includes('halbjährlich') ||
    f.includes('biannual') ||
    f.includes('alle 6 monate') ||
    f.includes('every 6 month') ||
    (f.includes('6') && f.includes('monat'))
  ) {
    return [26, 52]
  }

  if (
    f.includes('jährlich') ||
    f.includes('annual') ||
    f.includes('yearly') ||
    f.includes('every year') ||
    f.includes('once a year')
  ) {
    return [52]
  }

  if (
    f.includes('therapiebeginn') ||
    f.includes('bei beginn') ||
    f.includes('at start') ||
    f.includes('at initiation') ||
    f.includes('zu beginn') ||
    f.includes('einmalig') ||
    f.includes('once')
  ) {
    return [1]
  }

  const weekMatch = f.match(/alle\s+(\d+)\s+(?:woche|week)/)
  if (weekMatch) {
    const interval = parseInt(weekMatch[1]!, 10)
    return WEEK_CHECKPOINTS.filter((w) => w % interval === 0)
  }

  const monthMatch = f.match(/alle\s+(\d+)\s+(?:monat|month)|every\s+(\d+)\s+month/)
  if (monthMatch) {
    const months = parseInt(monthMatch[1] ?? monthMatch[2] ?? '3', 10)
    const weekInterval = months * 4
    return WEEK_CHECKPOINTS.filter((w) => w >= weekInterval && w % weekInterval === 0)
  }

  return [13, 26, 39, 52]
}

function unionWeeks(existing: number[], next: number[]): number[] {
  return [...new Set([...existing, ...next])].sort((a, b) => a - b)
}

interface TimelineRow {
  parameter: string
  label: string
  weeks: number[]
  color: string
  noteDe: string
  noteEn: string
}

interface MonitoringTimelineProps {
  medications: MedicationEntry[]
  language: UiLanguage
}

export function MonitoringTimeline({ medications, language }: MonitoringTimelineProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  const activeMeds = medications.filter(
    (med) => med.status === 'active' || med.status === 'reduced' || med.status === 'increased',
  )

  const paramMap = new Map<
    string,
    { parameter: string; medications: string[]; weeks: number[]; noteDe: string; noteEn: string }
  >()

  activeMeds.forEach((med) => {
    const drugs = getDrugsForSubstance(med.substance)
    drugs.forEach((drug) => {
      drug.monitoringRules.forEach((rule) => {
        const parameter = rule.parameter.trim()
        if (!parameter) return
        const key = parameter.toLowerCase()
        const existing = paramMap.get(key)
        const weeks = frequencyToWeeks(rule.frequency)
        if (existing) {
          if (!existing.medications.includes(med.substance)) {
            existing.medications.push(med.substance)
          }
          existing.weeks = unionWeeks(existing.weeks, weeks)
        } else {
          paramMap.set(key, {
            parameter,
            medications: [med.substance],
            weeks,
            noteDe: rule.noteDe,
            noteEn: rule.noteEn,
          })
        }
      })
    })
  })

  const rows: TimelineRow[] = [...paramMap.values()]
    .sort((a, b) => b.medications.length - a.medications.length || a.parameter.localeCompare(b.parameter, 'de'))
    .slice(0, 8)
    .map((entry, idx) => ({
      parameter: entry.parameter,
      label:
        entry.medications.length > 0
          ? `${entry.parameter} (${entry.medications.join(', ')})`
          : entry.parameter,
      weeks: entry.weeks,
      color: PARAM_COLORS[idx % PARAM_COLORS.length]!,
      noteDe: entry.noteDe,
      noteEn: entry.noteEn,
    }))

  if (rows.length === 0) return null

  const ROW_H = 28
  const PARAM_COL_W = 240
  const COL_W = 40
  const PAD_TOP = 26
  const PAD_BOTTOM = 6
  const svgW = PARAM_COL_W + WEEK_CHECKPOINTS.length * COL_W
  const svgH = PAD_TOP + rows.length * ROW_H + PAD_BOTTOM

  return (
    <div className="monitoring-timeline">
      <div className="monitoring-timeline__scroll">
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <svg
            width={svgW}
            height={svgH}
            className="monitoring-timeline__svg"
            aria-label={translateMedicationUi(language, 'medSectionMonitoringTimeline')}
          >
            {WEEK_CHECKPOINTS.map((week, ci) => (
              <text
                key={week}
                x={PARAM_COL_W + ci * COL_W + COL_W / 2}
                y={PAD_TOP - 10}
                textAnchor="middle"
                className="monitoring-timeline__axis-label"
              >
                {`W${week}`}
              </text>
            ))}

            {WEEK_CHECKPOINTS.map((_, ci) => (
              <line
                key={ci}
                x1={PARAM_COL_W + ci * COL_W + COL_W / 2}
                y1={PAD_TOP - 4}
                x2={PARAM_COL_W + ci * COL_W + COL_W / 2}
                y2={svgH - PAD_BOTTOM}
                className="monitoring-timeline__grid-line"
              />
            ))}

            {rows.map((row, ri) => {
              const cy = PAD_TOP + ri * ROW_H + ROW_H / 2
              const note = language === 'de' ? row.noteDe : row.noteEn

              return (
                <g key={`${row.parameter}-${ri}`}>
                  {ri % 2 === 1 ? (
                    <rect
                      x={0}
                      y={PAD_TOP + ri * ROW_H}
                      width={svgW}
                      height={ROW_H}
                      className="monitoring-timeline__row-tint"
                    />
                  ) : null}

                  <text
                    x={8}
                    y={cy + 4}
                    textAnchor="start"
                    className="monitoring-timeline__param-label"
                    style={{ fill: row.color }}
                  >
                    {row.label}
                  </text>

                  {row.weeks.map((week) => {
                    const ci = WEEK_CHECKPOINTS.indexOf(week)
                    if (ci < 0) return null
                    const cx = PARAM_COL_W + ci * COL_W + COL_W / 2
                    return (
                      <circle
                        key={week}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={row.color}
                        className="monitoring-timeline__dot"
                        onMouseEnter={(e) => {
                          const svgEl = e.currentTarget.ownerSVGElement as SVGSVGElement
                          const rect = svgEl.getBoundingClientRect()
                          setTooltip({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top - 36,
                            text: note,
                          })
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    )
                  })}
                </g>
              )
            })}
          </svg>

          {tooltip ? (
            <div
              className="monitoring-timeline__tooltip"
              style={{ left: tooltip.x, top: tooltip.y }}
              role="tooltip"
            >
              {tooltip.text}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
