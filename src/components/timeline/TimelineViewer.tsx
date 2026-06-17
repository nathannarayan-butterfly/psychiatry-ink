import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { TimelineEntry, TimelineLayout } from '../../types/timeline'
import {
  buildHorizontalConnectorSegments,
  buildSnakeConnectorPath,
  getTimelineAxisY,
  layoutTimelineEntries,
  TIMELINE_BOX_HEIGHT,
  TIMELINE_BOX_WIDTH,
  type PlacedTimelineEntry,
} from '../../utils/timelineLayout'
import { TimelineEntryActions } from './TimelineEntryActions'

interface TimelineViewerProps {
  entries: TimelineEntry[]
  layout: TimelineLayout
  onEditEntry: (entry: TimelineEntry) => void
  onDeleteEntry: (entryId: string) => void
  onToggleEntryVisibility: (entryId: string) => void
  editLabel: string
  hideLabel: string
  showLabel: string
  deleteLabel: string
}

const SCROLL_STEP = 120

export function TimelineViewer({
  entries,
  layout,
  onEditEntry,
  onDeleteEntry,
  onToggleEntryVisibility,
  editLabel,
  hideLabel,
  showLabel,
  deleteLabel,
}: TimelineViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 320 })
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; scrollX: number; scrollY: number } | null>(null)

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setViewportSize({ width: Math.max(width, 1), height: Math.max(height, 1) })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const { placed, contentWidth, contentHeight } = layoutTimelineEntries(
    entries,
    layout,
    viewportSize.width,
  )
  const axisY = getTimelineAxisY(layout, contentHeight)
  const snakePath = layout === 'snake' ? buildSnakeConnectorPath(placed) : ''
  const horizontalSegments =
    layout === 'horizontal' ? buildHorizontalConnectorSegments(placed, axisY) : []

  const clampScroll = useCallback(
    (x: number, y: number) => {
      const maxX = Math.max(0, contentWidth - viewportSize.width)
      const maxY = Math.max(0, contentHeight - viewportSize.height)
      return {
        x: Math.min(Math.max(x, 0), maxX),
        y: Math.min(Math.max(y, 0), maxY),
      }
    },
    [contentHeight, contentWidth, viewportSize.height, viewportSize.width],
  )

  useEffect(() => {
    setScrollOffset((current) => clampScroll(current.x, current.y))
  }, [clampScroll])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('.timeline-entry__action')) return
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollX: scrollOffset.x,
      scrollY: scrollOffset.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = dragRef.current.x - event.clientX
    const dy = dragRef.current.y - event.clientY
    setScrollOffset(clampScroll(dragRef.current.scrollX + dx, dragRef.current.scrollY + dy))
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const nudge = (dx: number, dy: number) => {
    setScrollOffset((current) => clampScroll(current.x + dx, current.y + dy))
  }

  return (
    <div className="timeline-viewer">
      <button
        type="button"
        className="timeline-viewer__nav timeline-viewer__nav--left"
        aria-label="Scroll left"
        onClick={() => nudge(-SCROLL_STEP, 0)}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      </button>
      <button
        type="button"
        className="timeline-viewer__nav timeline-viewer__nav--right"
        aria-label="Scroll right"
        onClick={() => nudge(SCROLL_STEP, 0)}
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      </button>
      <button
        type="button"
        className="timeline-viewer__nav timeline-viewer__nav--up"
        aria-label="Scroll up"
        onClick={() => nudge(0, -SCROLL_STEP)}
      >
        <ChevronLeft className="h-4 w-4 rotate-90" strokeWidth={1.5} aria-hidden />
      </button>
      <button
        type="button"
        className="timeline-viewer__nav timeline-viewer__nav--down"
        aria-label="Scroll down"
        onClick={() => nudge(0, SCROLL_STEP)}
      >
        <ChevronRight className="h-4 w-4 rotate-90" strokeWidth={1.5} aria-hidden />
      </button>

      <div
        ref={viewportRef}
        className="timeline-viewer__viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="timeline-viewer__canvas"
          style={{
            width: contentWidth,
            height: contentHeight,
            transform: `translate(${-scrollOffset.x}px, ${-scrollOffset.y}px)`,
          }}
        >
          {layout === 'horizontal' ? (
            <>
              <div
                className="timeline-viewer__axis timeline-viewer__axis--horizontal"
                style={{ top: axisY, width: contentWidth }}
              />
              <svg
                className="timeline-viewer__connectors"
                width={contentWidth}
                height={contentHeight}
                aria-hidden
              >
                {horizontalSegments.map((segment) => (
                  <line
                    key={`connector-${segment.key}`}
                    x1={segment.x1}
                    y1={segment.y1}
                    x2={segment.x2}
                    y2={segment.y2}
                    stroke="var(--border-strong)"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            </>
          ) : null}

          {layout === 'snake' && snakePath ? (
            <svg
              className="timeline-viewer__connectors timeline-viewer__connectors--snake"
              width={contentWidth}
              height={contentHeight}
              aria-hidden
            >
              <path
                d={snakePath}
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          ) : null}

          {placed.map((item) => (
            <TimelineEntryNode
              key={item.entry.id}
              item={item}
              onEdit={onEditEntry}
              onDelete={onDeleteEntry}
              onToggleVisibility={onToggleEntryVisibility}
              editLabel={editLabel}
              hideLabel={hideLabel}
              showLabel={showLabel}
              deleteLabel={deleteLabel}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TimelineEntryNode({
  item,
  onEdit,
  onDelete,
  onToggleVisibility,
  editLabel,
  hideLabel,
  showLabel,
  deleteLabel,
}: {
  item: PlacedTimelineEntry
  onEdit: (entry: TimelineEntry) => void
  onDelete: (entryId: string) => void
  onToggleVisibility: (entryId: string) => void
  editLabel: string
  hideLabel: string
  showLabel: string
  deleteLabel: string
}) {
  const { entry, x, y } = item

  return (
    <div
      className={`timeline-entry timeline-entry--${entry.priority}${
        entry.visible ? '' : ' timeline-entry--hidden'
      }`}
      style={{ left: x, top: y, width: TIMELINE_BOX_WIDTH, height: TIMELINE_BOX_HEIGHT }}
    >
      <div className="timeline-entry__card">
        <div className="timeline-entry__top">
          <span className="timeline-entry__date">{entry.displayDate}</span>
          <TimelineEntryActions
            entry={entry}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleVisibility={onToggleVisibility}
            editLabel={editLabel}
            hideLabel={hideLabel}
            showLabel={showLabel}
            deleteLabel={deleteLabel}
          />
        </div>
        <span className="timeline-entry__heading">{entry.heading}</span>
        {entry.subheading ? (
          <span className="timeline-entry__subheading">{entry.subheading}</span>
        ) : null}
      </div>
    </div>
  )
}
