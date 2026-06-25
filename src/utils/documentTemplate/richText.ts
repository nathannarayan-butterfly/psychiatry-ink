import { FONT_MONO, FONT_SANS } from '../../styles/typographyTokens'
import { escapeHtml } from './htmlUtils'

/**
 * Rich-text helpers shared by the TipTap editor and the (DOM-free) render
 * pipeline. The template field model stores rich content as HTML strings; the
 * TipTap editor reads/writes that HTML. These helpers keep legacy plain-text /
 * markdown-ish values readable when they are migrated into the editor.
 */

export interface FontFamilyOption {
  /** Stable id stored as the CSS font-family stack via TipTap FontFamily. */
  value: string
  /** Localised-agnostic display name shown in the toolbar. */
  label: string
}

/**
 * Curated, clinical-document-appropriate font set. The first entry mirrors the
 * app's default sans stack so unstyled content keeps the existing look.
 */
export const FONT_FAMILY_OPTIONS: FontFamilyOption[] = [
  { value: FONT_SANS, label: 'Standard (Sans)' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Georgia (Serif)' },
  { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: '"Courier New", ' + FONT_MONO, label: 'Monospace' },
]

/** Default font size (pt) — matches the document body font-size. */
export const DEFAULT_FONT_SIZE_PT = 11

/** Point sizes offered in the toolbar (Word-like sane set). */
export const FONT_SIZE_OPTIONS: number[] = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72]

/** TipTap FontSize stores a CSS length; we standardise on points. */
export function fontSizeToCss(pt: number): string {
  return `${pt}pt`
}

/** Parse a CSS font-size (e.g. "12pt", "16px") back to an approximate pt value. */
export function cssToFontSizePt(css: string | null | undefined): number | null {
  if (!css) return null
  const match = css.trim().match(/^([\d.]+)\s*(pt|px|rem|em)?$/i)
  if (!match) return null
  const num = Number.parseFloat(match[1]!)
  if (!Number.isFinite(num)) return null
  const unit = (match[2] ?? 'pt').toLowerCase()
  if (unit === 'pt') return Math.round(num)
  if (unit === 'px') return Math.round(num * 0.75)
  // rem/em — assume 1em ≈ 12pt baseline
  return Math.round(num * 12)
}

/**
 * Heuristic: does this string already contain HTML markup? Legacy template
 * content was stored either as HTML (from the old contenteditable editor) or as
 * plain text. We only convert when it is NOT already markup.
 */
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

/**
 * Convert a plain-text string into safe paragraph HTML so legacy values render
 * with their original line/paragraph breaks inside TipTap and the document.
 * Blank lines split paragraphs; single newlines become <br>.
 */
export function plainTextToHtml(value: string): string {
  const normalized = value.replace(/\r\n?/g, '\n')
  const paragraphs = normalized.split(/\n{2,}/)
  const html = paragraphs
    .map((para) => {
      const lines = para.split('\n').map((line) => escapeHtml(line))
      const inner = lines.join('<br />')
      return inner ? `<p>${inner}</p>` : ''
    })
    .filter(Boolean)
    .join('')
  return html
}

/**
 * Normalise any stored rich value to HTML suitable for TipTap / rendering.
 * - Empty → ''
 * - Already HTML → returned as-is (sanitised later by the render/editor layer)
 * - Plain text → migrated to paragraph HTML
 */
export function ensureRichHtml(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (looksLikeHtml(trimmed)) return value
  return plainTextToHtml(value)
}

/** Field types whose content is edited as rich text (TipTap) and stored as HTML. */
export const RICH_TEXT_FIELD_TYPES = new Set([
  'static_text',
  'short_text',
  'long_text',
  'ai_assisted_text',
])

export function isRichTextField(type: string): boolean {
  return RICH_TEXT_FIELD_TYPES.has(type)
}
