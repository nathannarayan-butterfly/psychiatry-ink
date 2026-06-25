import type { TemplateField, TemplateFieldLayout } from '../../types/documentTemplate'

export const TEMPLATE_GRID_COLUMNS = 12

export type TemplateFieldColSpan = 4 | 6 | 8 | 12

export type TemplateFieldWidth = 'full' | 'half' | 'third' | 'two-thirds'

const COL_SPAN_OPTIONS: TemplateFieldColSpan[] = [4, 6, 8, 12]

const FULL_WIDTH_FIELD_TYPES = new Set<TemplateField['type']>(['divider', 'spacer', 'heading'])

export function resolveFieldColSpan(field: TemplateField): TemplateFieldColSpan {
  if (FULL_WIDTH_FIELD_TYPES.has(field.type)) return 12
  const span = field.layout?.colSpan
  if (span === 4 || span === 6 || span === 8 || span === 12) return span
  return 12
}

export function colSpanToWidth(colSpan: TemplateFieldColSpan): TemplateFieldWidth {
  switch (colSpan) {
    case 4:
      return 'third'
    case 6:
      return 'half'
    case 8:
      return 'two-thirds'
    default:
      return 'full'
  }
}

export function widthToColSpan(width: TemplateFieldWidth): TemplateFieldColSpan {
  switch (width) {
    case 'third':
      return 4
    case 'half':
      return 6
    case 'two-thirds':
      return 8
    default:
      return 12
  }
}

export function snapColSpan(rawSpan: number): TemplateFieldColSpan {
  const clamped = Math.max(4, Math.min(12, Math.round(rawSpan)))
  let closest: TemplateFieldColSpan = 12
  let minDiff = Infinity
  for (const option of COL_SPAN_OPTIONS) {
    const diff = Math.abs(option - clamped)
    if (diff < minDiff) {
      minDiff = diff
      closest = option
    }
  }
  return closest
}

export function fieldSupportsHeightResize(field: TemplateField): boolean {
  return (
    field.type === 'long_text' ||
    field.type === 'static_text' ||
    field.type === 'ai_assisted_text' ||
    field.type === 'spacer'
  )
}

export function resolveFieldMinHeightMm(field: TemplateField): number | undefined {
  if (field.type === 'spacer') {
    return Math.max(2, Number(field.defaultValue) || 4)
  }
  return field.layout?.minHeightMm
}

export function fieldGridStyle(field: TemplateField): { gridColumn: string; minHeight?: string } {
  const colSpan = resolveFieldColSpan(field)
  const style: { gridColumn: string; minHeight?: string } = {
    gridColumn: `span ${colSpan}`,
  }
  const minHeightMm = resolveFieldMinHeightMm(field)
  if (minHeightMm != null && minHeightMm > 0) {
    style.minHeight = `${minHeightMm}mm`
  }
  return style
}

export function patchFieldLayout(
  field: TemplateField,
  patch: Partial<TemplateFieldLayout>,
): TemplateFieldLayout {
  const next: TemplateFieldLayout = { ...field.layout, ...patch }
  if (FULL_WIDTH_FIELD_TYPES.has(field.type)) {
    next.colSpan = 12
  }
  return next
}

export function renderFieldGridCellStyle(field: TemplateField): string {
  const colSpan = resolveFieldColSpan(field)
  const minHeightMm = resolveFieldMinHeightMm(field)
  const parts = [`grid-column:span ${colSpan}`]
  if (minHeightMm != null && minHeightMm > 0) {
    parts.push(`min-height:${minHeightMm}mm`)
  }
  return parts.join(';')
}
