import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVerlaufAnnotationRevealParams {
  /** The feed list container whose annotated spans should drive hover/focus reveal. */
  listRef: React.RefObject<HTMLElement | null>
  /** `data-verlauf-annot-type` value to track (e.g. `todo`). */
  annotType: string
  /** Attribute carrying the annotation id on the side-panel index card. */
  panelAttr: string
  /** Attribute carrying the annotation id on the hover bubble container. */
  bubbleAttr: string
}

/**
 * Hover/focus reveal model for anchored Verlauf annotations, mirroring the
 * Kommentare behaviour: hovering (or focusing) an annotated span in the feed
 * reveals its target (side-panel card in wide mode, hover bubble in narrow
 * mode), with a short grace period so the pointer can travel between the
 * anchor, the bubble and the panel index entry without flickering closed.
 */
export function useVerlaufAnnotationReveal({
  listRef,
  annotType,
  panelAttr,
  bubbleAttr,
}: UseVerlaufAnnotationRevealParams) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const hoverClearTimerRef = useRef<number | null>(null)

  const cancelHoverClear = useCallback(() => {
    if (hoverClearTimerRef.current !== null) {
      window.clearTimeout(hoverClearTimerRef.current)
      hoverClearTimerRef.current = null
    }
  }, [])

  const scheduleHoverClear = useCallback(() => {
    cancelHoverClear()
    hoverClearTimerRef.current = window.setTimeout(() => {
      setHoveredId(null)
      hoverClearTimerRef.current = null
    }, 120)
  }, [cancelHoverClear])

  const reset = useCallback(() => {
    cancelHoverClear()
    setHoveredId(null)
    setFocusedId(null)
  }, [cancelHoverClear])

  useEffect(() => {
    const container = listRef.current
    if (!container) return

    const typeSelector = `[data-verlauf-annot-type="${annotType}"]`

    function resolveId(target: EventTarget | null): string | null {
      const el = (target as HTMLElement | null)?.closest?.(typeSelector)
      return el?.getAttribute('data-verlauf-annotation-id') ?? null
    }

    function isRelatedTarget(related: Node | null, id: string): boolean {
      if (!related) return false
      const el = related as HTMLElement
      const bubble = el.closest?.(`[${bubbleAttr}]`)
      if (bubble?.getAttribute(bubbleAttr) === id) return true
      const panel = el.closest?.(`[${panelAttr}]`)
      if (panel?.getAttribute(panelAttr) === id) return true
      return false
    }

    function handleOver(e: Event) {
      const id = resolveId(e.target)
      if (!id) return
      cancelHoverClear()
      setHoveredId(id)
    }
    function handleOut(e: Event) {
      const id = resolveId(e.target)
      if (!id) return
      const related = (e as MouseEvent).relatedTarget as Node | null
      if (isRelatedTarget(related, id)) return
      scheduleHoverClear()
    }
    function handleFocusIn(e: Event) {
      const id = resolveId(e.target)
      if (id) setFocusedId(id)
    }
    function handleFocusOut(e: Event) {
      const id = resolveId(e.target)
      if (!id) return
      const related = (e as FocusEvent).relatedTarget as Node | null
      if (isRelatedTarget(related, id)) return
      setFocusedId((current) => (current === id ? null : current))
    }

    container.addEventListener('mouseover', handleOver)
    container.addEventListener('mouseout', handleOut)
    container.addEventListener('focusin', handleFocusIn)
    container.addEventListener('focusout', handleFocusOut)
    return () => {
      container.removeEventListener('mouseover', handleOver)
      container.removeEventListener('mouseout', handleOut)
      container.removeEventListener('focusin', handleFocusIn)
      container.removeEventListener('focusout', handleFocusOut)
      cancelHoverClear()
    }
  }, [annotType, bubbleAttr, cancelHoverClear, listRef, panelAttr, scheduleHoverClear])

  useEffect(() => {
    function handleResize() {
      reset()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [reset])

  const revealedId = hoveredId ?? focusedId

  return {
    hoveredId,
    focusedId,
    revealedId,
    setHoveredId,
    setFocusedId,
    cancelHoverClear,
    scheduleHoverClear,
    reset,
  }
}
