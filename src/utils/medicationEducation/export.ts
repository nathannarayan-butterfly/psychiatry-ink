import type {
  MedicationEducationIdentityBlock,
  PatientMedicationEducationDocument,
} from '../../types/medicationEducation'
import {
  getMedicationEducationSections,
  MEDICATION_EDUCATION_DISCLAIMER_DE,
  MEDICATION_EDUCATION_DISCLAIMER_EN,
} from '../../data/medicationEducationSections'
import { isSectionIncludedInFinal } from './draftOps'
import { FONT_SANS } from '../../styles/typographyTokens'
import { printHtmlDocument, openHtmlPreviewWindow } from '../print/printDocument'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Patient-facing export assembly — intentionally excludes doc.references (clinician-only). */
export function assembleMedicationEducationText(
  doc: PatientMedicationEducationDocument,
  sectionLabels: Record<string, string>,
): string {
  const defs = getMedicationEducationSections(doc.scope, { includePregnancy: true })
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
    doc.language === 'en' ? MEDICATION_EDUCATION_DISCLAIMER_EN : MEDICATION_EDUCATION_DISCLAIMER_DE
  lines.push(disclaimer)
  return lines.join('\n').trim()
}

export function mergeIdentityIntoTitle(
  template: string,
  identity: MedicationEducationIdentityBlock,
  language: 'de' | 'en' = 'de',
): string {
  return template
    .replace(/\{patientName\}/g, identity.patientName)
    .replace(/\{dob\}/g, identity.patientDob)
    .replace(/\{clinicName\}/g, identity.clinicName)
    .replace(/\{clinicianName\}/g, identity.clinicianName)
    .replace(/\{date\}/g, new Date().toLocaleDateString(language === 'en' ? 'en-GB' : 'de-DE'))
}

export function applyIdentityToDocument(
  doc: PatientMedicationEducationDocument,
  identity: MedicationEducationIdentityBlock,
): PatientMedicationEducationDocument {
  const next = structuredClone(doc)
  const lang: 'de' | 'en' = doc.language === 'en' ? 'en' : 'de'
  const titleSection = next.sections.titel
  if (titleSection) {
    const defaultTitle =
      lang === 'en'
        ? 'Patient medication education — {patientName}\n{date}'
        : 'Patientenaufklärung Medikation — {patientName}\n{date}'
    const base = titleSection.currentContent.trim() || defaultTitle
    titleSection.currentContent = mergeIdentityIntoTitle(base, identity, lang)
    titleSection.status = titleSection.status === 'empty' ? 'auto_fetched' : titleSection.status
  }

  const confirmId =
    doc.scope === 'single' || doc.documentVariant === 'generic_kb_single'
      ? 'arzt-bestaetigung'
      : 'dokumentation-gespraech'
  const confirmSection = next.sections[confirmId]
  if (confirmSection && doc.includeSignatureArea) {
    const sigBlock =
      lang === 'en'
        ? [
            'Discussed with: {patientName}',
            'Date: {date}',
            'Treating clinician: {clinicianName}',
            'Institution: {clinicName}',
            '',
            'Patient signature: _______________________',
            'Care team signature: _______________________',
          ].join('\n')
        : [
            'Besprochen mit: {patientName}',
            'Datum: {date}',
            'Behandelnde/r Arzt/Ärztin: {clinicianName}',
            'Einrichtung: {clinicName}',
            '',
            'Unterschrift Patient/in: _______________________',
            'Unterschrift Behandlungsteam: _______________________',
          ].join('\n')
    if (!confirmSection.currentContent.trim()) {
      confirmSection.currentContent = mergeIdentityIntoTitle(sigBlock, identity, lang)
      confirmSection.status = 'auto_fetched'
    }
  }
  next.updatedAt = new Date().toISOString()
  return next
}

export function buildMedicationEducationPrintHtml(
  doc: PatientMedicationEducationDocument,
  sectionLabels: Record<string, string>,
  title: string,
): string {
  // References are clinician-facing only — not included in print/PDF/Word output.
  const defs = getMedicationEducationSections(doc.scope, { includePregnancy: true })
  const bodyParts: string[] = []

  for (const def of defs) {
    const section = doc.sections[def.id]
    if (!section || !isSectionIncludedInFinal(section)) continue
    const content = section.currentContent.trim()
    if (!content) continue
    const label = sectionLabels[def.id] ?? def.labelDe
    if (def.localIdentity) {
      bodyParts.push(`<pre class="me-flow">${escapeHtml(content)}</pre>`)
    } else {
      bodyParts.push(`<h2>${escapeHtml(label)}</h2><pre>${escapeHtml(content)}</pre>`)
    }
  }

  const disclaimer =
    doc.language === 'en' ? MEDICATION_EDUCATION_DISCLAIMER_EN : MEDICATION_EDUCATION_DISCLAIMER_DE

  return `<!DOCTYPE html>
<html lang="${doc.language}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
@page { size: A4; margin: 2cm; }
body { font-family: ${FONT_SANS}; font-size: 12pt; line-height: 1.55; color: #111; margin: 2cm; }
h1 { font-size: 14pt; margin-bottom: 1rem; }
h2 { font-size: 11pt; font-weight: 600; margin: 1.2rem 0 0.35rem; }
pre { white-space: pre-wrap; font-family: inherit; margin: 0 0 0.8rem; }
.me-disclaimer { font-size: 9pt; color: #555; margin-top: 2rem; border-top: 1px solid #ccc; padding-top: 0.5rem; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${bodyParts.join('')}
<p class="me-disclaimer">${escapeHtml(disclaimer)}</p>
</body>
</html>`
}

export async function copyMedicationEducationText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function printMedicationEducation(html: string): void {
  printHtmlDocument(html)
}

/** Opens a formatted, scrollable preview in a new window (no auto-print). */
export function previewMedicationEducation(html: string): boolean {
  return openHtmlPreviewWindow(html)
}

export function exportMedicationEducationPdf(html: string): void {
  printMedicationEducation(html)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function printMedicationEducationDocument(
  doc: PatientMedicationEducationDocument,
  sectionLabels: Record<string, string>,
  title?: string,
): void {
  const html = buildMedicationEducationPrintHtml(doc, sectionLabels, title ?? doc.title)
  printMedicationEducation(html)
}

export function exportMedicationEducationPdfDocument(
  doc: PatientMedicationEducationDocument,
  sectionLabels: Record<string, string>,
  title?: string,
): void {
  printMedicationEducationDocument(doc, sectionLabels, title)
}

export function exportMedicationEducationDocxDocument(
  doc: PatientMedicationEducationDocument,
  sectionLabels: Record<string, string>,
  title?: string,
): void {
  const html = buildMedicationEducationPrintHtml(doc, sectionLabels, title ?? doc.title)
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  })
  const stem = (title ?? doc.title).replace(/[^\wäöüß\-]+/gi, '_').slice(0, 60)
  downloadBlob(blob, `${stem}.doc`)
}

export function exportMedicationEducationPlainText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportMedicationEducationDocx(html: string, filename: string): void {
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.docx?$/, '.doc')
  a.click()
  URL.revokeObjectURL(url)
}

export function formatAcceptedDocumentTitle(dateIso: string, language: 'de' | 'en'): string {
  const date = new Date(dateIso).toLocaleDateString(language === 'en' ? 'en-GB' : 'de-DE')
  return language === 'en'
    ? `Medication patient education from ${date}`
    : `Patientenaufklärung Medikation vom ${date}`
}
