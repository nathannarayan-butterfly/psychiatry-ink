import { describe, expect, it } from 'vitest'
import { createDemoClinicalData } from '../clinicalData'
import {
  appendBandInline,
  appendBandToken,
  buildBandInnerHtml,
  isBandEmpty,
  PAGE_SENTINEL,
  PAGES_SENTINEL,
  resolveBandHtml,
  resolvePrintBands,
} from '../documentBand'
import { resolveTemplateName } from '../templateName'
import { CLINICAL_TEMPLATE_SCHEMA_VERSION, type ClinicalTemplate } from '../../../types/clinicalTemplate'

function makeTemplate(partial: Partial<ClinicalTemplate>): ClinicalTemplate {
  const now = new Date().toISOString()
  return {
    schemaVersion: CLINICAL_TEMPLATE_SCHEMA_VERSION,
    id: 'tpl',
    title: 'T',
    category: 'arztbrief',
    language: 'de',
    status: 'draft',
    scope: 'personal',
    version: 1,
    blocks: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

describe('resolveTemplateName (name-at-create)', () => {
  it('uses the entered name when present', () => {
    expect(resolveTemplateName('Kurzarztbrief', 'Arztbrief')).toBe('Kurzarztbrief')
  })

  it('collapses whitespace and trims', () => {
    expect(resolveTemplateName('  Mein   Brief  ', 'Arztbrief')).toBe('Mein Brief')
  })

  it('falls back to the category name when blank', () => {
    expect(resolveTemplateName('', 'Arztbrief')).toBe('Arztbrief')
    expect(resolveTemplateName('   ', 'Gutachten')).toBe('Gutachten')
  })

  it('falls back to a final default when both are blank', () => {
    expect(resolveTemplateName('', '')).toBe('Vorlage')
  })
})

describe('document band tokens', () => {
  const data = createDemoClinicalData('de')

  it('replaces placeholder tokens with resolved values', () => {
    const html = resolveBandHtml('<p>{{organization.name}}</p>', data)
    expect(html).not.toContain('{{')
    expect(html).toContain(data.organization.name)
  })

  it('renders an em-dash for unknown or empty tokens', () => {
    const html = resolveBandHtml('<p>{{does.not.exist}}</p>', data)
    expect(html).not.toContain('{{')
    expect(html).toContain('—')
  })

  it('isBandEmpty treats markup-only / undefined as empty but tokens as content', () => {
    expect(isBandEmpty(undefined)).toBe(true)
    expect(isBandEmpty({ html: '<p></p>' })).toBe(true)
    expect(isBandEmpty({ html: '<p>Klinik</p>' })).toBe(false)
    expect(isBandEmpty({ html: '<p>{{date}}</p>' })).toBe(false)
  })

  it('appendBandToken inserts inline before the closing paragraph', () => {
    expect(appendBandToken('<p>Klinik</p>', 'date')).toBe('<p>Klinik {{date}}</p>')
    expect(appendBandToken('', 'organization.name')).toBe('{{organization.name}}')
  })

  it('appendBandInline inserts arbitrary text (page X / Y)', () => {
    expect(appendBandInline('<p>Seite</p>', '{{page}} / {{pages}}')).toBe('<p>Seite {{page}} / {{pages}}</p>')
  })
})

describe('page-number tokens', () => {
  const data = createDemoClinicalData('de')

  it('defaults {{page}} / {{pages}} to 1 / 1 in preview', () => {
    const html = resolveBandHtml('<p>Seite {{page}} / {{pages}}</p>', data)
    expect(html).toContain('Seite 1 / 1')
  })

  it('resolves explicit page context numbers', () => {
    const html = resolveBandHtml('<p>{{page}}/{{pages}}</p>', data, { page: 3, pages: 7 })
    expect(html).toContain('3/7')
  })

  it('keeps print sentinels intact for deferred substitution', () => {
    const html = resolveBandHtml('<p>{{page}}/{{pages}}</p>', data, {
      page: PAGE_SENTINEL,
      pages: PAGES_SENTINEL,
    })
    expect(html).toContain(PAGE_SENTINEL)
    expect(html).toContain(PAGES_SENTINEL)
  })
})

describe('band image + emptiness', () => {
  const data = createDemoClinicalData('de')

  it('treats an image-only band as non-empty', () => {
    expect(isBandEmpty({ html: '', imageUrl: 'data:image/png;base64,AAAA' })).toBe(false)
  })

  it('buildBandInnerHtml emits the logo img and band content with page sentinels', () => {
    const html = buildBandInnerHtml(
      { html: '<p>Seite {{page}}</p>', imageUrl: 'data:image/png;base64,AAAA', imageHeight: 40 },
      data,
    )
    expect(html).toContain('<img')
    expect(html).toContain('data:image/png;base64,AAAA')
    expect(html).toContain('height:40px')
    expect(html).toContain(PAGE_SENTINEL)
  })

  it('buildBandInnerHtml returns empty string for an empty band', () => {
    expect(buildBandInnerHtml(undefined, data)).toBe('')
    expect(buildBandInnerHtml({ html: '<p></p>' }, data)).toBe('')
  })
})

describe('resolvePrintBands (first-page vs subsequent)', () => {
  const data = createDemoClinicalData('de')

  it('repeats the same band on every page by default', () => {
    const tpl = makeTemplate({ header: { html: '<p>Klinik</p>' }, footer: { html: '<p>F</p>' } })
    const bands = resolvePrintBands(tpl, data)
    expect(bands.firstHeader).toContain('Klinik')
    expect(bands.restHeader).toContain('Klinik')
    expect(bands.firstHeader).toBe(bands.restHeader)
  })

  it('first-page-only clears the subsequent-page bands', () => {
    const tpl = makeTemplate({
      header: { html: '<p>Klinik</p>' },
      footer: { html: '<p>F</p>' },
      pageSettings: { display: 'first-page-only', differentFirstPage: false },
    })
    const bands = resolvePrintBands(tpl, data)
    expect(bands.firstHeader).toContain('Klinik')
    expect(bands.restHeader).toBe('')
    expect(bands.restFooter).toBe('')
  })

  it('distinct first page uses the first variant on page 1 and the primary on the rest', () => {
    const tpl = makeTemplate({
      header: { html: '<p>Folgeseiten</p>' },
      headerFirst: { html: '<p>Titelseite</p>' },
      pageSettings: { display: 'all-pages', differentFirstPage: true },
    })
    const bands = resolvePrintBands(tpl, data)
    expect(bands.firstHeader).toContain('Titelseite')
    expect(bands.restHeader).toContain('Folgeseiten')
  })

  it('distinct first page falls back to the primary band when no first variant is set', () => {
    const tpl = makeTemplate({
      header: { html: '<p>Standard</p>' },
      pageSettings: { display: 'all-pages', differentFirstPage: true },
    })
    const bands = resolvePrintBands(tpl, data)
    expect(bands.firstHeader).toContain('Standard')
    expect(bands.restHeader).toContain('Standard')
  })
})
