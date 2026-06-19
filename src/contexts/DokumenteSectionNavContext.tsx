import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { CategoryFilter } from '../data/dokumenteCategories'

interface DokumenteSectionNavContextValue {
  activeCategory: CategoryFilter
  setActiveCategory: (category: CategoryFilter) => void
  /** Invoked by the sidebar nav to open the template workspace from the Dokumente page. */
  requestNewTemplate: () => void
  /** Registered by the Dokumente page so the sidebar nav can trigger the template host. */
  setNewTemplateHandler: (handler: (() => void) | null) => void
  /** Invoked by the sidebar nav to open the Document Import workflow. */
  requestImport: () => void
  /** Registered by the Dokumente page so the sidebar nav can open the import modal. */
  setImportHandler: (handler: (() => void) | null) => void
}

const DokumenteSectionNavContext = createContext<DokumenteSectionNavContextValue | null>(null)

export function DokumenteSectionNavProvider({ children }: { children: ReactNode }) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const handlerRef = useRef<(() => void) | null>(null)
  const importHandlerRef = useRef<(() => void) | null>(null)

  const setNewTemplateHandler = useCallback((handler: (() => void) | null) => {
    handlerRef.current = handler
  }, [])

  const requestNewTemplate = useCallback(() => {
    handlerRef.current?.()
  }, [])

  const setImportHandler = useCallback((handler: (() => void) | null) => {
    importHandlerRef.current = handler
  }, [])

  const requestImport = useCallback(() => {
    importHandlerRef.current?.()
  }, [])

  const value = useMemo(
    () => ({
      activeCategory,
      setActiveCategory,
      requestNewTemplate,
      setNewTemplateHandler,
      requestImport,
      setImportHandler,
    }),
    [activeCategory, requestNewTemplate, setNewTemplateHandler, requestImport, setImportHandler],
  )

  return (
    <DokumenteSectionNavContext.Provider value={value}>
      {children}
    </DokumenteSectionNavContext.Provider>
  )
}

/** Safe hook — returns null when provider is absent (page rendered without external sidebar). */
export function useDokumenteSectionNavOptional(): DokumenteSectionNavContextValue | null {
  return useContext(DokumenteSectionNavContext)
}
