import type { UiTranslationKey } from '../../data/uiTranslations'
import type {
  ClinicalTemplate,
  DocumentBand,
  DocumentPageSettings,
} from '../../types/clinicalTemplate'
import { escapeHtml, sanitizeRichHtml } from '../documentTemplate/htmlUtils'
import { institutionValue, patientDataValue } from './bindingEval'
import type { ResolvedClinicalData } from './clinicalData'

/**
 * Placeholder tokens that may be embedded in a header/footer band as
 * `{{token}}`. Resolved against the clinical data at render time. Exposed to the
 * band editor as quick-insert chips.
 */
export interface BandToken {
  token: string
  labelKey: UiTranslationKey
}

export const BAND_TOKENS: BandToken[] = [
  { token: 'organization.name', labelKey: 'vorlageTokenOrgName' },
  { token: 'organization.address', labelKey: 'vorlageTokenOrgAddress' },
  { token: 'clinician.name', labelKey: 'vorlageTokenClinicianName' },
  { token: 'clinician.title', labelKey: 'vorlageTokenClinicianTitle' },
  { token: 'patient.name', labelKey: 'vorlageTokenPatientName' },
  { token: 'patient.dob', labelKey: 'vorlageTokenPatientDob' },
  { token: 'patient.caseId', labelKey: 'vorlageTokenPatientCaseId' },
  { token: 'date', labelKey: 'vorlageTokenDate' },
  { token: 'documentDate', labelKey: 'vorlageTokenDocumentDate' },
]

/**
 * Page-number quick-insert chips. `{{page}}` is the current page and `{{pages}}`
 * the total. They resolve to live counters in paginated export/print; in the
 * single-page builder/preview they show `1` / `1`.
 */
export const PAGE_NUMBER_TOKENS: BandToken[] = [
  { token: 'page', labelKey: 'vorlageTokenPage' },
  { token: 'pages', labelKey: 'vorlageTokenPageCount' },
]

/** Sentinels left in print HTML so the paginator can substitute per-page values. */
export const PAGE_SENTINEL = '[[CT_PAGE]]'
export const PAGES_SENTINEL = '[[CT_PAGES]]'

export interface PageContext {
  /** Current page number, or a sentinel string for deferred print substitution. */
  page?: number | string
  /** Total page count, or a sentinel string for deferred print substitution. */
  pages?: number | string
}

function tokenValue(token: string, data: ResolvedClinicalData, pageCtx?: PageContext): string {
  switch (token) {
    case 'organization.name':
      return institutionValue('organization.name', data)
    case 'organization.address':
      return institutionValue('organization.address', data)
    case 'clinician.name':
      return institutionValue('clinician.name', data)
    case 'clinician.title':
      return institutionValue('clinician.title', data)
    case 'patient.name':
      return patientDataValue('name', data)
    case 'patient.dob':
      return patientDataValue('geburtsdatum', data)
    case 'patient.caseId':
      return patientDataValue('caseId', data)
    case 'date':
      return institutionValue('system.date', data)
    case 'documentDate':
      return institutionValue('system.documentDate', data)
    case 'page':
      return String(pageCtx?.page ?? 1)
    case 'pages':
      return String(pageCtx?.pages ?? 1)
    default:
      return ''
  }
}

/** Tokens whose empty value should NOT collapse to an em-dash (e.g. page `0`). */
const NO_EMDASH_TOKENS = new Set(['page', 'pages'])

/**
 * Resolve `{{token}}` placeholders in a band's stored HTML and return sanitised
 * HTML ready for rendering. Unknown tokens and empty values collapse to an
 * em-dash so the layout stays stable. Token values are HTML-escaped. Page
 * tokens resolve from {@link PageContext} (defaults `1` / `1`).
 */
export function resolveBandHtml(html: string, data: ResolvedClinicalData, pageCtx?: PageContext): string {
  const replaced = html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, token: string) => {
    const value = tokenValue(token, data, pageCtx).trim()
    if (!value && NO_EMDASH_TOKENS.has(token)) return ''
    return escapeHtml(value || '—')
  })
  return sanitizeRichHtml(replaced)
}

/** True when a band has neither meaningful text content nor an image. */
export function isBandEmpty(band: DocumentBand | undefined): boolean {
  if (!band) return true
  if (band.imageUrl) return false
  const stripped = band.html.replace(/<[^>]*>/g, '').replace(/\{\{\s*[\w.]+\s*\}\}/g, 'x').trim()
  return stripped.length === 0
}

/** Default rendered logo height (px) when a band image has no explicit height. */
export const DEFAULT_BAND_IMAGE_HEIGHT = 48

/**
 * Build the full inner HTML for a band (logo image + resolved rich text) for
 * the string-based export/print pipeline. Returns `''` when the band is empty.
 * Page tokens use {@link PAGE_SENTINEL} / {@link PAGES_SENTINEL} so the
 * paginator can substitute the real numbers per page.
 */
export function buildBandInnerHtml(band: DocumentBand | undefined, data: ResolvedClinicalData): string {
  if (!band || isBandEmpty(band)) return ''
  const parts: string[] = []
  if (band.imageUrl) {
    const height = band.imageHeight ?? DEFAULT_BAND_IMAGE_HEIGHT
    const align = band.imageAlign ?? 'left'
    const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'
    parts.push(
      `<div class="ct-doc__band-image" style="display:flex;justify-content:${justify};margin-bottom:4px;">` +
        `<img src="${escapeHtml(band.imageUrl)}" alt="" style="height:${height}px;width:auto;max-width:100%;object-fit:contain;" />` +
        `</div>`,
    )
  }
  const text = band.html?.trim()
    ? resolveBandHtml(band.html, data, { page: PAGE_SENTINEL, pages: PAGES_SENTINEL })
    : ''
  if (text) parts.push(`<div class="ct-doc__band-content">${text}</div>`)
  return parts.join('')
}

/** Default header/footer pagination behaviour for templates without explicit settings. */
export const DEFAULT_PAGE_SETTINGS: DocumentPageSettings = {
  display: 'all-pages',
  differentFirstPage: false,
}

export function resolvePageSettings(template: ClinicalTemplate): DocumentPageSettings {
  return template.pageSettings ?? DEFAULT_PAGE_SETTINGS
}

/** Whether a distinct first-page header/footer is in effect. */
export function usesDistinctFirstPage(settings: DocumentPageSettings): boolean {
  return settings.display === 'all-pages' && settings.differentFirstPage
}

export interface ResolvedPrintBands {
  /** Page-1 header inner HTML (with page sentinels). */
  firstHeader: string
  firstFooter: string
  /** Pages 2+ header inner HTML (empty in first-page-only mode). */
  restHeader: string
  restFooter: string
}

/**
 * Resolve which header/footer HTML applies to page 1 vs. subsequent pages,
 * honoring `pageSettings` (first-page-only display + distinct first page). Page
 * sentinels remain for the paginator to substitute per page. Pure + testable.
 */
export function resolvePrintBands(template: ClinicalTemplate, data: ResolvedClinicalData): ResolvedPrintBands {
  const settings = resolvePageSettings(template)
  const primaryHeader = buildBandInnerHtml(template.header, data)
  const primaryFooter = buildBandInnerHtml(template.footer, data)

  if (settings.display === 'first-page-only') {
    return { firstHeader: primaryHeader, firstFooter: primaryFooter, restHeader: '', restFooter: '' }
  }
  if (usesDistinctFirstPage(settings)) {
    return {
      firstHeader: buildBandInnerHtml(template.headerFirst ?? template.header, data),
      firstFooter: buildBandInnerHtml(template.footerFirst ?? template.footer, data),
      restHeader: primaryHeader,
      restFooter: primaryFooter,
    }
  }
  return {
    firstHeader: primaryHeader,
    firstFooter: primaryFooter,
    restHeader: primaryHeader,
    restFooter: primaryFooter,
  }
}

/**
 * Append literal text to a band's HTML, inline at the end of the last paragraph
 * when possible so it reads naturally.
 */
export function appendBandInline(html: string, insert: string): string {
  const trimmed = html.trimEnd()
  if (trimmed.endsWith('</p>')) {
    const idx = trimmed.lastIndexOf('</p>')
    const needsSpace = !/[\s>]$/.test(trimmed.slice(0, idx))
    return `${trimmed.slice(0, idx)}${needsSpace ? ' ' : ''}${insert}</p>`
  }
  return html ? `${html} ${insert}` : insert
}

/**
 * Append a `{{token}}` placeholder to a band's HTML, inline at the end of the
 * last paragraph when possible so it reads naturally.
 */
export function appendBandToken(html: string, token: string): string {
  return appendBandInline(html, `{{${token}}}`)
}
