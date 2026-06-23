import type { CSSProperties } from 'react'

export interface CiBarChartItem {
  id: string
  label: string
  /** Screen-reader description of bar meaning (severity/confidence); not shown visually. */
  ariaDescription?: string
  /** 0..1 normalised bar length. */
  fraction: number
  /**
   * CSS colour for the bar fill — must be one of the established CI semantic
   * colours (`var(--ci-severity-N)` for dimensions, `var(--ci-confidence-*)`
   * for mechanisms) so the chart matches the full CI graph colour schema.
   */
  fillColor: string
}

interface CiBarChartProps {
  items: CiBarChartItem[]
  ariaLabel: string
}

/**
 * Compact bar chart used identically by the Dimensional / Mechanism Übersicht
 * widgets. Each row is `[ name (left, up to 2 lines, ~48% max) ][ bar track
 * (flex-grow, fills remaining card width) ]`; severity and confidence are
 * encoded in bar colour only — no visible value labels.
 */
export function CiBarChart({ items, ariaLabel }: CiBarChartProps) {
  return (
    <ul className="ci-barchart" aria-label={ariaLabel}>
      {items.map((item) => {
        const fillStyle: CSSProperties = {
          width: `${Math.max(8, Math.min(1, item.fraction) * 100)}%`,
          background: item.fillColor,
        }
        const ariaValue = item.ariaDescription ?? ''
        return (
          <li key={item.id} className="ci-barchart__row">
            <span className="ci-barchart__name" title={item.label}>
              {item.label}
            </span>
            <div className="ci-barchart__track">
              <div
                className="ci-barchart__fill"
                style={fillStyle}
                role="img"
                aria-label={ariaValue ? `${item.label}: ${ariaValue}` : item.label}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
