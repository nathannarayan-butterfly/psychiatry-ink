import { MessageSquare, PanelRightClose, Sparkles, X } from 'lucide-react'
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  useKbPharmaComments,
  MIN_PANEL_WIDTH,
  MAX_PANEL_WIDTH,
} from '../../contexts/KbPharmaCommentsContext'
import { FloatingToolHeader } from '../notes/FloatingToolHeader'
import { KnowledgeBaseReadingPanel } from './KnowledgeBaseReadingPanel'

interface KbPharmaCommentsDockPanelProps {
  isOpen: boolean
  rightOffset: number
}

/** Docked Kommentare panel — stacks left of Notizen/Butterfly when all are docked. */
export function KbPharmaCommentsDockPanel({ isOpen, rightOffset }: KbPharmaCommentsDockPanelProps) {
  const { t } = useTranslation()
  const { close, undock, panelWidth, setPanelWidth, registration, panelRequest, purpose } =
    useKbPharmaComments()
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null)
  const panelTitle = purpose === 'askAi' ? t('kbReadingTabAskAi') : t('kbCommentsPanelTitle')

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
      aria-label={panelTitle}
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
        <FloatingToolHeader
          titleId="kbp-comments-dock-title"
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
                className="ask-butterfly-dialog__icon-btn"
                onClick={undock}
                title={t('askButterflyUndock')}
                aria-label={t('askButterflyUndock')}
              >
                <PanelRightClose strokeWidth={1.75} aria-hidden />
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
            mode={purpose}
          />
        </div>
      </div>
    </aside>
  )
}
