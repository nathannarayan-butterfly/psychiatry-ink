import type { GenericPatientEducationDocument } from '../../types/patientEducationGeneric'
import type { UiLanguage } from '../../types/settings'
import {
  getGenericEducationSections,
  GENERIC_EDUCATION_DISCLAIMER_DE,
  GENERIC_EDUCATION_DISCLAIMER_EN,
} from '../../data/patientEducationGenericSections'
import { isSectionIncludedInFinal } from './draftOps'
import { FONT_SANS } from '../../styles/typographyTokens'
import { printHtmlDocument } from '../print/printDocument'
import { buildEducationConsentHtml, EDUCATION_CONSENT_PRINT_CSS } from './consentSection'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Patient-facing assembly — intentionally excludes doc.references (clinician-only). */
export function assembleGenericEducationText(
  doc: GenericPatientEducationDocument,
  sectionLabels: Record<string, string>,
): string {
  const defs = getGenericEducationSections()
  const lines: string[] = []

  for (const def of defs) {
    const section = doc.sections[def.id]
    if (!section || !isSectionIncludedInFinal(section)) continue
    const content = section.currentContent.trim()
    if (!content) continue
    const label = sectionLabels[def.id] ?? def.labelDe
    if (def.localIdentity) {
      lines.push(content)
    } else {
      lines.push(`${label}\n${content}`)
    }
    lines.push('')
  }

  const disclaimer =
    doc.language === 'en' ? GENERIC_EDUCATION_DISCLAIMER_EN : GENERIC_EDUCATION_DISCLAIMER_DE
  lines.push(disclaimer)
  return lines.join('\n').trim()
}

export function buildGenericEducationPrintHtml(
  doc: GenericPatientEducationDocument,
  sectionLabels: Record<string, string>,
  title: string,
  consentLocale?: UiLanguage,
): string {
  // References are clinician-facing only — never part of print/PDF/Word output.
  const defs = getGenericEducationSections()
  const bodyParts: string[] = []

  for (const def of defs) {
    const section = doc.sections[def.id]
    if (!section || !isSectionIncludedInFinal(section)) continue
    const content = section.currentContent.trim()
    if (!content) continue
    const label = sectionLabels[def.id] ?? def.labelDe
    if (def.localIdentity) {
      bodyParts.push(`<pre class="pe-flow">${escapeHtml(content)}</pre>`)
    } else {
      bodyParts.push(`<h2>${escapeHtml(label)}</h2><pre>${escapeHtml(content)}</pre>`)
    }
  }

  const disclaimer =
    doc.language === 'en' ? GENERIC_EDUCATION_DISCLAIMER_EN : GENERIC_EDUCATION_DISCLAIMER_DE

  // Signature/consent block is patient-facing; localise to the clinician's UI
  // language when known, otherwise the document language (de/en).
  const consentHtml = buildEducationConsentHtml(consentLocale ?? doc.language)

  return `<!DOCTYPE html>
<html lang="${consentLocale ?? doc.language}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
@page { size: A4; margin: 2cm; }
body { font-family: ${FONT_SANS}; font-size: 12pt; line-height: 1.55; color: #111; margin: 2cm; }
h1 { font-size: 14pt; margin-bottom: 1rem; }
h2 { font-size: 11pt; font-weight: 600; margin: 1.2rem 0 0.35rem; }
pre { white-space: pre-wrap; font-family: inherit; margin: 0 0 0.8rem; }
.pe-disclaimer { font-size: 9pt; color: #555; margin-top: 2rem; border-top: 1px solid #ccc; padding-top: 0.5rem; }
${EDUCATION_CONSENT_PRINT_CSS}
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${bodyParts.join('')}
<p class="pe-disclaimer">${escapeHtml(disclaimer)}</p>
${consentHtml}
</body>
</html>`
}

export async function copyGenericEducationText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function printGenericEducationDocument(
  doc: GenericPatientEducationDocument,
  sectionLabels: Record<string, string>,
  title?: string,
  consentLocale?: UiLanguage,
): void {
  printHtmlDocument(buildGenericEducationPrintHtml(doc, sectionLabels, title ?? doc.title, consentLocale))
}

export function exportGenericEducationPdfDocument(
  doc: GenericPatientEducationDocument,
  sectionLabels: Record<string, string>,
  title?: string,
  consentLocale?: UiLanguage,
): void {
  printGenericEducationDocument(doc, sectionLabels, title, consentLocale)
}

export function exportGenericEducationDocxDocument(
  doc: GenericPatientEducationDocument,
  sectionLabels: Record<string, string>,
  title?: string,
  consentLocale?: UiLanguage,
): void {
  const html = buildGenericEducationPrintHtml(doc, sectionLabels, title ?? doc.title, consentLocale)
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' })
  const stem = (title ?? doc.title).replace(/[^\wäöüß\-]+/gi, '_').slice(0, 60)
  downloadBlob(blob, `${stem || 'patientenaufklaerung'}.doc`)
}

export function exportGenericEducationPlainText(text: string, filename: string): void {
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename)
}
