import { describe, expect, it } from 'vitest'
import { ANFORDERUNGEN_CATALOG, ANFORDERUNG_PRESET_EEG, ANFORDERUNG_PRESET_EKG, ANFORDERUNG_PRESET_LABOR, listCatalogByCategory } from '../../../data/anforderungenCatalog'
import type { Anforderung } from '../../../types/anforderung'
import {
  canAcceptAnforderung,
  resolveInitialAnforderungStatus,
} from '../storage'
import { resolveAnforderungResultState } from '../resultLinks'
import { buildAnforderungPrintHtml } from '../printAnforderung'
import { buildAnforderungenText } from '../exportAnforderungen'
import {
  ANFORDERUNGEN_CHANGED_EVENT,
  deleteAnforderung,
  loadAnforderungen,
  upsertAnforderung,
} from '../storage'

function makeOrder(overrides: Partial<Anforderung> = {}): Anforderung {
  const now = '2026-06-18T10:00:00.000Z'
  return {
    id: 'o1',
    caseId: 'case-1',
    catalogId: 'lab-tsh',
    category: 'labor',
    label: 'TSH',
    urgency: 'routine',
    status: 'accepted',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('anforderungenCatalog', () => {
  it('covers all four categories with substantial entries', () => {
    expect(listCatalogByCategory('labor').length).toBeGreaterThanOrEqual(40)
    expect(listCatalogByCategory('befunde').length).toBeGreaterThanOrEqual(15)
    expect(listCatalogByCategory('therapien').length).toBeGreaterThanOrEqual(15)
    expect(listCatalogByCategory('sonstiges').length).toBeGreaterThanOrEqual(10)
    expect(ANFORDERUNGEN_CATALOG.length).toBeGreaterThanOrEqual(80)
  })

  it('has unique catalog ids', () => {
    const ids = ANFORDERUNGEN_CATALOG.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('exposes diagnostics request presets for labor, EKG, and EEG', () => {
    expect(ANFORDERUNG_PRESET_LABOR.category).toBe('labor')
    expect(ANFORDERUNG_PRESET_EKG).toMatchObject({
      category: 'befunde',
      groupKey: 'befunde_kardio',
      selectedCatalogIds: ['befund-ekg'],
    })
    expect(ANFORDERUNG_PRESET_EEG).toMatchObject({
      category: 'befunde',
      groupKey: 'befunde_neurophys',
      selectedCatalogIds: ['befund-eeg-ruhe'],
    })
  })
})

describe('anforderungen accept workflow', () => {
  it('auto-accepts for single_use org', () => {
    expect(resolveInitialAnforderungStatus('single_use', true)).toBe('accepted')
    expect(resolveInitialAnforderungStatus(null, true)).toBe('accepted')
  })

  it('pending for praxis when requiresAcceptance', () => {
    expect(resolveInitialAnforderungStatus('small_praxis', true)).toBe('pending')
    expect(resolveInitialAnforderungStatus('small_praxis', false)).toBe('accepted')
  })

  it('allows clinical roles to accept', () => {
    expect(canAcceptAnforderung('org_admin')).toBe(true)
    expect(canAcceptAnforderung('clinical_lead')).toBe(true)
    expect(canAcceptAnforderung('viewer')).toBe(false)
  })
})

describe('anforderungen print', () => {
  it('renders printable html for an order', () => {
    const order: Anforderung = {
      id: '1',
      caseId: 'case-1',
      catalogId: 'lab-tsh',
      category: 'labor',
      label: 'TSH',
      urgency: 'routine',
      status: 'accepted',
      createdAt: '2026-06-18T10:00:00.000Z',
      updatedAt: '2026-06-18T10:00:00.000Z',
    }
    const html = buildAnforderungPrintHtml([order], {
      caseRef: 'abc12345',
      patientName: 'Test Patient',
    })
    expect(html).toContain('Anforderung')
    expect(html).toContain('TSH')
    expect(html).toContain('Test Patient')
  })
})

describe('anforderungen text export', () => {
  it('includes patient details and requisition fields', () => {
    const text = buildAnforderungenText([makeOrder({ requestedDate: '2026-07-01', note: 'nüchtern' })], {
      caseRef: 'abc12345',
      patientName: 'Test Patient',
      patientDob: '1990-01-01',
      requestingClinician: 'Dr. Beispiel',
    })
    expect(text).toContain('Test Patient')
    expect(text).toContain('1990-01-01')
    expect(text).toContain('Dr. Beispiel')
    expect(text).toContain('TSH')
    expect(text).toContain('Routine')
    expect(text).toContain('nüchtern')
  })

  it('does not throw on an empty list', () => {
    expect(() => buildAnforderungenText([], { caseRef: 'abc12345' })).not.toThrow()
  })
})

describe('deleteAnforderung', () => {
  it('permanently removes the record and emits a change event', () => {
    const caseId = `del-${Math.random().toString(36).slice(2)}`
    upsertAnforderung(makeOrder({ id: 'keep', caseId, label: 'Keep' }), caseId)
    upsertAnforderung(makeOrder({ id: 'drop', caseId, label: 'Drop' }), caseId)
    expect(loadAnforderungen(caseId)).toHaveLength(2)

    let changed = false
    const onChange = (e: Event) => {
      if ((e as CustomEvent<{ caseId: string }>).detail?.caseId === caseId) changed = true
    }
    window.addEventListener(ANFORDERUNGEN_CHANGED_EVENT, onChange)
    const removed = deleteAnforderung(caseId, 'drop')
    window.removeEventListener(ANFORDERUNGEN_CHANGED_EVENT, onChange)

    expect(removed).toBe(true)
    expect(changed).toBe(true)
    const remaining = loadAnforderungen(caseId)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.id).toBe('keep')
  })

  it('returns false when the id is not present', () => {
    const caseId = `del-${Math.random().toString(36).slice(2)}`
    upsertAnforderung(makeOrder({ id: 'a', caseId }), caseId)
    expect(deleteAnforderung(caseId, 'missing')).toBe(false)
    expect(loadAnforderungen(caseId)).toHaveLength(1)
  })
})

describe('anforderungen result links', () => {
  it('reports pending when no labor documented', () => {
    const order: Anforderung = {
      id: '1',
      caseId: 'missing-case',
      catalogId: 'lab-tsh',
      category: 'labor',
      label: 'TSH',
      urgency: 'routine',
      status: 'accepted',
      createdAt: '2026-06-18T10:00:00.000Z',
      updatedAt: '2026-06-18T10:00:00.000Z',
    }
    expect(resolveAnforderungResultState('missing-case', order)).toBe('pending')
  })
})
