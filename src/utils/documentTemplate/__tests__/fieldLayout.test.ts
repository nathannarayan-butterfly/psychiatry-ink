import { describe, expect, it } from 'vitest'
import type { TemplateField } from '../../../types/documentTemplate'
import {
  colSpanToWidth,
  fieldGridStyle,
  resolveFieldColSpan,
  snapColSpan,
  widthToColSpan,
} from '../fieldLayout'

const baseField = (patch: Partial<TemplateField>): TemplateField => ({
  id: 'f1',
  type: 'short_text',
  order: 0,
  ...patch,
})

describe('fieldLayout', () => {
  it('defaults to full width when layout is missing', () => {
    expect(resolveFieldColSpan(baseField({}))).toBe(12)
    expect(fieldGridStyle(baseField({}))).toEqual({ gridColumn: 'span 12' })
  })

  it('maps width presets to column spans', () => {
    expect(widthToColSpan('half')).toBe(6)
    expect(widthToColSpan('third')).toBe(4)
    expect(widthToColSpan('two-thirds')).toBe(8)
    expect(colSpanToWidth(6)).toBe('half')
  })

  it('snaps resize values to supported spans', () => {
    expect(snapColSpan(5)).toBe(4)
    expect(snapColSpan(7)).toBe(6)
    expect(snapColSpan(10)).toBe(8)
  })

  it('forces dividers and spacers to full width', () => {
    expect(resolveFieldColSpan(baseField({ type: 'divider', layout: { colSpan: 6 } }))).toBe(12)
    expect(resolveFieldColSpan(baseField({ type: 'spacer', layout: { colSpan: 4 } }))).toBe(12)
  })

  it('applies min height from layout or spacer default', () => {
    expect(fieldGridStyle(baseField({ layout: { minHeightMm: 20 } }))).toEqual({
      gridColumn: 'span 12',
      minHeight: '20mm',
    })
    expect(fieldGridStyle(baseField({ type: 'spacer', defaultValue: '8' }))).toEqual({
      gridColumn: 'span 12',
      minHeight: '8mm',
    })
  })
})
