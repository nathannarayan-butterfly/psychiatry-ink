interface SparklineProps {
  /** Numeric history oldest→newest (≥2 to render). */
  values: number[]
  abnormal?: boolean
  width?: number
  height?: number
}

/**
 * Minimal inline trend sparkline (pure SVG). Color is theme-driven via CSS
 * (`--ov-spark` / abnormal semantic), so it follows the app accent and keeps
 * semantic red reserved for out-of-range analytes.
 */
export function Sparkline({ values, abnormal = false, width = 56, height = 20 }: SparklineProps) {
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = width / (values.length - 1)
  const pad = 2

  const points = values.map((v, i) => {
    const x = i * stepX
    const y = pad + (1 - (v - min) / span) * (height - pad * 2)
    return [x, y] as const
  })

  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lastX, lastY] = points[points.length - 1]

  return (
    <svg
      className={`ov-spark ${abnormal ? 'ov-spark--abnormal' : ''}`.trim()}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <path className="ov-spark__line" d={d} fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle className="ov-spark__dot" cx={lastX} cy={lastY} r={2} />
    </svg>
  )
}
