import { PanelRightClose, X } from 'lucide-react'
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useAskButterfly, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH } from '../../contexts/AskButterflyContext'
import { AskButterflyChatPanel } from './AskButterflyChatPanel'

interface AskButterflyDockPanelProps {
  isOpen: boolean
}

export function AskButterflyDockPanel({ isOpen }: AskButterflyDockPanelProps) {
  const { t } = useTranslation()
  const { close, undock, panelWidth, setPanelWidth } = useAskButterfly()
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
      className={['ask-butterfly-dock-panel', isOpen ? 'ask-butterfly-dock-panel--open' : '']
        .filter(Boolean)
        .join(' ')}
      style={{ width: panelWidth }}
      aria-label={t('askButterflyTitle')}
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
        <AskButterflyChatPanel
          variant="docked"
          titleId="ask-butterfly-dock-title"
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
