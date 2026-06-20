import { describe, expect, it, vi } from 'vitest'
import { buildClinicalHeroMeta } from '../clinicalHeroMeta'
import { DEFAULT_CASE_ID } from '../../caseContext'
import { DEMO_CASE_ID } from '../../../demo/constants'

const t = (key: string) => {
  if (key === 'patientCaseUnassigned') return 'Patient nicht zugeordnet (Fall {id})'
  if (key === 'patientGeschlechtMaennlich') return 'Männlich'
  if (key === 'patientGeschlechtWeiblich') return 'Weiblich'
  if (key === 'patientFieldGeburtsdatum') return 'Geburtsdatum'
  if (key === 'patientAgeLabel') return 'Alter'
  if (key === 'patientFieldGeschlecht') return 'Geschlecht'
  if (key === 'patientFieldAufnahmedatum') return 'Aufnahmedatum'
  return key
}

vi.mock('../../../hooks/useCaseRegistry', () => ({
  getCaseMeta: vi.fn(),
}))

vi.mock('../../notionPageDate', () => ({
  loadNotionPageDate: vi.fn(() => null),
}))

import { getCaseMeta } from '../../../hooks/useCaseRegistry'
import { loadNotionPageDate } from '../../notionPageDate'

const mockGetCaseMeta = vi.mocked(getCaseMeta)
const mockLoadNotionPageDate = vi.mocked(loadNotionPageDate)

describe('buildClinicalHeroMeta', () => {
  it('uses workspace label for empty default case instead of patient list fallback', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: DEFAULT_CASE_ID,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    const result = buildClinicalHeroMeta(DEFAULT_CASE_ID, t)

    expect(result.name).toBe('topNavWorkspaceFall')
    expect(result.demographics).toEqual({
      dob: null,
      age: null,
      sex: null,
      admission: null,
    })
    expect(result.metaLine).toContain('Geburtsdatum: —')
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
    expect(result.demographics.admission).toBeNull()
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

  it('always exposes all demographic fields with placeholders when data is missing', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: 'abc-123',
      localVorname: 'Max',
      localNachname: 'Mustermann',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    const result = buildClinicalHeroMeta('abc-123', t)

    expect(result.name).toBe('Max Mustermann')
    expect(result.demographics).toEqual({
      dob: null,
      age: null,
      sex: null,
      admission: null,
    })
    expect(result.metaLine).toBe(
      'Geburtsdatum: — · Alter: — · Geschlecht: — · Aufnahmedatum: —',
    )
  })

  it('shows formatted Geburtsdatum, age from DOB, sex, and admission date when present', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: 'abc-123',
      localVorname: 'Max',
      localNachname: 'Mustermann',
      localGeburtsdatum: '1990-02-01',
      localGeschlecht: 'maennlich',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })
    mockLoadNotionPageDate.mockReturnValue('2026-06-02')

    const result = buildClinicalHeroMeta('abc-123', t)

    expect(result.demographics.dob).toBe('01.02.1990')
    expect(result.demographics.age).toMatch(/^\d+ J\.$/)
    expect(result.demographics.sex).toBe('Männlich')
    expect(result.demographics.admission).toBe('02.06.2026')
  })

  it('calculates age from Geburtsdatum instead of stored localAge', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: 'abc-123',
      localGeburtsdatum: '1985-06-15',
      localAge: '40',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    const result = buildClinicalHeroMeta('abc-123', t)

    expect(result.demographics.dob).toBe('15.06.1985')
    expect(result.demographics.age).toMatch(/^\d+ J\.$/)
    expect(result.demographics.age).not.toBe('40 J.')
  })

  it('falls back to stored age when Geburtsdatum is missing', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: 'abc-123',
      localAge: '34',
      localGeschlecht: 'weiblich',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    const result = buildClinicalHeroMeta('abc-123', t)

    expect(result.demographics.dob).toBeNull()
    expect(result.demographics.age).toBe('34 J.')
    expect(result.demographics.sex).toBe('Weiblich')
  })
})
