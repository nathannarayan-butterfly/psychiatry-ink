import type { MedicationEntry } from '../../types/medicationPlan'
import type { PatientMedicationLabCorrelationFinding } from '../../types/labMedicationCorrelation'
import { escapeHtml } from '../documentTemplate/htmlUtils'
import {
  ABNORMALITY_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  STRENGTH_LABELS,
  formatCaseRef,
  formatValueRef,
} from './labMedCorrelationLabels'

export interface LabMedCorrelationPrintContext {
  caseId: string
  findings: PatientMedicationLabCorrelationFinding[]
  medications: MedicationEntry[]
  clinicalNotes?: string
  labSnapshotCount?: number
  labObservationCount?: number
}

function activeMedicationSummary(medications: MedicationEntry[]): string {
  return medications
    .filter((m) => m.status === 'active' || m.status === 'reduced' || m.status === 'increased')
    .map((m) => {
      const dose = m.doseLineGerman?.trim()
      return dose ? `${m.substance} (${dose})` : m.substance
    })
    .join('; ')
}

function formatPrintDate(iso?: string): string {
  const date = iso ? new Date(iso) : new Date()
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function csvEscape(value: string): string {
  const normalized = value.replace(/\r?\n/g, ' ').trim()
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function buildFindingRows(findings: PatientMedicationLabCorrelationFinding[]): string {
  return findings
    .map((finding) => {
      const meta = [
        finding.labDate ? `Labor: ${finding.labDate}` : null,
        finding.trend ? `Trend: ${finding.trend}` : null,
        finding.medStartDate ? `Therapiebeginn: ${finding.medStartDate}` : null,
      ]
        .filter(Boolean)
        .join(' · ')

      return `<tr>
  <td>${escapeHtml(finding.labParameterLabel)}</td>
  <td>${escapeHtml(formatValueRef(finding))}</td>
  <td>${escapeHtml(ABNORMALITY_LABELS[finding.abnormality])}</td>
  <td>${escapeHtml(finding.substanceName)}</td>
  <td>${escapeHtml(STRENGTH_LABELS[finding.correlationStrength])}</td>
  <td>${escapeHtml(finding.zusammenhang)}</td>
  <td>${escapeHtml(finding.recommendation)}</td>
  <td>${escapeHtml(SOURCE_LABELS[finding.source])}</td>
  <td>${escapeHtml(STATUS_LABELS[finding.status])}</td>
  <td>${escapeHtml(meta || '—')}</td>
  <td>${escapeHtml(finding.clinicianNote ?? '—')}</td>
</tr>`
    })
    .join('\n')
}

export function buildLabMedCorrelationPrintHtml(context: LabMedCorrelationPrintContext): string {
  const medSummary = activeMedicationSummary(context.medications) || '—'
  const notes = context.clinicalNotes?.trim() || '—'
  const rows = buildFindingRows(context.findings)

  const body = `<article class="ks-print-page">
  <header class="ks-print-header">
    <h1 class="ks-print-title">Labor-Medikament-Korrelation</h1>
    <p class="ks-print-meta">Fallreferenz: ${escapeHtml(formatCaseRef(context.caseId))}</p>
    <p class="ks-print-meta">Erstellt: ${escapeHtml(formatPrintDate())}</p>
    <p class="ks-print-meta">Aktive Medikamente: ${escapeHtml(medSummary)}</p>
    ${
      context.labSnapshotCount != null
        ? `<p class="ks-print-meta">Laborresultate: ${context.labSnapshotCount} · Auffällige Parameter: ${context.labObservationCount ?? '—'}</p>`
        : ''
    }
  </header>
  <section class="ks-print-section">
    <div class="ks-print-field">
      <div class="ks-print-label">Klinische Notizen</div>
      <p class="ks-print-value">${escapeHtml(notes)}</p>
    </div>
  </section>
  <section class="ks-print-section">
    <h2 class="ks-print-heading">Korrelationsbefunde (${context.findings.length})</h2>
    <table class="ks-print-table">
      <thead>
        <tr>
          <th>Laborparameter</th>
          <th>Wert/Referenz</th>
          <th>Auffälligkeit</th>
          <th>Medikament</th>
          <th>Stärke</th>
          <th>Zusammenhang</th>
          <th>Empfehlung</th>
          <th>Quelle</th>
          <th>Status</th>
          <th>Zeitbezug</th>
          <th>Anmerkung</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </section>
  <footer class="ks-print-footer">
    Gedruckt über Psychiatry.ink · Labor-Medikament-Korrelation (MVP) — KI-Befunde erst nach Akzeptanz klinisch verbindlich.
  </footer>
</article>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Labor-Medikament-Korrelation</title>
<style>
@page { size: A4 landscape; margin: 14mm 12mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 10pt; line-height: 1.45; color: #1a1a1a; background: #fff; }
.ks-print-page { max-width: 100%; margin: 0 auto; }
.ks-print-header { border-bottom: 1px solid #ccc; margin-bottom: 5mm; padding-bottom: 3mm; }
.ks-print-title { margin: 0 0 2mm; font-size: 14pt; font-weight: 600; }
.ks-print-meta { margin: 0 0 1mm; font-size: 8.5pt; color: #555; }
.ks-print-section { margin-bottom: 4mm; }
.ks-print-heading { margin: 0 0 2mm; font-size: 9pt; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #333; }
.ks-print-field { margin-bottom: 3mm; }
.ks-print-label { font-size: 8pt; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #444; margin-bottom: 1mm; }
.ks-print-value { margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 10pt; }
.ks-print-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
.ks-print-table th, .ks-print-table td { border: 1px solid #ccc; padding: 2mm 2.5mm; text-align: left; vertical-align: top; }
.ks-print-table th { background: #f5f5f5; font-weight: 600; }
.ks-print-footer { margin-top: 6mm; padding-top: 2mm; border-top: 1px solid #ddd; font-size: 7.5pt; color: #777; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>${body}</body>
</html>`
}

function openPrintDocument(html: string): void {
  if (typeof window === 'undefined') return

  const printWindow = window.open('', '_blank', 'noopener,width=1100,height=900')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
    return
  }

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
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

export function printLabMedCorrelation(context: LabMedCorrelationPrintContext): void {
  openPrintDocument(buildLabMedCorrelationPrintHtml(context))
}

export function exportLabMedCorrelationCsv(context: LabMedCorrelationPrintContext): void {
  const header = [
    'Laborparameter',
    'Wert',
    'Einheit',
    'Referenz',
    'Auffälligkeit',
    'Medikament',
    'Korrelationsstärke',
    'Zusammenhang',
    'Empfehlung',
    'Quelle',
    'Status',
    'Labor-Datum',
    'Mechanismus',
    'Monitoring',
    'Alternativen',
    'Anmerkung',
  ]

  const rows = context.findings.map((f) =>
    [
      f.labParameterLabel,
      f.labValue,
      f.labUnit,
      f.refRange ?? '',
      ABNORMALITY_LABELS[f.abnormality],
      f.substanceName,
      STRENGTH_LABELS[f.correlationStrength],
      f.zusammenhang,
      f.recommendation,
      SOURCE_LABELS[f.source],
      STATUS_LABELS[f.status],
      f.labDate,
      f.mechanism ?? '',
      f.monitoring ?? '',
      f.alternatives ?? '',
      f.clinicianNote ?? '',
    ]
      .map(csvEscape)
      .join(','),
  )

  const meta = [
    `# Labor-Medikament-Korrelation`,
    `# Fall: ${formatCaseRef(context.caseId)}`,
    `# Exportiert: ${formatPrintDate()}`,
    `# Medikamente: ${activeMedicationSummary(context.medications) || '—'}`,
    context.clinicalNotes?.trim() ? `# Notizen: ${context.clinicalNotes.trim()}` : null,
    '',
  ]
    .filter((line) => line != null)
    .join('\n')

  const csv = `${meta}${header.join(',')}\n${rows.join('\n')}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().slice(0, 10)
  const link = document.createElement('a')
  link.href = url
  link.download = `labor-medikament-korrelation-${context.caseId.slice(0, 8)}-${stamp}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
