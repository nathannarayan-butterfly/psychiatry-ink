/**
 * Shared recharts theme — keeps every non-medication chart in the app on one
 * clinical visual language (axis stroke, grid dash, tooltip shell, font sizes,
 * accent line color). Values mirror the CSS custom properties declared in
 * `globals.css` (`--chart-*`) and are resolved at runtime so they follow the
 * user's accent / appearance settings.
 *
 * Medication / KB charts are intentionally NOT migrated here — they already
 * own a bespoke aesthetic and are managed separately.
 */

/** Fallbacks used during SSR / before styles resolve. */
const FALLBACK = {
  axis: '#91887e',
  grid: 'rgba(232, 228, 223, 0.7)',
  line: '#8a5a2b',
  tooltipBg: '#ffffff',
  tooltipBorder: '#d8cabb',
  ink: '#24211e',
} as const

let cache: Record<string, string> | null = null

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback
  }
  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim()
    return value || fallback
  } catch {
    return fallback
  }
}

/** Resolved chart palette (memoised; call {@link resetChartThemeCache} after a theme change). */
export function getChartColors() {
  if (cache) return cache as ReturnType<typeof buildColors>
  cache = buildColors()
  return cache as ReturnType<typeof buildColors>
}

function buildColors() {
  return {
    axis: readVar('--chart-axis', FALLBACK.axis),
    grid: readVar('--chart-grid', FALLBACK.grid),
    line: readVar('--chart-line', FALLBACK.line),
    tooltipBg: readVar('--chart-tooltip-bg', FALLBACK.tooltipBg),
    tooltipBorder: readVar('--chart-tooltip-border', FALLBACK.tooltipBorder),
    ink: readVar('--text-main', FALLBACK.ink),
  }
}

/** Invalidate the memoised palette (e.g. after the user changes their accent). */
export function resetChartThemeCache(): void {
  cache = null
}

export const CHART_FONT_SIZE_SM = 10
export const CHART_FONT_SIZE_MD = 12

/** Dashed cartesian grid styling. */
export function chartGridProps() {
  const c = getChartColors()
  return {
    stroke: c.grid,
    strokeDasharray: '3 3',
    vertical: false,
  } as const
}

/** Axis tick + line styling. `large` bumps the font size for enlarged views. */
export function chartAxisProps(large = false) {
  const c = getChartColors()
  return {
    tick: { fontSize: large ? CHART_FONT_SIZE_MD : CHART_FONT_SIZE_SM, fill: c.axis },
    stroke: c.grid,
    tickLine: { stroke: c.grid },
  }
}

/** Tooltip container styling (passed to recharts `<Tooltip contentStyle>`). */
export function chartTooltipStyle(large = false): React.CSSProperties {
  const c = getChartColors()
  return {
    fontSize: large ? CHART_FONT_SIZE_MD : 11,
    background: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    color: c.ink,
    padding: '6px 9px',
  }
}

/** Default accent line color for series that don't carry their own semantics. */
export function chartLineColor(): string {
  return getChartColors().line
}
