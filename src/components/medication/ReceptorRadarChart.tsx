import type { ReceptorProfile } from '../../data/psychDrugReference/schema'
import type { UiLanguage } from '../../types/settings'

const SIZE = 160
const CENTER = SIZE / 2
const MAX_RADIUS = 50
const LABEL_RADIUS = MAX_RADIUS + 16
const TICK_RADII = [MAX_RADIUS * 0.25, MAX_RADIUS * 0.5, MAX_RADIUS * 0.75, MAX_RADIUS]

type AxisKey = keyof Omit<ReceptorProfile, 'notes'>

const AXIS_CONFIG: { key: AxisKey; labelDe: string; labelEn: string }[] = [
  { key: 'd2', labelDe: 'D2', labelEn: 'D2' },
  { key: 'serotonin5HT2A', labelDe: '5-HT2A', labelEn: '5-HT2A' },
  { key: 'h1', labelDe: 'H1', labelEn: 'H1' },
  { key: 'm1', labelDe: 'M1', labelEn: 'M1' },
  { key: 'alpha1', labelDe: 'α1', labelEn: 'α1' },
  { key: 'netSert', labelDe: 'SERT/NET', labelEn: 'SERT/NET' },
  { key: 'serotonin5HT1A', labelDe: '5-HT1A', labelEn: '5-HT1A' },
  { key: 'd3', labelDe: 'D3', labelEn: 'D3' },
  { key: 'norepinephrine', labelDe: 'NET', labelEn: 'NET' },
  { key: 'gaba', labelDe: 'GABA', labelEn: 'GABA' },
]

function affinityScore(value: string | null | undefined): number {
  if (!value) return 0
  const v = value.toLowerCase()
  // High / strong / potent → 4
  if (/sehr hoch|very high|\bhoch\b|\bhigh\b|stark|potent|ausgeprägt|strong/.test(v)) return 4
  // Moderate → 3
  if (/moderat|moderate|mäßig/.test(v)) return 3
  // Low / weak → 2
  if (/\bgering\b|\blow\b|\bweak\b|leicht|niedrig/.test(v)) return 2
  // Minimal / partial → 1
  if (/minimal|partiell|partial|sehr gering/.test(v)) return 1
  // Any non-trivial label → 1
  return v.trim().length > 2 ? 1 : 0
}

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
}

export function ReceptorRadarChart({ profile, substanceName, language = 'de' }: ReceptorRadarChartProps) {
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

  return (
    <details className="receptor-radar">
      <summary className="receptor-radar__summary">{summaryLabel}</summary>
      <div className="receptor-radar__wrap">
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
            fill="var(--accent)"
            fillOpacity="0.18"
            stroke="var(--accent)"
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
      </div>
    </details>
  )
}
