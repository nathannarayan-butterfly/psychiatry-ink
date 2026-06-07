import { useCallback } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useRandomLottie } from '../../hooks/useRandomLottie'
import { PanelDateCard } from '../PanelDateCard'
import { PanelGraphic } from '../PanelGraphic'
import { PomodoroWidget } from './PomodoroWidget'

interface NotionDiarySidebarProps {
  panelGraphicEnabled: boolean
  breakLottieActive: boolean
  onClosePanelGraphic: () => void
  collapsed?: boolean
  onBreakStart?: () => void
}

export function NotionDiarySidebar({
  panelGraphicEnabled,
  breakLottieActive,
  onClosePanelGraphic,
  collapsed = false,
  onBreakStart,
}: NotionDiarySidebarProps) {
  const { t } = useTranslation()
  const { visible: randomLottieVisible, dismiss: dismissRandomLottie } = useRandomLottie({
    enabled: panelGraphicEnabled,
    paused: breakLottieActive,
  })
  const showPanelGraphic = breakLottieActive || randomLottieVisible

  const handleClosePanelGraphic = useCallback(() => {
    dismissRandomLottie()
    onClosePanelGraphic()
  }, [dismissRandomLottie, onClosePanelGraphic])

  return (
    <aside
      className={`notion-diary-sidebar${collapsed ? ' notion-diary-sidebar--collapsed' : ''}`}
      aria-label={t('notionMetadata')}
    >
      {collapsed ? (
        <div className="notion-diary-sidebar__collapsed-datetime">
          <PanelDateCard layout="vertical" />
        </div>
      ) : (
        <>
          <div className="notion-diary-sidebar__date">
            <PanelDateCard layout="sidebar" />
          </div>

          <div className="notion-diary-sidebar__timers">
            <PomodoroWidget onBreakStart={onBreakStart ?? (() => {})} variant="sidebar" />
          </div>

          {showPanelGraphic ? (
            <div className="notion-diary-sidebar__graphic">
              <PanelGraphic onClose={handleClosePanelGraphic} />
            </div>
          ) : null}
        </>
      )}
    </aside>
  )
}
