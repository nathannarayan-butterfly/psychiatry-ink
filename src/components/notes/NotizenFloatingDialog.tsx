import { GripHorizontal, PanelRight, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useNotizen } from '../../contexts/NotizenContext'
import { NotizenPanel } from './NotizenPanel'

const DOCK_EDGE_THRESHOLD_PX = 96

/**
 * Floating, draggable Notizen popup. Dragging it near the right edge docks it to
 * the border — the exact gesture the Ask Butterfly floating dialog uses (shared
 * CSS chrome + identical drag-to-dock threshold).
 */
export function NotizenFloatingDialog() {
  const { t } = useTranslation()
  const { close, dock } = useNotizen()
  const dialogRef = useRef<HTMLDivElement>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close])

  const handleDragStart = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    const dialog = dialogRef.current
    if (!dialog) return
    const rect = dialog.getBoundingClientRect()
    dragOffsetRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const handleDragMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!isDragging) return
      const dialog = dialogRef.current
      if (!dialog) return
      const width = dialog.offsetWidth
      const height = dialog.offsetHeight
      const maxX = Math.max(0, window.innerWidth - width - 16)
      const maxY = Math.max(0, window.innerHeight - height - 16)
      const nextX = Math.min(maxX, Math.max(16, event.clientX - dragOffsetRef.current.x))
      const nextY = Math.min(maxY, Math.max(16, event.clientY - dragOffsetRef.current.y))
      setPosition({ x: nextX, y: nextY })
    },
    [isDragging],
  )

  const handleDragEnd = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!isDragging) return
      setIsDragging(false)
      event.currentTarget.releasePointerCapture(event.pointerId)
      const dialog = dialogRef.current
      if (!dialog) return
      const rect = dialog.getBoundingClientRect()
      const nearRightEdge = window.innerWidth - rect.right <= DOCK_EDGE_THRESHOLD_PX
      if (nearRightEdge) {
        dock()
        setPosition(null)
      }
    },
    [dock, isDragging],
  )

  const dialogStyle =
    position != null
      ? { position: 'fixed' as const, left: position.x, top: position.y, margin: 0, transform: 'none' }
      : undefined

  return (
    <div className="ask-butterfly-overlay ask-butterfly-overlay--floating" role="presentation">
      <div
        ref={dialogRef}
        className={`ask-butterfly-dialog ask-butterfly-dialog--floating notizen-dialog--floating${isDragging ? ' ask-butterfly-dialog--dragging' : ''}`}
        style={dialogStyle}
        role="dialog"
        aria-modal="false"
        aria-labelledby="notizen-title"
        onClick={(event) => event.stopPropagation()}
      >
        <NotizenPanel
          variant="floating"
          headerActions={
            <>
              <button
                type="button"
                className="ask-butterfly-dialog__drag-handle"
                onPointerDown={handleDragStart}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
                title={t('askButterflyDragHint')}
                aria-label={t('askButterflyDragHint')}
              >
                <GripHorizontal strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="ask-butterfly-dialog__icon-btn"
                onClick={dock}
                title={t('askButterflyDock')}
                aria-label={t('askButterflyDock')}
              >
                <PanelRight strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="ask-butterfly-dialog__close"
                onClick={close}
                aria-label={t('settingsClose')}
              >
                <X strokeWidth={1.75} aria-hidden />
              </button>
            </>
          }
        />
      </div>
    </div>
  )
}
