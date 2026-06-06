import { useMemo, useRef, useState } from 'react'

import { useTranslation } from '../../context/TranslationContext'
import type { LabEntry, LabValueStatus, MedicationMarker } from '../../types/lab'
import { formatLabDate, getLabValueStatus, parseLabDate } from '../../types/lab'

interface LabChartProps {
  entries: LabEntry[]
  markers: MedicationMarker[]
  parameter: string | null
}

interface ChartPoint {
  entry: LabEntry
  x: number
  y: number
  status: LabValueStatus
}

interface TooltipState {
  x: number
  y: number
  date: string
  value: number
  unit: string
  referenceLow: number | null
  referenceHigh: number | null
  status: LabValueStatus
  medication?: MedicationMarker
}

const CHART_WIDTH = 720
const CHART_HEIGHT = 280
const PADDING = { top: 20, right: 24, bottom: 36, left: 48 }
const Y_TICK_COUNT = 5

const STATUS_COLORS: Record<LabValueStatus, string> = {
  low: '#2563eb',
  normal: '#6b7280',
  high: '#dc2626',
}

function formatReference(low: number | null, high: number | null): string {
  if (low !== null && high !== null) return `${low} – ${high}`
  if (low !== null) return `≥ ${low}`
  if (high !== null) return `≤ ${high}`
  return '—'
}

export function LabChart({ entries, markers, parameter }: LabChartProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null)

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const chartData = useMemo(() => {
    if (entries.length === 0) return null

    const dates = entries.map((entry) => parseLabDate(entry.date))
    const values = entries.map((entry) => entry.value)
    const refLows = entries
      .map((entry) => entry.referenceLow)
      .filter((value): value is number => value !== null)
    const refHighs = entries
      .map((entry) => entry.referenceHigh)
      .filter((value): value is number => value !== null)

    const minDate = Math.min(...dates)
    const maxDate = Math.max(...dates)
    const dateSpan = Math.max(maxDate - minDate, 1)

    const dataMin = Math.min(...values, ...(refLows.length ? refLows : values))
    const dataMax = Math.max(...values, ...(refHighs.length ? refHighs : values))
    const valueSpan = Math.max(dataMax - dataMin, 1)
    const valuePad = valueSpan * 0.12
    const yMin = dataMin - valuePad
    const yMax = dataMax + valuePad
    const ySpan = yMax - yMin

    const latestEntry = [...entries].sort((a, b) => parseLabDate(b.date) - parseLabDate(a.date))[0]
    const refLow = latestEntry.referenceLow
    const refHigh = latestEntry.referenceHigh

    const scaleX = (dateMs: number) =>
      PADDING.left + ((dateMs - minDate) / dateSpan) * plotWidth
    const scaleY = (value: number) =>
      PADDING.top + plotHeight - ((value - yMin) / ySpan) * plotHeight

    const points: ChartPoint[] = entries.map((entry) => ({
      entry,
      x: scaleX(parseLabDate(entry.date)),
      y: scaleY(entry.value),
      status: getLabValueStatus(entry.value, entry.referenceLow, entry.referenceHigh),
    }))

    const yTickValues = Array.from({ length: Y_TICK_COUNT }, (_, index) => {
      const ratio = index / (Y_TICK_COUNT - 1)
      return yMax - ratio * ySpan
    })

    const xTickEntries =
      entries.length <= 6
        ? entries
        : [entries[0], entries[Math.floor(entries.length / 2)], entries[entries.length - 1]]

    const markerLines = markers.map((marker) => ({
      marker,
      x: scaleX(parseLabDate(marker.date)),
    }))

    const refBand =
      refLow !== null || refHigh !== null
        ? {
            yTop: scaleY(refHigh ?? yMax),
            yBottom: scaleY(refLow ?? yMin),
          }
        : null

    return {
      points,
      polyline: points.map((point) => `${point.x},${point.y}`).join(' '),
      yTickValues,
      xTickEntries,
      markerLines,
      refBand,
      scaleX,
      scaleY,
    }
  }, [entries, markers, plotHeight, plotWidth])

  const findMarkerOnDate = (date: string): MedicationMarker | undefined => {
    return markers.find((marker) => marker.date === date)
  }

  const showTooltip = (point: ChartPoint) => {
    const rect = containerRef.current?.getBoundingClientRect()
    const scale = rect ? rect.width / CHART_WIDTH : 1
    setTooltip({
      x: point.x * scale,
      y: point.y * scale,
      date: point.entry.date,
      value: point.entry.value,
      unit: point.entry.unit,
      referenceLow: point.entry.referenceLow,
      referenceHigh: point.entry.referenceHigh,
      status: point.status,
      medication: findMarkerOnDate(point.entry.date),
    })
  }

  if (!parameter) {
    return (
      <div className="lab-chart lab-chart--empty">
        <p>{t('labChartSelectParameter')}</p>
      </div>
    )
  }

  if (!chartData || entries.length === 0) {
    return (
      <div className="lab-chart lab-chart--empty">
        <p>{t('labChartEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="lab-chart" ref={containerRef}>
      <svg
        className="lab-chart__svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={t('labChartAria').replace('{parameter}', parameter)}
      >
        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={plotWidth}
          height={plotHeight}
          className="lab-chart__plot-bg"
        />

        {chartData.yTickValues.map((tick) => {
          const y = chartData.scaleY(tick)
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + plotWidth}
                y2={y}
                className="lab-chart__grid-line"
              />
              <text x={PADDING.left - 6} y={y + 3} className="lab-chart__axis-label" textAnchor="end">
                {tick.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </text>
            </g>
          )
        })}

        {chartData.refBand ? (
          <rect
            x={PADDING.left}
            y={Math.min(chartData.refBand.yTop, chartData.refBand.yBottom)}
            width={plotWidth}
            height={Math.abs(chartData.refBand.yBottom - chartData.refBand.yTop)}
            className="lab-chart__ref-band"
          />
        ) : null}

        {chartData.markerLines.map(({ marker, x }) => (
          <g
            key={marker.id}
            onMouseEnter={() => setHoveredMarkerId(marker.id)}
            onMouseLeave={() => setHoveredMarkerId(null)}
          >
            <line
              x1={x}
              y1={PADDING.top}
              x2={x}
              y2={PADDING.top + plotHeight}
              className={`lab-chart__med-line ${
                hoveredMarkerId === marker.id ? 'lab-chart__med-line--active' : ''
              }`}
            />
            {hoveredMarkerId === marker.id ? (
              <text x={x + 4} y={PADDING.top + 10} className="lab-chart__med-label">
                {marker.medicationName}
              </text>
            ) : null}
          </g>
        ))}

        <polyline points={chartData.polyline} className="lab-chart__line" />

        {chartData.points.map((point) => (
          <circle
            key={point.entry.id}
            cx={point.x}
            cy={point.y}
            r={5}
            className={`lab-chart__point lab-chart__point--${point.status}`}
            fill={STATUS_COLORS[point.status]}
            onMouseEnter={() => showTooltip(point)}
            onMouseLeave={() => setTooltip(null)}
            onFocus={() => showTooltip(point)}
            onBlur={() => setTooltip(null)}
            tabIndex={0}
            role="presentation"
          />
        ))}

        {chartData.xTickEntries.map((entry) => (
          <text
            key={entry.id}
            x={chartData.scaleX(parseLabDate(entry.date))}
            y={CHART_HEIGHT - 10}
            className="lab-chart__axis-label lab-chart__axis-label--x"
            textAnchor="middle"
          >
            {formatLabDate(entry.date)}
          </text>
        ))}
      </svg>

      {tooltip ? (
        <div
          className="lab-chart__tooltip"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          <p className="lab-chart__tooltip-date">{formatLabDate(tooltip.date)}</p>
          <p className="lab-chart__tooltip-value">
            {tooltip.value}
            {tooltip.unit ? ` ${tooltip.unit}` : ''}
          </p>
          <p className="lab-chart__tooltip-ref">
            {t('labReferenceRange')}: {formatReference(tooltip.referenceLow, tooltip.referenceHigh)}
          </p>
          <p className={`lab-chart__tooltip-status lab-chart__tooltip-status--${tooltip.status}`}>
            {t(
              tooltip.status === 'low'
                ? 'labStatusLow'
                : tooltip.status === 'high'
                  ? 'labStatusHigh'
                  : 'labStatusNormal',
            )}
          </p>
          {tooltip.medication ? (
            <p className="lab-chart__tooltip-med">
              {tooltip.medication.medicationName}
              {tooltip.medication.dose ? ` · ${tooltip.medication.dose}` : ''}
              {tooltip.medication.doseUnit ? ` ${tooltip.medication.doseUnit}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
