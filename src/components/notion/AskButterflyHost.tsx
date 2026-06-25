import { useAskButterfly } from '../../contexts/AskButterflyContext'
import { AskButterflyChatDialog } from './AskButterflyChatDialog'
import { AskButterflyDockPanel } from './AskButterflyDockPanel'

/** Docked panel slot — fixed on the right; width reserved via .app-shell__content shrink. */
export function AskButterflyDockSlot() {
  const { isOpen, mode } = useAskButterfly()
  if (mode !== 'docked') return null
  return <AskButterflyDockPanel isOpen={isOpen} />
}

/** Floating dialog — render once at app root (fixed positioning). */
export function AskButterflyFloatingSlot() {
  const { isOpen, mode } = useAskButterfly()
  if (!isOpen || mode !== 'floating') return null
  return <AskButterflyChatDialog />
}
