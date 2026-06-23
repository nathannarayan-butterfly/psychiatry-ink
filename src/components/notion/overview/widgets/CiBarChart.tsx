import type { CSSProperties } from 'react'

export interface CiBarChartItem {
  id: string
  label: string
  /** Short value shown at the end of the row, e.g. "3/4" or "Hoch". */
  valueLabel: string
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
 * widgets. Each row is `[ name + value (left) ][ narrow bar (right) ]`; the
 * bar column is fixed-width so bars line up as a clean vertical band on the
 * right. HTML/CSS bars (not SVG) use the exact CI severity/confidence semantic
 * colours. Print-safe (print-color-adjust: exact via CSS); the grow transition
 * is disabled under prefers-reduced-motion.
 */
export function CiBarChart({ items, ariaLabel }: CiBarChartProps) {
  return (
    <ul className="ci-barchart" aria-label={ariaLabel}>
      {items.map((item) => {
        const fillStyle: CSSProperties = {
          width: `${Math.max(8, Math.min(1, item.fraction) * 100)}%`,
          background: item.fillColor,
        }
        return (
          <li key={item.id} className="ci-barchart__row">
            <div className="ci-barchart__text">
              <span className="ci-barchart__name">{item.label}</span>
              <span className="ci-barchart__value">{item.valueLabel}</span>
            </div>
            <div className="ci-barchart__track">
              <div
                className="ci-barchart__fill"
                style={fillStyle}
                role="img"
                aria-label={`${item.label}: ${item.valueLabel}`}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
