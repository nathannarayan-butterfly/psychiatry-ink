import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PanelSeamToggleProps {
  side: 'left' | 'right'
  direction: 'collapse' | 'expand'
  label: string
  onClick: () => void
  /** When true, anchor to the main column edge (panel fully hidden). */
  onMainEdge?: boolean
}

export function PanelSeamToggle({
  side,
  direction,
  label,
  onClick,
  onMainEdge = false,
}: PanelSeamToggleProps) {
  const Icon =
    direction === 'collapse'
      ? side === 'left'
        ? ChevronLeft
        : ChevronRight
      : side === 'left'
        ? ChevronRight
        : ChevronLeft

  const edgeClass =
    onMainEdge && side === 'left'
      ? 'panel-seam-toggle--main-left'
      : onMainEdge && side === 'right'
        ? 'panel-seam-toggle--main-right'
        : `panel-seam-toggle--${side}`

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`panel-seam-toggle ${edgeClass}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
    </button>
  )
}
