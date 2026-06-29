import { beforeEach, describe, expect, it } from 'vitest'
import { BEFUND_TYPES, getBefundSchema } from '../../../data/befundSchemas'
import { getBefundTypeLabel, renderBefundContent } from '../../befundRender'
import { loadDiagnostikBefunde } from '../../befundArchive'
import { applyGuidedOutput } from '../applyGuidedOutput'
import { getGuidedEntrySchema } from '../../../data/guidedEntry/schemas'
import {
  ANFORDERUNG_PRESET_ROENTGEN,
  getAnforderungCatalogItem,
} from '../../../data/anforderungenCatalog'
import {
  befundTypeForResultLink,
  diagnosticsTabForResultLink,
} from '../../anforderungen/resultLinks'
import type { GuidedEntryAnswer } from '../../../types/guidedEntry'

describe('Röntgen structured BefundType', () => {
  it('is registered as a documentable befund type with localized labels', () => {
    expect(BEFUND_TYPES).toContain('roentgen')
    expect(getBefundTypeLabel('roentgen', 'de')).toBe('Röntgen')
    expect(getBefundTypeLabel('roentgen', 'en')).toBe('X-ray')
    const schema = getBefundSchema('roentgen', 'en')
    expect(schema.title).toBe('X-ray report')
    expect(schema.sections.map((s) => s.id)).toEqual(['technique', 'findings'])
  })

  it('groups under Bildgebende Verfahren (imaging) in the Anforderung flow', () => {
    expect(diagnosticsTabForResultLink('roentgen')).toBe('imaging')
    expect(befundTypeForResultLink('roentgen')).toBe('roentgen')
    const catalogItem = getAnforderungCatalogItem('befund-roentgen-thorax')
    expect(catalogItem?.groupKey).toBe('befunde_bildgebung')
    expect(catalogItem?.resultLink).toBe('roentgen')
    expect(ANFORDERUNG_PRESET_ROENTGEN).toMatchObject({
      category: 'befunde',
      groupKey: 'befunde_bildgebung',
      selectedCatalogIds: ['befund-roentgen-thorax'],
    })
  })
})

describe('Röntgen guided → Diagnostik archive flow', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('routes the guided Röntgen schema into a structured befund record', () => {
    const schema = getGuidedEntrySchema('befund-roentgen')
    expect(schema.output).toMatchObject({ kind: 'befund-record', befundType: 'roentgen' })

    const now = '2026-06-20T09:00:00.000Z'
    const answers: GuidedEntryAnswer[] = [
      { fieldId: 'examDate', value: '2026-06-20', answeredAt: now, source: 'manual' },
      { fieldId: 'region', value: 'thorax', answeredAt: now, source: 'manual' },
      { fieldId: 'technique', value: 'p.a. und seitlich', answeredAt: now, source: 'manual' },
      {
        fieldId: 'findings',
        value: 'Herz normal konfiguriert, keine Infiltrate.',
        answeredAt: now,
        source: 'manual',
      },
      {
        fieldId: 'assessment',
        value: 'Altersentsprechender unauffälliger Thoraxbefund.',
        answeredAt: now,
        source: 'manual',
      },
    ]

    const caseId = 'roentgen-case'
    const result = applyGuidedOutput({
      caseId,
      schema,
      text: 'Röntgen Thorax — narrativer Befund.',
      answers,
      instanceId: 'inst-1',
      mode: 'guided',
      language: 'de',
    })

    expect(result.targetEntityId).toBeTruthy()

    const records = loadDiagnostikBefunde(caseId)
    expect(records).toHaveLength(1)
    const [record] = records
    expect(record.type).toBe('roentgen')
    expect(record.examDate).toBe('2026-06-20')

    const rendered = renderBefundContent(record, 'de')
    expect(rendered).toContain('Thorax')
    expect(rendered).toContain('keine Infiltrate')
    expect(rendered).toContain('unauffälliger Thoraxbefund')
  })
})
