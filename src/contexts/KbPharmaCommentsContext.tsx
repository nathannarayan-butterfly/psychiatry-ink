import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ReadingPanelRequest } from '../components/dashboard/KnowledgeBaseReadingPanel'

export type KbPharmaCommentsDisplayMode = 'floating' | 'docked'

export interface KbPharmaCommentsRegistration {
  medicationId: string
  medicationName: string
  sectionId: string
  sectionLabel: string
  sectionData: string
  language: string
  tier?: 'fast' | 'standard' | 'thorough'
}

interface KbPharmaCommentsContextValue {
  isRegistered: boolean
  registration: KbPharmaCommentsRegistration | null
  register: (registration: KbPharmaCommentsRegistration) => void
  unregister: () => void
  patchRegistration: (patch: Partial<KbPharmaCommentsRegistration>) => void
  panelRequest: ReadingPanelRequest | null
  open: (request?: ReadingPanelRequest | null) => void
  close: () => void
  isOpen: boolean
  mode: KbPharmaCommentsDisplayMode
  dock: () => void
  undock: () => void
  panelWidth: number
  setPanelWidth: (width: number) => void
}

const KbPharmaCommentsContext = createContext<KbPharmaCommentsContextValue | null>(null)

const MODE_STORAGE_KEY = 'psychiatry-ink:kb-pharma-comments-mode'
const WIDTH_STORAGE_KEY = 'psychiatry-ink:kb-pharma-comments-dock-width'
const DEFAULT_PANEL_WIDTH = 380
const MIN_PANEL_WIDTH = 300
const MAX_PANEL_WIDTH = 520

function readStoredMode(): KbPharmaCommentsDisplayMode {
  try {
    const raw = localStorage.getItem(MODE_STORAGE_KEY)
    if (raw === 'docked') return 'docked'
    return 'floating'
  } catch {
    return 'floating'
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

function persistMode(mode: KbPharmaCommentsDisplayMode) {
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

export function KbPharmaCommentsProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<KbPharmaCommentsRegistration | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<KbPharmaCommentsDisplayMode>(() => readStoredMode())
  const [panelWidth, setPanelWidthState] = useState(() => readStoredWidth())
  const [panelRequest, setPanelRequest] = useState<ReadingPanelRequest | null>(null)

  const setPanelWidth = useCallback((width: number) => {
    const clamped = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, width))
    setPanelWidthState(clamped)
    persistWidth(clamped)
  }, [])

  const register = useCallback((next: KbPharmaCommentsRegistration) => {
    setRegistration(next)
  }, [])

  const unregister = useCallback(() => {
    setRegistration(null)
    setIsOpen(false)
    setPanelRequest(null)
  }, [])

  const patchRegistration = useCallback((patch: Partial<KbPharmaCommentsRegistration>) => {
    setRegistration((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      if (
        next.sectionId === prev.sectionId &&
        next.sectionLabel === prev.sectionLabel &&
        next.sectionData === prev.sectionData &&
        next.tier === prev.tier &&
        next.language === prev.language
      ) {
        return prev
      }
      return next
    })
  }, [])

  const open = useCallback((request?: ReadingPanelRequest | null) => {
    setIsOpen(true)
    if (request) setPanelRequest(request)
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
      isRegistered: registration != null,
      registration,
      register,
      unregister,
      patchRegistration,
      panelRequest,
      open,
      close,
      isOpen,
      mode,
      dock,
      undock,
      panelWidth,
      setPanelWidth,
    }),
    [
      registration,
      register,
      unregister,
      patchRegistration,
      panelRequest,
      open,
      close,
      isOpen,
      mode,
      dock,
      undock,
      panelWidth,
      setPanelWidth,
    ],
  )

  return <KbPharmaCommentsContext.Provider value={value}>{children}</KbPharmaCommentsContext.Provider>
}

export function useKbPharmaComments(): KbPharmaCommentsContextValue {
  const ctx = useContext(KbPharmaCommentsContext)
  if (!ctx) {
    throw new Error('useKbPharmaComments must be used within KbPharmaCommentsProvider')
  }
  return ctx
}

/**
 * Non-throwing accessor for surfaces that may render outside the provider in
 * isolation (e.g. focused unit tests). Returns null when no provider is present.
 */
export function useOptionalKbPharmaComments(): KbPharmaCommentsContextValue | null {
  return useContext(KbPharmaCommentsContext)
}

export { DEFAULT_PANEL_WIDTH, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH }
