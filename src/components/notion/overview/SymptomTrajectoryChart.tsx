import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  chartAxisProps,
  chartLineColor,
  chartTooltipStyle,
} from '../../../utils/chartTheme'
import type { SymptomTrajectoryPoint } from './types'

interface SymptomTrajectoryChartProps {
  points: SymptomTrajectoryPoint[]
}

const Y_TICKS = [-1, 0, 1, 2]
const Y_LABEL: Record<number, string> = {
  [-1]: 'schlechter',
  0: 'stabil',
  1: 'besser',
  2: 'remittiert',
}

/**
 * Mini course-tendency trend from real recorded `courseDirection` history,
 * rendered with the shared chart theme. Only mounted when ≥2 points exist.
 */
export function SymptomTrajectoryChart({ points }: SymptomTrajectoryChartProps) {
  const axis = chartAxisProps()
  const line = chartLineColor()

  return (
    <div className="ov-trajectory">
      <ResponsiveContainer width="100%" height={88}>
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <XAxis dataKey="dateLabel" tick={axis.tick} stroke={axis.stroke} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            domain={[-1, 2]}
            ticks={Y_TICKS}
            tick={axis.tick}
            stroke={axis.stroke}
            tickLine={false}
            width={62}
            tickFormatter={(v: number) => Y_LABEL[v] ?? ''}
          />
          <Tooltip
            contentStyle={chartTooltipStyle()}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(_v: any, _n: any, item: any) => [item?.payload?.label ?? '', 'Verlauf']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={line}
            strokeWidth={2}
            dot={{ r: 3, fill: line, stroke: line }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
