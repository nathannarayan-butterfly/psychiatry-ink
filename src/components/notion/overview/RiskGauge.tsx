import type { SemanticTone } from './OverviewCard'

interface RiskGaugeProps {
  /** Semantic tone driving the ring color (never the area accent). */
  tone: SemanticTone
  /** Fill fraction 0–1 derived from the headline severity. */
  fraction: number
  /** Large central glyph — a count or a short token. */
  value: string
  /** Severity word under the value. */
  label: string
}

const SIZE = 88
const STROKE = 9
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

/**
 * Compact severity ring for the Safety card. Pure SVG (no chart dependency) so
 * it stays crisp and cheap; the fill fraction + color encode the headline tone.
 */
export function RiskGauge({ tone, fraction, value, label }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(1, fraction))
  const dash = `${clamped * C} ${C}`

  return (
    <div className={`ov-gauge ov-gauge--${tone}`} role="img" aria-label={`${label}`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
        <circle
          className="ov-gauge__track"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          strokeWidth={STROKE}
          fill="none"
        />
        <circle
          className="ov-gauge__value"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={dash}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="ov-gauge__center">
        <span className="ov-gauge__num">{value}</span>
      </div>
      <span className="ov-gauge__label">{label}</span>
    </div>
  )
}
