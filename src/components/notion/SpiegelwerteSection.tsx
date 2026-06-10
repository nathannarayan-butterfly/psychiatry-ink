import { useMemo } from 'react'
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

interface SpiegelCardProps {
  series: SpiegelSeries
}

function SpiegelCard({ series }: SpiegelCardProps) {
  const { t } = useTranslation()

  const chartData = series.points.map((p) => ({
    date: shortDate(p.date),
    value: p.value,
    isAbnormal: p.isAbnormal ?? false,
  }))

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

  // Compute Y domain with some padding + reference range
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

  return (
    <div className={['spiegelwerte-card', isOutOfRange ? 'spiegelwerte-card--abnormal' : ''].join(' ').trim()}>
      <div className="spiegelwerte-card__header">
        <span className="spiegelwerte-card__name">{series.name}</span>
        <span className={['spiegelwerte-card__trend', trendClass].join(' ')}>
          {trendLabel}
        </span>
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

      <ResponsiveContainer width="100%" height={72}>
        <LineChart
          data={chartData}
          margin={{ top: 6, right: 4, bottom: 0, left: -30 }}
        >
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9 }}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 9 }}
            domain={[yMin, yMax]}
            width={36}
          />
          <Tooltip
            contentStyle={{ fontSize: 10, padding: '2px 6px' }}
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
            strokeWidth={1.5}
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
                  r={3}
                  fill={color}
                  stroke={color}
                />
              )
            }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
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

  const series = useMemo(() => {
    const befunde = loadBefunde(caseId)
    return extractSpiegelwerte(befunde)
  }, [caseId])

  if (series.length === 0) return null

  return (
    <div className="spiegelwerte-section">
      <h3 className="spiegelwerte-section__title">{t('spiegelwerteSectionTitle')}</h3>
      <div className="spiegelwerte-section__grid">
        {series.map((s) => (
          <SpiegelCard key={s.name} series={s} />
        ))}
      </div>
    </div>
  )
}
