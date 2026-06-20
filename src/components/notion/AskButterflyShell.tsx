import { type CSSProperties, type ReactNode } from 'react'
import { useAskButterfly } from '../../contexts/AskButterflyContext'
import { AskButterflyDockSlot, AskButterflyFloatingSlot } from './AskButterflyHost'
import { AskButterflyOpenButton } from './AskButterflyOpenButton'

interface AskButterflyShellProps {
  children: ReactNode
}

/**
 * App-level shell:
 * - Floating mode → main content keeps full width (chat overlays).
 * - Docked mode (open) → reserve a right gutter equal to the dock panel
 *   width so the chat sits beside the page content instead of covering it.
 *   The reserved space is suppressed below the mobile breakpoint, where the
 *   dock panel becomes a bottom sheet (see ask-butterfly-chat.css).
 */
export function AskButterflyShell({ children }: AskButterflyShellProps) {
  const { isOpen, mode, panelWidth } = useAskButterfly()

  const isDockedOpen = isOpen && mode === 'docked'

  const shellClassName = ['app-shell', isDockedOpen ? 'app-shell--butterfly-docked' : '']
    .filter(Boolean)
    .join(' ')

  const shellStyle = { '--ask-butterfly-dock-width': `${panelWidth}px` } as CSSProperties

  return (
    <div className={shellClassName} style={shellStyle}>
      <div className="app-shell__content">{children}</div>
      {!isOpen ? (
        <div className="ask-butterfly-global-trigger">
          <AskButterflyOpenButton variant="global" />
        </div>
      ) : null}
      <AskButterflyDockSlot />
      <AskButterflyFloatingSlot />
    </div>
  )
}
