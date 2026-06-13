/**
 * Self-contained export + print utilities for a single Wissensdatenbank
 * medication knowledge entry ({@link KnowledgeBaseDrug}).
 *
 * Nothing here mutates app state or touches existing components — every function
 * either returns a string or triggers a browser download / print window, so it
 * is safe to wire into the medication detail toolbar with a one-line insertion.
 *
 * Supported outputs:
 *   - JSON      → full structured entry (all sections + receptor affinity data)
 *   - Markdown  → human-readable, sections + receptor affinity table
 *   - HTML      → styled standalone document (same layout used for printing)
 *   - Print     → opens a dedicated print window using the medication print
 *                 stylesheet, then calls `window.print()`
 */

import type {
  KnowledgeBaseDrug,
  ReceptorAction,
  ReceptorAffinityEntry,
} from '../../types/knowledgeBase'
import { getDisplayReceptorProfile } from './receptorAffinity'
import { sectionHasStructuredData } from '../../types/knowledgeBase'
import { structuredSectionToText } from './structuredSectionText'
// Loaded as a raw string and injected into the print/HTML document so the
// output is styled without depending on the app's screen stylesheets.
import printCss from '../../styles/medication-print.css?raw'

/** Localizable labels for the human-readable (Markdown / HTML / print) exports. */
export interface MedicationExportLabels {
  receptorProfile: string
  receptorTarget: string
  receptorAffinity: string
  receptorAction: string
  receptorEvidence: string
  receptorEstimated: string
  legacyNote: string
  statusActive: string
  statusInactive: string
  classLabel: string
  categoryLabel: string
  atcLabel: string
  authorLabel: string
  updatedLabel: string
  generatedLabel: string
  noReceptorData: string
}

export const DEFAULT_EXPORT_LABELS: MedicationExportLabels = {
  receptorProfile: 'Receptor affinity profile',
  receptorTarget: 'Target',
  receptorAffinity: 'Affinity (%)',
  receptorAction: 'Action',
  receptorEvidence: 'Evidence',
  receptorEstimated: 'estimated',
  legacyNote: 'Converted from a legacy 1–5 score profile (display estimate only).',
  statusActive: 'Active',
  statusInactive: 'Inactive',
  classLabel: 'Class',
  categoryLabel: 'Category',
  atcLabel: 'ATC',
  authorLabel: 'Author/editor',
  updatedLabel: 'Last updated',
  generatedLabel: 'Generated',
  noReceptorData: 'No receptor affinity data recorded.',
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Turn a drug name into a filesystem-safe file stem. */
export function slugifyMedicationName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug || 'medication'
}

function humanizeAction(action: ReceptorAction): string {
  return action
    .split('_')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function formatAffinity(entry: ReceptorAffinityEntry): string {
  return entry.affinityPercent == null ? '—' : String(entry.affinityPercent)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Visible sections with text or structured data, in display order. */
function exportableSections(drug: KnowledgeBaseDrug) {
  return [...drug.sections]
    .sort((a, b) => a.order - b.order)
    .filter((s) => !s.hidden && (s.content.trim().length > 0 || sectionHasStructuredData(s)))
}

/** Combined text body for a section: narrative + structured serialization. */
function sectionBodyText(section: KnowledgeBaseDrug['sections'][number]): string {
  const structured = structuredSectionToText(section)
  return [section.content.trim(), structured].filter(Boolean).join('\n\n')
}

function statusLabel(drug: KnowledgeBaseDrug, labels: MedicationExportLabels): string {
  return drug.status === 'inactive' ? labels.statusInactive : labels.statusActive
}

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? (iso ?? '') : d.toLocaleString()
}

// ── Markdown ─────────────────────────────────────────────────────────────────

/**
 * Build a human-readable Markdown document for a single medication entry,
 * including a receptor affinity table resolved via {@link getDisplayReceptorProfile}.
 */
export function buildMedicationMarkdown(
  drug: KnowledgeBaseDrug,
  labels: MedicationExportLabels = DEFAULT_EXPORT_LABELS,
): string {
  const lines: string[] = []
  lines.push(`# ${drug.genericName}`)
  if (drug.brandNames.length > 0) lines.push(`*${drug.brandNames.join(', ')}*`)
  lines.push('')

  const meta: string[] = []
  if (drug.drugClass) meta.push(`**${labels.classLabel}:** ${drug.drugClass}`)
  if (drug.category) meta.push(`**${labels.categoryLabel}:** ${drug.category}`)
  if (drug.atcCode) meta.push(`**${labels.atcLabel}:** ${drug.atcCode}`)
  meta.push(`**Status:** ${statusLabel(drug, labels)}`)
  if (drug.authorEditor) meta.push(`**${labels.authorLabel}:** ${drug.authorEditor}`)
  meta.push(`**${labels.updatedLabel}:** ${formatTimestamp(drug.updatedAt)}`)
  lines.push(meta.join('  \n'))
  lines.push('')

  const profile = getDisplayReceptorProfile(drug)
  lines.push(`## ${labels.receptorProfile}`)
  if (profile.isEmpty) {
    lines.push(labels.noReceptorData)
  } else {
    lines.push(
      `| ${labels.receptorTarget} | ${labels.receptorAffinity} | ${labels.receptorAction} | ${labels.receptorEvidence} |`,
    )
    lines.push('| --- | ---: | --- | --- |')
    for (const entry of profile.entries) {
      const evidence = entry.isEstimated
        ? `${entry.evidenceQuality} (${labels.receptorEstimated})`
        : entry.evidenceQuality
      lines.push(
        `| ${entry.target} | ${formatAffinity(entry)} | ${humanizeAction(entry.action)} | ${evidence} |`,
      )
    }
    if (profile.isLegacy) {
      lines.push('')
      lines.push(`> ${labels.legacyNote}`)
    }
  }
  lines.push('')

  for (const section of exportableSections(drug)) {
    lines.push(`## ${section.label}`)
    lines.push(sectionBodyText(section))
    lines.push('')
  }

  lines.push('---')
  lines.push(`*${labels.generatedLabel}: ${new Date().toLocaleString()}*`)
  return lines.join('\n')
}

// ── HTML / print document ────────────────────────────────────────────────────

/**
 * Build a styled, standalone HTML document for a single medication entry. The
 * same markup is used both for HTML export and for the print window.
 */
export function buildMedicationHtml(
  drug: KnowledgeBaseDrug,
  labels: MedicationExportLabels = DEFAULT_EXPORT_LABELS,
): string {
  const profile = getDisplayReceptorProfile(drug)

  const metaItems: string[] = []
  if (drug.drugClass) metaItems.push(`<span class="med-print__meta-item">${escapeHtml(drug.drugClass)}</span>`)
  if (drug.category) metaItems.push(`<span class="med-print__meta-item">${escapeHtml(drug.category)}</span>`)
  if (drug.atcCode) metaItems.push(`<span class="med-print__meta-item">${labels.atcLabel}: ${escapeHtml(drug.atcCode)}</span>`)
  const badgeClass = drug.status === 'inactive' ? ' med-print__badge--inactive' : ''
  metaItems.push(`<span class="med-print__badge${badgeClass}">${escapeHtml(statusLabel(drug, labels))}</span>`)
  if (drug.authorEditor) metaItems.push(`<span class="med-print__meta-item">${escapeHtml(drug.authorEditor)}</span>`)
  metaItems.push(`<span class="med-print__meta-item">${labels.updatedLabel}: ${escapeHtml(formatTimestamp(drug.updatedAt))}</span>`)

  let receptorHtml: string
  if (profile.isEmpty) {
    receptorHtml = `<p class="med-print__section-body">${escapeHtml(labels.noReceptorData)}</p>`
  } else {
    const rows = profile.entries
      .map((entry) => {
        const evidence = entry.isEstimated
          ? `${entry.evidenceQuality} (${labels.receptorEstimated})`
          : entry.evidenceQuality
        return `<tr><td>${escapeHtml(entry.target)}</td><td class="num">${escapeHtml(
          formatAffinity(entry),
        )}</td><td>${escapeHtml(humanizeAction(entry.action))}</td><td>${escapeHtml(evidence)}</td></tr>`
      })
      .join('')
    const legacy = profile.isLegacy
      ? `<p class="med-print__legacy-note">${escapeHtml(labels.legacyNote)}</p>`
      : ''
    receptorHtml = `<table class="med-print__receptor-table"><thead><tr><th>${escapeHtml(
      labels.receptorTarget,
    )}</th><th>${escapeHtml(labels.receptorAffinity)}</th><th>${escapeHtml(
      labels.receptorAction,
    )}</th><th>${escapeHtml(labels.receptorEvidence)}</th></tr></thead><tbody>${rows}</tbody></table>${legacy}`
  }

  const sectionsHtml = exportableSections(drug)
    .map(
      (section) =>
        `<section class="med-print__section"><h2 class="med-print__section-title">${escapeHtml(
          section.label,
        )}</h2><div class="med-print__section-body">${escapeHtml(sectionBodyText(section))}</div></section>`,
    )
    .join('')

  const brands =
    drug.brandNames.length > 0
      ? `<p class="med-print__brands">${escapeHtml(drug.brandNames.join(', '))}</p>`
      : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(drug.genericName)}</title>
<style>${printCss}</style>
</head>
<body>
<article class="med-print">
<header class="med-print__header">
<h1 class="med-print__title">${escapeHtml(drug.genericName)}</h1>
${brands}
<div class="med-print__meta">${metaItems.join('')}</div>
</header>
<section class="med-print__section">
<h2 class="med-print__section-title">${escapeHtml(labels.receptorProfile)}</h2>
${receptorHtml}
</section>
${sectionsHtml}
<footer class="med-print__footer">${escapeHtml(labels.generatedLabel)}: ${escapeHtml(
    new Date().toLocaleString(),
  )}</footer>
</article>
</body>
</html>`
}

// ── download / print triggers ────────────────────────────────────────────────

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
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Download the full medication entry as structured JSON (`name.json`). */
export function exportMedicationAsJson(drug: KnowledgeBaseDrug): void {
  const stem = slugifyMedicationName(drug.genericName)
  downloadBlob(JSON.stringify(drug, null, 2), `${stem}.json`, 'application/json')
}

/** Download the medication entry as human-readable Markdown (`name.md`). */
export function exportMedicationAsMarkdown(
  drug: KnowledgeBaseDrug,
  labels?: MedicationExportLabels,
): void {
  const stem = slugifyMedicationName(drug.genericName)
  downloadBlob(buildMedicationMarkdown(drug, labels), `${stem}.md`, 'text/markdown')
}

/** Download the medication entry as a styled standalone HTML file (`name.html`). */
export function exportMedicationAsHtml(
  drug: KnowledgeBaseDrug,
  labels?: MedicationExportLabels,
): void {
  const stem = slugifyMedicationName(drug.genericName)
  downloadBlob(buildMedicationHtml(drug, labels), `${stem}.html`, 'text/html')
}

/**
 * Open a clean, print-styled rendering of the medication entry in a dedicated
 * window (or a hidden iframe fallback when popups are blocked) and trigger the
 * browser print dialog. Because the print document's `<title>` is the
 * medication name, the browser's "Save as PDF" destination suggests
 * `medicationName.pdf` as the filename — so this same pipeline powers both the
 * Print and the (preferred) PDF export action.
 */
function openMedicationPrintDocument(
  drug: KnowledgeBaseDrug,
  labels?: MedicationExportLabels,
): void {
  if (typeof window === 'undefined') return
  const html = buildMedicationHtml(drug, labels)

  const printWindow = window.open('', '_blank', 'noopener,width=900,height=1000')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    // Give the new document a moment to lay out before printing.
    setTimeout(() => {
      printWindow.print()
    }, 250)
    return
  }

  // Popup blocked → print via a temporary hidden iframe instead.
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
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, 250)
}

/**
 * Export the medication entry as a PDF. We deliberately reuse the existing
 * clean print HTML/CSS pipeline and route through the browser's native
 * print-to-PDF ("Save as PDF" destination) rather than a client-side raster
 * library: this guarantees the PDF matches the print layout exactly (title,
 * metadata, receptor-affinity table, all visible sections, no app chrome),
 * keeps the bundle dependency-free, and avoids fragile pagination/raster
 * output. The print document's `<title>` is the medication name, so the
 * default suggested filename is `medicationName.pdf`.
 */
export function exportMedicationAsPdf(
  drug: KnowledgeBaseDrug,
  labels?: MedicationExportLabels,
): void {
  openMedicationPrintDocument(drug, labels)
}

/**
 * Open a dedicated print window with a clean, print-styled rendering of the
 * medication entry and trigger the browser print dialog. Falls back to an
 * in-document hidden iframe when popups are blocked.
 *
 * NOTE: Kept in the codebase but currently inactive in the UI (PDF export is
 * the only exposed action). See `MedicationExportMenu`.
 */
export function printMedication(
  drug: KnowledgeBaseDrug,
  labels?: MedicationExportLabels,
): void {
  openMedicationPrintDocument(drug, labels)
}
