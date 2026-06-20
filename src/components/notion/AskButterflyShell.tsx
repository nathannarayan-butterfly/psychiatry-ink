import { type ReactNode } from 'react'
import { useAskButterfly } from '../../contexts/AskButterflyContext'
import { AskButterflyDockSlot, AskButterflyFloatingSlot } from './AskButterflyHost'
import { AskButterflyOpenButton } from './AskButterflyOpenButton'

interface AskButterflyShellProps {
  children: ReactNode
}

/** App-level shell: fixed dock/floating slots; main content keeps full width. */
export function AskButterflyShell({ children }: AskButterflyShellProps) {
  const { isOpen } = useAskButterfly()

  return (
    <div className="app-shell">
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
