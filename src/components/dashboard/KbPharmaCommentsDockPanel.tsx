import { MessageSquare, PanelRightClose, X } from 'lucide-react'
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  useKbPharmaComments,
  MIN_PANEL_WIDTH,
  MAX_PANEL_WIDTH,
} from '../../contexts/KbPharmaCommentsContext'
import { KnowledgeBaseReadingPanel } from './KnowledgeBaseReadingPanel'

interface KbPharmaCommentsDockPanelProps {
  isOpen: boolean
  rightOffset: number
}

/** Docked Kommentare panel — stacks left of Notizen/Butterfly when all are docked. */
export function KbPharmaCommentsDockPanel({ isOpen, rightOffset }: KbPharmaCommentsDockPanelProps) {
  const { t } = useTranslation()
  const { close, undock, panelWidth, setPanelWidth, registration, panelRequest } = useKbPharmaComments()
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null)

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      resizeStartRef.current = { x: event.clientX, width: panelWidth }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [panelWidth],
  )

  const handleResizeMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!resizeStartRef.current) return
      const delta = resizeStartRef.current.x - event.clientX
      const next = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, resizeStartRef.current.width + delta))
      setPanelWidth(next)
    },
    [setPanelWidth],
  )

  const handleResizeEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current) return
    resizeStartRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }, [])

  if (!registration) return null

  return (
    <aside
      className={[
        'ask-butterfly-dock-panel',
        'kbp-comments-dock-panel',
        isOpen ? 'ask-butterfly-dock-panel--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: panelWidth, right: rightOffset }}
      aria-label={t('kbReadingPanelTitle')}
      aria-hidden={!isOpen}
      {...(!isOpen ? { inert: true } : {})}
    >
      <div
        className="ask-butterfly-dock-panel__resize-handle"
        role="separator"
        aria-orientation="vertical"
        aria-label={t('askButterflyResize')}
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
      />

      <div className="ask-butterfly-dock-panel__inner">
        <div className="ask-butterfly-dock-panel__header">
          <span className="ask-butterfly-dock-panel__title" id="kbp-comments-dock-title">
            <MessageSquare className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {t('kbReadingPanelTitle')}
          </span>
          <div className="ask-butterfly-dialog__actions">
            <button
              type="button"
              className="ask-butterfly-dialog__icon-btn"
              onClick={undock}
              title={t('askButterflyUndock')}
              aria-label={t('askButterflyUndock')}
            >
              <PanelRightClose className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="ask-butterfly-dialog__icon-btn"
              onClick={close}
              aria-label={t('kbReadingPanelCollapse')}
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div className="ask-butterfly-dock-panel__body kbp-comments-dialog__body">
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
          />
        </div>
      </div>
    </aside>
  )
}
