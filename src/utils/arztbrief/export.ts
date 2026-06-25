import type {
  ArztbriefDraft,
  ArztbriefDocumentType,
  ArztbriefFetchResult,
  ArztbriefIdentityBlock,
} from '../../types/arztbrief'
import { getArztbriefSections } from '../../data/arztbriefSections'
import { isSectionIncludedInFinal } from './draftOps'
import { FONT_SANS } from '../../styles/typographyTokens'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function assembleArztbriefText(
  draft: ArztbriefDraft,
  sectionLabels: Record<string, string>,
): string {
  const defs = getArztbriefSections(draft.documentType)
  const lines: string[] = []

  for (const def of defs) {
    const section = draft.sections[def.id]
    if (!section || !isSectionIncludedInFinal(section)) continue
    const content = section.currentContent.trim()
    if (!content) continue
    const label = sectionLabels[def.id] ?? def.labelDe
    if (def.id === 'header' || def.id === 'greeting' || def.id === 'closing' || def.id === 'signature' || def.id === 'recipient') {
      lines.push(content)
    } else {
      lines.push(`${label}\n${content}`)
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}

export function buildArztbriefPrintHtml(
  draft: ArztbriefDraft,
  sectionLabels: Record<string, string>,
  title: string,
): string {
  const defs = getArztbriefSections(draft.documentType)
  const bodyParts: string[] = []

  for (const def of defs) {
    const section = draft.sections[def.id]
    if (!section || !isSectionIncludedInFinal(section)) continue
    const content = section.currentContent.trim()
    if (!content) continue
    const label = sectionLabels[def.id] ?? def.labelDe
    if (def.id === 'header' || def.id === 'greeting' || def.id === 'closing' || def.id === 'signature' || def.id === 'recipient') {
      bodyParts.push(`<pre class="ab-flow">${escapeHtml(content)}</pre>`)
    } else {
      bodyParts.push(`<h2>${escapeHtml(label)}</h2><pre>${escapeHtml(content)}</pre>`)
    }
  }

  return `<!DOCTYPE html>
<html lang="de">
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

export function copyArztbriefText(text: string): Promise<boolean> {
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

export function printArztbrief(draft: ArztbriefDraft, sectionLabels: Record<string, string>): void {
  const html = buildArztbriefPrintHtml(draft, sectionLabels, draft.title)
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

export function exportArztbriefPdf(
  draft: ArztbriefDraft,
  sectionLabels: Record<string, string>,
): void {
  printArztbrief(draft, sectionLabels)
}

export function exportArztbriefDocx(
  draft: ArztbriefDraft,
  sectionLabels: Record<string, string>,
): void {
  const html = buildArztbriefPrintHtml(draft, sectionLabels, draft.title)
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  })
  const stem = draft.title.replace(/[^\wäöüß\-]+/gi, '_').slice(0, 60)
  downloadBlob(blob, `${stem}.doc`)
}

export function exportArztbriefPlainText(
  draft: ArztbriefDraft,
  sectionLabels: Record<string, string>,
): void {
  const text = assembleArztbriefText(draft, sectionLabels)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const stem = draft.title.replace(/[^\wäöüß\-]+/gi, '_').slice(0, 60)
  downloadBlob(blob, `${stem}.txt`)
}

export function mergeIdentityIntoHeader(
  headerTemplate: string,
  identity: ArztbriefIdentityBlock,
): string {
  const replacements: Record<string, string | undefined> = {
    '{institution}': identity.institution,
    '{ward}': identity.ward,
    '{date}': identity.letterDate,
    '{patientName}': identity.patientName,
    '{dob}': identity.patientDob,
    '{treatmentPeriod}': identity.treatmentPeriod,
    '{recipient}': identity.recipient,
  }
  let result = headerTemplate
  for (const [key, value] of Object.entries(replacements)) {
    if (value) result = result.replace(new RegExp(key, 'g'), value)
  }
  return result
}

export function buildDefaultHeaderTemplate(documentType: ArztbriefDocumentType): string {
  const title =
    documentType === 'kurzbrief'
      ? 'Vorläufiger Entlassungsbericht / Kurzbrief'
      : 'Arztbrief'
  return `{institution}
{ward}

{date}

${title}

{nameLabel}: {patientName}
Geburtsdatum: {dob}
Behandlungszeitraum: {treatmentPeriod}

An: {recipient}`
}

export function applyIdentityToDraftSections(
  draft: ArztbriefDraft,
  identity: ArztbriefIdentityBlock,
  fetchResult?: ArztbriefFetchResult,
): ArztbriefDraft {
  const next = structuredClone(draft)
  const nameLabel = 'Patient'

  if (next.sections.header) {
    const template =
      next.sections.header.currentContent.trim() || buildDefaultHeaderTemplate(draft.documentType)
    next.sections.header.currentContent = mergeIdentityIntoHeader(template, {
      ...identity,
      patientName: identity.patientName,
    }).replace('{nameLabel}', nameLabel)
    next.sections.header.status = 'auto_fetched'
  }

  if (next.sections.recipient && identity.recipient) {
    next.sections.recipient.currentContent = identity.recipient
    next.sections.recipient.status = 'auto_fetched'
  }

  if (next.sections.signature && identity.signatureBlock) {
    next.sections.signature.currentContent = identity.signatureBlock
  }

  if (fetchResult) {
    next.sourceSnapshotIds = fetchResult.sourceSnapshotIds
  }

  next.updatedAt = new Date().toISOString()
  return next
}
