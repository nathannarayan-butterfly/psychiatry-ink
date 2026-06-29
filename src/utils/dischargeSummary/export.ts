import type {
  DischargeSummaryDraft,
  DischargeSummaryDocumentType,
  DischargeSummaryFetchResult,
  DischargeSummaryIdentityBlock,
  DischargeSummaryRegion,
} from '../../types/dischargeSummary'
import {
  defaultDischargeSummaryTitle,
  getDischargeSummarySectionLabel,
  getDischargeSummarySections,
} from '../../data/dischargeSummarySections'
import { isSectionIncludedInFinal } from './draftOps'
import { applyRegionSpelling, regionLocale } from './regionSpelling'
import { FONT_SANS } from '../../styles/typographyTokens'
import { printHtmlDocument } from '../print/printDocument'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function assembleDischargeSummaryText(
  draft: DischargeSummaryDraft,
  sectionLabels: Record<string, string>,
): string {
  const defs = getDischargeSummarySections(draft.documentType)
  const lines: string[] = []

  for (const def of defs) {
    const section = draft.sections[def.id]
    if (!section || !isSectionIncludedInFinal(section)) continue
    let content = section.currentContent.trim()
    if (!content) continue
    content = applyRegionSpelling(content, draft.region)
    const label = sectionLabels[def.id] ?? def.labelEn
    if (
      def.flowSection ||
      def.id === 'header' ||
      def.id === 'sign-off' ||
      def.id === 'copy-recipients' ||
      def.id === 'patient-details'
    ) {
      lines.push(content)
    } else {
      lines.push(`${label}\n${content}`)
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}

export function buildDischargeSummaryPrintHtml(
  draft: DischargeSummaryDraft,
  sectionLabels: Record<string, string>,
  title: string,
): string {
  const defs = getDischargeSummarySections(draft.documentType)
  const bodyParts: string[] = []
  const locale = regionLocale(draft.region)

  for (const def of defs) {
    const section = draft.sections[def.id]
    if (!section || !isSectionIncludedInFinal(section)) continue
    const content = applyRegionSpelling(section.currentContent.trim(), draft.region)
    if (!content) continue
    const label = sectionLabels[def.id] ?? def.labelEn
    if (def.flowSection || def.id === 'header' || def.id === 'sign-off' || def.id === 'copy-recipients') {
      bodyParts.push(`<pre class="ab-flow">${escapeHtml(content)}</pre>`)
    } else {
      bodyParts.push(`<h2>${escapeHtml(label)}</h2><pre>${escapeHtml(content)}</pre>`)
    }
  }

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
@page { size: A4; margin: 2cm; }
body { font-family: ${FONT_SANS}; font-size: 12pt; line-height: 1.55; color: #111; margin: 2cm; }
h2 { font-size: 11pt; font-weight: 600; margin: 1.2rem 0 0.35rem; text-transform: uppercase; letter-spacing: 0.04em; }
pre { white-space: pre-wrap; font-family: inherit; margin: 0 0 0.8rem; }
.ab-flow { margin-bottom: 1rem; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${bodyParts.join('')}
</body>
</html>`
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function copyDischargeSummaryText(text: string): Promise<boolean> {
  if (!text.trim()) return Promise.resolve(false)
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    },
  )
}

export function printDischargeSummary(
  draft: DischargeSummaryDraft,
  sectionLabels: Record<string, string>,
): void {
  printHtmlDocument(buildDischargeSummaryPrintHtml(draft, sectionLabels, draft.title))
}

export function exportDischargeSummaryPdf(
  draft: DischargeSummaryDraft,
  sectionLabels: Record<string, string>,
): void {
  printDischargeSummary(draft, sectionLabels)
}

export function exportDischargeSummaryDocx(
  draft: DischargeSummaryDraft,
  sectionLabels: Record<string, string>,
): void {
  const html = buildDischargeSummaryPrintHtml(draft, sectionLabels, draft.title)
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  })
  const stem = draft.title.replace(/[^\w\-]+/gi, '_').slice(0, 60)
  downloadBlob(blob, `${stem}.doc`)
}

export function buildDefaultHeaderTemplate(
  documentType: DischargeSummaryDocumentType,
  region: DischargeSummaryRegion,
): string {
  const title = defaultDischargeSummaryTitle(documentType, region)
  return `{institution}
{ward}

{date}

${title}

Responsible clinician: {responsibleClinician}
Recipient: {recipient}`
}

export function mergeIdentityIntoHeader(
  headerTemplate: string,
  identity: DischargeSummaryIdentityBlock,
): string {
  const replacements: Record<string, string | undefined> = {
    '{institution}': identity.institution,
    '{ward}': identity.ward,
    '{date}': identity.documentDate,
    '{responsibleClinician}': identity.responsibleClinician ?? identity.consultant,
    '{recipient}': identity.recipient,
  }
  let result = headerTemplate
  for (const [key, value] of Object.entries(replacements)) {
    if (value) result = result.replace(new RegExp(key, 'g'), value)
  }
  return result
}

export function formatPatientDetailsBlock(identity: DischargeSummaryIdentityBlock): string {
  const lines: string[] = []
  if (identity.patientName) lines.push(`Name: ${identity.patientName}`)
  if (identity.patientDob) lines.push(`Date of birth: ${identity.patientDob}`)
  if (identity.patientId) lines.push(`Hospital / patient ID: ${identity.patientId}`)
  if (identity.patientAge) lines.push(`Age: ${identity.patientAge}`)
  if (identity.patientSex) lines.push(`Sex: ${identity.patientSex}`)
  if (identity.patientAddress) lines.push(`Address: ${identity.patientAddress}`)
  return lines.join('\n')
}

export function formatAdmissionDetailsBlock(
  identity: DischargeSummaryIdentityBlock,
  region: DischargeSummaryRegion,
): string {
  const lines: string[] = []
  if (identity.admissionDate) lines.push(`Admission date: ${identity.admissionDate}`)
  if (identity.dischargeDate) lines.push(`Discharge date: ${identity.dischargeDate}`)
  if (identity.treatmentPeriod) lines.push(`Inpatient period: ${identity.treatmentPeriod}`)
  if (identity.ward) lines.push(`Ward / unit: ${identity.ward}`)
  if (identity.admissionType) lines.push(`Admission type: ${identity.admissionType}`)
  if (identity.dischargeDestination) {
    const label = region === 'UK' ? 'Discharge destination' : 'Discharge disposition'
    lines.push(`${label}: ${identity.dischargeDestination}`)
  }
  if (identity.consultant) lines.push(`Consultant / attending: ${identity.consultant}`)
  return lines.join('\n')
}

export function applyIdentityToDraftSections(
  draft: DischargeSummaryDraft,
  identity: DischargeSummaryIdentityBlock,
  fetchResult?: DischargeSummaryFetchResult,
): DischargeSummaryDraft {
  const next = structuredClone(draft)

  if (next.sections.header) {
    const template =
      next.sections.header.currentContent.trim() ||
      buildDefaultHeaderTemplate(draft.documentType, draft.region)
    next.sections.header.currentContent = mergeIdentityIntoHeader(template, identity)
    next.sections.header.status = 'auto_fetched'
  }

  if (next.sections['patient-details']) {
    const block = formatPatientDetailsBlock(identity)
    if (block) {
      next.sections['patient-details'].currentContent = block
      next.sections['patient-details'].status = 'auto_fetched'
      next.sections['patient-details'].sourcePreview = 'Patient identity (local only)'
    }
  }

  const admissionKey =
    draft.documentType === 'short_discharge_summary' ? 'admission-details' : 'admission-discharge-details'
  if (next.sections[admissionKey]) {
    const block = formatAdmissionDetailsBlock(identity, draft.region)
    if (block) {
      next.sections[admissionKey].currentContent = block
      next.sections[admissionKey].status = 'auto_fetched'
    }
  }

  if (next.sections['copy-recipients'] && identity.recipient) {
    next.sections['copy-recipients'].currentContent = identity.recipient
    next.sections['copy-recipients'].status = 'auto_fetched'
  }

  if (next.sections['sign-off'] && identity.signatureBlock) {
    next.sections['sign-off'].currentContent = identity.signatureBlock
  }

  if (fetchResult) {
    next.sourceSnapshotIds = fetchResult.sourceSnapshotIds
  }

  next.updatedAt = new Date().toISOString()
  return next
}

export function buildSectionLabelsForDraft(draft: DischargeSummaryDraft): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const def of getDischargeSummarySections(draft.documentType)) {
    labels[def.id] = getDischargeSummarySectionLabel(def, draft.region)
  }
  return labels
}
