import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AskButterflyChatMessage } from '../services/askButterflyApi'
import type { AiModelTier } from '../types'
import {
  loadAiModelPreferences,
  resolveAiModelForTask,
  saveAiModelPreferences,
  tierToPsyinkOptionId,
} from '../utils/resolveAiModel'

export type AskButterflyDisplayMode = 'floating' | 'docked'

interface AskButterflyContextValue {
  isOpen: boolean
  mode: AskButterflyDisplayMode
  tier: AiModelTier
  setTier: (tier: AiModelTier) => void
  messages: AskButterflyChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<AskButterflyChatMessage[]>>
  open: () => void
  close: () => void
  dock: () => void
  undock: () => void
  panelWidth: number
  setPanelWidth: (width: number) => void
}

const AskButterflyContext = createContext<AskButterflyContextValue | null>(null)

const MODE_STORAGE_KEY = 'psychiatry-ink:ask-butterfly-mode'
const TIER_STORAGE_KEY = 'psychiatry-ink:ask-butterfly-tier'
const WIDTH_STORAGE_KEY = 'psychiatry-ink:ask-butterfly-dock-width'
const DEFAULT_PANEL_WIDTH = 400
const MIN_PANEL_WIDTH = 280
const MAX_PANEL_WIDTH = 520

function readStoredTier(): AiModelTier {
  try {
    const raw = localStorage.getItem(TIER_STORAGE_KEY)
    if (raw === 'fast' || raw === 'standard' || raw === 'thorough') return raw
  } catch {
    // ignore
  }
  return resolveAiModelForTask('ask_butterfly').tier
}

function readStoredMode(): AskButterflyDisplayMode {
  try {
    const raw = localStorage.getItem(MODE_STORAGE_KEY)
    if (raw === 'floating') return 'floating'
    return 'docked'
  } catch {
    return 'docked'
  }
}

function readStoredWidth(): number {
  try {
    const raw = localStorage.getItem(WIDTH_STORAGE_KEY)
    const parsed = raw ? Number.parseInt(raw, 10) : NaN
    if (Number.isFinite(parsed) && parsed >= MIN_PANEL_WIDTH && parsed <= MAX_PANEL_WIDTH) {
      return parsed
    }
  } catch {
    // ignore
  }
  return DEFAULT_PANEL_WIDTH
}

function persistTier(tier: AiModelTier) {
  try {
    localStorage.setItem(TIER_STORAGE_KEY, tier)
  } catch {
    // ignore
  }
}

function persistMode(mode: AskButterflyDisplayMode) {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode)
  } catch {
    // ignore
  }
}

function persistWidth(width: number) {
  try {
    localStorage.setItem(WIDTH_STORAGE_KEY, String(width))
  } catch {
    // ignore
  }
}

export function AskButterflyProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<AskButterflyDisplayMode>(() => readStoredMode())
  const [tier, setTierState] = useState<AiModelTier>(() => readStoredTier())
  const [messages, setMessages] = useState<AskButterflyChatMessage[]>([])
  const [panelWidth, setPanelWidthState] = useState(() => readStoredWidth())

  const setTier = useCallback((next: AiModelTier) => {
    setTierState(next)
    persistTier(next)
    const prefs = loadAiModelPreferences()
    saveAiModelPreferences({
      tasks: {
        ...prefs.tasks,
        ask_butterfly: tierToPsyinkOptionId(next),
      },
    })
  }, [])

  const setPanelWidth = useCallback((width: number) => {
    const clamped = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, width))
    setPanelWidthState(clamped)
    persistWidth(clamped)
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
    setMode((current) => {
      const next = current === 'docked' ? 'docked' : readStoredMode()
      persistMode(next)
      return next
    })
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const dock = useCallback(() => {
    setMode('docked')
    persistMode('docked')
    setIsOpen(true)
  }, [])

  const undock = useCallback(() => {
    setMode('floating')
    persistMode('floating')
    setIsOpen(true)
  }, [])

  const value = useMemo(
    () => ({
      isOpen,
      mode,
      tier,
      setTier,
      messages,
      setMessages,
      open,
      close,
      dock,
      undock,
      panelWidth,
      setPanelWidth,
    }),
    [close, dock, isOpen, messages, mode, open, panelWidth, setPanelWidth, setTier, tier, undock],
  )

  return <AskButterflyContext.Provider value={value}>{children}</AskButterflyContext.Provider>
}

export function useAskButterfly(): AskButterflyContextValue {
  const ctx = useContext(AskButterflyContext)
  if (!ctx) {
    throw new Error('useAskButterfly must be used within AskButterflyProvider')
  }
  return ctx
}

export { DEFAULT_PANEL_WIDTH, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH }
