import { describe, expect, it } from 'vitest'
import type { MedicationEntry } from '../../../types/medicationPlan'
import type { PriorTherapyItem } from '../../../types/priorTherapies'
import {
  classifyPriorTherapyEvent,
  extractPriorTherapiesFromPlan,
  mergePriorTherapies,
  priorTherapySummaryLine,
} from '../priorTherapies'

function makeEntry(overrides: Partial<MedicationEntry>): MedicationEntry {
  return {
    id: overrides.id ?? `id-${Math.random()}`,
    substance: 'Substanz',
    formulation: 'tablet',
    strength: '10 mg',
    doseSchedule: { morning: '', noon: '', evening: '', night: '', unit: 'mg' },
    doseLineGerman: '',
    prn: false,
    startDate: '2026-01-01',
    indication: '',
    status: 'active',
    reasonForChange: '',
    sideEffects: [],
    adherenceNote: '',
    freeTextLine: '',
    introducedAt: '2026-01-01T00:00:00.000Z',
    lastChangeAt: '2026-01-01T00:00:00.000Z',
    lastChangeType: 'start',
    history: [],
    ...overrides,
  }
}

function inferred(overrides: Partial<PriorTherapyItem>): PriorTherapyItem {
  return {
    substance: 'X',
    event: 'mentioned',
    reason: null,
    timeframe: 'history',
    source: 'aufnahme',
    evidenceQuote: null,
    inferred: true,
    ...overrides,
  }
}

describe('classifyPriorTherapyEvent', () => {
  it('prefers side_effect when side-effects are recorded', () => {
    expect(classifyPriorTherapyEvent('Ausgeschlichen zugunsten Aripiprazol', ['Prolaktin-Anstieg'])).toBe(
      'side_effect',
    )
  })

  it('detects no_response from the reason text', () => {
    expect(classifyPriorTherapyEvent('kein signifikantes Ansprechen', [])).toBe('no_response')
  })

  it('detects switched / discontinued fallbacks', () => {
    expect(classifyPriorTherapyEvent('Umstellung auf SGA', [])).toBe('switched')
    expect(classifyPriorTherapyEvent('vom Patienten abgesetzt', [])).toBe('discontinued')
  })
})

describe('extractPriorTherapiesFromPlan', () => {
  it('extracts discontinued agents with reason + side-effects, ignoring active ones', () => {
    const plan = [
      makeEntry({ substance: 'Aripiprazol', status: 'active' }),
      makeEntry({
        substance: 'Risperidon',
        status: 'discontinued',
        reasonForChange: 'Ausgeschlichen zugunsten Aripiprazol',
        sideEffects: ['Prolaktin-Anstieg', 'Antriebsminderung'],
      }),
    ]
    const items = extractPriorTherapiesFromPlan(plan)
    expect(items).toHaveLength(1)
    const [item] = items
    expect(item.substance).toBe('Risperidon')
    expect(item.event).toBe('side_effect')
    expect(item.reason).toBe('Prolaktin-Anstieg, Antriebsminderung')
    expect(item.source).toBe('plan')
    expect(item.inferred).toBe(false)
    expect(item.timeframe).toBe('current_admission')
  })

  it('de-duplicates the same discontinued substance', () => {
    const plan = [
      makeEntry({ substance: 'Olanzapin', status: 'discontinued', reasonForChange: 'kein Ansprechen' }),
      makeEntry({ substance: 'olanzapin', status: 'discontinued', reasonForChange: 'kein Ansprechen' }),
    ]
    const items = extractPriorTherapiesFromPlan(plan)
    expect(items).toHaveLength(1)
    expect(items[0].event).toBe('no_response')
  })

  it('skips soft-deleted entries', () => {
    const plan = [
      makeEntry({ substance: 'Quetiapin', status: 'discontinued', deletedAt: '2026-02-01T00:00:00.000Z' }),
    ]
    expect(extractPriorTherapiesFromPlan(plan)).toHaveLength(0)
  })
})

describe('mergePriorTherapies', () => {
  it('keeps authoritative plan data and drops a colliding inferred item', () => {
    const deterministic = extractPriorTherapiesFromPlan([
      makeEntry({ substance: 'Risperidon', status: 'discontinued', sideEffects: ['Prolaktin-Anstieg'] }),
    ])
    const merged = mergePriorTherapies(deterministic, [
      inferred({ substance: 'Risperidon', event: 'mentioned', source: 'verlauf' }),
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].inferred).toBe(false)
    expect(merged[0].source).toBe('plan')
  })

  it('adds inferred-only substances and orders plan data first', () => {
    const deterministic = extractPriorTherapiesFromPlan([
      makeEntry({ substance: 'Risperidon', status: 'discontinued', sideEffects: ['Prolaktin-Anstieg'] }),
    ])
    const merged = mergePriorTherapies(deterministic, [
      inferred({ substance: 'Olanzapin', event: 'no_response', reason: 'kein Ansprechen' }),
    ])
    expect(merged).toHaveLength(2)
    expect(merged[0].inferred).toBe(false)
    expect(merged[1].substance).toBe('Olanzapin')
    expect(merged[1].inferred).toBe(true)
  })

  it('keeps the more specific event when two inferred items collide', () => {
    const merged = mergePriorTherapies(
      [],
      [
        inferred({ substance: 'Olanzapin', event: 'mentioned' }),
        inferred({ substance: 'Olanzapin', event: 'side_effect', reason: 'Gewichtszunahme' }),
      ],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0].event).toBe('side_effect')
  })
})

describe('priorTherapySummaryLine', () => {
  it('renders a German one-liner with reason + source', () => {
    const [item] = extractPriorTherapiesFromPlan([
      makeEntry({ substance: 'Risperidon', status: 'discontinued', sideEffects: ['Hyperprolaktinämie'] }),
    ])
    expect(priorTherapySummaryLine(item, 'de')).toBe(
      'Risperidon — abgesetzt (Nebenwirkung) wegen Hyperprolaktinämie (aktueller Aufenthalt)',
    )
  })
})
