import { useMemo, useState } from 'react'
import type { DepotOption } from '../../../../types/knowledgeBase'
import { kbT } from '../kbStrings'

interface DepotTimelineProps {
  option: DepotOption
  language: string
}

/**
 * Hand-rolled SVG switching timeline (MonitoringTimeline idiom) for one depot /
 * LAI option: X = days; rows = oral antipsychotic overlap bar, loading
 * injections, and maintenance injection ticks. The required oral-overlap window
 * is shaded across all rows; loading days and the first maintenance injection
 * are annotated. Short-acting acetates draw no maintenance row.
 */
export function DepotTimeline({ option, language }: DepotTimelineProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  const model = useMemo(() => {
    const interval = Math.max(1, option.injectionIntervalDays || 1)
    const loadingDays = option.loadingRegimen.map((d) => d.day)
    const lastLoading = loadingDays.length > 0 ? Math.max(...loadingDays) : 0
    const firstMaint =
      option.firstMaintenanceDay != null
        ? option.firstMaintenanceDay
        : lastLoading + interval
    const drawMaintenance = !option.isShortActingNotDepot
    const maintenanceDays: number[] = []
    if (drawMaintenance) {
      // Show up to 3 maintenance injections beyond the first.
      for (let i = 0; i < 4; i++) maintenanceDays.push(firstMaint + i * interval)
    }
    const horizon = Math.max(
      option.oralOverlapDays,
      lastLoading,
      drawMaintenance ? firstMaint + interval * 3 : lastLoading,
      interval,
      14,
    )
    return { interval, firstMaint, drawMaintenance, maintenanceDays, horizon }
  }, [option])

  // Build the visible rows.
  const rows: { id: string; label: string }[] = [
    { id: 'oral', label: kbT(language, 'depotOralTaper') },
    { id: 'loading', label: kbT(language, 'depotLoading') },
  ]
  if (model.drawMaintenance) rows.push({ id: 'maintenance', label: kbT(language, 'depotMaintenance') })

  // SVG layout
  const LABEL_W = 150
  const PLOT_W = Math.max(440, Math.round(model.horizon * 6))
  const ROW_H = 38
  const PAD_TOP = 30
  const PAD_BOTTOM = 26
  const svgW = LABEL_W + PLOT_W + 16
  const svgH = PAD_TOP + rows.length * ROW_H + PAD_BOTTOM

  const dayToX = (day: number) => LABEL_W + (Math.max(0, Math.min(day, model.horizon)) / model.horizon) * PLOT_W
  const rowY = (idx: number) => PAD_TOP + idx * ROW_H + ROW_H / 2

  // X-axis ticks: 0, each injection landmark, horizon.
  const tickDays = Array.from(
    new Set([
      0,
      ...(option.oralOverlapDays > 0 ? [option.oralOverlapDays] : []),
      ...option.loadingRegimen.map((d) => d.day),
      ...(model.drawMaintenance ? [model.firstMaint] : []),
      model.horizon,
    ]),
  )
    .filter((d) => d >= 0 && d <= model.horizon)
    .sort((a, b) => a - b)

  const showTip = (e: React.MouseEvent, text: string) => {
    const svgEl = (e.currentTarget as SVGGraphicsElement).ownerSVGElement
    if (!svgEl) return
    const rect = svgEl.getBoundingClientRect()
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 36, text })
  }

  const oralRowIdx = 0
  const loadingRowIdx = 1
  const maintRowIdx = 2

  return (
    <div className="kb-depot-timeline">
      <div className="kb-depot-timeline__scroll">
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <svg
            width={svgW}
            height={svgH}
            className="kb-depot-timeline__svg"
            role="img"
            aria-label={`${kbT(language, 'depotTitle')} — ${option.name}`}
          >
            {/* Oral-overlap shaded window across all rows */}
            {option.oralOverlapDays > 0 ? (
              <rect
                x={dayToX(0)}
                y={PAD_TOP - 4}
                width={dayToX(option.oralOverlapDays) - dayToX(0)}
                height={rows.length * ROW_H}
                className="kb-depot-timeline__overlap"
              />
            ) : null}

            {/* X-axis ticks + labels */}
            {tickDays.map((d) => (
              <g key={`tick-${d}`}>
                <line
                  x1={dayToX(d)}
                  y1={PAD_TOP - 4}
                  x2={dayToX(d)}
                  y2={svgH - PAD_BOTTOM}
                  className="kb-depot-timeline__grid"
                />
                <text
                  x={dayToX(d)}
                  y={svgH - PAD_BOTTOM + 16}
                  textAnchor="middle"
                  className="kb-depot-timeline__axis-label"
                >
                  {d}
                </text>
              </g>
            ))}
            <text
              x={LABEL_W + PLOT_W / 2}
              y={svgH - 4}
              textAnchor="middle"
              className="kb-depot-timeline__axis-title"
            >
              {kbT(language, 'axisDay')}
            </text>

            {/* Row labels + baselines */}
            {rows.map((row, idx) => (
              <g key={row.id}>
                {idx % 2 === 1 ? (
                  <rect
                    x={0}
                    y={PAD_TOP + idx * ROW_H}
                    width={svgW}
                    height={ROW_H}
                    className="kb-depot-timeline__row-tint"
                  />
                ) : null}
                <text
                  x={LABEL_W - 8}
                  y={rowY(idx) + 4}
                  textAnchor="end"
                  className="kb-depot-timeline__row-label"
                >
                  {row.label}
                </text>
              </g>
            ))}

            {/* Oral taper bar */}
            {option.oralOverlapDays > 0 ? (
              <rect
                x={dayToX(0)}
                y={rowY(oralRowIdx) - 7}
                width={Math.max(2, dayToX(option.oralOverlapDays) - dayToX(0))}
                height={14}
                rx={4}
                className="kb-depot-timeline__oral-bar"
                onMouseEnter={(e) =>
                  showTip(e, `${kbT(language, 'depotOverlap')}: ${option.oralOverlapDays} ${kbT(language, 'days')}`)
                }
                onMouseLeave={() => setTooltip(null)}
              />
            ) : (
              <text
                x={dayToX(0) + 4}
                y={rowY(oralRowIdx) + 4}
                textAnchor="start"
                className="kb-depot-timeline__no-overlap"
              >
                {kbT(language, 'depotNoOverlap')}
              </text>
            )}

            {/* Loading injections */}
            {option.loadingRegimen.map((dose, i) => (
              <g key={`load-${i}`}>
                <circle
                  cx={dayToX(dose.day)}
                  cy={rowY(loadingRowIdx)}
                  r={6}
                  className="kb-depot-timeline__loading-dot"
                  onMouseEnter={(e) =>
                    showTip(
                      e,
                      `${kbT(language, 'axisDay')} ${dose.day}: ${dose.doseLabel}${
                        dose.route ? ` · ${dose.route}` : ''
                      }${dose.note ? ` · ${dose.note}` : ''}`,
                    )
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
                <text
                  x={dayToX(dose.day)}
                  y={rowY(loadingRowIdx) - 11}
                  textAnchor="middle"
                  className="kb-depot-timeline__dose-label"
                >
                  {dose.doseLabel}
                </text>
              </g>
            ))}

            {/* Maintenance injections */}
            {model.drawMaintenance
              ? model.maintenanceDays.map((d, i) => (
                  <g key={`maint-${i}`}>
                    <line
                      x1={dayToX(d)}
                      y1={rowY(maintRowIdx) - 8}
                      x2={dayToX(d)}
                      y2={rowY(maintRowIdx) + 8}
                      className={`kb-depot-timeline__maint-tick${i === 0 ? ' kb-depot-timeline__maint-tick--first' : ''}`}
                      onMouseEnter={(e) =>
                        showTip(
                          e,
                          `${kbT(language, 'axisDay')} ${d}${
                            i === 0 ? ` · ${kbT(language, 'depotFirstMaintenance')}` : ''
                          } · ${kbT(language, 'depotEvery')} ${option.injectionIntervalDays} ${kbT(language, 'days')}`,
                        )
                      }
                      onMouseLeave={() => setTooltip(null)}
                    />
                  </g>
                ))
              : null}
          </svg>

          {tooltip ? (
            <div
              className="kb-depot-timeline__tooltip"
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
