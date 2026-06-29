/**
 * Export utilities for a case's Anforderungen (requisitions).
 *
 * Reuses the same German clinical document produced by
 * {@link buildAnforderungPrintHtml} for HTML / Word / PDF, and the shared,
 * robust {@link printHtmlDocument} pipeline for PDF/print — never `noopener`,
 * which returns null and silently breaks the print/PDF window.
 *
 * All outputs include the patient details (name / DOB) and requisition fields
 * (service, urgency, preferred date, status, notes) carried by the print HTML.
 */

import type { Anforderung } from '../../types/anforderung'
import {
  buildAnforderungPrintHtml,
  formatPrintDate,
  STATUS_LABELS_DE,
  URGENCY_LABELS_DE,
  type AnforderungPrintContext,
} from './printAnforderung'
import { printHtmlDocument } from '../print/printDocument'

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug || 'anforderung'
}

function fileStem(context: AnforderungPrintContext): string {
  const patient = context.patientName?.trim()
  return `anforderungen-${slugify(patient || context.caseRef)}`
}

function downloadBlob(content: string, filename: string, mime: string): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Human-readable plain-text rendering mirroring the print document (patient
 * block + a line per active requisition with urgency / preferred date / status
 * and any note / review comment).
 */
export function buildAnforderungenText(
  orders: Anforderung[],
  context: AnforderungPrintContext,
): string {
  const active = orders.filter((o) => o.status === 'pending' || o.status === 'accepted')
  const lines: string[] = []
  lines.push('ANFORDERUNG / ÜBERWEISUNG')
  if (context.organisationName?.trim()) lines.push(context.organisationName.trim())
  lines.push(`Fallreferenz: ${context.caseRef}`)
  lines.push(`Erstellt: ${formatPrintDate(new Date().toISOString())}`)
  if (context.requestingClinician?.trim()) {
    lines.push(`Anfordernd: ${context.requestingClinician.trim()}`)
  }
  lines.push('')
  if (context.patientName?.trim() || context.patientDob?.trim()) {
    lines.push(`Patient/in: ${context.patientName?.trim() || '—'}`)
    lines.push(`Geburtsdatum: ${context.patientDob?.trim() || '—'}`)
    lines.push('')
  }
  lines.push('Leistungen:')
  if (active.length === 0) {
    lines.push('  Keine aktiven Anforderungen')
  } else {
    for (const order of active) {
      lines.push(
        `- ${order.label} | ${URGENCY_LABELS_DE[order.urgency]} | ` +
          `${formatPrintDate(order.requestedDate)} | ${STATUS_LABELS_DE[order.status]}`,
      )
      if (order.note?.trim()) lines.push(`    Anmerkung: ${order.note.trim()}`)
      if (order.reviewComment?.trim() && order.status !== 'pending') {
        lines.push(`    Kommentar: ${order.reviewComment.trim()}`)
      }
    }
  }
  lines.push('')
  lines.push(`Gedruckt über Psychiatry.ink · ${formatPrintDate(new Date().toISOString())}`)
  return lines.join('\n')
}

/** Download the requisition list as plain text (`.txt`). */
export function exportAnforderungenAsText(
  orders: Anforderung[],
  context: AnforderungPrintContext,
): void {
  downloadBlob(
    buildAnforderungenText(orders, context),
    `${fileStem(context)}.txt`,
    'text/plain;charset=utf-8',
  )
}

/** Download the requisition list as HTML-in-Word (`.doc`), reusing the print HTML. */
export function exportAnforderungenAsWord(
  orders: Anforderung[],
  context: AnforderungPrintContext,
): void {
  const html = buildAnforderungPrintHtml(orders, context)
  downloadBlob(`\ufeff${html}`, `${fileStem(context)}.doc`, 'application/msword;charset=utf-8')
}

/**
 * Export the requisition list as a PDF by routing the clean print HTML through
 * the browser's native print-to-PDF ("Save as PDF") destination — identical to
 * the layout/medication export pipeline, no extra dependency, no raster output.
 */
export function exportAnforderungenAsPdf(
  orders: Anforderung[],
  context: AnforderungPrintContext,
): void {
  printHtmlDocument(buildAnforderungPrintHtml(orders, context))
}
