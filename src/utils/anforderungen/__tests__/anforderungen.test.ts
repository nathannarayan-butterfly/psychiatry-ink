import { describe, expect, it } from 'vitest'
import { ANFORDERUNGEN_CATALOG, listCatalogByCategory } from '../../../data/anforderungenCatalog'
import type { Anforderung } from '../../../types/anforderung'
import {
  canAcceptAnforderung,
  resolveInitialAnforderungStatus,
} from '../storage'
import { resolveAnforderungResultState } from '../resultLinks'
import { buildAnforderungPrintHtml } from '../printAnforderung'

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
