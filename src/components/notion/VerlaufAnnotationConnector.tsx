import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  COMMENT_BUBBLE_VIEWPORT_MARGIN,
  resolveConnectorGeometry,
  type ConnectorGeometry,
} from '../../utils/verlaufAnnotationHelpers'

interface VerlaufAnnotationConnectorProps {
  /** The revealed/linked annotation whose anchor → target line should be drawn. */
  commentId: string | null
  /** `panel` targets the side-panel card; `bubble` targets the hover popup. */
  mode: 'panel' | 'bubble'
  /** Annotation type to anchor against (`data-verlauf-annot-type`). */
  annotType?: string
  /** Attribute carrying the annotation id on the side-panel card. */
  panelAttr?: string
  /** Attribute carrying the annotation id on the hover bubble. */
  bubbleAttr?: string
  /** Leader line stroke colour. */
  lineColor?: string
  /** Anchor dot fill colour. */
  dotColor?: string
}

interface ConnectorState extends ConnectorGeometry {
  path: string
}

function buildPath(geo: ConnectorGeometry): string {
  const { startX, startY, endX, endY, orientation } = geo
  if (orientation === 'horizontal') {
    const cx = startX + (endX - startX) / 2
    return `M ${startX} ${startY} C ${cx} ${startY}, ${cx} ${endY}, ${endX} ${endY}`
  }
  const cy = startY + (endY - startY) / 2
  return `M ${startX} ${startY} C ${startX} ${cy}, ${endX} ${cy}, ${endX} ${endY}`
}

function isOffScreen(rect: DOMRect, margin: number): boolean {
  return (
    rect.bottom < margin ||
    rect.top > window.innerHeight - margin ||
    rect.right < margin ||
    rect.left > window.innerWidth - margin
  )
}

function nearlyEqual(a: ConnectorState | null, b: ConnectorState): boolean {
  if (!a) return false
  return (
    Math.abs(a.startX - b.startX) < 0.5 &&
    Math.abs(a.startY - b.startY) < 0.5 &&
    Math.abs(a.endX - b.endX) < 0.5 &&
    Math.abs(a.endY - b.endY) < 0.5
  )
}

/**
 * A fixed, viewport-sized SVG overlay that draws a leader line from an
 * annotated text span to its comment target. It tracks both elements every
 * animation frame (so it stays correct while the page scrolls, the panel
 * scrolls internally, the bubble repositions, or the window resizes) and hides
 * itself when nothing is linked or the anchor scrolls off-screen.
 */
export function VerlaufAnnotationConnector({
  commentId,
  mode,
  annotType = 'comment',
  panelAttr = 'data-verlauf-panel-annotation-id',
  bubbleAttr = 'data-verlauf-comment-bubble-id',
  lineColor = 'rgba(197, 121, 0, 0.6)',
  dotColor = 'rgba(197, 121, 0, 0.85)',
}: VerlaufAnnotationConnectorProps) {
  const [state, setState] = useState<ConnectorState | null>(null)
  const stateRef = useRef<ConnectorState | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (!commentId) {
      stateRef.current = null
      setState(null)
      return
    }

    let frame = 0
    const margin = COMMENT_BUBBLE_VIEWPORT_MARGIN
    const targetSelector =
      mode === 'panel'
        ? `[${panelAttr}="${commentId}"]`
        : `[${bubbleAttr}="${commentId}"]`

    const clear = () => {
      if (stateRef.current !== null) {
        stateRef.current = null
        setState(null)
      }
    }

    const tick = () => {
      const anchor = document.querySelector<HTMLElement>(
        `[data-verlauf-annotation-id="${commentId}"][data-verlauf-annot-type="${annotType}"]`,
      )
      const target = document.querySelector<HTMLElement>(targetSelector)

      if (!anchor || !target) {
        clear()
      } else {
        const anchorRect = anchor.getBoundingClientRect()
        // The bubble starts hidden (visibility:hidden) until placed — don't
        // draw a line to its un-positioned origin.
        const targetHidden = getComputedStyle(target).visibility === 'hidden'
        if (targetHidden || isOffScreen(anchorRect, margin)) {
          clear()
        } else {
          const geo = resolveConnectorGeometry(anchorRect, target.getBoundingClientRect())
          const next: ConnectorState = { ...geo, path: buildPath(geo) }
          if (!nearlyEqual(stateRef.current, next)) {
            stateRef.current = next
            setState(next)
          }
        }
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [annotType, bubbleAttr, commentId, mode, panelAttr])

  if (!state) return null

  return createPortal(
    <svg
      className="verlauf-annotation-connector"
      width="100%"
      height="100%"
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99990,
        overflow: 'visible',
      }}
    >
      <path
        className="verlauf-annotation-connector__line"
        d={state.path}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="2 5"
      />
      <circle
        className="verlauf-annotation-connector__dot"
        cx={state.startX}
        cy={state.startY}
        r={3}
        fill={dotColor}
      />
    </svg>,
    document.body,
  )
}
