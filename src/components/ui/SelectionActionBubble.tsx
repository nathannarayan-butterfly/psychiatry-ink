import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface SelectionAction {
  id: string
  label: string
  onClick: () => void
  disabled?: boolean
}

interface SelectionActionBubbleProps {
  visible: boolean
  position: { x: number; y: number }
  actions: SelectionAction[]
  onClose: () => void
}

/** Viewport position for a fixed selection bubble (matches Verlauf reader mode). */
export function selectionBubblePosition(rect: DOMRect, gap = 48): { x: number; y: number } {
  const topCandidate = rect.top - gap
  const y = topCandidate < 8 ? rect.bottom + 8 : topCandidate
  const x = Math.min(Math.max(rect.left + rect.width / 2, 90), window.innerWidth - 90)
  return { x, y }
}

export function SelectionActionBubble({
  visible,
  position,
  actions,
  onClose,
}: SelectionActionBubbleProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [visible, onClose])

  if (!visible || actions.length === 0) return null

  return createPortal(
    <div
      ref={ref}
      className="clinical-selection-bubble"
      style={{ top: position.y, left: position.x }}
      role="toolbar"
      aria-label="Textauswahl"
      onMouseDown={(e) => e.preventDefault()}
    >
      {actions.map((action, index) => (
        <span key={action.id} className="clinical-selection-bubble__item">
          {index > 0 ? <span className="clinical-selection-bubble__divider" aria-hidden /> : null}
          <button
            type="button"
            className="clinical-selection-bubble__btn"
            disabled={action.disabled}
            onClick={() => {
              action.onClick()
              onClose()
            }}
          >
            {action.label}
          </button>
        </span>
      ))}
    </div>,
    document.body,
  )
}
