import { describe, expect, it, vi } from 'vitest'
import { buildClinicalHeroMeta } from '../clinicalHeroMeta'
import { DEFAULT_CASE_ID } from '../../caseContext'
import { DEMO_CASE_ID } from '../../../demo/constants'

const t = (key: string) => key

vi.mock('../../../hooks/useCaseRegistry', () => ({
  getCaseMeta: vi.fn(),
}))

vi.mock('../../notionPageDate', () => ({
  loadNotionPageDate: vi.fn(() => null),
}))

import { getCaseMeta } from '../../../hooks/useCaseRegistry'

const mockGetCaseMeta = vi.mocked(getCaseMeta)

describe('buildClinicalHeroMeta', () => {
  it('uses workspace label for empty default case instead of patient list fallback', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: DEFAULT_CASE_ID,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    const result = buildClinicalHeroMeta(DEFAULT_CASE_ID, t)

    expect(result.name).toBe('topNavWorkspaceFall')
    expect(result.metaLine).toBeNull()
  })

  it('keeps patient nav fallback for unnamed non-default cases', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: 'abc-123',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    const result = buildClinicalHeroMeta('abc-123', t)

    expect(result.name).toBe('patientNavFallback')
    expect(result.metaLine).toBeNull()
  })

  it('uses demo display name for unnamed demo case', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: DEMO_CASE_ID,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
      isDemoPatient: true,
    })

    const result = buildClinicalHeroMeta(DEMO_CASE_ID, t)

    expect(result.name).toBe('demoPatientDisplayName')
  })

  it('prefers structured patient name on default case when present', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: DEFAULT_CASE_ID,
      localVorname: 'Anna',
      localNachname: 'Beispiel',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    const result = buildClinicalHeroMeta(DEFAULT_CASE_ID, t)

    expect(result.name).toBe('Anna Beispiel')
  })
})
