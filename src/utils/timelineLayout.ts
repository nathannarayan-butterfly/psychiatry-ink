import type { TimelineEntry, TimelineLayout } from '../types/timeline'

export type TimelineLane = 'above' | 'below'

export interface PlacedTimelineEntry {
  entry: TimelineEntry
  x: number
  y: number
  lane: TimelineLane
  row: number
}

const BOX_WIDTH = 148
const BOX_HEIGHT = 72
const LANE_GAP = 12
const ROW_HEIGHT = BOX_HEIGHT + LANE_GAP * 2
const MIN_X_GAP = 8

function getLayoutEntries(entries: TimelineEntry[]): TimelineEntry[] {
  return [...entries].sort((a, b) => a.sortKey - b.sortKey)
}

function entryCenter(item: PlacedTimelineEntry): { x: number; y: number } {
  return {
    x: item.x + BOX_WIDTH / 2,
    y: item.y + BOX_HEIGHT / 2,
  }
}

export function buildSnakeConnectorPath(placed: PlacedTimelineEntry[]): string {
  if (placed.length < 2) return ''

  const segments: string[] = []
  for (let index = 0; index < placed.length; index += 1) {
    const point = entryCenter(placed[index])
    segments.push(`${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
  }
  return segments.join(' ')
}

export function buildHorizontalConnectorSegments(
  placed: PlacedTimelineEntry[],
  axisY: number,
): Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> {
  return placed.map((item) => {
    const centerX = item.x + BOX_WIDTH / 2
    const boxEdgeY = item.lane === 'above' ? item.y + BOX_HEIGHT : item.y
    return {
      key: item.entry.id,
      x1: centerX,
      y1: boxEdgeY,
      x2: centerX,
      y2: axisY,
    }
  })
}

function computeXScale(entries: TimelineEntry[], innerWidth: number, padding: number) {
  if (entries.length === 0) {
    return { minKey: 0, maxKey: 1, mapX: () => padding }
  }

  const keys = entries.map((entry) => entry.sortKey)
  const minKey = Math.min(...keys)
  const maxKey = Math.max(...keys)
  const span = Math.max(maxKey - minKey, 1)
  const usable = Math.max(innerWidth - padding * 2 - BOX_WIDTH, 1)

  return {
    minKey,
    maxKey,
    mapX: (sortKey: number) => padding + ((sortKey - minKey) / span) * usable,
  }
}

function assignHorizontalLanes(
  entries: TimelineEntry[],
  mapX: (sortKey: number) => number,
): PlacedTimelineEntry[] {
  const laneEnds: Record<TimelineLane, number> = { above: -Infinity, below: -Infinity }
  const centerY = ROW_HEIGHT

  return entries.map((entry) => {
    const x = mapX(entry.sortKey)
    const fitsAbove = x >= laneEnds.above + BOX_WIDTH + MIN_X_GAP
    const fitsBelow = x >= laneEnds.below + BOX_WIDTH + MIN_X_GAP

    let lane: TimelineLane = 'above'
    if (fitsAbove) {
      lane = 'above'
    } else if (fitsBelow) {
      lane = 'below'
    } else {
      lane = laneEnds.above <= laneEnds.below ? 'above' : 'below'
    }

    laneEnds[lane] = x
    const y = lane === 'above' ? centerY - BOX_HEIGHT - LANE_GAP : centerY + LANE_GAP

    return { entry, x, y, lane, row: 0 }
  })
}

function assignSnakeLanes(
  entries: TimelineEntry[],
  innerWidth: number,
  padding: number,
): PlacedTimelineEntry[] {
  const rowWidth = Math.max(innerWidth - padding * 2, BOX_WIDTH)
  const cols = Math.max(1, Math.floor(rowWidth / (BOX_WIDTH + MIN_X_GAP)))
  const placed: PlacedTimelineEntry[] = []

  entries.forEach((entry, index) => {
    const row = Math.floor(index / cols)
    const colInRow = index % cols
    const reverse = row % 2 === 1
    const col = reverse ? cols - 1 - colInRow : colInRow
    const x = padding + col * (BOX_WIDTH + MIN_X_GAP)
    const y = padding + row * ROW_HEIGHT
    const lane: TimelineLane = row % 2 === 0 ? 'above' : 'below'

    placed.push({ entry, x, y, lane, row })
  })

  return placed
}

export function layoutTimelineEntries(
  entries: TimelineEntry[],
  layout: TimelineLayout,
  innerWidth: number,
): { placed: PlacedTimelineEntry[]; contentWidth: number; contentHeight: number } {
  const sorted = getLayoutEntries(entries)
  const padding = 24

  if (sorted.length === 0 || layout === 'list') {
    return { placed: [], contentWidth: innerWidth, contentHeight: 200 }
  }

  if (layout === 'snake') {
    const placed = assignSnakeLanes(sorted, innerWidth, padding)
    const cols = Math.max(1, Math.floor((innerWidth - padding * 2) / (BOX_WIDTH + MIN_X_GAP)))
    const rows = Math.max(1, Math.ceil(sorted.length / cols))
    const contentWidth = Math.max(
      innerWidth,
      padding * 2 + cols * (BOX_WIDTH + MIN_X_GAP) - MIN_X_GAP,
    )
    const contentHeight = padding * 2 + rows * ROW_HEIGHT
    return { placed, contentWidth, contentHeight }
  }
  const { mapX } = computeXScale(sorted, innerWidth, padding)
  const placed = assignHorizontalLanes(sorted, mapX)
  const maxX = Math.max(...placed.map((item) => item.x), padding) + BOX_WIDTH + padding
  const contentWidth = Math.max(innerWidth, maxX)
  const contentHeight = ROW_HEIGHT * 2 + BOX_HEIGHT + LANE_GAP * 2
  return { placed, contentWidth, contentHeight }
}

export const TIMELINE_BOX_WIDTH = BOX_WIDTH
export const TIMELINE_BOX_HEIGHT = BOX_HEIGHT
export const TIMELINE_ROW_HEIGHT = ROW_HEIGHT

export function getTimelineAxisY(layout: TimelineLayout, contentHeight: number): number {
  if (layout === 'snake' || layout === 'list') return -1
  return Math.round(contentHeight / 2)
}
