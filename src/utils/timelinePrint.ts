import type { TimelineEntry, TimelineLayout, TimelineSnapshot } from '../types/timeline'
import {
  buildHorizontalConnectorSegments,
  buildSnakeConnectorPath,
  getTimelineAxisY,
  layoutTimelineEntries,
  TIMELINE_BOX_HEIGHT,
  TIMELINE_BOX_WIDTH,
} from './timelineLayout'
import { FONT_SANS } from '../styles/typographyTokens'

const PRIORITY_LABEL: Record<TimelineEntry['priority'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const PRIORITY_COLOR: Record<TimelineEntry['priority'], string> = {
  low: '#9ca3af',
  medium: '#d97706',
  high: '#dc2626',
  critical: '#7f1d1d',
}

const LAYOUT_LABEL: Record<TimelineLayout, string> = {
  horizontal: 'Horizontal',
  snake: 'Snake',
  list: 'List',
}

const PRINT_WIDTH = 920

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function visibleSorted(entries: TimelineEntry[]): TimelineEntry[] {
  return entries.filter((entry) => entry.visible).sort((a, b) => a.sortKey - b.sortKey)
}

function buildListPrintBody(entries: TimelineEntry[]): string {
  const rows = visibleSorted(entries)
    .map(
      (entry) =>
        `<tr>
          <td>${escapeHtml(entry.displayDate)}</td>
          <td>${escapeHtml(entry.heading)}</td>
          <td>${escapeHtml(entry.subheading || '—')}</td>
          <td>${PRIORITY_LABEL[entry.priority]}</td>
        </tr>`,
    )
    .join('')

  return `<table>
    <thead>
      <tr><th>Date</th><th>Heading</th><th>Subheading</th><th>Priority</th></tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="4">No entries</td></tr>'}</tbody>
  </table>`
}

function buildCanvasPrintBody(entries: TimelineEntry[], layout: 'horizontal' | 'snake'): string {
  const { placed, contentWidth, contentHeight } = layoutTimelineEntries(entries, layout, PRINT_WIDTH)
  const axisY = getTimelineAxisY(layout, contentHeight)
  const snakePath = layout === 'snake' ? buildSnakeConnectorPath(placed) : ''
  const horizontalSegments =
    layout === 'horizontal' ? buildHorizontalConnectorSegments(placed, axisY) : []

  const cards = placed
    .filter((item) => item.entry.visible)
    .map((item) => {
      const { entry, x, y } = item
      const color = PRIORITY_COLOR[entry.priority]
      return `<article class="entry entry--${entry.priority}" style="left:${x}px;top:${y}px;width:${TIMELINE_BOX_WIDTH}px;height:${TIMELINE_BOX_HEIGHT}px;border-left-color:${color}">
        <span class="entry__date">${escapeHtml(entry.displayDate)}</span>
        <strong class="entry__heading">${escapeHtml(entry.heading)}</strong>
        ${entry.subheading ? `<span class="entry__subheading">${escapeHtml(entry.subheading)}</span>` : ''}
      </article>`
    })
    .join('')

  const axis =
    layout === 'horizontal'
      ? `<div class="axis" style="top:${axisY}px;width:${contentWidth}px"></div>`
      : ''

  const connectors =
    layout === 'horizontal'
      ? `<svg class="connectors" width="${contentWidth}" height="${contentHeight}" aria-hidden="true">
          ${horizontalSegments
            .filter((segment) => {
              const entry = placed.find((item) => item.entry.id === segment.key)?.entry
              return entry?.visible
            })
            .map(
              (segment) =>
                `<line x1="${segment.x1}" y1="${segment.y1}" x2="${segment.x2}" y2="${segment.y2}" stroke="#c9bfb3" stroke-width="1" />`,
            )
            .join('')}
        </svg>`
      : snakePath
        ? `<svg class="connectors" width="${contentWidth}" height="${contentHeight}" aria-hidden="true">
            <path d="${snakePath}" fill="none" stroke="#c9bfb3" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
          </svg>`
        : ''

  return `<div class="canvas" style="width:${contentWidth}px;height:${contentHeight}px">
    ${axis}
    ${connectors}
    ${cards}
  </div>`
}

export function buildTimelinePrintHtml(snapshot: TimelineSnapshot, title: string): string {
  const body =
    snapshot.layout === 'list'
      ? buildListPrintBody(snapshot.entries)
      : buildCanvasPrintBody(snapshot.entries, snapshot.layout)

  const canvasStyles =
    snapshot.layout === 'list'
      ? ''
      : `
    .canvas { position: relative; margin: 0 auto; }
    .axis { position: absolute; left: 0; height: 2px; background: #ded6cc; transform: translateY(-1px); }
    .connectors { position: absolute; inset: 0; pointer-events: none; }
    .entry {
      position: absolute;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      border: 1px solid #ded6cc;
      border-left-width: 3px;
      border-radius: 4px;
      background: #fff;
      padding: 0.5rem 0.625rem 0.5rem 0.75rem;
    }
    .entry__date { font-size: 0.625rem; color: #6d655c; }
    .entry__heading { font-size: 0.75rem; line-height: 1.2; }
    .entry__subheading { font-size: 0.625rem; color: #6d655c; line-height: 1.2; }
  `

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: ${FONT_SANS}; margin: 1.5rem; color: #24211e; }
    h1 { font-size: 1.125rem; margin: 0 0 0.25rem; }
    p { margin: 0 0 1rem; color: #6d655c; font-size: 0.8125rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    th, td { border: 1px solid #ded6cc; padding: 0.5rem 0.625rem; text-align: left; vertical-align: top; }
    th { background: #fafaf8; font-weight: 600; }
    ${canvasStyles}
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>Layout: ${LAYOUT_LABEL[snapshot.layout]}</p>
  ${body}
</body>
</html>`
}
