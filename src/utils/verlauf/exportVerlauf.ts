import { FONT_SANS } from '../../styles/typographyTokens'
import { formatIsoTimestampDate, formatIsoTimestampTime } from '../siteTimezone'
import { derivedFeedEntryText } from '../verlaufAnnotationHelpers'
import { printHtmlDocument } from '../print/printDocument'

export interface VerlaufExportManualEntry {
  kind: 'manual'
  date: string
  sectionLabel?: string
  subheading?: string
  content: string
}

export interface VerlaufExportDerivedEntry {
  kind: 'derived'
  date: string
  sourceLabel: string
  title: string
  body: string
  sections?: { label: string; content: string }[]
}

export type VerlaufExportItem = VerlaufExportManualEntry | VerlaufExportDerivedEntry

interface VerlaufExportBlock {
  dateLine: string
  metaLine?: string
  content: string
}

function formatDateLine(date: string): string {
  const parts = [formatIsoTimestampDate(date), formatIsoTimestampTime(date)].filter(Boolean)
  return parts.join(' ')
}

function itemToBlock(item: VerlaufExportItem): VerlaufExportBlock {
  const dateLine = formatDateLine(item.date)

  if (item.kind === 'manual') {
    const metaLine = [item.sectionLabel, item.subheading].filter(Boolean).join(' — ') || undefined
    return { dateLine, metaLine, content: item.content.trim() }
  }

  if (item.sections && item.sections.length > 0) {
    const content = item.sections
      .map((section) => `${section.label}:\n${section.content.trim()}`)
      .join('\n\n')
    return { dateLine, metaLine: item.sourceLabel, content }
  }

  return {
    dateLine,
    metaLine: item.sourceLabel,
    content: derivedFeedEntryText(item.title, item.body).trim(),
  }
}

export function buildVerlaufPlainText(items: VerlaufExportItem[], title: string): string {
  if (items.length === 0) return ''

  const entryBlocks = items.map((item) => {
    const block = itemToBlock(item)
    const header = block.metaLine
      ? `${block.dateLine}\n${block.metaLine}`
      : block.dateLine
    return `${header}\n${block.content}`.trim()
  })

  return [title.trim(), ...entryBlocks].filter(Boolean).join('\n\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildVerlaufPrintHtml(items: VerlaufExportItem[], title: string): string {
  const bodyEntries = items
    .map((item) => {
      const block = itemToBlock(item)
      const meta = block.metaLine
        ? `<div class="meta">${escapeHtml(block.metaLine)}</div>`
        : ''
      return `<article class="entry">
  <div class="date">${escapeHtml(block.dateLine)}</div>
  ${meta}
  <pre>${escapeHtml(block.content)}</pre>
</article>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: ${FONT_SANS}; font-size: 12pt; line-height: 1.6; margin: 2cm; color: #111; }
    h1 { font-size: 18pt; font-weight: 600; margin: 0 0 1.5rem; }
    .entry { margin: 0 0 1.4rem; padding-bottom: 1.2rem; border-bottom: 1px solid #e8e8e4; }
    .entry:last-child { border-bottom: none; }
    .date { font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #555; margin: 0 0 0.25rem; }
    .meta { font-size: 10pt; color: #666; margin: 0 0 0.5rem; }
    pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${bodyEntries}
</body>
</html>`
}

export function exportVerlaufText(fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function printVerlauf(items: VerlaufExportItem[], title: string): void {
  printHtmlDocument(buildVerlaufPrintHtml(items, title))
}
