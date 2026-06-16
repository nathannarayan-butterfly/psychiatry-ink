import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { DiscussCaseListItem } from '../types/discussCase'

/** Snapshot of the discuss page state mirrored into the global sidebar nav. */
export interface DiscussNavSnapshot {
  discussions: DiscussCaseListItem[]
  loading: boolean
  error: string | null
  activeDiscussionId: string
  canCreate: boolean
}

interface DiscussNavHandlers {
  openDiscussion: (id: string) => void
  requestCreate: () => void
  backToList: () => void
}

interface DiscussSectionNavContextValue {
  snapshot: DiscussNavSnapshot
  /** Registered by the discuss page to keep the sidebar list in sync. */
  setSnapshot: (snapshot: DiscussNavSnapshot) => void
  /** Registered by the discuss page so the sidebar can drive navigation. */
  setHandlers: (handlers: DiscussNavHandlers) => void
  openDiscussion: (id: string) => void
  requestCreate: () => void
  backToList: () => void
}

const EMPTY_SNAPSHOT: DiscussNavSnapshot = {
  discussions: [],
  loading: true,
  error: null,
  activeDiscussionId: '',
  canCreate: false,
}

const DiscussSectionNavContext = createContext<DiscussSectionNavContextValue | null>(null)

export function DiscussSectionNavProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<DiscussNavSnapshot>(EMPTY_SNAPSHOT)
  const handlersRef = useRef<DiscussNavHandlers>({
    openDiscussion: () => {},
    requestCreate: () => {},
    backToList: () => {},
  })

  const setHandlers = useCallback((handlers: DiscussNavHandlers) => {
    handlersRef.current = handlers
  }, [])

  const openDiscussion = useCallback((id: string) => handlersRef.current.openDiscussion(id), [])
  const requestCreate = useCallback(() => handlersRef.current.requestCreate(), [])
  const backToList = useCallback(() => handlersRef.current.backToList(), [])

  const value = useMemo(
    () => ({ snapshot, setSnapshot, setHandlers, openDiscussion, requestCreate, backToList }),
    [snapshot, setSnapshot, setHandlers, openDiscussion, requestCreate, backToList],
  )

  return (
    <DiscussSectionNavContext.Provider value={value}>{children}</DiscussSectionNavContext.Provider>
  )
}

/** Safe hook — returns null when provider is absent (page rendered standalone). */
export function useDiscussSectionNavOptional(): DiscussSectionNavContextValue | null {
  return useContext(DiscussSectionNavContext)
}
