import type { DocumentTemplate, GeneratedDocument, TemplateField, TemplateRenderContext } from '../../types/documentTemplate'
import { UNRESOLVED_PLACEHOLDER } from './constants'
import { htmlToPlainLines, sanitizeRichHtml, escapeHtml } from './htmlUtils'
import { resolveBinding } from './placeholderContext'
import { resolvePageSettings } from './pageSettings'
import { FONT_SANS } from '../../styles/typographyTokens'

function isPlaceholderType(type: TemplateField['type']): boolean {
  return (
    type === 'patient_placeholder' ||
    type === 'case_placeholder' ||
    type === 'clinician_placeholder' ||
    type === 'organization_placeholder'
  )
}

function isMultiSelectType(type: TemplateField['type']): boolean {
  return type === 'checkbox_group' || type === 'multi_select'
}

function fieldValueToString(
  field: TemplateField,
  value: string | boolean | string[] | undefined,
  context: TemplateRenderContext,
  markUnresolved: boolean,
): string {
  if (field.type === 'checkbox') {
    return value === true ? '☑' : '☐'
  }
  if (isMultiSelectType(field.type)) {
    const selected = Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : []
    if (!field.options?.length) return selected.join(', ')
    return field.options
      .map((opt) => {
        const checked = selected.includes(opt.id)
        return `${checked ? '☑' : '☐'} ${opt.label}`
      })
      .join('\n')
  }
  if (field.type === 'radio_group' || field.type === 'yes_no') {
    const selectedId = typeof value === 'string' ? value : ''
    if (field.type === 'yes_no') {
      const yes = selectedId === 'yes'
      const no = selectedId === 'no'
      return `Ja ${yes ? '☑' : '☐'}   Nein ${no ? '☑' : '☐'}`
    }
    if (!field.options?.length) return selectedId
    return field.options
      .map((opt) => `${selectedId === opt.id ? '◉' : '○'} ${opt.label}`)
      .join('   ')
  }
  if (field.type === 'select') {
    const selectedId = typeof value === 'string' ? value : ''
    const opt = field.options?.find((o) => o.id === selectedId)
    return opt?.label ?? selectedId
  }
  if (isPlaceholderType(field.type)) {
    const resolved = resolveBinding(field.binding, context)
    if (resolved) return resolved
    return markUnresolved ? UNRESOLVED_PLACEHOLDER : ''
  }
  if (field.type === 'heading') {
    return (field.label ?? field.defaultValue as string ?? '').toUpperCase()
  }
  if (field.type === 'divider') {
    return '────────────────────────────────────────'
  }
  if (field.type === 'spacer') {
    const lines = Math.max(1, Number(field.defaultValue) || 1)
    return '\n'.repeat(lines - 1)
  }
  if (field.type === 'initials' || field.type === 'name_line' || field.type === 'signature') {
    const label = field.label?.trim() ?? (field.type === 'signature' ? 'Unterschrift' : '')
    const line = typeof value === 'string' && value.trim() ? value : '________________________'
    return label ? `${label}: ${line}` : line
  }
  if (field.type === 'number_with_unit') {
    const num = typeof value === 'string' ? value : ''
    const unit = field.unit?.trim() ?? ''
    if (!num) return markUnresolved ? UNRESOLVED_PLACEHOLDER : ''
    return unit ? `${num} ${unit}` : num
  }
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'string') return value
  if (field.defaultValue != null) return String(field.defaultValue)
  return ''
}

function renderFieldBlock(
  field: TemplateField,
  fieldValues: Record<string, string | boolean | string[]>,
  context: TemplateRenderContext,
  mode: 'form' | 'document',
  markUnresolved: boolean,
): string {
  const value = fieldValues[field.id]
  const text = fieldValueToString(field, value, context, markUnresolved)

  if (field.type === 'static_text') {
    const raw = (field.defaultValue as string | undefined)?.trim() ?? field.label?.trim() ?? ''
    return htmlToPlainLines(raw)
  }

  if (field.type === 'heading') {
    return text
  }

  if (field.type === 'divider') {
    return fieldValueToString(field, value, context, markUnresolved)
  }

  if (field.type === 'spacer') {
    return fieldValueToString(field, value, context, markUnresolved)
  }

  if (mode === 'document') {
    if (field.type === 'long_text' || field.type === 'ai_assisted_text') {
      const label = field.label?.trim()
      const body = htmlToPlainLines(typeof value === 'string' ? value : text)
      if (label) return `${label}:\n${body || UNRESOLVED_PLACEHOLDER}`
      return body
    }
    if (field.label?.trim()) {
      return `${field.label}: ${text || (markUnresolved ? UNRESOLVED_PLACEHOLDER : '')}`.trim()
    }
    return text
  }

  return text
}

function renderFieldBlockHtml(
  field: TemplateField,
  fieldValues: Record<string, string | boolean | string[]>,
  context: TemplateRenderContext,
  markUnresolved: boolean,
): string {
  const value = fieldValues[field.id]
  const text = fieldValueToString(field, value, context, markUnresolved)

  if (field.type === 'static_text') {
    const raw = sanitizeRichHtml((field.defaultValue as string | undefined) ?? '')
    return raw ? `<div class="dt-doc-static">${raw}</div>` : ''
  }

  if (field.type === 'heading') {
    const label = escapeHtml(field.label ?? (field.defaultValue as string) ?? '')
    return label ? `<h3 class="dt-doc-heading">${label}</h3>` : ''
  }

  if (field.type === 'divider') {
    return '<hr class="dt-doc-divider" />'
  }

  if (field.type === 'spacer') {
    const mm = Math.max(2, Number(field.defaultValue) || 4)
    return `<div class="dt-doc-spacer" style="height:${mm}mm"></div>`
  }

  if (field.type === 'long_text' || field.type === 'ai_assisted_text') {
    const label = field.label?.trim()
    const body = sanitizeRichHtml(typeof value === 'string' ? value : text)
    if (label) {
      return `<div class="dt-doc-field"><span class="dt-doc-label">${escapeHtml(label)}:</span><div class="dt-doc-body">${body || escapeHtml(UNRESOLVED_PLACEHOLDER)}</div></div>`
    }
    return `<div class="dt-doc-body">${body || escapeHtml(UNRESOLVED_PLACEHOLDER)}</div>`
  }

  if (isMultiSelectType(field.type)) {
    const selected = Array.isArray(value) ? value : []
    const items = (field.options ?? [])
      .map((opt) => {
        const checked = selected.includes(opt.id)
        return `<div class="dt-doc-check">${checked ? '☑' : '☐'} ${escapeHtml(opt.label)}</div>`
      })
      .join('')
    const label = field.label?.trim()
    return label
      ? `<div class="dt-doc-field"><span class="dt-doc-label">${escapeHtml(label)}:</span>${items}</div>`
      : items
  }

  if (field.type === 'radio_group' || field.type === 'yes_no') {
    const selectedId = typeof value === 'string' ? value : ''
    const options =
      field.type === 'yes_no'
        ? [
            { id: 'yes', label: 'Ja' },
            { id: 'no', label: 'Nein' },
          ]
        : field.options ?? []
    const items = options
      .map((opt) => {
        const checked = selectedId === opt.id
        const mark = field.type === 'yes_no' ? (checked ? '☑' : '☐') : checked ? '◉' : '○'
        return `<span class="dt-doc-radio">${mark} ${escapeHtml(opt.label)}</span>`
      })
      .join(' &nbsp; ')
    const label = field.label?.trim()
    return label
      ? `<div class="dt-doc-field"><span class="dt-doc-label">${escapeHtml(label)}:</span> ${items}</div>`
      : `<div class="dt-doc-field">${items}</div>`
  }

  if (field.type === 'initials' || field.type === 'name_line' || field.type === 'signature') {
    const label = field.label?.trim()
    const line = typeof value === 'string' && value.trim() ? escapeHtml(value) : '<span class="dt-doc-line">________________________</span>'
    return label
      ? `<div class="dt-doc-field"><span class="dt-doc-label">${escapeHtml(label)}:</span> ${line}</div>`
      : `<div class="dt-doc-field">${line}</div>`
  }

  if (field.label?.trim()) {
    const display = text || (markUnresolved ? UNRESOLVED_PLACEHOLDER : '')
    return `<div class="dt-doc-field"><span class="dt-doc-label">${escapeHtml(field.label)}:</span> ${escapeHtml(display)}</div>`
  }

  return text ? `<div class="dt-doc-field">${escapeHtml(text)}</div>` : ''
}

export function buildInitialFieldValues(
  template: DocumentTemplate,
  context: TemplateRenderContext,
): Record<string, string | boolean | string[]> {
  const values: Record<string, string | boolean | string[]> = {}
  for (const field of template.fields) {
    if (field.type === 'checkbox') {
      values[field.id] = field.defaultValue === true
    } else if (isMultiSelectType(field.type)) {
      values[field.id] = Array.isArray(field.defaultValue) ? [...field.defaultValue] : []
    } else if (isPlaceholderType(field.type)) {
      values[field.id] = resolveBinding(field.binding, context)
    } else if (field.type === 'yes_no' || field.type === 'radio_group') {
      values[field.id] = typeof field.defaultValue === 'string' ? field.defaultValue : ''
    } else if (field.type === 'divider' || field.type === 'spacer' || field.type === 'heading') {
      values[field.id] = ''
    } else if (field.defaultValue != null) {
      values[field.id] = String(field.defaultValue)
    } else {
      values[field.id] = ''
    }
  }
  return values
}

export function renderTemplate(
  template: DocumentTemplate,
  fieldValues: Record<string, string | boolean | string[]>,
  context: TemplateRenderContext,
  options?: { mode?: 'form' | 'document'; markUnresolved?: boolean },
): string {
  const mode = options?.mode ?? 'document'
  const markUnresolved = options?.markUnresolved ?? true
  const sorted = [...template.fields].sort((a, b) => a.order - b.order)
  return sorted
    .map((field) => renderFieldBlock(field, fieldValues, context, mode, markUnresolved))
    .filter((block) => block.trim().length > 0)
    .join('\n\n')
}

export function renderTemplateBodyHtml(
  template: DocumentTemplate,
  fieldValues: Record<string, string | boolean | string[]>,
  context: TemplateRenderContext,
  options?: { markUnresolved?: boolean },
): string {
  const markUnresolved = options?.markUnresolved ?? true
  const sorted = [...template.fields].sort((a, b) => a.order - b.order)
  return sorted
    .map((field) => renderFieldBlockHtml(field, fieldValues, context, markUnresolved))
    .filter((block) => block.trim().length > 0)
    .join('')
}

export function renderTemplateDocumentHtml(
  template: DocumentTemplate,
  fieldValues: Record<string, string | boolean | string[]>,
  context: TemplateRenderContext,
  options?: { markUnresolved?: boolean },
): string {
  const page = resolvePageSettings(template)
  const margins = page.margins!
  const markUnresolved = options?.markUnresolved ?? true
  const body = renderTemplateBodyHtml(template, fieldValues, context, { markUnresolved })

  const headerContent = page.header?.content?.trim()
  const footerContent = page.footer?.content?.trim()
  const headerHeight = headerContent ? undefined : `${page.header?.heightMm ?? 15}mm`
  const footerHeight = footerContent ? undefined : `${page.footer?.heightMm ?? 12}mm`

  const headerBlock = headerContent || headerHeight
    ? `<header class="dt-doc-header" style="${headerHeight ? `min-height:${headerHeight}` : ''}">${headerContent ? sanitizeRichHtml(headerContent) : ''}</header>`
    : ''

  const footerBlock = footerContent || footerHeight
    ? `<footer class="dt-doc-footer" style="${footerHeight ? `min-height:${footerHeight}` : ''}">${footerContent ? sanitizeRichHtml(footerContent) : ''}</footer>`
    : ''

  const firstPageOnly = page.headerFooterFirstPageOnly ? ' dt-doc-page--first-only-hf' : ''

  return `<article class="dt-doc-page${firstPageOnly}" style="--dt-margin-top:${margins.top}mm;--dt-margin-right:${margins.right}mm;--dt-margin-bottom:${margins.bottom}mm;--dt-margin-left:${margins.left}mm">
  ${headerBlock}
  <main class="dt-doc-body-area">${body}</main>
  ${footerBlock}
</article>`
}

export function buildPrintHtmlDocument(
  template: DocumentTemplate,
  fieldValues: Record<string, string | boolean | string[]>,
  context: TemplateRenderContext,
  options?: { markUnresolved?: boolean },
): string {
  const article = renderTemplateDocumentHtml(template, fieldValues, context, options)
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(template.title)}</title>
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: ${FONT_SANS}; font-size: 11pt; line-height: 1.55; color: #1a1a1a; }
.dt-doc-page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: var(--dt-margin-top) var(--dt-margin-right) var(--dt-margin-bottom) var(--dt-margin-left); display: flex; flex-direction: column; }
.dt-doc-header, .dt-doc-footer { font-size: 9pt; color: #444; }
.dt-doc-header { border-bottom: 1px solid #ddd; margin-bottom: 4mm; padding-bottom: 2mm; }
.dt-doc-footer { border-top: 1px solid #ddd; margin-top: auto; padding-top: 2mm; }
.dt-doc-body-area { flex: 1; }
.dt-doc-heading { font-size: 12pt; font-weight: 700; letter-spacing: 0.04em; margin: 0.75rem 0 0.5rem; text-transform: uppercase; }
.dt-doc-divider { border: none; border-top: 1px solid #bbb; margin: 0.75rem 0; }
.dt-doc-field { margin-bottom: 0.5rem; }
.dt-doc-label { font-weight: 600; }
.dt-doc-check { margin: 0.15rem 0; }
.dt-doc-radio { margin-right: 0.75rem; }
.dt-doc-line { letter-spacing: 0.1em; }
.dt-doc-page--first-only-hf .dt-doc-header, .dt-doc-page--first-only-hf .dt-doc-footer { display: block; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>${article}</body>
</html>`
}

export function regenerateRenderedText(
  template: DocumentTemplate,
  doc: GeneratedDocument,
  context: TemplateRenderContext,
): string {
  return renderTemplate(template, doc.fieldValues, context, { mode: 'document', markUnresolved: true })
}
