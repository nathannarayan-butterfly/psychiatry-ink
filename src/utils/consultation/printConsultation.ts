import { loadConsultationSession } from '../../services/consultationApi'
import type {
  ConsultationReport,
  ConsultationRequest,
  ConsultationSession,
  ConsultationUrgency,
} from '../../types/consultation'
import { CONSULTATION_STATUS_LABELS } from '../../types/consultation'
import { escapeHtml } from '../documentTemplate/htmlUtils'
import { FONT_SANS } from '../../styles/typographyTokens'

const URGENCY_LABELS: Record<ConsultationUrgency, string> = {
  routine: 'Routine',
  urgent: 'Dringend',
  emergency: 'Notfall',
}

export interface ConsultationPrintRequestData {
  caseRef: string
  specialty: string
  title: string
  clinicalQuestion: string
  kurzanamnese: string
  urgency: ConsultationUrgency
  deadline: string | null
  examinationRequested?: boolean
  legalConsentNote?: string | null
  sharedSectionLabels: string[]
  status?: ConsultationRequest['status']
  createdAt?: string
}

export interface ConsultationPrintReportData {
  findings: string
  assessment: string
  recommendations: string
  limitations: string
  followUp: string
  submittedAt?: string | null
}

export function formatConsultationCaseRef(caseId: string): string {
  const trimmed = caseId.trim()
  if (!trimmed) return '—'
  return trimmed.length > 12 ? `${trimmed.slice(0, 8)}…` : trimmed
}

export function formatConsultationDeadline(deadline: string | null | undefined): string {
  if (!deadline) return '—'
  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatConsultationPrintDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function consultationRequestToPrintData(
  request: ConsultationRequest,
  sharedSectionLabels: string[],
  caseRef?: string,
): ConsultationPrintRequestData {
  return {
    caseRef: caseRef ?? formatConsultationCaseRef(request.caseId),
    specialty: request.specialty,
    title: request.title,
    clinicalQuestion: request.clinicalQuestion,
    kurzanamnese: request.kurzanamnese,
    urgency: request.urgency,
    deadline: request.deadline,
    examinationRequested: request.examinationRequested,
    legalConsentNote: request.legalConsentNote,
    sharedSectionLabels,
    status: request.status,
    createdAt: request.createdAt,
  }
}

export function consultationReportToPrintData(report: ConsultationReport): ConsultationPrintReportData {
  return {
    findings: report.findings,
    assessment: report.assessment,
    recommendations: report.recommendations,
    limitations: report.limitations,
    followUp: report.followUp,
    submittedAt: report.submittedAt,
  }
}

function renderField(label: string, value: string, options?: { pre?: boolean }): string {
  const content = escapeHtml(value || '—')
  if (options?.pre) {
    return `<div class="ks-print-field">
  <div class="ks-print-label">${escapeHtml(label)}</div>
  <pre class="ks-print-value">${content}</pre>
</div>`
  }
  return `<div class="ks-print-field">
  <div class="ks-print-label">${escapeHtml(label)}</div>
  <p class="ks-print-value">${content}</p>
</div>`
}

function renderSectionList(labels: string[]): string {
  if (labels.length === 0) {
    return renderField('Freigegebene Unterlagen', '—')
  }
  const items = labels.map((label) => `<li>${escapeHtml(label)}</li>`).join('')
  return `<div class="ks-print-field">
  <div class="ks-print-label">Freigegebene Unterlagen</div>
  <ul class="ks-print-list">${items}</ul>
</div>`
}

export function buildConsultationPrintHtml(
  request: ConsultationPrintRequestData,
  report?: ConsultationPrintReportData | null,
): string {
  const statusLine =
    request.status != null
      ? `<p class="ks-print-meta">Status: ${escapeHtml(CONSULTATION_STATUS_LABELS[request.status])}</p>`
      : ''
  const createdLine = request.createdAt
    ? `<p class="ks-print-meta">Erstellt: ${escapeHtml(formatConsultationPrintDate(request.createdAt))}</p>`
    : ''

  const reportBlock =
    report != null
      ? `
<section class="ks-print-section">
  <h2 class="ks-print-heading">Konsilbericht</h2>
  <p class="ks-print-meta">Eingereicht: ${escapeHtml(formatConsultationPrintDate(report.submittedAt ?? undefined))}</p>
  ${renderField('Befunde', report.findings, { pre: true })}
  ${renderField('Beurteilung', report.assessment, { pre: true })}
  ${renderField('Empfehlungen', report.recommendations, { pre: true })}
  ${renderField('Limitationen', report.limitations, { pre: true })}
  ${renderField('Follow-up', report.followUp, { pre: true })}
</section>`
      : ''

  const body = `<article class="ks-print-page">
  <header class="ks-print-header">
    <h1 class="ks-print-title">Konsilanfrage</h1>
    <p class="ks-print-meta">Fallreferenz: ${escapeHtml(request.caseRef)}</p>
    ${statusLine}
    ${createdLine}
  </header>
  <section class="ks-print-section">
    ${renderField('Fachrichtung', request.specialty)}
    ${renderField('Titel', request.title)}
    ${renderField('Fragestellung', request.clinicalQuestion, { pre: true })}
    ${renderField('Kurzanamnese', request.kurzanamnese, { pre: true })}
    ${renderField('Dringlichkeit', URGENCY_LABELS[request.urgency])}
    ${renderField('Frist', formatConsultationDeadline(request.deadline))}
    ${renderField(
      'Patientenuntersuchung',
      request.examinationRequested ? 'Direkte Untersuchung angefordert' : 'Nicht angefordert',
    )}
    ${renderSectionList(request.sharedSectionLabels)}
    ${
      request.legalConsentNote?.trim()
        ? renderField('Rechtliches / Einwilligung', request.legalConsentNote.trim(), { pre: true })
        : ''
    }
  </section>
  ${reportBlock}
  <footer class="ks-print-footer">
    Gedruckt über Psychiatry.ink · ${escapeHtml(formatConsultationPrintDate(new Date().toISOString()))}
  </footer>
</article>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(request.title || 'Konsilanfrage')}</title>
<style>
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: ${FONT_SANS}; font-size: 11pt; line-height: 1.55; color: #1a1a1a; background: #fff; }
.ks-print-page { max-width: 178mm; margin: 0 auto; }
.ks-print-header { border-bottom: 1px solid #ccc; margin-bottom: 6mm; padding-bottom: 3mm; }
.ks-print-title { margin: 0 0 2mm; font-size: 16pt; font-weight: 600; letter-spacing: -0.01em; }
.ks-print-meta { margin: 0 0 1mm; font-size: 9pt; color: #555; }
.ks-print-section { margin-bottom: 5mm; }
.ks-print-heading { margin: 0 0 3mm; font-size: 10pt; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #333; }
.ks-print-field { margin-bottom: 4mm; }
.ks-print-label { font-size: 9pt; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #444; margin-bottom: 1mm; }
.ks-print-value { margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 11pt; }
.ks-print-list { margin: 0; padding-left: 1.2rem; }
.ks-print-list li { margin-bottom: 0.5mm; }
.ks-print-footer { margin-top: 8mm; padding-top: 3mm; border-top: 1px solid #ddd; font-size: 8pt; color: #777; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>${body}</body>
</html>`
}

export function openConsultationPrintDocument(html: string): void {
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

export function printConsultationDocument(
  request: ConsultationPrintRequestData,
  report?: ConsultationPrintReportData | null,
): void {
  openConsultationPrintDocument(buildConsultationPrintHtml(request, report))
}

export function printConsultationSession(session: ConsultationSession): void {
  const labels = session.sharedItems.map((item) => item.label).filter(Boolean)
  const requestData = consultationRequestToPrintData(session.request, labels)
  const reportData =
    session.report?.status === 'submitted'
      ? consultationReportToPrintData(session.report)
      : null
  printConsultationDocument(requestData, reportData)
}

export async function printConsultationById(requestId: string): Promise<void> {
  const session = await loadConsultationSession(requestId)
  printConsultationSession(session)
}
