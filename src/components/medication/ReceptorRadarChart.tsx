import type { ReceptorProfile } from '../../data/psychDrugReference/schema'
import type { UiLanguage } from '../../types/settings'
import { affinityScore, RECEPTOR_AXES } from '../../utils/medication/referenceReceptorProfile'

const SIZE = 160
const CENTER = SIZE / 2
const MAX_RADIUS = 50
const LABEL_RADIUS = MAX_RADIUS + 16
const TICK_RADII = [MAX_RADIUS * 0.25, MAX_RADIUS * 0.5, MAX_RADIUS * 0.75, MAX_RADIUS]

const AXIS_CONFIG = RECEPTOR_AXES

function polarXY(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: parseFloat((CENTER + radius * Math.cos(rad)).toFixed(3)),
    y: parseFloat((CENTER + radius * Math.sin(rad)).toFixed(3)),
  }
}

interface ReceptorRadarChartProps {
  profile: ReceptorProfile
  substanceName: string
  language?: UiLanguage
  /**
   * - 'collapsible' (default): wrapped in a `<details>` toggle (per-drug usage).
   * - 'inline': rendered directly without a toggle (headline / dashboard usage).
   */
  variant?: 'collapsible' | 'inline'
}

export function ReceptorRadarChart({
  profile,
  substanceName,
  language = 'de',
  variant = 'collapsible',
}: ReceptorRadarChartProps) {
  const axes = AXIS_CONFIG.filter((a) => profile[a.key] != null)
  if (axes.length < 3) return null

  const n = axes.length
  const angleStep = 360 / n
  const scores = axes.map((a) => affinityScore(profile[a.key] as string | undefined))

  const polygonPoints = axes
    .map((_, i) => {
      const r = (scores[i]! / 4) * MAX_RADIUS
      const { x, y } = polarXY(i * angleStep, r)
      return `${x},${y}`
    })
    .join(' ')

  const summaryLabel = language === 'de' ? 'Rezeptorprofil' : 'Receptor Profile'

  const svg = (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="receptor-radar__svg"
      role="img"
      aria-label={`${language === 'de' ? 'Rezeptorprofil' : 'Receptor profile'}: ${substanceName}`}
    >
      {TICK_RADII.map((r) => (
        <circle
          key={r}
          cx={CENTER}
          cy={CENTER}
          r={r}
          fill="none"
          stroke="var(--border-soft)"
          strokeWidth="0.7"
        />
      ))}

      {axes.map((axis, i) => {
        const end = polarXY(i * angleStep, MAX_RADIUS)
        return (
          <line
            key={axis.key}
            x1={CENTER}
            y1={CENTER}
            x2={end.x}
            y2={end.y}
            stroke="var(--border-soft)"
            strokeWidth="0.7"
          />
        )
      })}

      <polygon
        points={polygonPoints}
        fill="var(--area-accent, var(--accent))"
        fillOpacity="0.18"
        stroke="var(--area-accent, var(--accent))"
        strokeOpacity="0.6"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {axes.map((axis, i) => {
        const p = polarXY(i * angleStep, LABEL_RADIUS)
        const label = language === 'de' ? axis.labelDe : axis.labelEn
        return (
          <text
            key={axis.key}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill="var(--text-muted)"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )

  if (variant === 'inline') {
    return <div className="receptor-radar receptor-radar--inline">{svg}</div>
  }

  return (
    <details className="receptor-radar">
      <summary className="receptor-radar__summary">{summaryLabel}</summary>
      <div className="receptor-radar__wrap">{svg}</div>
    </details>
  )
}
