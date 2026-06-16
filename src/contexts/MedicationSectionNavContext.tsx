import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { MedicationSectionKey } from '../components/medication/MedicationLowerSections'

interface MedicationSectionNavContextValue {
  activeSection: MedicationSectionKey
  setActiveSection: (key: MedicationSectionKey) => void
  /** Select a section and scroll the case content area back to the top. */
  jumpToSection: (key: MedicationSectionKey) => void
}

const MedicationSectionNavContext = createContext<MedicationSectionNavContextValue | null>(null)

/** DOM id for a medication section's scroll/anchor target (kept for back-compat). */
export function medicationSectionDomId(key: MedicationSectionKey): string {
  return `med-section-${key}`
}

/** Scroll the nearest case content scroller (or window) to the top. */
function scrollContentToTop(): void {
  if (typeof document === 'undefined') return
  const scroller = document.querySelector('.case-tab-shell__body')
  if (scroller) {
    scroller.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

export function MedicationSectionNavProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<MedicationSectionKey>('plan')

  const jumpToSection = useCallback((key: MedicationSectionKey) => {
    setActiveSection(key)
    requestAnimationFrame(scrollContentToTop)
  }, [])

  const value = useMemo(
    () => ({
      activeSection,
      setActiveSection,
      jumpToSection,
    }),
    [activeSection, jumpToSection],
  )

  return (
    <MedicationSectionNavContext.Provider value={value}>
      {children}
    </MedicationSectionNavContext.Provider>
  )
}

export function useMedicationSectionNav(): MedicationSectionNavContextValue {
  const ctx = useContext(MedicationSectionNavContext)
  if (!ctx) {
    throw new Error('useMedicationSectionNav must be used within MedicationSectionNavProvider')
  }
  return ctx
}

/** Safe hook for sidebar nav — returns null when provider is absent. */
export function useMedicationSectionNavOptional(): MedicationSectionNavContextValue | null {
  return useContext(MedicationSectionNavContext)
}
