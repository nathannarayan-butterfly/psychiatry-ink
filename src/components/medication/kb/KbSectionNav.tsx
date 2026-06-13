import { useEffect, useMemo, useRef } from 'react'
import {
  groupLabel,
  kbT,
  KB_GROUP_ORDER,
  type KbGroupId,
} from './kbStrings'

export interface KbNavItem {
  id: string
  label: string
  number?: string
  group: KbGroupId
}

interface KbSectionNavProps {
  items: KbNavItem[]
  activeId: string
  onActivate: (id: string) => void
  language: string
}

/** DOM id for a section card so the TOC can scroll to / observe it. */
export function kbSectionDomId(sectionId: string): string {
  return `kb-sec-${sectionId}`
}

export function KbSectionNav({ items, activeId, onActivate, language }: KbSectionNavProps) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  const grouped = useMemo(() => {
    return KB_GROUP_ORDER.map((group) => ({
      group,
      items: items.filter((it) => it.group === group),
    })).filter((g) => g.items.length > 0)
  }, [items])

  const jump = (id: string) => {
    const el = document.getElementById(kbSectionDomId(id))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    onActivate(id)
  }

  // Scroll-spy: highlight the section nearest the top of the viewport.
  useEffect(() => {
    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-kb-section-id')
          if (!id) continue
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top)
          else visible.delete(id)
        }
        if (visible.size === 0) return
        let bestId: string | null = null
        let bestTop = Infinity
        for (const [id, top] of visible) {
          if (top < bestTop) {
            bestTop = top
            bestId = id
          }
        }
        if (bestId) onActivate(bestId)
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    )
    observerRef.current = observer
    for (const it of items) {
      const el = document.getElementById(kbSectionDomId(it.id))
      if (el) {
        el.setAttribute('data-kb-section-id', it.id)
        observer.observe(el)
      }
    }
    return () => observer.disconnect()
    // Re-bind when the set of section ids changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id).join('|')])

  return (
    <nav className="kb-toc" aria-label={kbT(language, 'tocTitle')}>
      {/* Compact dropdown (shown under the responsive breakpoint via CSS). */}
      <label className="kb-toc__dropdown">
        <span className="kb-toc__dropdown-label">{kbT(language, 'tocTitle')}</span>
        <select
          className="kb-toc__select"
          value={activeId}
          onChange={(e) => jump(e.target.value)}
          aria-label={kbT(language, 'tocJump')}
        >
          {grouped.map((g) => (
            <optgroup key={g.group} label={groupLabel(g.group, language)}>
              {g.items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {/* Full sticky list. */}
      <div className="kb-toc__list">
        <span className="kb-toc__title">{kbT(language, 'tocTitle')}</span>
        {grouped.map((g) => (
          <div key={g.group} className="kb-toc__group">
            <span className="kb-toc__group-label">{groupLabel(g.group, language)}</span>
            <ul className="kb-toc__items">
              {g.items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    className={`kb-toc__link${activeId === it.id ? ' kb-toc__link--active' : ''}`}
                    onClick={() => jump(it.id)}
                  >
                    <span className="kb-toc__label">{it.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
