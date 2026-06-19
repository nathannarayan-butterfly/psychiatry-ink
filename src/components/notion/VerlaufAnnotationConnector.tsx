import { useEffect, useRef, useState } from 'react'
import { VERLAUF_ANNOTATION_PANEL_LAYOUT_EVENT } from '../../utils/verlaufAnnotationHelpers'

interface VerlaufAnnotationConnectorProps {
  activeId: string | null
}

interface LineCoords {
  x1: number
  y1: number
  x2: number
  y2: number
}

const VIEWPORT_MARGIN = 8
/** How long (ms) to keep re-measuring so the line follows the panel slide. */
const FOLLOW_DURATION = 420

function resolveConnectorLine(activeId: string): LineCoords | null {
  const anchor = document.querySelector<HTMLElement>(
    `[data-verlauf-annotation-id="${activeId}"]`,
  )
  const panelCard = document.querySelector<HTMLElement>(
    `.verlauf-annotation-panel [data-verlauf-panel-annotation-id="${activeId}"]`,
  )
  const panelItem = panelCard?.closest<HTMLElement>('.verlauf-annotation-panel__item')
  if (!anchor || !panelCard || !panelItem?.style.top) return null

  const anchorRect = anchor.getBoundingClientRect()
  const cardRect = panelCard.getBoundingClientRect()
  if (anchorRect.width === 0 || cardRect.width === 0) return null

  // Stacked layout (panel rendered below the feed instead of beside it): a
  // horizontal connector would be meaningless, so skip it entirely.
  if (cardRect.left <= anchorRect.right) return null

  const vh = window.innerHeight
  // Anchor scrolled fully out of view → nothing meaningful to connect.
  if (anchorRect.bottom < VIEWPORT_MARGIN || anchorRect.top > vh - VIEWPORT_MARGIN) {
    return null
  }

  const clampY = (y: number) => Math.max(VIEWPORT_MARGIN, Math.min(y, vh - VIEWPORT_MARGIN))

  return {
    x1: anchorRect.right,
    y1: clampY(anchorRect.top + anchorRect.height / 2),
    x2: cardRect.left,
    y2: clampY(cardRect.top + cardRect.height / 2),
  }
}

export function VerlaufAnnotationConnector({ activeId }: VerlaufAnnotationConnectorProps) {
  const [line, setLine] = useState<LineCoords | null>(null)
  const frameRef = useRef<number | null>(null)
  const followRef = useRef<number | null>(null)

  useEffect(() => {
    if (!activeId) {
      setLine(null)
      return
    }

    let cancelled = false

    const apply = () => {
      if (cancelled) return
      setLine(resolveConnectorLine(activeId))
    }

    // Coalesce bursty scroll/resize events into a single rAF measurement so we
    // never thrash layout mid-scroll.
    let scheduled = false
    const schedule = () => {
      if (scheduled) return
      scheduled = true
      frameRef.current = requestAnimationFrame(() => {
        scheduled = false
        apply()
      })
    }

    // The panel card slides to its anchor with a CSS transition; follow it for a
    // few frames so the line tracks the motion instead of snapping at the end.
    const start =
      typeof performance !== 'undefined' ? performance.now() : Date.now()
    const follow = () => {
      if (cancelled) return
      apply()
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      if (now - start < FOLLOW_DURATION) {
        followRef.current = requestAnimationFrame(follow)
      }
    }
    follow()

    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    window.addEventListener(VERLAUF_ANNOTATION_PANEL_LAYOUT_EVENT, schedule)

    const anchor = document.querySelector<HTMLElement>(
      `[data-verlauf-annotation-id="${activeId}"]`,
    )
    const panelCard = document.querySelector<HTMLElement>(
      `.verlauf-annotation-panel [data-verlauf-panel-annotation-id="${activeId}"]`,
    )
    const panelItem = panelCard?.closest<HTMLElement>('.verlauf-annotation-panel__item')

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    if (resizeObserver) {
      if (anchor) resizeObserver.observe(anchor)
      if (panelCard) resizeObserver.observe(panelCard)
      if (panelItem) resizeObserver.observe(panelItem)
    }

    return () => {
      cancelled = true
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      if (followRef.current !== null) cancelAnimationFrame(followRef.current)
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      window.removeEventListener(VERLAUF_ANNOTATION_PANEL_LAYOUT_EVENT, schedule)
      resizeObserver?.disconnect()
    }
  }, [activeId])

  if (!activeId || !line) return null

  const midX = (line.x1 + line.x2) / 2

  return (
    <svg
      className="verlauf-annotation-connector"
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99990,
      }}
    >
      <path
        d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="4 3"
        opacity="0.45"
      />
      <circle cx={line.x1} cy={line.y1} r="3" fill="currentColor" opacity="0.55" />
      <circle cx={line.x2} cy={line.y2} r="3" fill="currentColor" opacity="0.55" />
    </svg>
  )
}
