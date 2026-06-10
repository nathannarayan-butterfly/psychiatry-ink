import { useState } from 'react'
import { getDrugsForSubstance } from '../../data/psychDrugReference/index'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import type { MedicationEntry } from '../../types/medicationPlan'
import type { UiLanguage } from '../../types/settings'

// Fixed week checkpoints on the X-axis
const WEEK_CHECKPOINTS = [1, 2, 4, 8, 13, 26, 39, 52]

// Muted hue palette — one slot per drug (up to 5)
const DRUG_COLORS = [
  'hsl(210 45% 52%)',
  'hsl(152 38% 44%)',
  'hsl(27  55% 52%)',
  'hsl(280 35% 52%)',
  'hsl(355 40% 50%)',
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

  // Try to parse an interval in weeks/months
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

  // Fallback: quarterly
  return [13, 26, 39, 52]
}

interface TimelineRow {
  substanceName: string
  parameter: string
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

  const rows: TimelineRow[] = []

  activeMeds.slice(0, 5).forEach((med, idx) => {
    const drugs = getDrugsForSubstance(med.substance)
    const color = DRUG_COLORS[idx % DRUG_COLORS.length]!

    drugs.forEach((drug) => {
      drug.monitoringRules.forEach((rule) => {
        rows.push({
          substanceName: med.substance,
          parameter: rule.parameter,
          weeks: frequencyToWeeks(rule.frequency),
          color,
          noteDe: rule.noteDe,
          noteEn: rule.noteEn,
        })
      })
    })
  })

  if (rows.length === 0) return null

  // SVG layout constants
  const ROW_H = 28
  const DRUG_COL_W = 72
  const PARAM_COL_W = 152
  const COL_W = 40
  const PAD_TOP = 26
  const PAD_BOTTOM = 6
  const svgW = DRUG_COL_W + PARAM_COL_W + WEEK_CHECKPOINTS.length * COL_W
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
            {/* Column headers */}
            {WEEK_CHECKPOINTS.map((week, ci) => (
              <text
                key={week}
                x={DRUG_COL_W + PARAM_COL_W + ci * COL_W + COL_W / 2}
                y={PAD_TOP - 10}
                textAnchor="middle"
                className="monitoring-timeline__axis-label"
              >
                {`W${week}`}
              </text>
            ))}

            {/* Vertical grid lines */}
            {WEEK_CHECKPOINTS.map((_, ci) => (
              <line
                key={ci}
                x1={DRUG_COL_W + PARAM_COL_W + ci * COL_W + COL_W / 2}
                y1={PAD_TOP - 4}
                x2={DRUG_COL_W + PARAM_COL_W + ci * COL_W + COL_W / 2}
                y2={svgH - PAD_BOTTOM}
                className="monitoring-timeline__grid-line"
              />
            ))}

            {rows.map((row, ri) => {
              const cy = PAD_TOP + ri * ROW_H + ROW_H / 2
              const note = language === 'de' ? row.noteDe : row.noteEn

              return (
                <g key={`${row.substanceName}-${row.parameter}-${ri}`}>
                  {/* Alternating row tint */}
                  {ri % 2 === 1 ? (
                    <rect
                      x={0}
                      y={PAD_TOP + ri * ROW_H}
                      width={svgW}
                      height={ROW_H}
                      className="monitoring-timeline__row-tint"
                    />
                  ) : null}

                  {/* Drug name */}
                  <text
                    x={DRUG_COL_W - 6}
                    y={cy + 4}
                    textAnchor="end"
                    className="monitoring-timeline__drug-label"
                    style={{ fill: row.color }}
                  >
                    {row.substanceName}
                  </text>

                  {/* Separator */}
                  <line
                    x1={DRUG_COL_W}
                    y1={PAD_TOP + ri * ROW_H + 4}
                    x2={DRUG_COL_W}
                    y2={PAD_TOP + ri * ROW_H + ROW_H - 4}
                    className="monitoring-timeline__sep-line"
                  />

                  {/* Parameter label */}
                  <text
                    x={DRUG_COL_W + 6}
                    y={cy + 4}
                    textAnchor="start"
                    className="monitoring-timeline__param-label"
                  >
                    {row.parameter}
                  </text>

                  {/* Dot markers */}
                  {row.weeks.map((week) => {
                    const ci = WEEK_CHECKPOINTS.indexOf(week)
                    if (ci < 0) return null
                    const cx = DRUG_COL_W + PARAM_COL_W + ci * COL_W + COL_W / 2
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
