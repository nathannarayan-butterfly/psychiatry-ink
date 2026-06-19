import { describe, expect, it, vi } from 'vitest'
import { buildClinicalHeroMeta } from '../clinicalHeroMeta'
import { DEFAULT_CASE_ID } from '../../caseContext'
import { DEMO_CASE_ID } from '../../../demo/constants'

const t = (key: string) => {
  if (key === 'patientCaseUnassigned') return 'Patient nicht zugeordnet (Fall {id})'
  return key
}

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

  it('shows unassigned label with short case id for unnamed non-default cases', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: '6c5b69f3-973b-4585-99de-81b3dcb5d2e4',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    const result = buildClinicalHeroMeta('6c5b69f3-973b-4585-99de-81b3dcb5d2e4', t)

    expect(result.name).toBe('Patient nicht zugeordnet (Fall 6c5b69f3)')
    expect(result.isAssigned).toBe(false)
    expect(result.metaLine).toBeNull()
  })

  it('uses page heading when structured name is absent', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: 'abc-123',
      pageHeading: 'Araya',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    const result = buildClinicalHeroMeta('abc-123', t)

    expect(result.name).toBe('Araya')
    expect(result.isAssigned).toBe(true)
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

  it('shows formatted Geburtsdatum in meta line when stored on case', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: 'abc-123',
      localVorname: 'Max',
      localNachname: 'Mustermann',
      localGeburtsdatum: '1990-02-01',
      localGeschlecht: 'maennlich',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    const result = buildClinicalHeroMeta('abc-123', t)

    expect(result.name).toBe('Max Mustermann')
    expect(result.metaLine).toBe('01.02.1990 · patientGeschlechtMaennlich')
  })

  it('prefers Geburtsdatum over numeric age when both are present', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: 'abc-123',
      localGeburtsdatum: '1985-06-15',
      localAge: '40',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    const result = buildClinicalHeroMeta('abc-123', t)

    expect(result.metaLine).toBe('15.06.1985')
  })

  it('falls back to age when Geburtsdatum is missing', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: 'abc-123',
      localAge: '34',
      localGeschlecht: 'weiblich',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    const result = buildClinicalHeroMeta('abc-123', t)

    expect(result.metaLine).toBe('34 J · patientGeschlechtWeiblich')
  })
})
