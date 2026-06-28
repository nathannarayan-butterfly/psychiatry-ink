import { type CSSProperties, type ReactNode } from 'react'
import { useAskButterfly } from '../../contexts/AskButterflyContext'
import { useNotizen } from '../../contexts/NotizenContext'
import { AskButterflyDockSlot, AskButterflyFloatingSlot } from '../notion/AskButterflyHost'
import { NotizenDockPanel } from './NotizenDockPanel'
import { NotizenFloatingDialog } from './NotizenFloatingDialog'
import { FloatingToolsFab } from './FloatingToolsFab'
import '../../styles/notizen.css'

interface FloatingToolsShellProps {
  children: ReactNode
}

/**
 * App-level shell hosting BOTH floating tools — Ask Butterfly and Notizen — with
 * the bottom-right stacked bubble launcher. Reserves a right gutter equal to the
 * combined width of any docked panel(s) so the page content shrinks beside them
 * instead of being covered. When both are docked, Notizen stacks to the left of
 * the Butterfly dock.
 */
export function FloatingToolsShell({ children }: FloatingToolsShellProps) {
  const butterfly = useAskButterfly()
  const notizen = useNotizen()

  const butterflyDocked = butterfly.isOpen && butterfly.mode === 'docked'
  const notizenDocked = notizen.isOpen && notizen.mode === 'docked'

  const butterflyWidth = butterflyDocked ? butterfly.panelWidth : 0
  const notizenWidth = notizenDocked ? notizen.panelWidth : 0
  const reserved = butterflyWidth + notizenWidth

  const shellClassName = ['app-shell', reserved > 0 ? 'app-shell--tools-docked' : '']
    .filter(Boolean)
    .join(' ')

  const shellStyle = {
    '--ask-butterfly-dock-width': `${butterfly.panelWidth}px`,
    '--notizen-dock-width': `${notizen.panelWidth}px`,
    '--app-dock-reserved': `${reserved}px`,
  } as CSSProperties

  return (
    <div className={shellClassName} style={shellStyle}>
      <div className="app-shell__content">{children}</div>

      <FloatingToolsFab />

      <AskButterflyDockSlot />
      <AskButterflyFloatingSlot />

      {notizen.mode === 'docked' ? (
        <NotizenDockPanel isOpen={notizen.isOpen} rightOffset={butterflyWidth} />
      ) : null}
      {notizen.isOpen && notizen.mode === 'floating' ? <NotizenFloatingDialog /> : null}
    </div>
  )
}
