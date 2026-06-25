import { describe, expect, it } from 'vitest'
import type { DocumentTemplate, TemplateRenderContext } from '../../../types/documentTemplate'
import {
  buildPrintHtmlDocument,
  renderTemplate,
  renderTemplateBodyHtml,
} from '../renderTemplate'

const LONG_TEXT = Array.from({ length: 60 }, (_, i) => `Satz ${i + 1} mit klinischem Verlauf.`).join(' ')

const ctx: TemplateRenderContext = {}

function makeTemplate(): DocumentTemplate {
  return {
    id: 'tpl',
    title: 'Verlaufsbericht',
    category: 'arztbrief',
    language: 'de',
    version: 1,
    status: 'draft',
    availability: { emptyWorkspace: true, patientWorkspace: true, patientDocuments: true },
    fields: [
      { id: 'h', type: 'heading', label: 'Befund', order: 0 },
      { id: 'body', type: 'long_text', label: 'Verlauf', order: 1, layout: { colSpan: 12 } },
      { id: 'a', type: 'short_text', label: 'Links', order: 2, layout: { colSpan: 6 } },
      { id: 'b', type: 'short_text', label: 'Rechts', order: 3, layout: { colSpan: 6 } },
    ],
    pageSettings: { format: 'a4', margins: { top: 20, right: 18, bottom: 20, left: 25 } },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('renderTemplate body flow', () => {
  it('emits full-width fields as breakable block rows and groups partials into column rows', () => {
    const values = {
      body: `<p style="font-family: Georgia, serif; font-size: 12pt">${LONG_TEXT}</p>`,
      a: 'Wert A',
      b: 'Wert B',
    }
    const html = renderTemplateBodyHtml(makeTemplate(), values, ctx)
    expect(html).toContain('dt-doc-flow')
    // heading + long text are full-width -> standalone rows
    expect(html).toContain('dt-doc-row--full')
    // two half-width short fields collapse into a single column row
    expect((html.match(/dt-doc-row--cols/g) ?? []).length).toBe(1)
    // typography from the editor survives sanitisation
    expect(html).toContain('font-family: Georgia, serif')
    expect(html).toContain('font-size: 12pt')
  })

  it('migrates legacy plain-text values to paragraph HTML on render', () => {
    const values = { body: 'Zeile eins\nZeile zwei', a: '', b: '' }
    const html = renderTemplateBodyHtml(makeTemplate(), values, ctx)
    expect(html).toContain('Zeile eins')
    expect(html).toContain('<br')
  })
})

describe('buildPrintHtmlDocument pagination + wrapping', () => {
  it('uses native A4 pagination with template margins', () => {
    const values = { body: `<p>${LONG_TEXT}</p>`, a: 'x', b: 'y' }
    const html = buildPrintHtmlDocument(makeTemplate(), values, ctx)
    expect(html).toContain('@page')
    expect(html).toContain('size: A4')
    expect(html).toContain('margin: 20mm 18mm 20mm 25mm')
  })

  it('lets long text wrap and flow across pages (no fixed clipped page box)', () => {
    const values = { body: `<p>${LONG_TEXT}</p>`, a: 'x', b: 'y' }
    const html = buildPrintHtmlDocument(makeTemplate(), values, ctx)
    expect(html).toContain('overflow-wrap: anywhere')
    expect(html).toContain('dt-doc-row--full')
    expect(html).toContain('break-inside: auto')
    // the long body text is present in full (not truncated)
    expect(html).toContain('Satz 60 mit klinischem Verlauf.')
    // no single fixed-height clipped page container
    expect(html).not.toContain('min-height: 297mm')
  })
})

describe('renderTemplate plain text', () => {
  it('renders short_text inline and long_text as block in document mode', () => {
    const values = { body: 'Absatz', a: 'A', b: 'B' }
    const text = renderTemplate(makeTemplate(), values, ctx, { mode: 'document', markUnresolved: false })
    expect(text).toContain('Links: A')
    expect(text).toContain('Verlauf:')
  })
})
