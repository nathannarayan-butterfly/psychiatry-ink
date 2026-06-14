import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { MedicationSectionKey } from '../components/medication/MedicationLowerSections'
import { THERAPY_PAGE_SECTIONS, therapyPageSectionDomId, type TherapyPageSectionKey } from '../data/therapyPageSections'

interface MedicationSectionNavContextValue {
  activeSection: MedicationSectionKey
  activePageSection: TherapyPageSectionKey | null
  setActiveSection: (key: MedicationSectionKey) => void
  jumpToSection: (key: MedicationSectionKey) => void
  jumpToPageSection: (key: TherapyPageSectionKey) => void
}

const MedicationSectionNavContext = createContext<MedicationSectionNavContextValue | null>(null)

/** DOM id for a medication sub-section anchor target. */
export function medicationSectionDomId(key: MedicationSectionKey): string {
  return `med-section-${key}`
}

export function MedicationSectionNavProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<MedicationSectionKey>('plan')
  const [activePageSection, setActivePageSection] = useState<TherapyPageSectionKey | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const jumpToSection = useCallback((key: MedicationSectionKey) => {
    setActiveSection(key)
    setActivePageSection(null)
    requestAnimationFrame(() => {
      document.getElementById(medicationSectionDomId(key))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [])

  const jumpToPageSection = useCallback((key: TherapyPageSectionKey) => {
    setActivePageSection(key)
    requestAnimationFrame(() => {
      document.getElementById(therapyPageSectionDomId(key))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [])

  useEffect(() => {
    const visible = new Map<TherapyPageSectionKey, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-therapy-page-section') as TherapyPageSectionKey | null
          if (!id) continue
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top)
          else visible.delete(id)
        }
        if (visible.size === 0) {
          setActivePageSection(null)
          return
        }
        let bestId: TherapyPageSectionKey | null = null
        let bestTop = Infinity
        for (const [id, top] of visible) {
          if (top < bestTop) {
            bestTop = top
            bestId = id
          }
        }
        if (bestId) setActivePageSection(bestId)
      },
      { rootMargin: '-12% 0px -65% 0px', threshold: 0 },
    )
    observerRef.current = observer
    for (const section of THERAPY_PAGE_SECTIONS) {
      const el = document.getElementById(therapyPageSectionDomId(section.key))
      if (el) {
        el.setAttribute('data-therapy-page-section', section.key)
        observer.observe(el)
      }
    }
    return () => observer.disconnect()
  }, [])

  const value = useMemo(
    () => ({
      activeSection,
      activePageSection,
      setActiveSection,
      jumpToSection,
      jumpToPageSection,
    }),
    [activeSection, activePageSection, jumpToSection, jumpToPageSection],
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
