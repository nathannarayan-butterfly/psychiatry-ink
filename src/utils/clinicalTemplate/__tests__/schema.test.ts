import { describe, expect, it } from 'vitest'
import { PALETTE_ITEMS } from '../blockCatalog'
import { createBlock } from '../blockFactory'
import {
  blockSchema,
  clinicalTemplateSchema,
  parseClinicalTemplate,
  serializeTemplate,
} from '../schema'
import { CLINICAL_TEMPLATE_SCHEMA_VERSION, type ClinicalTemplate } from '../../../types/clinicalTemplate'

describe('clinical template schema', () => {
  it('every palette item produces a schema-valid block', () => {
    for (const item of PALETTE_ITEMS) {
      const block = createBlock(item.id, 'de')
      const result = blockSchema.safeParse(block)
      expect(result.success, `${item.id} should be valid: ${JSON.stringify(result)}`).toBe(true)
    }
  })

  it('exposes both a single checkbox and a checkbox list in the palette', () => {
    const ids = PALETTE_ITEMS.map((i) => i.id)
    expect(ids).toContain('checkbox')
    expect(ids).toContain('checkbox_group')
  })

  it('checkbox_group creates a multi_select input with labelled options that round-trips', () => {
    const block = createBlock('checkbox_group', 'de')
    expect(block.type).toBe('input')
    if (block.type !== 'input') throw new Error('expected input block')
    expect(block.inputKind).toBe('multi_select')
    expect(block.options?.length).toBeGreaterThanOrEqual(2)
    expect(block.options?.every((o) => o.label.length > 0)).toBe(true)
    // options must survive schema validation (so they persist in saved JSON)
    expect(blockSchema.safeParse(block).success).toBe(true)
  })

  it('validates a nested conditional block with children', () => {
    const conditional = createBlock('conditional', 'de')
    if (conditional.type !== 'conditional') throw new Error('expected conditional')
    conditional.children = [createBlock('diagnosis', 'de'), createBlock('medication', 'de')]
    expect(blockSchema.safeParse(conditional).success).toBe(true)
  })

  it('rejects an unknown block type', () => {
    expect(blockSchema.safeParse({ id: 'x', type: 'not_a_block' }).success).toBe(false)
  })

  it('accepts schema-v3 layout fields (height / width / align) on any block', () => {
    const block = { ...createBlock('diagnosis', 'de'), height: 240, width: 'half', align: 'right' }
    const result = blockSchema.safeParse(block)
    expect(result.success, JSON.stringify(result)).toBe(true)
    if (result.success && 'width' in result.data) {
      expect(result.data.width).toBe('half')
      expect(result.data.align).toBe('right')
      expect(result.data.height).toBe(240)
    }
  })

  it('accepts a text block with rich-text html and keeps the plain fallback', () => {
    const block = { ...createBlock('text', 'de'), text: 'Hallo Welt', html: '<p><strong>Hallo</strong> Welt</p>' }
    const result = blockSchema.safeParse(block)
    expect(result.success).toBe(true)
    if (result.success && result.data.type === 'text') {
      expect(result.data.html).toContain('<strong>')
      expect(result.data.text).toBe('Hallo Welt')
    }
  })

  it('rejects invalid layout values', () => {
    expect(blockSchema.safeParse({ ...createBlock('heading', 'de'), width: 'third' }).success).toBe(false)
    expect(blockSchema.safeParse({ ...createBlock('heading', 'de'), align: 'middle' }).success).toBe(false)
    expect(blockSchema.safeParse({ ...createBlock('heading', 'de'), height: -10 }).success).toBe(false)
  })

  it('still parses a v2 block without any layout fields (safe migration default)', () => {
    const legacyBlock = createBlock('medication', 'de') as unknown as Record<string, unknown>
    delete legacyBlock.width
    delete legacyBlock.align
    delete legacyBlock.height
    const result = blockSchema.safeParse(legacyBlock)
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as unknown as Record<string, unknown>).width).toBeUndefined()
    }
  })

  it('round-trips a full template through serialize + parse', () => {
    const now = new Date().toISOString()
    const template: ClinicalTemplate = {
      schemaVersion: CLINICAL_TEMPLATE_SCHEMA_VERSION,
      id: 'tpl-1',
      title: 'Kurzbrief',
      category: 'arztbrief',
      language: 'de',
      status: 'draft',
      scope: 'personal',
      version: 1,
      blocks: [
        createBlock('heading', 'de'),
        createBlock('diagnosis', 'de'),
        createBlock('medication', 'de'),
        createBlock('ai_section', 'de'),
      ],
      createdAt: now,
      updatedAt: now,
    }
    const serialized = serializeTemplate(template)
    const parsed = parseClinicalTemplate(JSON.parse(serialized))
    expect(parsed).not.toBeNull()
    expect(parsed?.blocks).toHaveLength(4)
    expect(parsed?.title).toBe('Kurzbrief')
  })

  it('accepts optional header/footer bands and round-trips them', () => {
    const now = new Date().toISOString()
    const template: ClinicalTemplate = {
      schemaVersion: CLINICAL_TEMPLATE_SCHEMA_VERSION,
      id: 'tpl-band',
      title: 'Mit Kopfzeile',
      category: 'arztbrief',
      language: 'de',
      status: 'draft',
      scope: 'personal',
      version: 1,
      blocks: [createBlock('heading', 'de')],
      header: { html: '<p>{{organization.name}}</p>', divider: true },
      footer: { html: '<p>{{date}}</p>' },
      createdAt: now,
      updatedAt: now,
    }
    const parsed = parseClinicalTemplate(JSON.parse(serializeTemplate(template)))
    expect(parsed).not.toBeNull()
    expect(parsed?.header?.html).toContain('organization.name')
    expect(parsed?.header?.divider).toBe(true)
    expect(parsed?.footer?.html).toContain('{{date}}')
  })

  it('rejects a malformed band (non-string html)', () => {
    const result = clinicalTemplateSchema.safeParse({
      schemaVersion: 4,
      id: 'x',
      title: 't',
      category: 'arztbrief',
      language: 'de',
      status: 'draft',
      scope: 'personal',
      version: 1,
      blocks: [],
      header: { html: 42 },
      createdAt: 'a',
      updatedAt: 'b',
    })
    expect(result.success).toBe(false)
  })

  it('accepts v5 band image/height + first-page variants + pageSettings and round-trips them', () => {
    const now = new Date().toISOString()
    const template: ClinicalTemplate = {
      schemaVersion: CLINICAL_TEMPLATE_SCHEMA_VERSION,
      id: 'tpl-v5',
      title: 'Mit Logo',
      category: 'arztbrief',
      language: 'de',
      status: 'draft',
      scope: 'personal',
      version: 1,
      blocks: [createBlock('heading', 'de')],
      header: {
        html: '<p>{{organization.name}}</p>',
        imageUrl: 'data:image/png;base64,AAAA',
        imageHeight: 56,
        imageAlign: 'center',
        height: 80,
      },
      footer: { html: '<p>Seite {{page}} / {{pages}}</p>' },
      headerFirst: { html: '<p>Erste Seite</p>', imageUrl: 'data:image/png;base64,BBBB' },
      footerFirst: { html: '<p>Kontakt</p>' },
      pageSettings: { display: 'all-pages', differentFirstPage: true },
      createdAt: now,
      updatedAt: now,
    }
    const parsed = parseClinicalTemplate(JSON.parse(serializeTemplate(template)))
    expect(parsed).not.toBeNull()
    expect(parsed?.header?.imageUrl).toBe('data:image/png;base64,AAAA')
    expect(parsed?.header?.imageHeight).toBe(56)
    expect(parsed?.header?.imageAlign).toBe('center')
    expect(parsed?.header?.height).toBe(80)
    expect(parsed?.headerFirst?.html).toContain('Erste Seite')
    expect(parsed?.footerFirst?.html).toContain('Kontakt')
    expect(parsed?.pageSettings?.display).toBe('all-pages')
    expect(parsed?.pageSettings?.differentFirstPage).toBe(true)
  })

  it('rejects an invalid pageSettings.display value', () => {
    const result = clinicalTemplateSchema.safeParse({
      schemaVersion: 5,
      id: 'x',
      title: 't',
      category: 'arztbrief',
      language: 'de',
      status: 'draft',
      scope: 'personal',
      version: 1,
      blocks: [],
      pageSettings: { display: 'odd-pages', differentFirstPage: false },
      createdAt: 'a',
      updatedAt: 'b',
    })
    expect(result.success).toBe(false)
  })

  it('still parses a v4 template without the v5 band fields (safe migration)', () => {
    const now = new Date().toISOString()
    const v4 = {
      schemaVersion: 4,
      id: 'tpl-v4',
      title: 'Ohne Logo',
      category: 'custom',
      language: 'de',
      status: 'draft',
      scope: 'personal',
      version: 1,
      blocks: [createBlock('text', 'de')],
      header: { html: '<p>Klinik</p>', divider: true },
      createdAt: now,
      updatedAt: now,
    }
    const parsed = parseClinicalTemplate(v4)
    expect(parsed).not.toBeNull()
    expect(parsed?.header?.html).toContain('Klinik')
    expect(parsed?.header?.imageUrl).toBeUndefined()
    expect(parsed?.pageSettings).toBeUndefined()
  })

  it('still parses a v3 template without header/footer (safe migration)', () => {
    const now = new Date().toISOString()
    const v3 = {
      schemaVersion: 3,
      id: 'tpl-v3',
      title: 'Ohne Bänder',
      category: 'custom',
      language: 'de',
      status: 'draft',
      scope: 'personal',
      version: 1,
      blocks: [createBlock('text', 'de')],
      createdAt: now,
      updatedAt: now,
    }
    const parsed = parseClinicalTemplate(v3)
    expect(parsed).not.toBeNull()
    expect(parsed?.header).toBeUndefined()
    expect(parsed?.footer).toBeUndefined()
  })

  it('migrates a legacy payload missing schemaVersion/scope', () => {
    const now = new Date().toISOString()
    const legacy = {
      id: 'tpl-legacy',
      title: 'Legacy',
      category: 'custom',
      language: 'de',
      status: 'draft',
      version: 1,
      blocks: [createBlock('text', 'de')],
      createdAt: now,
      updatedAt: now,
    }
    const parsed = parseClinicalTemplate(legacy)
    expect(parsed).not.toBeNull()
    expect(parsed?.schemaVersion).toBe(CLINICAL_TEMPLATE_SCHEMA_VERSION)
    expect(parsed?.scope).toBe('personal')
  })

  it('rejects a template with an invalid category', () => {
    const result = clinicalTemplateSchema.safeParse({
      schemaVersion: 2,
      id: 'x',
      title: 't',
      category: 'nope',
      language: 'de',
      status: 'draft',
      scope: 'personal',
      version: 1,
      blocks: [],
      createdAt: 'a',
      updatedAt: 'b',
    })
    expect(result.success).toBe(false)
  })
})
