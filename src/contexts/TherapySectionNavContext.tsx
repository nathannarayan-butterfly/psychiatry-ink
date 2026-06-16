import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { THERAPY_PAGE_SECTIONS, therapyPageSectionDomId, type TherapyPageSectionKey } from '../data/therapyPageSections'

interface TherapySectionNavContextValue {
  activePageSection: TherapyPageSectionKey | null
  jumpToPageSection: (key: TherapyPageSectionKey) => void
}

const TherapySectionNavContext = createContext<TherapySectionNavContextValue | null>(null)

export function TherapySectionNavProvider({ children }: { children: ReactNode }) {
  const [activePageSection, setActivePageSection] = useState<TherapyPageSectionKey | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

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
      activePageSection,
      jumpToPageSection,
    }),
    [activePageSection, jumpToPageSection],
  )

  return (
    <TherapySectionNavContext.Provider value={value}>
      {children}
    </TherapySectionNavContext.Provider>
  )
}

export function useTherapySectionNavOptional(): TherapySectionNavContextValue | null {
  return useContext(TherapySectionNavContext)
}
