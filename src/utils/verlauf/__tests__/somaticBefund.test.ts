import { describe, expect, it } from 'vitest'
import { getGuidedEntrySchema } from '../../../data/guidedEntry/schemas'
import { generateGuidedNarrative } from '../../guidedEntry/generateNarrative'
import { buildGuidedSteps } from '../../guidedEntry/stepEngine'
import {
  buildSomaticBefundPayload,
  buildSomaticBefundSummaryRows,
  isSomaticBefundEntry,
} from '../somaticBefund'
import { SOMATIC_BEFUND_PAGE_TYPE } from '../../../types/somaticBefund'
import type { VerlaufFeedEntry } from '../../verlaufFeed'

describe('somaticBefund', () => {
  it('builds payload from guided field values', () => {
    const payload = buildSomaticBefundPayload({
      examDate: '2026-06-24',
      generalCondition: 'unremarkable',
      bloodPressure: '118/76 mmHg',
      pulse: '68/min',
      height: '176',
      weight: '82',
      heartFinding: 'normal',
      lungsFinding: 'pathological',
      lungsNote: 'Feuchte RG basal links',
    })

    expect(payload.examDate).toBe('2026-06-24')
    expect(payload.generalCondition).toBe('unremarkable')
    expect(payload.vitals.bloodPressure).toBe('118/76 mmHg')
    expect(payload.vitals.height).toBe('176')
    expect(payload.vitals.weight).toBe('82')
    expect(payload.heart.finding).toBe('normal')
    expect(payload.lungs).toEqual({
      finding: 'pathological',
      note: 'Feuchte RG basal links',
    })
  })

  it('recognizes somatic feed entries by pageType and payload', () => {
    const entry: VerlaufFeedEntry = {
      id: 'x',
      date: '2026-06-24T12:00:00.000Z',
      content: 'narrative',
      pageType: SOMATIC_BEFUND_PAGE_TYPE,
      somaticBefund: buildSomaticBefundPayload({ examDate: '2026-06-24' }),
    }
    expect(isSomaticBefundEntry(entry)).toBe(true)
  })

  it('builds summary rows for feed card rendering', () => {
    const payload = buildSomaticBefundPayload({
      examDate: '2026-06-24',
      generalCondition: 'reduced',
      temperature: '37.9 °C',
      weight: '81.5 kg',
      abdomenFinding: 'not_examined',
      supplement: 'Keine Dyspnoe.',
    })
    const rows = buildSomaticBefundSummaryRows(payload, 'de')
    expect(rows.some((row) => row.labelKey === 'guidedEntryGenSomaticGeneral')).toBe(true)
    expect(rows.some((row) => row.value.includes('37.9'))).toBe(true)
    expect(rows.some((row) => row.value.includes('81.5'))).toBe(true)
    expect(rows.some((row) => row.value.includes('Nicht untersucht'))).toBe(true)
    expect(rows.some((row) => row.value.includes('Dyspnoe'))).toBe(true)
  })
})

describe('somatic-befund-quick guided schema', () => {
  it('exposes vitals, systems, and supplement steps', () => {
    const schema = getGuidedEntrySchema('somatic-befund-quick')
    const steps = buildGuidedSteps(schema, {})
    expect(steps.map((step) => step.id)).toEqual(['vitals', 'systems', 'supplement'])
  })

  it('generates narrative text from structured answers', () => {
    const schema = getGuidedEntrySchema('somatic-befund-quick')
    const { text } = generateGuidedNarrative(
      schema,
      {
        examDate: '2026-06-24',
        generalCondition: 'unremarkable',
        heartFinding: 'normal',
        lungsFinding: 'normal',
        supplement: 'Keine Beschwerden.',
      },
      'de',
    )
    expect(text).toContain('Guter Allgemeinzustand')
    expect(text).toContain('Unauffällig')
    expect(text).toContain('Keine Beschwerden.')
  })
})
