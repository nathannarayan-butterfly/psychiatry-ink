import type { CalendarItem } from '../../types/calendar'
import {
  CALENDAR_STATUS_LABELS,
  CALENDAR_TYPE_LABELS,
  formatCalendarTime,
} from '../calendarLabels'
import { escapeHtml } from '../documentTemplate/htmlUtils'
import { FONT_SANS } from '../../styles/typographyTokens'

export interface PrintDayScheduleOptions {
  /** Include notes column (default: false). */
  includeNotes?: boolean
  /** Resolve patient display name from case registry. */
  resolvePatientName?: (caseId?: string) => string
}

function formatPrintDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatPrintedAt(): string {
  return new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function resolvePatient(
  item: CalendarItem,
  resolvePatientName?: (caseId?: string) => string,
): string {
  if (resolvePatientName) return resolvePatientName(item.caseId)
  if (!item.caseId) return '—'
  return item.caseId.length > 12 ? `${item.caseId.slice(0, 8)}…` : item.caseId
}

function renderRow(item: CalendarItem, options: PrintDayScheduleOptions): string {
  const reasonOrTitle = item.reason?.trim() || item.title.trim() || '—'
  const notesCell =
    options.includeNotes === true
      ? `<td class="cal-print-notes">${escapeHtml(item.notes?.trim() || '—')}</td>`
      : ''

  return `<tr>
  <td class="cal-print-time">${escapeHtml(formatCalendarTime(item.startTime))}</td>
  <td>${escapeHtml(resolvePatient(item, options.resolvePatientName))}</td>
  <td>${escapeHtml(CALENDAR_TYPE_LABELS[item.type])}</td>
  <td>${escapeHtml(reasonOrTitle)}</td>
  <td>${escapeHtml(CALENDAR_STATUS_LABELS[item.status])}</td>
  <td>${escapeHtml(item.location?.trim() || '—')}</td>
  ${notesCell}
</tr>`
}

export function buildDaySchedulePrintHtml(
  items: CalendarItem[],
  date: Date,
  options: PrintDayScheduleOptions = {},
): string {
  const sorted = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime))
  const notesHeader = options.includeNotes === true ? '<th>Notizen</th>' : ''
  const rows =
    sorted.length > 0
      ? sorted.map((item) => renderRow(item, options)).join('')
      : `<tr><td colspan="${options.includeNotes ? 7 : 6}" class="cal-print-empty">Keine Termine an diesem Tag.</td></tr>`

  const body = `<article class="cal-print-page">
  <header class="cal-print-header">
    <h1 class="cal-print-title">Tagesplan</h1>
    <p class="cal-print-meta">${escapeHtml(formatPrintDate(date))}</p>
    <p class="cal-print-meta">${sorted.length} Termin${sorted.length === 1 ? '' : 'e'}</p>
  </header>
  <table class="cal-print-table">
    <thead>
      <tr>
        <th>Uhrzeit</th>
        <th>Patient</th>
        <th>Terminart</th>
        <th>Grund / Titel</th>
        <th>Status</th>
        <th>Ort</th>
        ${notesHeader}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <footer class="cal-print-footer">
    Gedruckt über Psychiatry.ink · ${escapeHtml(formatPrintedAt())}
  </footer>
</article>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Tagesplan · ${escapeHtml(formatPrintDate(date))}</title>
<style>
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: ${FONT_SANS}; font-size: 10pt; line-height: 1.4; color: #1a1a1a; background: #fff; }
.cal-print-page { max-width: 186mm; margin: 0 auto; }
.cal-print-header { border-bottom: 1px solid #ccc; margin-bottom: 5mm; padding-bottom: 3mm; }
.cal-print-title { margin: 0 0 1.5mm; font-size: 15pt; font-weight: 600; letter-spacing: -0.01em; }
.cal-print-meta { margin: 0 0 1mm; font-size: 9pt; color: #555; }
.cal-print-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
.cal-print-table th { text-align: left; font-weight: 600; font-size: 8pt; letter-spacing: 0.03em; text-transform: uppercase; color: #444; border-bottom: 1.5px solid #333; padding: 2mm 2mm 1.5mm 0; vertical-align: bottom; }
.cal-print-table td { padding: 2mm 2mm 2mm 0; border-bottom: 0.5px solid #ddd; vertical-align: top; }
.cal-print-time { white-space: nowrap; font-variant-numeric: tabular-nums; }
.cal-print-notes { max-width: 38mm; white-space: pre-wrap; font-size: 8.5pt; color: #333; }
.cal-print-empty { text-align: center; color: #666; font-style: italic; padding: 6mm 0; }
.cal-print-footer { margin-top: 6mm; padding-top: 2mm; border-top: 1px solid #ddd; font-size: 8pt; color: #777; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cal-print-table tr { break-inside: avoid; }
}
</style>
</head>
<body>${body}</body>
</html>`
}

function openPrintDocument(html: string): void {
  if (typeof window === 'undefined') return

  const printWindow = window.open('', '_blank', 'noopener,width=900,height=1000')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
    return
  }

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    document.body.removeChild(iframe)
  }, 250)
}

/** Client-side print from already-decrypted calendar items (zero-knowledge). */
export function printDaySchedule(
  items: CalendarItem[],
  date: Date,
  options: PrintDayScheduleOptions = {},
): void {
  const html = buildDaySchedulePrintHtml(items, date, options)
  openPrintDocument(html)
}
