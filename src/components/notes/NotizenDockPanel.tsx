import { PanelRightClose, X } from 'lucide-react'
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useNotizen, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH } from '../../contexts/NotizenContext'
import { NotizenPanel } from './NotizenPanel'

interface NotizenDockPanelProps {
  isOpen: boolean
  /** Right offset (px) so the dock can stack to the left of the Butterfly dock. */
  rightOffset: number
}

/**
 * Docked Notizen panel — fixed to the right border, resizable, mirroring the
 * Ask Butterfly dock panel (reuses its CSS chrome). When the Butterfly chat is
 * also docked, `rightOffset` slides this panel left so the two sit side by side.
 */
export function NotizenDockPanel({ isOpen, rightOffset }: NotizenDockPanelProps) {
  const { t } = useTranslation()
  const { close, undock, panelWidth, setPanelWidth } = useNotizen()
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

  return (
    <aside
      className={['ask-butterfly-dock-panel', 'notizen-dock-panel', isOpen ? 'ask-butterfly-dock-panel--open' : '']
        .filter(Boolean)
        .join(' ')}
      style={{ width: panelWidth, right: rightOffset }}
      aria-label={t('notizenTitle')}
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
        <NotizenPanel
          variant="docked"
          titleId="notizen-dock-title"
          headerActions={
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
      </div>
    </aside>
  )
}
