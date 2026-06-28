import { describe, expect, it, vi } from 'vitest'
import type { DashboardCase } from '../../hooks/useCaseRegistry'

// Isolate the partition logic from registry/demo/archive internals so this test
// exercises only the filter / split / sort behaviour that the dashboard preview
// and the dedicated pages both depend on.
vi.mock('../../hooks/useCaseRegistry', () => ({
  // Hide a single sentinel case id to prove the "listed" gate is applied.
  isListedPatientCase: (caseItem: DashboardCase) => caseItem.caseId !== 'hidden-1',
}))
vi.mock('../../hooks/useDemoPatient', () => ({
  isCaseListedOnDashboard: (caseId: string) => caseId !== 'other-user',
}))
vi.mock('../casePatientLifecycle', () => ({
  isPatientCaseArchived: (caseId: string) => caseId.startsWith('arch-'),
}))

import {
  matchesPatientSearch,
  partitionPatients,
  sortPatients,
  type PatientSort,
} from '../patientListView'

function makeCase(overrides: Partial<DashboardCase> & { caseId: string }): DashboardCase {
  return {
    displayTitle: overrides.caseId,
    lastEditedAt: '2024-01-01T00:00:00.000Z',
    documentTypeSummary: '',
    ...overrides,
  }
}

describe('partitionPatients', () => {
  it('separates active and archived cases and applies the listed/visibility gates', () => {
    const cases = [
      makeCase({ caseId: 'active-1', displayTitle: 'Anna', lastEditedAt: '2024-05-01T00:00:00.000Z' }),
      makeCase({ caseId: 'active-2', displayTitle: 'Bert', lastEditedAt: '2024-06-01T00:00:00.000Z' }),
      makeCase({ caseId: 'arch-1', displayTitle: 'Clara', lastEditedAt: '2024-04-01T00:00:00.000Z' }),
      makeCase({ caseId: 'hidden-1', displayTitle: 'Hidden' }),
      makeCase({ caseId: 'other-user', displayTitle: 'Other' }),
    ]

    const { listed, active, archived } = partitionPatients(cases, 'user-1')

    // hidden-1 (not listed) + other-user (not visible) are dropped.
    expect(listed.map((c) => c.caseId)).toEqual(['active-2', 'active-1', 'arch-1'])
    expect(active.map((c) => c.caseId)).toEqual(['active-2', 'active-1'])
    expect(archived.map((c) => c.caseId)).toEqual(['arch-1'])
  })

  it('lists every active patient (no implicit cap) so the full page can show all', () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      makeCase({
        caseId: `active-${i}`,
        displayTitle: `Patient ${i}`,
        lastEditedAt: `2024-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
      }),
    )

    const { active } = partitionPatients(many, 'user-1')
    expect(active).toHaveLength(25)

    // The dashboard preview caps to the first 6; the full list keeps all 25.
    const preview = active.slice(0, 6)
    expect(preview).toHaveLength(6)
    expect(active.length).toBeGreaterThan(preview.length)
  })
})

describe('matchesPatientSearch', () => {
  const caseItem = makeCase({
    caseId: 'c1',
    displayTitle: 'Müller, Anna',
    localVorname: 'Anna',
    localNachname: 'Müller',
  })

  it('returns every case for an empty query', () => {
    expect(matchesPatientSearch(caseItem, '')).toBe(true)
    expect(matchesPatientSearch(caseItem, '   ')).toBe(true)
  })

  it('matches case-insensitively across name fields', () => {
    expect(matchesPatientSearch(caseItem, 'anna')).toBe(true)
    expect(matchesPatientSearch(caseItem, 'MÜLLER')).toBe(true)
  })

  it('rejects non-matching queries', () => {
    expect(matchesPatientSearch(caseItem, 'schmidt')).toBe(false)
  })
})

describe('sortPatients', () => {
  const list = [
    makeCase({ caseId: 'a', displayTitle: 'Zoe', lastEditedAt: '2024-03-01T00:00:00.000Z' }),
    makeCase({ caseId: 'b', displayTitle: 'Anna', lastEditedAt: '2024-01-01T00:00:00.000Z' }),
    makeCase({ caseId: 'c', displayTitle: 'mark', lastEditedAt: '2024-02-01T00:00:00.000Z' }),
  ]

  it('sorts most-recently-edited first for "recent"', () => {
    const sorted = sortPatients(list, 'recent' as PatientSort, 'de')
    expect(sorted.map((c) => c.caseId)).toEqual(['a', 'c', 'b'])
  })

  it('sorts alphabetically (case-insensitive) for "alpha"', () => {
    const sorted = sortPatients(list, 'alpha', 'de')
    expect(sorted.map((c) => c.displayTitle)).toEqual(['Anna', 'mark', 'Zoe'])
  })

  it('does not mutate the input list', () => {
    const before = list.map((c) => c.caseId)
    sortPatients(list, 'alpha', 'de')
    expect(list.map((c) => c.caseId)).toEqual(before)
  })
})
