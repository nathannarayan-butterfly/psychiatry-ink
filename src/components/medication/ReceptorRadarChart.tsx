import { getReceptorDisplayLabel } from '../../data/receptorProfile'
import type { ReceptorProfile } from '../../data/psychDrugReference/schema'
import type { UiLanguage } from '../../types/settings'
import { AFFINITY_MAX } from '../../utils/medication/receptorBurden'
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
  /** Legacy qualitative profile from psychDrugReference (0–4 score scale). */
  profile?: ReceptorProfile
  /** v2 relative-affinity fingerprint (0–100 % scale). Prefer over `profile`. */
  affinityTargets?: { target: string; percent: number }[]
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
  affinityTargets,
  substanceName,
  language = 'de',
  variant = 'collapsible',
}: ReceptorRadarChartProps) {
  const v2Axes =
    affinityTargets != null
      ? affinityTargets.filter((entry) => entry.percent > 0)
      : []
  const legacyAxes = profile != null ? AXIS_CONFIG.filter((a) => profile[a.key] != null) : []
  const useV2 = v2Axes.length >= 3
  const useLegacy = !useV2 && legacyAxes.length >= 3
  if (!useV2 && !useLegacy) return null

  const n = useV2 ? v2Axes.length : legacyAxes.length
  const angleStep = 360 / n
  const normalizedScores = useV2
    ? v2Axes.map((entry) => entry.percent)
    : legacyAxes.map((a) => affinityScore(profile![a.key] as string | undefined))
  const scoreMax = useV2 ? AFFINITY_MAX : 4

  const polygonPoints = (useV2 ? v2Axes : legacyAxes)
    .map((_, i) => {
      const r = (normalizedScores[i]! / scoreMax) * MAX_RADIUS
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

      {(useV2 ? v2Axes : legacyAxes).map((axis, i) => {
        const end = polarXY(i * angleStep, MAX_RADIUS)
        const axisKey = useV2
          ? (axis as { target: string; percent: number }).target
          : (axis as (typeof RECEPTOR_AXES)[number]).key
        return (
          <line
            key={axisKey}
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

      {(useV2 ? v2Axes : legacyAxes).map((axis, i) => {
        const p = polarXY(i * angleStep, LABEL_RADIUS)
        const label = useV2
          ? getReceptorDisplayLabel((axis as { target: string; percent: number }).target)
          : language === 'de'
            ? (axis as (typeof RECEPTOR_AXES)[number]).labelDe
            : (axis as (typeof RECEPTOR_AXES)[number]).labelEn
        const axisKey = useV2
          ? (axis as { target: string; percent: number }).target
          : (axis as (typeof RECEPTOR_AXES)[number]).key
        return (
          <text
            key={axisKey}
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
