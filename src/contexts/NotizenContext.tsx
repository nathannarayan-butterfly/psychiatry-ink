import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Floating Notizen popup state — deliberately mirrors {@link AskButterflyContext}
 * so the notes popup gets the exact same floating ↔ docked-to-right-border feel as
 * the Ask Butterfly chat (open/close, dock/undock, a persisted dock width).
 */
export type NotizenDisplayMode = 'floating' | 'docked'

interface NotizenContextValue {
  isOpen: boolean
  mode: NotizenDisplayMode
  open: () => void
  close: () => void
  dock: () => void
  undock: () => void
  panelWidth: number
  setPanelWidth: (width: number) => void
}

const NotizenContext = createContext<NotizenContextValue | null>(null)

const MODE_STORAGE_KEY = 'psychiatry-ink:notizen-mode'
const WIDTH_STORAGE_KEY = 'psychiatry-ink:notizen-dock-width'
const DEFAULT_PANEL_WIDTH = 400
const MIN_PANEL_WIDTH = 300
const MAX_PANEL_WIDTH = 560

function readStoredMode(): NotizenDisplayMode {
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

function persistMode(mode: NotizenDisplayMode) {
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

export function NotizenProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<NotizenDisplayMode>(() => readStoredMode())
  const [panelWidth, setPanelWidthState] = useState(() => readStoredWidth())

  const setPanelWidth = useCallback((width: number) => {
    const clamped = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, width))
    setPanelWidthState(clamped)
    persistWidth(clamped)
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
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
    () => ({ isOpen, mode, open, close, dock, undock, panelWidth, setPanelWidth }),
    [isOpen, mode, open, close, dock, undock, panelWidth, setPanelWidth],
  )

  return <NotizenContext.Provider value={value}>{children}</NotizenContext.Provider>
}

export function useNotizen(): NotizenContextValue {
  const ctx = useContext(NotizenContext)
  if (!ctx) {
    throw new Error('useNotizen must be used within NotizenProvider')
  }
  return ctx
}

export { DEFAULT_PANEL_WIDTH, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH }
