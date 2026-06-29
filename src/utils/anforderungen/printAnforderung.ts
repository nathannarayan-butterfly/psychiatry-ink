import type {
  Anforderung,
  AnforderungStatus,
  AnforderungUrgency,
} from '../../types/anforderung'
import { escapeHtml } from '../documentTemplate/htmlUtils'
import { FONT_SANS } from '../../styles/typographyTokens'
import { printHtmlDocument } from '../print/printDocument'

const URGENCY_LABELS_DE: Record<AnforderungUrgency, string> = {
  routine: 'Routine',
  soon: 'Zeitnah',
  urgent: 'Dringend',
}

const STATUS_LABELS_DE: Record<AnforderungStatus, string> = {
  pending: 'Ausstehend (Freigabe)',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
  cancelled: 'Storniert',
}

export interface AnforderungPrintContext {
  caseRef: string
  patientName?: string
  patientDob?: string
  requestingClinician?: string
  organisationName?: string
}

function formatPrintDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-')
      return `${d}.${m}.${y}`
    }
    return '—'
  }
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function renderField(label: string, value: string, options?: { pre?: boolean }): string {
  const content = escapeHtml(value || '—')
  if (options?.pre) {
    return `<div class="anf-print-field">
  <div class="anf-print-label">${escapeHtml(label)}</div>
  <pre class="anf-print-value">${content}</pre>
</div>`
  }
  return `<div class="anf-print-field">
  <div class="anf-print-label">${escapeHtml(label)}</div>
  <p class="anf-print-value">${content}</p>
</div>`
}

function renderOrderRow(order: Anforderung): string {
  const note = order.note?.trim()
    ? `<div class="anf-print-order-note">${escapeHtml(order.note.trim())}</div>`
    : ''
  const review =
    order.reviewComment?.trim() && order.status !== 'pending'
      ? `<div class="anf-print-order-review">${escapeHtml(order.reviewComment.trim())}</div>`
      : ''
  return `<tr>
  <td>${escapeHtml(order.label)}</td>
  <td>${escapeHtml(URGENCY_LABELS_DE[order.urgency])}</td>
  <td>${escapeHtml(formatPrintDate(order.requestedDate))}</td>
  <td>${escapeHtml(STATUS_LABELS_DE[order.status])}</td>
</tr>
<tr class="anf-print-order-detail"><td colspan="4">${note}${review}</td></tr>`
}

export function buildAnforderungPrintHtml(
  orders: Anforderung[],
  context: AnforderungPrintContext,
): string {
  const activeOrders = orders.filter(
    (o) => o.status === 'pending' || o.status === 'accepted',
  )
  const rows = activeOrders.map(renderOrderRow).join('\n')
  const patientBlock =
    context.patientName?.trim() || context.patientDob?.trim()
      ? `${renderField('Patient/in', context.patientName?.trim() ?? '—')}
    ${renderField('Geburtsdatum', context.patientDob?.trim() ?? '—')}`
      : ''

  const body = `<article class="anf-print-page">
  <header class="anf-print-header">
    <h1 class="anf-print-title">Anforderung / Überweisung</h1>
    ${context.organisationName?.trim() ? `<p class="anf-print-meta">${escapeHtml(context.organisationName.trim())}</p>` : ''}
    <p class="anf-print-meta">Fallreferenz: ${escapeHtml(context.caseRef)}</p>
    <p class="anf-print-meta">Erstellt: ${escapeHtml(formatPrintDate(new Date().toISOString()))}</p>
    ${context.requestingClinician?.trim() ? `<p class="anf-print-meta">Anfordernd: ${escapeHtml(context.requestingClinician.trim())}</p>` : ''}
  </header>
  <section class="anf-print-section">
    ${patientBlock}
    <table class="anf-print-table">
      <thead>
        <tr>
          <th>Leistung</th>
          <th>Dringlichkeit</th>
          <th>Wunschtermin</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="4">Keine aktiven Anforderungen</td></tr>'}
      </tbody>
    </table>
  </section>
  <footer class="anf-print-footer">
    Gedruckt über Psychiatry.ink · ${escapeHtml(formatPrintDate(new Date().toISOString()))}
  </footer>
</article>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Anforderung</title>
<style>
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: ${FONT_SANS}; font-size: 11pt; line-height: 1.55; color: #1a1a1a; background: #fff; }
.anf-print-page { max-width: 178mm; margin: 0 auto; }
.anf-print-header { border-bottom: 1px solid #ccc; margin-bottom: 6mm; padding-bottom: 3mm; }
.anf-print-title { margin: 0 0 2mm; font-size: 16pt; font-weight: 600; }
.anf-print-meta { margin: 0 0 1mm; font-size: 9pt; color: #555; }
.anf-print-section { margin-bottom: 5mm; }
.anf-print-field { margin-bottom: 4mm; }
.anf-print-label { font-size: 9pt; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #444; margin-bottom: 1mm; }
.anf-print-value { margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 11pt; }
.anf-print-table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 4mm; }
.anf-print-table th, .anf-print-table td { border: 1px solid #ccc; padding: 2mm 2.5mm; text-align: left; vertical-align: top; }
.anf-print-table th { background: #f5f5f5; font-weight: 600; font-size: 9pt; }
.anf-print-order-detail td { font-size: 9pt; color: #444; border-top: none; padding-top: 0; }
.anf-print-order-note, .anf-print-order-review { margin-top: 1mm; white-space: pre-wrap; }
.anf-print-footer { margin-top: 8mm; padding-top: 3mm; border-top: 1px solid #ddd; font-size: 8pt; color: #777; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>${body}</body>
</html>`
}

export function openAnforderungPrintDocument(html: string): void {
  // Route through the shared, robust print helper. The previous implementation
  // requested `noopener`, which makes window.open return null per spec, so the
  // popup could never be written to and print silently did nothing.
  printHtmlDocument(html)
}

export function printAnforderungen(orders: Anforderung[], context: AnforderungPrintContext): void {
  openAnforderungPrintDocument(buildAnforderungPrintHtml(orders, context))
}

export function printSingleAnforderung(
  order: Anforderung,
  context: AnforderungPrintContext,
): void {
  printAnforderungen([order], context)
}

export { URGENCY_LABELS_DE, STATUS_LABELS_DE, formatPrintDate }
