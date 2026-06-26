import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { LaborBefund } from '../utils/laborArchive'
import { consumeDiagnosticsSectionPref } from '../utils/befundArchive'
import { isDiagnosticsSectionId, type DiagnosticsSectionId } from '../data/diagnosticsSections'
import { useLaborBefundeList } from '../hooks/useLaborBefundeList'
import { useDiagnostikBefunde } from '../components/diagnostik/DiagnostikBefundeSection'

export type LaborViewMode = 'einzeln' | 'kumulativ' | 'verlauf'

interface DiagnosticsSectionNavContextValue {
  diagnosticsSection: DiagnosticsSectionId
  setDiagnosticsSection: (id: DiagnosticsSectionId) => void
  viewMode: LaborViewMode
  setViewMode: (mode: LaborViewMode) => void
  pasteZoneOpen: boolean
  setPasteZoneOpen: (open: boolean) => void
  togglePasteZone: () => void
  labor: {
    befunde: LaborBefund[]
    setBefunde: React.Dispatch<React.SetStateAction<LaborBefund[]>>
    selectedId: string | null
    setSelectedId: (id: string | null) => void
    refresh: () => void
  }
  diagnostikBefunde: ReturnType<typeof useDiagnostikBefunde>
}

const DiagnosticsSectionNavContext = createContext<DiagnosticsSectionNavContextValue | null>(null)

export function DiagnosticsSectionNavProvider({
  caseId,
  children,
}: {
  caseId: string
  children: ReactNode
}) {
  const [diagnosticsSection, setDiagnosticsSection] = useState<DiagnosticsSectionId>(() => {
    const pref = consumeDiagnosticsSectionPref(caseId)
    return isDiagnosticsSectionId(pref) ? pref : 'labor'
  })
  const [viewMode, setViewMode] = useState<LaborViewMode>('einzeln')
  const [pasteZoneOpen, setPasteZoneOpen] = useState(false)
  const labor = useLaborBefundeList(caseId)
  const diagnostikBefunde = useDiagnostikBefunde(caseId)

  const togglePasteZone = useCallback(() => {
    setPasteZoneOpen((open) => !open)
  }, [])

  const value = useMemo(
    () => ({
      diagnosticsSection,
      setDiagnosticsSection,
      viewMode,
      setViewMode,
      pasteZoneOpen,
      setPasteZoneOpen,
      togglePasteZone,
      labor,
      diagnostikBefunde,
    }),
    [diagnosticsSection, viewMode, pasteZoneOpen, togglePasteZone, labor, diagnostikBefunde],
  )

  return (
    <DiagnosticsSectionNavContext.Provider value={value}>
      {children}
    </DiagnosticsSectionNavContext.Provider>
  )
}

export function useDiagnosticsSectionNav(): DiagnosticsSectionNavContextValue {
  const ctx = useContext(DiagnosticsSectionNavContext)
  if (!ctx) {
    throw new Error('useDiagnosticsSectionNav must be used within DiagnosticsSectionNavProvider')
  }
  return ctx
}

/** Safe hook — returns null when provider is absent (workspace-embedded Labor page). */
export function useDiagnosticsSectionNavOptional(): DiagnosticsSectionNavContextValue | null {
  return useContext(DiagnosticsSectionNavContext)
}
