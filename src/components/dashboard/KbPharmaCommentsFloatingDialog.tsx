import { GripHorizontal, MessageSquare, PanelRight, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useKbPharmaComments } from '../../contexts/KbPharmaCommentsContext'
import { FloatingToolHeader } from '../notes/FloatingToolHeader'
import { KnowledgeBaseReadingPanel } from './KnowledgeBaseReadingPanel'

const DOCK_EDGE_THRESHOLD_PX = 96

/** Floating Kommentare panel — draggable, dockable to the right edge. */
export function KbPharmaCommentsFloatingDialog() {
  const { t } = useTranslation()
  const { close, dock, registration, panelRequest, purpose } = useKbPharmaComments()
  const panelTitle = purpose === 'askAi' ? t('kbReadingTabAskAi') : t('kbCommentsPanelTitle')
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

  if (!registration) return null

  const dialogStyle =
    position != null
      ? { position: 'fixed' as const, left: position.x, top: position.y, margin: 0, transform: 'none' }
      : undefined

  return (
    <div className="ask-butterfly-overlay ask-butterfly-overlay--floating" role="presentation">
      <div
        ref={dialogRef}
        className={`ask-butterfly-dialog ask-butterfly-dialog--floating notizen-dialog--floating kbp-comments-dialog${
          isDragging ? ' ask-butterfly-dialog--dragging' : ''
        }`}
        style={dialogStyle}
        role="dialog"
        aria-modal="false"
        aria-labelledby="kbp-comments-float-title"
        onClick={(event) => event.stopPropagation()}
      >
        <FloatingToolHeader
          titleId="kbp-comments-float-title"
          icon={
            purpose === 'askAi' ? (
              <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            ) : (
              <MessageSquare className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            )
          }
          title={panelTitle}
          subtitle={registration.medicationName}
          actions={
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
        <div className="ask-butterfly-dialog__body kbp-comments-dialog__body">
          <KnowledgeBaseReadingPanel
            medicationId={registration.medicationId}
            medicationName={registration.medicationName}
            sectionId={registration.sectionId}
            sectionLabel={registration.sectionLabel}
            sectionData={registration.sectionData}
            language={registration.language}
            request={panelRequest}
            tier={registration.tier}
            embedded
            mode={purpose}
          />
        </div>
      </div>
    </div>
  )
}
