import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts'
import { loadBefunde, type LaborBefund } from '../../utils/laborArchive'
import { useTranslation } from '../../context/TranslationContext'
import { useOverviewHiddenGraphs } from '../../hooks/useOverviewHiddenGraphs'
import { GraphEnlargeModal } from './GraphEnlargeModal'

/** Graph id namespace for the shared Overview hidden-graphs store. */
function spiegelGraphId(name: string): string {
  return `spiegel:${name}`
}

// ---------------------------------------------------------------------------
// Spiegelwert detection
// ---------------------------------------------------------------------------

/** Category IDs / label fragments that indicate drug-level panels */
const SPIEGEL_CAT_PATTERNS = ['medikamentenspiegel', 'spiegel', 'druglevels', 'drug level', 'trough']

/** Known drug-level parameter names (case-insensitive substring match) */
const SPIEGEL_DRUG_NAMES = [
  'lithium',
  'valproat',
  'valproinsäure',
  'carbamazepin',
  'lamotrigin',
  'levetiracetam',
  'topiramat',
  'oxcarbazepin',
  'phenytoin',
  'zonisamid',
  'clonazepam',
  'clozapin',
  'olanzapin',
  'quetiapin',
  'risperidon',
  'aripiprazol',
  'haloperidol',
  'amisulprid',
  'paliperidon',
  'ziprasidon',
  'fluoxetin',
  'sertralin',
  'citalopram',
  'escitalopram',
  'paroxetin',
  'venlafaxin',
  'duloxetin',
  'amitriptylin',
  'nortriptylin',
  'imipramin',
  'clomipramin',
  'mirtazapin',
  'bupropion',
  'spiegel',
  'talspiegel',
]

function isSpiegelCategory(catId: string, catLabel: string): boolean {
  const id = catId.toLowerCase()
  const label = catLabel.toLowerCase()
  return SPIEGEL_CAT_PATTERNS.some((p) => id.includes(p) || label.includes(p))
}

function isSpiegelParam(paramName: string): boolean {
  const name = paramName.toLowerCase()
  return SPIEGEL_DRUG_NAMES.some((drug) => name.includes(drug))
}

// ---------------------------------------------------------------------------
// Data extraction
// ---------------------------------------------------------------------------

export interface SpiegelDataPoint {
  date: string   // ISO date string
  value: number
  unit: string
  refMin?: number
  refMax?: number
  refText?: string
  isAbnormal?: boolean
}

export interface SpiegelSeries {
  name: string
  points: SpiegelDataPoint[]  // sorted ascending by date, max 3
  unit: string
  refMin?: number
  refMax?: number
  refText?: string
}

export function extractSpiegelwerte(befunde: LaborBefund[]): SpiegelSeries[] {
  // Collect all (date, value) tuples per parameter name
  const map = new Map<string, SpiegelDataPoint[]>()

  const sorted = [...befunde].sort((a, b) => a.date.localeCompare(b.date))

  for (const befund of sorted) {
    for (const cat of befund.categories) {
      const isScat = isSpiegelCategory(cat.id, cat.label)
      for (const val of cat.values) {
        if (!isScat && !isSpiegelParam(val.name)) continue
        if (val.numericValue === undefined) continue

        const key = val.name.trim()
        const point: SpiegelDataPoint = {
          date: befund.date,
          value: val.numericValue,
          unit: val.unit,
          refMin: val.refMin,
          refMax: val.refMax,
          refText: val.refText,
          isAbnormal: val.isAbnormal,
        }
        const existing = map.get(key)
        if (existing) {
          // Avoid duplicate dates: keep the last one from the same date
          const dupIdx = existing.findIndex((p) => p.date === befund.date)
          if (dupIdx >= 0) {
            existing[dupIdx] = point
          } else {
            existing.push(point)
          }
        } else {
          map.set(key, [point])
        }
      }
    }
  }

  const result: SpiegelSeries[] = []

  for (const [name, points] of map.entries()) {
    if (points.length < 2) continue

    // Take the last 3 only
    const last3 = points.slice(-3)

    // Derive unit and reference from the most recent point
    const latest = last3[last3.length - 1]

    // Collect refMin/refMax from any point that has them
    let refMin: number | undefined
    let refMax: number | undefined
    let refText: string | undefined
    for (const p of last3) {
      if (p.refMin !== undefined) refMin = p.refMin
      if (p.refMax !== undefined) refMax = p.refMax
      if (p.refText) refText = p.refText
    }

    result.push({
      name,
      points: last3,
      unit: latest.unit,
      refMin,
      refMax,
      refText,
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
  } catch {
    return iso.slice(5, 10)
  }
}

type TrendDir = 'up' | 'down' | 'stable'

function getTrendDir(points: SpiegelDataPoint[]): TrendDir {
  if (points.length < 2) return 'stable'
  const prev = points[points.length - 2].value
  const curr = points[points.length - 1].value
  const delta = Math.abs(curr - prev)
  // treat changes < 1% of value as stable
  const threshold = Math.max(0.01, Math.abs(prev) * 0.01)
  if (delta < threshold) return 'stable'
  return curr > prev ? 'up' : 'down'
}

// ---------------------------------------------------------------------------
// Single sparkline card
// ---------------------------------------------------------------------------

/** Reference-range label, e.g. "20–80 ng/mL". */
function refRangeLabel(series: SpiegelSeries): string | null {
  if (series.refText) {
    return series.unit ? `${series.refText} ${series.unit}` : series.refText
  }
  if (series.refMin !== undefined && series.refMax !== undefined) {
    return `${series.refMin}–${series.refMax}${series.unit ? ` ${series.unit}` : ''}`
  }
  if (series.refMin !== undefined) {
    return `≥ ${series.refMin}${series.unit ? ` ${series.unit}` : ''}`
  }
  if (series.refMax !== undefined) {
    return `≤ ${series.refMax}${series.unit ? ` ${series.unit}` : ''}`
  }
  return null
}

interface SpiegelChartViewProps {
  series: SpiegelSeries
  height: number
  large?: boolean
}

/** Shared Recharts line chart used in both the small card and the enlarge modal. */
function SpiegelChartView({ series, height, large = false }: SpiegelChartViewProps) {
  const chartData = series.points.map((p) => ({
    date: shortDate(p.date),
    value: p.value,
    isAbnormal: p.isAbnormal ?? false,
  }))

  const latest = series.points[series.points.length - 1]
  const isOutOfRange =
    latest.isAbnormal === true ||
    (series.refMin !== undefined && latest.value < series.refMin) ||
    (series.refMax !== undefined && latest.value > series.refMax)

  const allValues = series.points.map((p) => p.value)
  const dataMin = Math.min(...allValues)
  const dataMax = Math.max(...allValues)
  const rangeMin = series.refMin !== undefined ? Math.min(dataMin, series.refMin) : dataMin
  const rangeMax = series.refMax !== undefined ? Math.max(dataMax, series.refMax) : dataMax
  const pad = (rangeMax - rangeMin) * 0.2 || 1
  const yMin = Math.max(0, rangeMin - pad)
  const yMax = rangeMax + pad

  const hasRefBand = series.refMin !== undefined || series.refMax !== undefined
  const refBandMin = series.refMin ?? yMin
  const refBandMax = series.refMax ?? yMax

  const tickSize = large ? 12 : 9
  const dotRadius = large ? 4 : 3

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={chartData}
        margin={{ top: 6, right: large ? 16 : 4, bottom: 0, left: large ? 0 : -30 }}
      >
        <XAxis dataKey="date" tick={{ fontSize: tickSize }} interval={0} />
        <YAxis
          tick={{ fontSize: tickSize }}
          domain={[yMin, yMax]}
          width={large ? 44 : 36}
        />
        <Tooltip
          contentStyle={{ fontSize: large ? 12 : 10, padding: '2px 6px' }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [`${v} ${series.unit}`, series.name]}
        />

        {hasRefBand && (
          <ReferenceArea
            y1={refBandMin}
            y2={refBandMax}
            fill="#22c55e"
            fillOpacity={0.1}
            ifOverflow="extendDomain"
          />
        )}
        {series.refMin !== undefined && (
          <ReferenceLine
            y={series.refMin}
            stroke="#16a34a"
            strokeDasharray="3 2"
            strokeOpacity={0.6}
          />
        )}
        {series.refMax !== undefined && (
          <ReferenceLine
            y={series.refMax}
            stroke="#16a34a"
            strokeDasharray="3 2"
            strokeOpacity={0.6}
          />
        )}

        <Line
          type="monotone"
          dataKey="value"
          stroke={isOutOfRange ? '#ef4444' : '#3b82f6'}
          strokeWidth={large ? 2 : 1.5}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dot={(dotProps: any) => {
            const { cx, cy, payload } = dotProps as {
              cx: number | undefined
              cy: number | undefined
              payload: { isAbnormal: boolean }
            }
            if (cx === undefined || cy === undefined) return <g key="empty" />
            const color = payload.isAbnormal ? '#ef4444' : (isOutOfRange ? '#ef4444' : '#3b82f6')
            return (
              <circle
                key={`dot-${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={dotRadius}
                fill={color}
                stroke={color}
              />
            )
          }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface SpiegelCardProps {
  series: SpiegelSeries
  onEnlarge: () => void
  onHide: () => void
}

function SpiegelCard({ series, onEnlarge, onHide }: SpiegelCardProps) {
  const { t } = useTranslation()

  const latest = series.points[series.points.length - 1]
  const trendDir = getTrendDir(series.points)

  const trendLabel =
    trendDir === 'up'
      ? t('spiegelwerteTrendUp')
      : trendDir === 'down'
        ? t('spiegelwerteTrendDown')
        : t('spiegelwerteTrendStable')

  const trendClass =
    trendDir === 'up'
      ? 'spiegelwerte-card__trend--up'
      : trendDir === 'down'
        ? 'spiegelwerte-card__trend--down'
        : 'spiegelwerte-card__trend--stable'

  const isOutOfRange =
    latest.isAbnormal === true ||
    (series.refMin !== undefined && latest.value < series.refMin) ||
    (series.refMax !== undefined && latest.value > series.refMax)

  return (
    <div className={['spiegelwerte-card', isOutOfRange ? 'spiegelwerte-card--abnormal' : ''].join(' ').trim()}>
      <div className="spiegelwerte-card__header">
        <span className="spiegelwerte-card__name">{series.name}</span>
        <span className={['spiegelwerte-card__trend', trendClass].join(' ')}>
          {trendLabel}
        </span>
        <div className="overview-chart-card__actions">
          <button
            type="button"
            className="overview-chart-card__action"
            onClick={onEnlarge}
            title={t('overviewChartEnlarge')}
            aria-label={t('overviewChartEnlarge')}
          >
            ⤢
          </button>
          <button
            type="button"
            className="overview-chart-card__action overview-chart-card__action--close"
            onClick={onHide}
            title={t('overviewChartHide')}
            aria-label={t('overviewChartHide')}
          >
            ×
          </button>
        </div>
      </div>

      <div className="spiegelwerte-card__latest">
        <span className={['spiegelwerte-card__value', isOutOfRange ? 'spiegelwerte-card__value--abnormal' : ''].join(' ').trim()}>
          {latest.value}
        </span>
        <span className="spiegelwerte-card__unit">{series.unit}</span>
        {series.refText && (
          <span className="spiegelwerte-card__ref">Ref: {series.refText}</span>
        )}
      </div>

      <SpiegelChartView series={series} height={72} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section component (exported)
// ---------------------------------------------------------------------------

interface SpiegelwerteSectionProps {
  caseId: string
}

export function SpiegelwerteSection({ caseId }: SpiegelwerteSectionProps) {
  const { t } = useTranslation()
  const { isHidden, hide, unhide } = useOverviewHiddenGraphs(caseId)
  const [enlarged, setEnlarged] = useState<SpiegelSeries | null>(null)
  const [showHiddenMenu, setShowHiddenMenu] = useState(false)

  const series = useMemo(() => {
    const befunde = loadBefunde(caseId)
    return extractSpiegelwerte(befunde)
  }, [caseId])

  if (series.length === 0) return null

  const visibleSeries = series.filter((s) => !isHidden(spiegelGraphId(s.name)))
  const hiddenSeries = series.filter((s) => isHidden(spiegelGraphId(s.name)))

  return (
    <div className="spiegelwerte-section">
      <div className="spiegelwerte-section__head">
        <h3 className="spiegelwerte-section__title">{t('spiegelwerteSectionTitle')}</h3>
        {hiddenSeries.length > 0 && (
          <div className="overview-hidden-menu">
            <button
              type="button"
              className="overview-hidden-menu__toggle"
              onClick={() => setShowHiddenMenu((v) => !v)}
              aria-expanded={showHiddenMenu}
            >
              {t('overviewChartAdd')} ({hiddenSeries.length})
            </button>
            {showHiddenMenu && (
              <ul className="overview-hidden-menu__list">
                {hiddenSeries.map((s) => (
                  <li key={s.name} className="overview-hidden-menu__item">
                    <span className="overview-hidden-menu__name">{s.name}</span>
                    <button
                      type="button"
                      className="overview-hidden-menu__add"
                      onClick={() => {
                        unhide(spiegelGraphId(s.name))
                        if (hiddenSeries.length <= 1) setShowHiddenMenu(false)
                      }}
                    >
                      {t('overviewChartAddBack')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {visibleSeries.length > 0 && (
        <div className="spiegelwerte-section__grid">
          {visibleSeries.map((s) => (
            <SpiegelCard
              key={s.name}
              series={s}
              onEnlarge={() => setEnlarged(s)}
              onHide={() => hide(spiegelGraphId(s.name))}
            />
          ))}
        </div>
      )}

      {enlarged && (
        <GraphEnlargeModal
          title={enlarged.name}
          subtitle={enlarged.unit}
          refText={refRangeLabel(enlarged)}
          onClose={() => setEnlarged(null)}
        >
          <SpiegelChartView series={enlarged} height={420} large />
        </GraphEnlargeModal>
      )}
    </div>
  )
}
