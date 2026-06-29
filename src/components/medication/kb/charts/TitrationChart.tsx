import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TitrationSchedule } from '../../../../types/knowledgeBase'
import { kbT } from '../kbStrings'

interface TitrationChartProps {
  schedule: TitrationSchedule
  isTaper: boolean
  language: string
  chartExportKey?: string
}

/**
 * Step (stepAfter) dose-vs-day chart for an up-titration or a descending taper.
 * Target/max doses are drawn as horizontal reference lines. A `null` dose (stop)
 * renders as 0 so the line returns cleanly to baseline.
 */
export function TitrationChart({ schedule, isTaper, language, chartExportKey }: TitrationChartProps) {
  const unit = schedule.unit ?? 'mg'
  const data = useMemo(() => {
    return [...schedule.steps]
      .sort((a, b) => a.startDay - b.startDay)
      .map((s) => ({
        day: s.startDay,
        dose: s.doseMg == null ? 0 : s.doseMg,
        label: s.label ?? '',
      }))
  }, [schedule.steps])

  if (data.length === 0) return null

  const title = isTaper ? kbT(language, 'taperTitle') : kbT(language, 'titrationTitle')

  return (
    <div className="kb-titration-chart">
      <p className="kb-chart__caption">{title}</p>
      <div
        className="kb-chart__canvas"
        role="img"
        aria-label={title}
        {...(chartExportKey ? { 'data-kb-export-chart': chartExportKey } : {})}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 18, left: 4 }}>
            <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              type="number"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              tickLine={false}
              stroke="var(--border-soft)"
              label={{
                value: kbT(language, 'titrationAxisDay'),
                position: 'insideBottom',
                offset: -8,
                fill: 'var(--text-muted)',
                fontSize: 10,
              }}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              tickLine={false}
              stroke="var(--border-soft)"
              width={36}
              label={{
                value: unit,
                angle: -90,
                position: 'insideLeft',
                fill: 'var(--text-muted)',
                fontSize: 10,
              }}
            />
            {schedule.targetDoseMg != null ? (
              <ReferenceLine
                y={schedule.targetDoseMg}
                stroke="var(--accent)"
                strokeDasharray="5 4"
                label={{
                  value: `${kbT(language, 'titrationTarget')} ${schedule.targetDoseMg}`,
                  fill: 'var(--accent)',
                  fontSize: 9,
                  position: 'insideTopRight',
                }}
              />
            ) : null}
            {schedule.maxDoseMg != null ? (
              <ReferenceLine
                y={schedule.maxDoseMg}
                stroke="var(--warning)"
                strokeDasharray="2 3"
                label={{
                  value: `${kbT(language, 'titrationMax')} ${schedule.maxDoseMg}`,
                  fill: 'var(--warning)',
                  fontSize: 9,
                  position: 'insideBottomRight',
                }}
              />
            ) : null}
            <Tooltip
              contentStyle={{
                fontSize: '0.7rem',
                borderRadius: '0.4rem',
                border: '1px solid var(--border-soft)',
                background: 'var(--surface)',
              }}
              labelFormatter={(v) => `${kbT(language, 'titrationAxisDay')} ${v}`}
              formatter={(value) => [`${value} ${unit}`, kbT(language, 'titrationAxisDose')]}
            />
            <Line
              type="stepAfter"
              dataKey="dose"
              stroke="var(--accent)"
              strokeWidth={1.6}
              dot={{ r: 2, fill: 'var(--accent)' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
